import { app, ipcMain, BrowserWindow, WebContentsView, nativeImage, net, Menu, MenuItem, clipboard, shell, dialog } from 'electron';
import { IPC } from '../../../shared/dist';
import { getDatabase } from '../db/database';
import path from 'path';
// import { cachePage } from '../services/page-cache'; // Disabled: automatic page caching removed (I5 security fix)
import {
  isTabSuspended, markTabRestored, stopMemorySaver,
  getTabSuspendInfo, getTotalMemorySaved, getSuspendedTabCount,
  addExcludedDomain, removeExcludedDomain, getExcludedDomains,
} from '../services/tab-suspension';
import { getAdBlockService } from '../services/adblock-engine';
import { isGovCaptureDomain, captureCurrentPage } from '../services/interaction-vault';
import { TabManager } from '../tabs/TabManager';
import { TabSessionManager } from '../tabs/TabSessionManager';
import { getTabView, getAllTabViews, resizeAllViews, hideAllTabViews, detachTabView } from '../tabs/TabWebContents';

function isAllowedUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('os-browser://')) return true;
  if (url.startsWith('view-source:')) return true;
  try { return ['http:', 'https:'].includes(new URL(url).protocol); }
  catch { return false; }
}

// Track which tabs have already had PWA detection run (once per page load)
const pwaDetectedTabs = new Set<string>();

// ── Multi-step login support ──────────────────────────────────────────
// Stores the username from step 1 (email page) so it can be paired with
// the password from step 2 (password page). Keyed by tabId.
// Entry expires after 2 minutes to avoid stale data.
const pendingUsernames = new Map<string, { username: string; domain: string; timestamp: number }>();

// Module-level TabManager reference — set in registerTabHandlers, used by setupViewEvents & createTabFromMain
let _tabManager: TabManager;

// ── OAuth tab tracking ────────────────────────────────────────────────
// Maps an OAuth tab ID → { openerTabId, openerHost } so we can detect
// when the auth flow redirects back to the original site and auto-close
// the OAuth tab, switching focus back to the opener.
const oauthTabOrigins = new Map<string, { openerTabId: string; openerHost: string }>();

// ── Auto-login to askozzy.work ──────────────────────────────────────
// Injects the GovChat session token as a cookie so askozzy.work recognizes the user.
// Reads encrypted credentials from disk — if none exist, does nothing (no disruption).
import fs from 'fs';
import { decryptCredential } from '../services/credential-encryption';
import { reactivateTab } from '../services/TabLifecycleManager';
import {
  initMediaSession,
  tryAutoPiP,
  tryAutoExitPiP,
  extractMediaMetadata,
  clearMediaState,
  mediaPlayPause,
  mediaSkipForward,
  mediaSkipBackward,
  startProgressPolling,
  stopProgressPolling,
  getMediaState,
  reEnterPiP,
} from '../services/MediaSessionManager';

const GOVCHAT_CRED_FILE = path.join(app.getPath('userData'), '.govchat-credentials');

// Cache to avoid reading the file on every request
let _cachedCreds: { accessToken: string; userId: string; staffId: string; displayName: string } | null | undefined;
let _credsLastChecked = 0;

function getGovChatCreds(): { accessToken: string; userId: string; staffId: string; displayName: string } | null {
  const now = Date.now();
  // Re-read from disk at most every 30 seconds
  if (_cachedCreds !== undefined && now - _credsLastChecked < 30000) return _cachedCreds;
  _credsLastChecked = now;
  try {
    console.log('[AutoLogin] Checking cred file:', GOVCHAT_CRED_FILE);
    if (!fs.existsSync(GOVCHAT_CRED_FILE)) { console.log('[AutoLogin] File does not exist'); _cachedCreds = null; return null; }
    const encrypted = fs.readFileSync(GOVCHAT_CRED_FILE, 'utf8');
    if (!encrypted) { console.log('[AutoLogin] File is empty'); _cachedCreds = null; return null; }
    const creds = JSON.parse(decryptCredential(encrypted));
    console.log('[AutoLogin] Decrypted creds keys:', Object.keys(creds));
    if (!creds?.accessToken) { console.log('[AutoLogin] No accessToken in creds'); _cachedCreds = null; return null; }
    _cachedCreds = {
      accessToken: creds.accessToken,
      userId: creds.userId || '',
      staffId: creds.staffId || '',
      displayName: creds.displayName || '',
    };
    return _cachedCreds;
  } catch {
    _cachedCreds = null;
    return null;
  }
}

/** Call once at startup to set cookies for askozzy.work on the default session.
 *  Uses session.webRequest to ensure cookies are set BEFORE any page loads. */
function setupAskOzzyAutoLogin(mainWindow: BrowserWindow): void {
  const ses = mainWindow.webContents.session;

  // Set cookies proactively for askozzy.work domains
  function setCookiesNow(): void {
    const creds = getGovChatCreds();
    console.log('[AutoLogin] setCookiesNow called, creds:', creds ? `found (token: ${creds.accessToken.slice(0, 8)}..., staffId: ${creds.staffId})` : 'null');
    if (!creds) return;

    const domains = ['https://askozzy.work', 'https://osbrowser.askozzy.work', 'https://m.osbrowser.askozzy.work'];
    for (const baseUrl of domains) {
      ses.cookies.set({
        url: baseUrl,
        name: 'os_browser_token',
        value: creds.accessToken,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        expirationDate: Math.floor(Date.now() / 1000) + 86400 * 7,
      }).catch(() => {});

      const userInfo = JSON.stringify({
        userId: creds.userId,
        staffId: creds.staffId,
        displayName: creds.displayName,
      });
      ses.cookies.set({
        url: baseUrl,
        name: 'os_browser_user',
        value: encodeURIComponent(userInfo),
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
        path: '/',
        expirationDate: Math.floor(Date.now() / 1000) + 86400 * 7,
      }).then(() => console.log(`[AutoLogin] Cookie os_browser_user set for ${baseUrl}`))
        .catch((err) => console.error(`[AutoLogin] FAILED to set cookie for ${baseUrl}:`, err));
    }
  }

  // Set cookies immediately at startup
  setCookiesNow();

  // Also refresh cookies every 5 minutes (in case user logs into GovChat mid-session)
  setInterval(setCookiesNow, 5 * 60 * 1000);
}

export function registerTabHandlers(mainWindow: BrowserWindow): void {
  // ── Auto-login: set askozzy.work cookies from stored GovChat credentials ──
  setupAskOzzyAutoLogin(mainWindow);

  // ── Create TabManager ────────────────────────────────────────────────
  // Debounce state broadcasts to prevent flooding the renderer during bulk operations
  let broadcastTimer: NodeJS.Timeout | null = null;
  const broadcastState = () => {
    if (broadcastTimer) clearTimeout(broadcastTimer);
    broadcastTimer = setTimeout(() => {
      try { mainWindow.webContents.send('tabs:state-updated', tabManager.getState()); } catch {}
    }, 16); // ~1 frame at 60fps
  };
  const tabManager = new TabManager(mainWindow, broadcastState);
  tabManager.setupViewEventsFn = (view, tabId, win) => setupViewEvents(view, tabId, win);
  _tabManager = tabManager;

  // ── Media Session ──────────────────────────────────────────────────
  initMediaSession(mainWindow);

  // ── Session save/restore ──────────────────────────────────────────────
  const sessionManager = new TabSessionManager();
  sessionManager.startAutoSave(tabManager);

  ipcMain.handle('session:save', () => sessionManager.save(tabManager));
  ipcMain.handle('session:restore', () => sessionManager.restore());

  app.on('before-quit', () => {
    sessionManager.save(tabManager);
    sessionManager.markCleanExit();
    sessionManager.stopAutoSave();
    stopMemorySaver();
  });

  // ── Memory Saver IPC ──────────────────────────────────────────────
  ipcMain.handle('memory-saver:stats', () => ({
    totalSaved: getTotalMemorySaved(),
    suspendedCount: getSuspendedTabCount(),
  }));
  ipcMain.handle('memory-saver:tab-info', (_e, tabId: string) => getTabSuspendInfo(tabId));
  ipcMain.handle('memory-saver:exclude-add', (_e, domain: string) => addExcludedDomain(domain));
  ipcMain.handle('memory-saver:exclude-remove', (_e, domain: string) => removeExcludedDomain(domain));
  ipcMain.handle('memory-saver:exclude-list', () => getExcludedDomains());

  // ── Media control IPC ──────────────────────────────────────────────
  ipcMain.handle(IPC.MEDIA_PLAY_PAUSE, (_e, tabId: string) => mediaPlayPause(tabId));
  ipcMain.handle(IPC.MEDIA_SKIP_FORWARD, (_e, tabId: string) => mediaSkipForward(tabId));
  ipcMain.handle(IPC.MEDIA_SKIP_BACKWARD, (_e, tabId: string) => mediaSkipBackward(tabId));
  ipcMain.handle(IPC.MEDIA_GET_STATE, () => getMediaState());
  ipcMain.handle(IPC.MEDIA_START_PROGRESS, (_e, tabId: string) => startProgressPolling(tabId));
  ipcMain.handle(IPC.MEDIA_STOP_PROGRESS, () => stopProgressPolling());
  ipcMain.handle('media:re-enter-pip', (_e, tabId: string) => reEnterPiP(tabId));

  ipcMain.handle(IPC.TAB_CREATE, (_event, url?: string) => {
    return tabManager.createTab(url);
  });

  ipcMain.handle(IPC.TAB_CLOSE, (_event, id: string) => {
    return tabManager.closeTab(id);
  });

  ipcMain.handle(IPC.TAB_SWITCH, async (_event, id: string) => {
    // Auto-PiP: if outgoing tab has playing video, pop it into PiP (non-blocking)
    const currentActive = tabManager.getActiveTab();
    if (currentActive && currentActive.id !== id) {
      tryAutoPiP(currentActive.id, !!currentActive.is_muted).catch(() => {});
    }

    // Auto-exit PiP if switching back to PiP source tab (non-blocking)
    tryAutoExitPiP(id).catch(() => {});

    // Check if tab was suspended BEFORE activating (activation recreates the view)
    const wasSuspended = isTabSuspended(id);
    let suspendInfo: any = null;
    if (wasSuspended) {
      try {
        const { getTabSuspendInfo } = require('../services/tab-suspension');
        suspendInfo = getTabSuspendInfo(id);
      } catch {}
    }

    const result = tabManager.activateTab(id);

    // Notify renderer that a suspended tab was restored (triggers Memory Saver banner)
    if (wasSuspended) {
      markTabRestored(id);
      mainWindow.webContents.send('tab:restored', {
        id,
        memorySavedBytes: suspendInfo?.memorySavedBytes || 0,
      });
    }

    // Restore scroll position and form data after discarded tab reactivation
    const lifecycleInfo = reactivateTab(id);
    if (lifecycleInfo && lifecycleInfo.state === 'discarded') {
      const view = getTabView(id);
      if (view) {
        view.webContents.once('did-finish-load', () => {
          const scrollY = lifecycleInfo.savedScrollY || 0;
          const formData = lifecycleInfo.savedFormData || {};
          if (scrollY > 0) {
            view.webContents.executeJavaScript(`window.scrollTo(0, ${scrollY})`).catch(() => {});
          }
          if (Object.keys(formData).length > 0) {
            const formScript = Object.entries(formData)
              .map(([key, value]) => {
                const escaped = (value as string).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return `(document.getElementById('${key}') || document.querySelector('[name="${key}"]') || {}).value = '${escaped}';`;
              })
              .join('\n');
            view.webContents.executeJavaScript(formScript).catch(() => {});
          }
        });
      }
    }

    return result;
  });

  ipcMain.handle(IPC.TAB_LIST, () => {
    return tabManager.getTabs();
  });

  ipcMain.handle(IPC.TAB_NAVIGATE, (_event, id: string, url: string) => {
    if (!isAllowedUrl(url)) return;
    tabManager.navigate(id, url);
  });

  ipcMain.handle(IPC.TAB_GO_BACK, (_event, id: string) => {
    const view = getTabView(id);
    if (view?.webContents.canGoBack()) view.webContents.goBack();
  });

  ipcMain.handle(IPC.TAB_GO_FORWARD, (_event, id: string) => {
    const view = getTabView(id);
    if (view?.webContents.canGoForward()) view.webContents.goForward();
  });

  ipcMain.handle(IPC.TAB_RELOAD, (_event, id: string) => {
    const view = getTabView(id);
    view?.webContents.reload();
  });

  ipcMain.handle(IPC.TAB_STOP, (_event, id: string) => {
    const view = getTabView(id);
    view?.webContents.stop();
  });

  ipcMain.handle(IPC.TAB_UPDATE, (_event, id: string, data: any) => {
    const allowed = ['title', 'url', 'favicon_path', 'is_pinned', 'is_muted'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;
    for (const field of fields) {
      tabManager.updateTabField(id, field, data[field]);
    }
  });

  // Picture-in-Picture — find first <video> in the active tab and trigger PiP
  ipcMain.handle('tab:pip', async (_event, id: string) => {
    const view = getTabView(id);
    if (!view) return { success: false, error: 'No view found' };
    try {
      const result = await view.webContents.executeJavaScript(`
        (async () => {
          try {
            const video = document.querySelector('video');
            if (!video) return { success: false, error: 'No video found on this page' };
            if (document.pictureInPictureElement) {
              await document.exitPictureInPicture();
              return { success: true, action: 'exited' };
            }
            await video.requestPictureInPicture();
            return { success: true, action: 'entered' };
          } catch (e) { return { success: false, error: e.message || 'PiP not supported' }; }
        })()
      `, true);
      return result;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to execute PiP' };
    }
  });

  ipcMain.handle('tab:print', (_event, id: string) => {
    const view = getTabView(id);
    if (view) {
      view.webContents.print({}, (success, failureReason) => {
        mainWindow.webContents.send('print:result', { success, failureReason });
      });
    }
  });

  ipcMain.handle('tab:print-to-pdf', async (_event, id: string) => {
    const view = getTabView(id);
    if (!view) return null;

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save as PDF',
      defaultPath: 'page.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (!filePath) return null;

    const data = await view.webContents.printToPDF({});
    const fs = require('fs');
    fs.writeFileSync(filePath, data);
    return filePath;
  });

  // ── Exchange Rate Price Overlay ─────────────────────────────────────
  // Injects a content script that detects foreign currency prices on the page
  // and shows GHS conversion tooltips on hover.
  ipcMain.handle('exchange:inject-overlay', async (_event, id: string, rates: Record<string, number>) => {
    const view = getTabView(id);
    if (!view) return { success: false, error: 'No view found' };

    try {
      await view.webContents.executeJavaScript(`
        (function() {
          // Prevent duplicate injection
          if (window.__osBrowserExchangeOverlay) {
            // If already injected, just update rates and re-scan
            window.__osBrowserExchangeRates = ${JSON.stringify(rates)};
            if (window.__osBrowserExchangeRescan) window.__osBrowserExchangeRescan();
            return;
          }
          window.__osBrowserExchangeOverlay = true;
          window.__osBrowserExchangeRates = ${JSON.stringify(rates)};

          var SYMBOL_MAP = {
            '$': 'USD', '\\u20AC': 'EUR', '\\u00A3': 'GBP', '\\u00A5': 'CNY',
            '\\u20A6': 'NGN', 'C$': 'CAD',
          };
          var CODE_MAP = {
            'USD': 'USD', 'EUR': 'EUR', 'GBP': 'GBP', 'CNY': 'CNY',
            'JPY': 'JPY', 'NGN': 'NGN', 'CAD': 'CAD', 'AUD': 'AUD',
          };

          // Regex: symbol-first prices like $49.99 or \\u00A320.00
          var symbolFirstRe = /(?:\\$|\\u20AC|\\u00A3|\\u00A5|\\u20A6|C\\$)\\s*[\\d,]+\\.?\\d*/g;
          // Regex: code-first prices like USD 49.99
          var codeFirstRe = /(?:USD|EUR|GBP|CNY|JPY|NGN|CAD|AUD)\\s+[\\d,]+\\.?\\d*/g;
          // Regex: code-after prices like 49.99 USD
          var codeAfterRe = /[\\d,]+\\.?\\d*\\s*(?:USD|EUR|GBP|CNY|JPY|NGN|CAD|AUD)/g;

          function parsePriceMatch(match) {
            match = match.trim();
            var currency = null;
            var amountStr = null;

            // Check symbol-first
            for (var sym in SYMBOL_MAP) {
              if (match.indexOf(sym) === 0) {
                currency = SYMBOL_MAP[sym];
                amountStr = match.substring(sym.length).trim();
                break;
              }
            }

            // Check code-first
            if (!currency) {
              for (var code in CODE_MAP) {
                if (match.indexOf(code) === 0) {
                  currency = CODE_MAP[code];
                  amountStr = match.substring(code.length).trim();
                  break;
                }
              }
            }

            // Check code-after
            if (!currency) {
              for (var code2 in CODE_MAP) {
                if (match.indexOf(code2) === match.length - code2.length) {
                  currency = CODE_MAP[code2];
                  amountStr = match.substring(0, match.length - code2.length).trim();
                  break;
                }
              }
            }

            if (!currency || !amountStr) return null;

            var amount = parseFloat(amountStr.replace(/,/g, ''));
            if (isNaN(amount) || amount <= 0) return null;

            return { currency: currency, amount: amount, original: match };
          }

          function createTooltip() {
            var tip = document.createElement('div');
            tip.id = '__osBrowserExchangeTooltip';
            tip.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;' +
              'background:rgba(15,17,23,0.95);color:#D4A017;font-size:13px;font-weight:600;' +
              'font-family:ui-monospace,monospace;padding:6px 10px;border-radius:8px;' +
              'border:1px solid rgba(212,160,23,0.3);box-shadow:0 4px 16px rgba(0,0,0,0.4);' +
              'white-space:nowrap;display:none;backdrop-filter:blur(8px);';
            document.body.appendChild(tip);
            return tip;
          }

          var tooltip = createTooltip();

          function processTextNode(node) {
            var text = node.textContent;
            if (!text || text.length < 2) return;

            var parent = node.parentElement;
            if (!parent) return;
            if (parent.closest('[data-ozzy-exchange]')) return;
            var tag = parent.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'CODE' || tag === 'PRE') return;

            var matches = [];
            var m;

            symbolFirstRe.lastIndex = 0;
            while ((m = symbolFirstRe.exec(text)) !== null) {
              var parsed = parsePriceMatch(m[0]);
              if (parsed) matches.push({ index: m.index, length: m[0].length, data: parsed });
            }

            codeFirstRe.lastIndex = 0;
            while ((m = codeFirstRe.exec(text)) !== null) {
              var parsed2 = parsePriceMatch(m[0]);
              if (parsed2) matches.push({ index: m.index, length: m[0].length, data: parsed2 });
            }

            codeAfterRe.lastIndex = 0;
            while ((m = codeAfterRe.exec(text)) !== null) {
              var parsed3 = parsePriceMatch(m[0]);
              if (parsed3) matches.push({ index: m.index, length: m[0].length, data: parsed3 });
            }

            if (matches.length === 0) return;

            // Deduplicate overlapping matches
            matches.sort(function(a, b) { return a.index - b.index; });
            var deduped = [matches[0]];
            for (var i = 1; i < matches.length; i++) {
              var prev = deduped[deduped.length - 1];
              if (matches[i].index >= prev.index + prev.length) {
                deduped.push(matches[i]);
              }
            }

            // Build replacement
            var frag = document.createDocumentFragment();
            var lastIdx = 0;

            deduped.forEach(function(match) {
              // Text before match
              if (match.index > lastIdx) {
                frag.appendChild(document.createTextNode(text.substring(lastIdx, match.index)));
              }

              var rates = window.__osBrowserExchangeRates;
              var rate = rates[match.data.currency];
              var ghsAmount = rate ? (match.data.amount * rate) : 0;

              var span = document.createElement('span');
              span.setAttribute('data-ozzy-exchange', 'true');
              span.setAttribute('data-currency', match.data.currency);
              span.setAttribute('data-amount', String(match.data.amount));
              span.textContent = text.substring(match.index, match.index + match.length);
              span.style.cssText = 'border-bottom:1.5px dashed #D4A017;cursor:help;position:relative;';

              span.addEventListener('mouseenter', function(e) {
                var r = window.__osBrowserExchangeRates;
                var cur = this.getAttribute('data-currency');
                var amt = parseFloat(this.getAttribute('data-amount'));
                var rt = r[cur];
                if (!rt) return;
                var ghs = (amt * rt).toFixed(2);
                tooltip.textContent = this.textContent + ' \\u2192 GH\\u20B5' + Number(ghs).toLocaleString('en-US', {minimumFractionDigits:2}) + ' (1 ' + cur + ' = \\u20B5' + rt.toFixed(2) + ')';
                tooltip.style.display = 'block';
                var rect = this.getBoundingClientRect();
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.top - 36) + 'px';
              });

              span.addEventListener('mouseleave', function() {
                tooltip.style.display = 'none';
              });

              frag.appendChild(span);
              lastIdx = match.index + match.length;
            });

            // Remaining text
            if (lastIdx < text.length) {
              frag.appendChild(document.createTextNode(text.substring(lastIdx)));
            }

            parent.replaceChild(frag, node);
          }

          function scanDocument() {
            var walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              null
            );
            var nodes = [];
            var n;
            while ((n = walker.nextNode())) nodes.push(n);
            nodes.forEach(processTextNode);
          }

          // Debounced scan
          var scanTimer;
          function debouncedScan() {
            clearTimeout(scanTimer);
            scanTimer = setTimeout(scanDocument, 500);
          }

          window.__osBrowserExchangeRescan = debouncedScan;

          // Initial scan after 500ms
          setTimeout(scanDocument, 500);

          // Observe DOM mutations for dynamically loaded content
          var observer = new MutationObserver(function(mutations) {
            var hasNew = mutations.some(function(m) { return m.addedNodes.length > 0; });
            if (hasNew) debouncedScan();
          });

          observer.observe(document.body, { childList: true, subtree: true });
        })()
      `);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Injection failed' };
    }
  });

  // Remove exchange overlay from page
  ipcMain.handle('exchange:remove-overlay', async (_event, id: string) => {
    const view = getTabView(id);
    if (!view) return { success: false };

    try {
      await view.webContents.executeJavaScript(`
        (function() {
          // Remove all annotated spans
          var spans = document.querySelectorAll('[data-ozzy-exchange]');
          spans.forEach(function(span) {
            var parent = span.parentNode;
            if (parent) {
              var text = document.createTextNode(span.textContent || '');
              parent.replaceChild(text, span);
            }
          });
          // Remove tooltip
          var tip = document.getElementById('__osBrowserExchangeTooltip');
          if (tip) tip.remove();
          // Reset flag
          window.__osBrowserExchangeOverlay = false;
          window.__osBrowserExchangeRescan = null;
        })()
      `);
      return { success: true };
    } catch {
      return { success: false };
    }
  });

  // ── Password autofill handler ─────────────────────────────────────
  // Called from the renderer when a saved credential exists for the current domain.
  // Injects username + password into the page's login form fields.
  ipcMain.handle('password:autofill', async (_e, tabId: string, username: string, password: string) => {
    const view = getTabView(tabId);
    if (!view) return;
    const safeUsername = JSON.stringify(username);
    const safePassword = JSON.stringify(password);
    try {
      await view.webContents.executeJavaScript(`
        (function() {
          var username = ${safeUsername};
          var password = ${safePassword};
          var inputs = document.querySelectorAll('input');
          for (var i = 0; i < inputs.length; i++) {
            var input = inputs[i];
            var type = (input.type || '').toLowerCase();
            var name = (input.name || '').toLowerCase();
            var id = (input.id || '').toLowerCase();
            var autocomplete = (input.autocomplete || '').toLowerCase();

            if (type === 'password') {
              input.value = password;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (
              (type === 'email' || type === 'text' || type === 'tel') &&
              (name.match(/user|email|login|account|name|phone|mobile/) ||
               id.match(/user|email|login|account|name|phone|mobile/) ||
               autocomplete.match(/username|email/))
            ) {
              input.value = username;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        })()
      `);
    } catch {}
  });

  // PWA install handler — opens a standalone BrowserWindow for the PWA
  ipcMain.handle('pwa:install', async (_event, data: { name: string; startUrl: string; iconUrl: string }) => {
    // Strict input validation
    const safeName = data.name.replace(/[^a-zA-Z0-9\s\-_.]/g, '').slice(0, 50);
    let safeUrl: string;
    try {
      const parsed = new URL(data.startUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { success: false, error: 'Invalid URL protocol' };
      }
      safeUrl = parsed.href;
    } catch {
      return { success: false, error: 'Invalid URL' };
    }

    const pwaWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: safeName,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Set the window icon if available
    if (data.iconUrl) {
      try {
        const response = await net.fetch(data.iconUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const icon = nativeImage.createFromBuffer(buffer);
        pwaWindow.setIcon(icon);
      } catch { /* icon fetch failed — use default */ }
    }

    pwaWindow.loadURL(safeUrl);

    // Create a desktop shortcut (Windows)
    try {
      const shortcutPath = path.join(
        app.getPath('appData'),
        'Microsoft/Windows/Start Menu/Programs',
        `${safeName}.lnk`
      );
      shell.writeShortcutLink(shortcutPath, {
        target: process.execPath,
        args: `--pwa-url="${safeUrl}" --pwa-name="${safeName}"`,
        description: safeName,
      });
    } catch { /* shortcut creation failed — non-critical */ }

    return { success: true };
  });

  // Get readable content from the active tab's page
  ipcMain.handle('tab:get-content', async (_event, id: string) => {
    const view = getTabView(id);
    if (!view) return null;
    try {
      const result = await view.webContents.executeJavaScript(`
        (function() {
          var article = document.querySelector('article') || document.querySelector('[role="main"]') || document.querySelector('main') || document.body;
          var title = document.title;
          var clone = article.cloneNode(true);
          clone.querySelectorAll('script, style, nav, footer, aside, header, [role="navigation"], [role="banner"], .ad, .ads, .advertisement, .sidebar, iframe, svg, form').forEach(function(el) { el.remove(); });
          return { title: title, content: clone.innerText, html: clone.innerHTML };
        })()
      `);
      return result;
    } catch { return null; }
  });

  // Resize views when window resizes
  mainWindow.on('resize', () => {
    resizeAllViews(mainWindow);
  });

  // ── New TabManager-backed IPC handlers ─────────────────────────────
  ipcMain.handle(IPC.TAB_REORDER, (_e, id: string, newIndex: number) => tabManager.reorderTab(id, newIndex));
  ipcMain.handle(IPC.TAB_DUPLICATE, (_e, id: string) => tabManager.duplicateTab(id));
  ipcMain.handle(IPC.TAB_CLOSE_OTHERS, (_e, id: string) => tabManager.closeOtherTabs(id));
  ipcMain.handle(IPC.TAB_CLOSE_TO_RIGHT, (_e, id: string) => tabManager.closeTabsToRight(id));
  ipcMain.handle(IPC.TAB_MOVE_LEFT, (_e, id: string) => tabManager.moveTabLeft(id));
  ipcMain.handle(IPC.TAB_MOVE_RIGHT, (_e, id: string) => tabManager.moveTabRight(id));
  ipcMain.handle(IPC.TAB_PIN, (_e, id: string) => tabManager.pinTab(id));
  ipcMain.handle(IPC.TAB_UNPIN, (_e, id: string) => tabManager.unpinTab(id));
  ipcMain.handle(IPC.TAB_MUTE, (_e, id: string) => tabManager.muteTab(id));
  ipcMain.handle(IPC.TAB_UNMUTE, (_e, id: string) => tabManager.unmuteTab(id));
  ipcMain.handle(IPC.TAB_REOPEN_CLOSED, () => tabManager.reopenClosedTab());
  ipcMain.handle(IPC.TAB_GET_STATE, () => tabManager.getState());

  ipcMain.handle(IPC.TAB_DETACH, async (_event, tabId: string, screenX: number, screenY: number) => {
    const tab = tabManager.getTab(tabId);
    if (!tab) return null;

    // Detach the WebContentsView from the current window
    const view = detachTabView(tabId, mainWindow);
    if (!view) return null;

    // Remove tab from current window's database
    const db = getDatabase();
    db.prepare('DELETE FROM tabs WHERE id = ?').run(tabId);

    // Broadcast update to source window
    broadcastState();

    return { success: true, tabId, url: tab.url };
  });

  ipcMain.handle(IPC.GROUP_CREATE, (_e, tabIds: string[], name?: string) => tabManager.createGroup(tabIds, name));
  ipcMain.handle(IPC.GROUP_ADD_TAB, (_e, tabId: string, groupId: string) => tabManager.addTabToGroup(tabId, groupId));
  ipcMain.handle(IPC.GROUP_REMOVE_TAB, (_e, tabId: string) => tabManager.removeTabFromGroup(tabId));
  ipcMain.handle(IPC.GROUP_UPDATE, (_e, groupId: string, data: any) => tabManager.updateGroup(groupId, data));
  ipcMain.handle(IPC.GROUP_COLLAPSE, (_e, groupId: string) => tabManager.collapseGroup(groupId));
  ipcMain.handle(IPC.GROUP_EXPAND, (_e, groupId: string) => tabManager.expandGroup(groupId));
  ipcMain.handle(IPC.GROUP_DELETE, (_e, groupId: string, closeTabs: boolean) => tabManager.deleteGroup(groupId));
}

function resizeViewToContent(view: WebContentsView, win: BrowserWindow): void {
  try {
    const bounds = win.getContentBounds();
    // Browser chrome heights (measured from actual components):
    // KenteCrown: 3px, TitleBar: 32px, TabBar: 36px, NavigationBar: 44px = 115px base
    // BookmarksBar: ~28px, KenteStatusBar: ~28px = 56px additional
    // Total: 171px when all visible
    const topOffset = 171;
    // Kente Sidebar icon rail width = 48px (always visible on the left)
    const sidebarWidth = 48;
    // Bottom safety margin — prevents covering the Windows taskbar on maximize
    const bottomMargin = 2;
    const height = Math.max(100, bounds.height - topOffset - bottomMargin);
    const width = Math.max(100, bounds.width - sidebarWidth);
    view.setBounds({ x: sidebarWidth, y: topOffset, width, height });
  } catch (err) {
    console.error('[Tabs] resizeViewToContent failed:', err);
  }
}

/**
 * Create a new tab from the main process (used by context menu and window.open handler).
 * Delegates to TabManager, then notifies the renderer to sync its store.
 * @param oauthOpener If provided, marks this tab as an OAuth flow so we can auto-close it
 *                    when the auth redirects back to the opener's domain.
 */
export function createTabFromMain(mainWindow: BrowserWindow, url: string, oauthOpener?: { openerTabId: string; openerHost: string }): void {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('view-source:'))) return;

  const tab = _tabManager.createTab(url);

  // If this is an OAuth tab, track it so we can auto-close when auth completes
  if (oauthOpener) {
    oauthTabOrigins.set(tab.id, oauthOpener);
  }

  // Tell the renderer to reload its tab list so the UI syncs (legacy backward compat)
  mainWindow.webContents.send('tabs:refresh', {
    newTabId: tab.id,
    url,
    title: tab.title,
    position: tab.position,
  });
}

function setupViewEvents(view: WebContentsView, tabId: string, mainWindow: BrowserWindow): void {
  const wc = view.webContents;
  const db = getDatabase();

  // ── Ad domain list for navigation blocking ──────────────────────────
  const AD_POPUP_DOMAINS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'moatads.com', 'adsrvr.org', 'serving-sys.com', 'adnxs.com',
    'taboola.com', 'outbrain.com', 'revcontent.com', 'mgid.com',
    'popads.net', 'popcash.net', 'propellerads.com', 'hilltopads.net',
    'exoclick.com', 'juicyads.com', 'trafficjunky.com', 'adcash.com',
    'clickadu.com', 'richpush.com', 'pushground.com', 'evadav.com',
    'notification.top', 'pushame.com', 'push.house', 'rolemedia.co',
    'onclicka.com', 'onclickmax.com', 'clickaine.com', 'adf.ly',
    'bc.vc', 'sh.st', 'linkbucks.com', 'shorte.st',
    'betaheat.com', 'revenuenetworkcpm.com', '1movietv.com',
  ];

  function isAdPopupUrl(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return AD_POPUP_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
    } catch { return false; }
  }

  // Track whether the current navigation was user-initiated (from omni bar / createTab)
  let userInitiatedNavigation = false;
  wc.on('did-finish-load', () => {
    // Reset after page fully loads — the navigation is complete
    userInitiatedNavigation = false;
  });

  // Expose a way for the IPC navigate handler to mark navigation as user-initiated
  (wc as any).__markUserNavigation = () => { userInitiatedNavigation = true; };

  // ── Navigation Guards (security + ad blocking) ──────────────────────
  // Prevent navigation to non-HTTP protocols and ad redirect hijacking
  wc.on('will-navigate', (event, url) => {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      event.preventDefault();
      return;
    }
    // Block ad redirect hijacking — known ad domains
    if (isAdPopupUrl(url)) {
      event.preventDefault();
      return;
    }
    // Note: Cross-domain navigation is allowed — this is a web browser.
    // Ad redirect hijacking is already blocked by the isAdPopupUrl check above.

    // Intercept navigations to downloadable file URLs — convert to actual downloads.
    // Some sites (OBS, SourceForge, GitHub releases) redirect through JS to a file URL.
    // Without this, the browser navigates to the file URL instead of downloading it.
    const DOWNLOAD_EXTENSIONS = [
      '.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.AppImage', '.snap',
      '.zip', '.7z', '.rar', '.tar', '.tar.gz', '.tgz', '.tar.bz2', '.tar.xz',
      '.iso', '.img',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.mp4', '.mkv', '.avi', '.mov', '.mp3', '.wav', '.flac',
      '.apk', '.aab', '.ipa',
    ];
    try {
      const navUrl = new URL(url);
      const pathname = navUrl.pathname.toLowerCase();
      if (DOWNLOAD_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
        event.preventDefault();
        wc.downloadURL(url);
        return;
      }
    } catch { /* URL parsing failed — let navigation proceed */ }
  });

  // Handle target="_blank" links, window.open(), and middle-click
  // Allow OAuth/auth popups as real windows; open other links as new tabs
  const OAUTH_POPUP_HOSTS = [
    'accounts.google.com', 'login.microsoftonline.com', 'login.live.com',
    'appleid.apple.com', 'github.com', 'auth0.com',
    'facebook.com', 'www.facebook.com',
    'api.twitter.com', 'twitter.com',
    'discord.com', 'slack.com',
    'login.yahoo.com', 'login.aol.com',
  ];

  wc.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      return { action: 'deny' };
    }
    if (isAdPopupUrl(url)) {
      return { action: 'deny' };
    }
    // OAuth/auth popups: allow as real BrowserWindow so window.open() returns
    // a valid reference. Google GSI and other OAuth SDKs need this to detect
    // popup completion. COOP headers are stripped in main.ts so window.opener works.
    try {
      const hostname = new URL(url).hostname;
      if (OAUTH_POPUP_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h))) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 500,
            height: 700,
            autoHideMenuBar: true,
            webPreferences: {
              // Same session as parent — cookies are shared
              partition: undefined,
              contextIsolation: true,
              nodeIntegration: false,
              sandbox: true,
            },
          },
        };
      }
    } catch {}
    // Everything else opens as a new tab
    createTabFromMain(mainWindow, url);
    return { action: 'deny' };
  });

  // Monitor OAuth popup windows — when auth completes and navigates away from
  // the auth domain, close the popup and reload the parent tab with auth cookies
  wc.on('did-create-window', (popupWindow) => {
    const popupWc = popupWindow.webContents;

    popupWc.on('will-navigate', (_event, navUrl) => {
      try {
        const navHost = new URL(navUrl).hostname;
        // If the popup navigates to a non-OAuth host, auth is complete
        const isStillOAuth = OAUTH_POPUP_HOSTS.some(h => navHost === h || navHost.endsWith('.' + h));
        if (!isStillOAuth) {
          // Auth complete — close popup and reload parent tab
          setTimeout(() => {
            try { popupWindow.close(); } catch {}
            try { wc.reload(); } catch {}
          }, 500);
        }
      } catch {}
    });

    // Also handle when popup finishes loading a non-OAuth page
    popupWc.on('did-navigate', (_event, navUrl) => {
      try {
        const navHost = new URL(navUrl).hostname;
        const isStillOAuth = OAUTH_POPUP_HOSTS.some(h => navHost === h || navHost.endsWith('.' + h));
        if (!isStillOAuth) {
          setTimeout(() => {
            try { popupWindow.close(); } catch {}
            try { wc.reload(); } catch {}
          }, 300);
        }
      } catch {}
    });
  });

  // Handle new-window events from <a target="_blank"> that bypass setWindowOpenHandler
  wc.on('new-window' as any, (event: any, url: string) => {
    event.preventDefault();
    if ((url.startsWith('https://') || url.startsWith('http://')) && !isAdPopupUrl(url)) {
      createTabFromMain(mainWindow, url);
    }
  });

  // Right-click context menu — prevent default Chromium menu so only ours shows
  wc.on('context-menu', (e, params) => {
    e.preventDefault();
    const menu = new Menu();

    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Undo', role: 'undo' }));
      menu.append(new MenuItem({ label: 'Redo', role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
      menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
      menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
    } else {
      if (params.selectionText) {
        menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
        menu.append(new MenuItem({
          label: `Search Google for "${params.selectionText.substring(0, 30)}${params.selectionText.length > 30 ? '...' : ''}"`,
          click: () => {
            const q = encodeURIComponent(params.selectionText);
            createTabFromMain(mainWindow, `https://www.google.com/search?q=${q}`);
          },
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      menu.append(new MenuItem({ label: 'Back', accelerator: 'Alt+Left', enabled: wc.canGoBack(), click: () => wc.goBack() }));
      menu.append(new MenuItem({ label: 'Forward', accelerator: 'Alt+Right', enabled: wc.canGoForward(), click: () => wc.goForward() }));
      menu.append(new MenuItem({ label: 'Reload', accelerator: 'Ctrl+R', click: () => wc.reload() }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Save Page As...', accelerator: 'Ctrl+S', click: () => wc.downloadURL(wc.getURL()) }));
      menu.append(new MenuItem({ label: 'Print...', accelerator: 'Ctrl+P', click: () => wc.print() }));
      menu.append(new MenuItem({ type: 'separator' }));

      if (params.linkURL) {
        menu.append(new MenuItem({
          label: 'Open Link in New Tab',
          click: () => createTabFromMain(mainWindow, params.linkURL),
        }));
        menu.append(new MenuItem({
          label: 'Copy Link Address',
          click: () => clipboard.writeText(params.linkURL),
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      if (params.mediaType === 'image' && params.srcURL) {
        menu.append(new MenuItem({
          label: 'Copy Image Address',
          click: () => clipboard.writeText(params.srcURL),
        }));
        menu.append(new MenuItem({
          label: 'Open Image in New Tab',
          click: () => createTabFromMain(mainWindow, params.srcURL),
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      menu.append(new MenuItem({
        label: 'Copy Page URL',
        click: () => clipboard.writeText(wc.getURL()),
      }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'View Page Source', accelerator: 'Ctrl+U', click: () => {
        createTabFromMain(mainWindow, `view-source:${wc.getURL()}`);
      }}));
      menu.append(new MenuItem({ label: 'Inspect Element', accelerator: 'Ctrl+Shift+I', click: () => {
        wc.openDevTools();
        wc.devToolsWebContents?.focus();
      }}));
    }

    menu.popup({ window: mainWindow });
  });

  // Keyboard shortcut: F12 or Ctrl+Shift+I opens DevTools for the page
  wc.on('before-input-event', (_event, input) => {
    if (wc.isDestroyed()) return;
    if (input.type !== 'keyDown') return;
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      wc.openDevTools();
    }
  });

  wc.on('page-title-updated', (_e, title) => {
    if (wc.isDestroyed() || mainWindow.isDestroyed()) return;
    try { db.prepare('UPDATE tabs SET title = ? WHERE id = ?').run(title, tabId); } catch {}
    try { mainWindow.webContents.send('tab:title-updated', { id: tabId, title }); } catch {}
  });

  // ── Tracking parameter list for URL stripping ──
  const TRACKING_PARAMS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid',
    'mc_cid', 'mc_eid', '_ga', '_gl', 'yclid', 'wickedid',
    'twclid', 'ttclid', 'igshid', 'ref_src', 'ref_url',
    '__s', 'vero_id', '_hsenc', '_hsmi', 'mkt_tok',
  ]);

  function stripTrackingParams(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      let changed = false;
      for (const key of Array.from(parsed.searchParams.keys())) {
        if (TRACKING_PARAMS.has(key)) {
          parsed.searchParams.delete(key);
          changed = true;
        }
      }
      return changed ? parsed.toString() : rawUrl;
    } catch {
      return rawUrl;
    }
  }

  wc.on('did-navigate', async (_e, url) => {
    if (wc.isDestroyed() || mainWindow.isDestroyed()) return;

    // ── OAuth completion detection ─────────────────────────────────────
    // If this tab was opened for OAuth and has now navigated back to the
    // opener's domain, the auth flow is complete. Auto-close this tab and
    // switch back to the opener tab.
    const oauthOrigin = oauthTabOrigins.get(tabId);
    if (oauthOrigin) {
      try {
        const navHost = new URL(url).hostname;
        // Check if we've navigated back to the opener's domain (auth complete)
        if (oauthOrigin.openerHost && (navHost === oauthOrigin.openerHost || navHost.endsWith('.' + oauthOrigin.openerHost))) {
          oauthTabOrigins.delete(tabId);
          // Schedule auto-close after a brief delay so cookies/tokens are fully set
          setTimeout(() => {
            try {
              // Switch to the opener tab
              const openerView = getTabView(oauthOrigin.openerTabId);
              if (openerView && !openerView.webContents.isDestroyed()) {
                // Hide all views, show opener
                hideAllTabViews();
                openerView.setVisible(true);
                db.prepare('UPDATE tabs SET is_active = 0').run();
                db.prepare('UPDATE tabs SET is_active = 1, last_accessed_at = datetime("now") WHERE id = ?').run(oauthOrigin.openerTabId);
                // Reload the opener tab so it picks up the new auth cookies
                openerView.webContents.reload();
                mainWindow.webContents.send('tabs:refresh', { switchToTabId: oauthOrigin.openerTabId });
              }
              // Close the OAuth tab via TabManager's destroy helper
              _tabManager.closeTab(tabId);
              mainWindow.webContents.send('tabs:refresh', { closedTabId: tabId });
            } catch (err) {
              console.error('[OAuth] Auto-close failed:', err);
            }
          }, 500);
          return; // Skip normal did-navigate processing for this final redirect
        }
      } catch {}
    }

    // Clear PWA detection for this tab so it re-checks on the new page
    for (const key of pwaDetectedTabs) {
      if (key.startsWith(`${tabId}:`)) pwaDetectedTabs.delete(key);
    }

    // Strip tracking parameters from URL (cosmetic only — no page reload)
    const cleanUrl = stripTrackingParams(url);

    try { db.prepare('UPDATE tabs SET url = ? WHERE id = ?').run(cleanUrl, tabId); } catch {}
    try { mainWindow.webContents.send('tab:url-updated', { id: tabId, url: cleanUrl, canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward() }); } catch {}

    // Record history
    try {
      db.prepare(`
        INSERT INTO history (url, title, last_visited_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(url) DO UPDATE SET visit_count = visit_count + 1, last_visited_at = datetime('now'), title = excluded.title
      `).run(url, '');
    } catch {}

    // Password detection moved to did-start-navigation (old page still alive there)

    // Apply cosmetic filters + YouTube ad blocking
    const adblock = getAdBlockService();
    if (adblock) try { adblock.applyCosmeticFilters(wc, url); } catch {}
  });

  wc.on('did-navigate-in-page', (_e, url) => {
    if (wc.isDestroyed() || mainWindow.isDestroyed()) return;
    // Persist SPA navigation URL to database so tab restore uses the correct URL
    try { db.prepare('UPDATE tabs SET url = ? WHERE id = ?').run(url, tabId); } catch {}
    try { mainWindow.webContents.send('tab:url-updated', { id: tabId, url, canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward() }); } catch {}

    // Apply cosmetic filters + YouTube ad blocking (YouTube is a SPA)
    const adblock2 = getAdBlockService();
    if (adblock2) try { adblock2.applyCosmeticFilters(wc, url); } catch {}
  });

  wc.on('did-start-loading', () => {
    if (wc.isDestroyed() || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('tab:loading', { id: tabId, isLoading: true });
  });

  // Inject ad blocking scripts as early as possible — dom-ready fires before
  // page scripts run, ensuring our fetch/XHR intercepts are in place before
  // the video player requests ad data. This eliminates the "ad flash" where
  // users briefly see an ad before the blocker kicks in.
  wc.on('dom-ready', () => {
    if (wc.isDestroyed()) return;
    const url = wc.getURL();
    const adblock3 = getAdBlockService();
    if (adblock3) try { adblock3.applyCosmeticFilters(wc, url); } catch {}

    // Inject click interceptor for Ctrl+click and middle-click on links.
    // Electron's WebContentsView has no built-in tab concept, so Ctrl+click
    // and middle-click on <a> tags just navigate in the same frame.
    // This script converts those clicks into window.open() calls which are
    // caught by setWindowOpenHandler and opened in a new tab.
    try {
      wc.executeJavaScript(`
        (function() {
          if (window.__osBrowserClickInterceptor) return;
          window.__osBrowserClickInterceptor = true;

          function findAnchor(el) {
            while (el && el !== document.body) {
              if (el.tagName === 'A' && el.href) return el;
              el = el.parentElement;
            }
            return null;
          }

          // Handle Ctrl+click (Windows/Linux) and Cmd+click (macOS)
          document.addEventListener('click', function(e) {
            if (!e.ctrlKey && !e.metaKey) return;
            var anchor = findAnchor(e.target);
            if (!anchor || !anchor.href) return;
            var href = anchor.href;
            if (!href.startsWith('http://') && !href.startsWith('https://')) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            window.open(href, '_blank');
          }, true);

          // Handle middle-click (mouse button 1)
          document.addEventListener('auxclick', function(e) {
            if (e.button !== 1) return;
            var anchor = findAnchor(e.target);
            if (!anchor || !anchor.href) return;
            var href = anchor.href;
            if (!href.startsWith('http://') && !href.startsWith('https://')) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            window.open(href, '_blank');
          }, true);
        })()
      `);
    } catch { /* injection failed — non-critical */ }

    // ── USSD Code Detection ─────────────────────────────────────────
    // Scan visible text for USSD patterns and make them interactive.
    // Wraps matched codes in a styled span with gold underline and
    // a copy-to-clipboard tooltip on hover.
    try {
      wc.executeJavaScript(`
        (function() {
          if (window.__osBrowserUSSDDetector) return;
          window.__osBrowserUSSDDetector = true;

          var USSD_RE = /\\*(\\d{2,4}(?:\\*\\d+)*)#/g;

          // Style tag for USSD highlights
          var style = document.createElement('style');
          style.textContent = [
            '.ozzy-ussd { text-decoration: underline; text-decoration-color: #D4A017; text-underline-offset: 2px; cursor: pointer; position: relative; color: inherit; }',
            '.ozzy-ussd:hover { background: rgba(212,160,23,0.12); border-radius: 2px; }',
            '.ozzy-ussd-tip { position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%); padding: 3px 8px; border-radius: 4px; background: #1e212b; color: #e8e8ec; font-size: 11px; white-space: nowrap; pointer-events: auto; cursor: pointer; border: 1px solid #2e3340; z-index: 99999; box-shadow: 0 2px 8px rgba(0,0,0,0.3); opacity: 0; transition: opacity 150ms ease; }',
            '.ozzy-ussd:hover .ozzy-ussd-tip { opacity: 1; }',
          ].join('\\n');
          document.head.appendChild(style);

          function wrapTextNode(node) {
            var text = node.textContent;
            if (!text || !USSD_RE.test(text)) return;
            USSD_RE.lastIndex = 0;

            var frag = document.createDocumentFragment();
            var lastIdx = 0;
            var match;
            while ((match = USSD_RE.exec(text)) !== null) {
              if (match.index > lastIdx) {
                frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
              }
              var span = document.createElement('span');
              span.className = 'ozzy-ussd';
              span.textContent = match[0];
              span.setAttribute('data-ussd', match[0]);

              var tip = document.createElement('span');
              tip.className = 'ozzy-ussd-tip';
              tip.textContent = 'Copy ' + match[0];
              span.appendChild(tip);

              span.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var code = this.getAttribute('data-ussd');
                navigator.clipboard.writeText(code).then(function() {
                  var t = e.target.closest('.ozzy-ussd').querySelector('.ozzy-ussd-tip');
                  if (t) { t.textContent = 'Copied!'; setTimeout(function() { t.textContent = 'Copy ' + code; }, 1500); }
                }).catch(function(err) { console.warn('[USSD] clipboard copy failed:', err); });
              });

              frag.appendChild(span);
              lastIdx = match.index + match[0].length;
            }
            if (lastIdx < text.length) {
              frag.appendChild(document.createTextNode(text.slice(lastIdx)));
            }
            if (lastIdx > 0) {
              node.parentNode.replaceChild(frag, node);
            }
          }

          function scanNode(root) {
            var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
              acceptNode: function(n) {
                var tag = n.parentNode ? n.parentNode.tagName : '';
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA' || tag === 'INPUT') return NodeFilter.FILTER_REJECT;
                if (n.parentNode && n.parentNode.classList && n.parentNode.classList.contains('ozzy-ussd')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
              }
            });
            var nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(wrapTextNode);
          }

          // Scan after a short delay to let dynamic content settle
          setTimeout(function() { scanNode(document.body); }, 800);
        })()
      `);
    } catch { /* USSD detection injection failed — non-critical */ }

    // ── Password Form Detection ──────────────────────────────────────
    // Detects login form submissions and stores credentials temporarily
    // so the did-navigate handler can send them to the renderer for the
    // "Save Password?" prompt.
    try {
      wc.executeJavaScript(`
        (function() {
          if (window.__osBrowserPasswordDetector) return;
          window.__osBrowserPasswordDetector = true;

          function extractCredentials(form) {
            var inputs = form ? form.querySelectorAll('input') : document.querySelectorAll('input');
            var username = '';
            var password = '';

            for (var i = 0; i < inputs.length; i++) {
              var input = inputs[i];
              var type = (input.type || '').toLowerCase();
              var name = (input.name || '').toLowerCase();
              var id = (input.id || '').toLowerCase();
              var autocomplete = (input.autocomplete || '').toLowerCase();

              if (type === 'password' && input.value) {
                password = input.value;
              } else if (
                (type === 'email' || type === 'text' || type === 'tel') &&
                (name.match(/user|email|login|account|name|phone|mobile/) ||
                 id.match(/user|email|login|account|name|phone|mobile/) ||
                 autocomplete.match(/username|email/)) &&
                input.value
              ) {
                username = input.value;
              }
            }
            return { username: username, password: password };
          }

          // Store any captured data — username-only, password-only, or both
          function storeCreds(creds) {
            if (creds.username || creds.password) {
              window.__osBrowserDetectedCreds = creds;
            }
          }

          // Detect form submissions
          document.addEventListener('submit', function(e) {
            var form = e.target;
            if (!(form instanceof HTMLFormElement)) return;
            storeCreds(extractCredentials(form));
          }, true);

          // Also detect click on submit buttons (for JS-driven forms)
          document.addEventListener('click', function(e) {
            var el = e.target;
            while (el && el !== document.body) {
              if ((el.tagName === 'BUTTON' && (el.type === 'submit' || !el.type)) ||
                  (el.tagName === 'INPUT' && el.type === 'submit') ||
                  (el.tagName === 'A' && el.getAttribute('role') === 'button')) {
                var form = el.closest('form');
                storeCreds(extractCredentials(form));
                return;
              }
              el = el.parentElement;
            }
          }, true);

          // For Enter key submission
          document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              var active = document.activeElement;
              if (active && (active.type === 'password' || (active.closest && active.closest('form')))) {
                var form = active.closest ? active.closest('form') : null;
                storeCreds(extractCredentials(form));
              }
            }
          }, true);
        })()
      `);
    } catch { /* password detection injection failed — non-critical */ }
  });

  wc.on('did-stop-loading', () => {
    if (wc.isDestroyed() || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('tab:loading', { id: tabId, isLoading: false });

    // Notify renderer which domain just loaded so it can check for saved credentials
    // and trigger autofill if a match exists.
    try {
      const pageUrl = wc.getURL();
      if (pageUrl && !pageUrl.startsWith('os-browser://') && !pageUrl.startsWith('about:')) {
        const domain = new URL(pageUrl).hostname;
        mainWindow.webContents.send('password:page-loaded', { tabId, domain });
      }
    } catch {}
  });

  // ── Audio indicator ───────────────────────────────────────────────
  wc.on('media-started-playing', () => {
    _tabManager.setAudioPlaying(tabId, true);
    // Delay metadata extraction to avoid interfering with player initialization
    setTimeout(() => extractMediaMetadata(tabId), 2000);
  });

  wc.on('media-paused', () => {
    _tabManager.setAudioPlaying(tabId, false);
    clearMediaState(tabId);
  });

  // Page caching disabled — was caching every page load including potentially sensitive content
  // (banking pages, email, etc.). Use the Offline Library "Save Page" feature instead for
  // explicit user-initiated caching of specific pages.
  // wc.on('did-finish-load', async () => { cachePage(...) });

  // ── PWA Detection ──────────────────────────────────────────────────
  // Uses async IIFE inside executeJavaScript (the correct Electron pattern)
  // plus net.fetch fallback for URL guessing
  wc.on('did-finish-load', async () => {
    if (wc.isDestroyed() || mainWindow.isDestroyed()) return;
    const loadUrl = wc.getURL();
    if (!loadUrl || loadUrl.startsWith('os-browser://') || loadUrl.startsWith('about:') || loadUrl.startsWith('data:')) return;

    const detectionKey = `${tabId}:${loadUrl}`;
    if (pwaDetectedTabs.has(detectionKey)) return;
    pwaDetectedTabs.add(detectionKey);

    // Wait a moment for page to settle
    await new Promise(r => setTimeout(r, 1000));

    let manifestJson: any = null;
    let manifestUrl = '';

    // Approach 1: Use async IIFE in executeJavaScript — fetches manifest from page context
    try {
      const result = await wc.executeJavaScript(`
        (async () => {
          try {
            const link = document.querySelector('link[rel="manifest"]');
            if (!link) return null;
            const r = await fetch(link.href);
            if (!r.ok) return null;
            return { url: link.href, manifest: await r.json() };
          } catch (e) { return null; }
        })()
      `);
      if (result && result.manifest) {
        manifestJson = result.manifest;
        manifestUrl = result.url;
      }
    } catch { /* executeJavaScript failed — try fallback */ }

    // Approach 2: Fallback — probe common manifest paths via net.fetch from main process
    if (!manifestJson) {
      try {
        const origin = new URL(loadUrl).origin;
        const paths = ['/manifest.json', '/manifest.webmanifest', '/site.webmanifest'];
        for (const p of paths) {
          try {
            const url = origin + p;
            const res = await net.fetch(url);
            if (res.ok) {
              const json = await res.json() as any;
              if (json && (json.name || json.short_name)) {
                manifestJson = json;
                manifestUrl = url;
                break;
              }
            }
          } catch { /* this path didn't work */ }
        }
      } catch { /* URL parsing failed */ }
    }

    if (!manifestJson) return;

    // Validate installability (Chrome's criteria)
    const display = manifestJson.display || '';
    if (!['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].includes(display)) return;
    if (!manifestJson.name && !manifestJson.short_name) return;
    if (manifestJson.prefer_related_applications === true) return;

    const isSecure = loadUrl.startsWith('https://') || /^http:\/\/(localhost|127\.0\.0\.1)/.test(loadUrl);
    if (!isSecure) return;

    // Resolve icon URL
    let iconUrl: string | null = null;
    if (manifestJson.icons && manifestJson.icons.length > 0) {
      const icon = manifestJson.icons.find((i: any) => i.sizes === '192x192')
        || manifestJson.icons.find((i: any) => i.sizes === '512x512')
        || manifestJson.icons[manifestJson.icons.length - 1];
      try { iconUrl = new URL(icon.src, manifestUrl || loadUrl).href; } catch {}
    }

    // Send to renderer
    mainWindow.webContents.send('pwa:installable', {
      tabId,
      name: manifestJson.name || manifestJson.short_name || 'Web App',
      shortName: manifestJson.short_name || manifestJson.name,
      description: manifestJson.description || '',
      iconUrl,
      startUrl: manifestJson.start_url
        ? new URL(manifestJson.start_url, manifestUrl || loadUrl).href
        : loadUrl,
      display,
      url: loadUrl,
    });
  });

  // ── Vault: Gov Site Form Detection ──────────────────────────────────
  // After page loads, if it's a government site from the allowlist,
  // inject a content script that detects form submissions and triggers
  // automatic vault captures for proof of interaction.
  wc.on('did-finish-load', async () => {
    if (wc.isDestroyed() || mainWindow.isDestroyed()) return;
    const pageUrl = wc.getURL();
    if (!pageUrl || !isGovCaptureDomain(pageUrl)) return;

    try {
      // Inject form detection script
      await wc.executeJavaScript(`
        (function() {
          if (window.__osBrowserVaultInjected) return;
          window.__osBrowserVaultInjected = true;

          // Listen for form submit events
          document.addEventListener('submit', function(e) {
            // Signal pre-submit capture via postMessage
            window.postMessage({ type: '__OS_BROWSER_VAULT_CAPTURE', action: 'pre-submit' }, '*');
          }, true);

          // Also detect button clicks that might submit forms programmatically
          document.addEventListener('click', function(e) {
            var el = e.target;
            while (el && el !== document.body) {
              if (el.tagName === 'BUTTON' && (el.type === 'submit' || el.closest('form'))) {
                window.postMessage({ type: '__OS_BROWSER_VAULT_CAPTURE', action: 'pre-submit' }, '*');
                return;
              }
              if (el.tagName === 'INPUT' && el.type === 'submit') {
                window.postMessage({ type: '__OS_BROWSER_VAULT_CAPTURE', action: 'pre-submit' }, '*');
                return;
              }
              el = el.parentElement;
            }
          }, true);
        })()
      `);

      // Listen for the postMessage from the content script
      wc.on('console-message', () => {}); // no-op, needed for event loop

      // Use ipc-message from the content script
      // Actually, listen to postMessage via executeJavaScript polling or via
      // a preload IPC bridge. Since we can't use preload in WebContentsView,
      // we use a message channel approach.

      // Set up a message listener in the page that calls Electron's IPC
      // We inject a message event listener that calls back via window.postMessage
      // and we listen via wc.on('ipc-message') — but WebContentsView doesn't
      // support preload. So instead, we use webContents.executeJavaScript to poll.

      // Simpler approach: intercept via did-navigate (post-form-submit) for
      // form submissions typically cause a navigation.
      // We already capture on form navigation via did-navigate when the URL
      // is a gov domain.

      // Notify renderer that this page is vault-eligible (for showing the toast)
      mainWindow.webContents.send('vault:gov-site-detected', {
        tabId,
        url: pageUrl,
      });
    } catch {
      // Injection failed — non-critical
    }
  });

  // Capture on navigation away from a gov site form (post-submit detection)
  wc.on('did-start-navigation', ((_e: any, url: string, isInPlace: boolean, isMainFrame: boolean) => {
    if (!isMainFrame || wc.isDestroyed() || mainWindow.isDestroyed()) return;
    try {
      const previousUrl = wc.getURL();
      if (previousUrl && isGovCaptureDomain(previousUrl)) {
        // Auto-capture the page before navigating away (post-submit)
        captureCurrentPage(wc, {
          url: previousUrl,
          title: wc.getTitle() || '',
          pageAction: 'pre-submit',
        }).then(entry => {
          mainWindow.webContents.send('vault:auto-captured', {
            id: entry.id,
            url: entry.url,
            title: entry.title,
            timestamp: entry.timestamp,
            pageAction: entry.pageAction,
          });
        }).catch((err: any) => {
          console.warn('[Tab]', err?.message || err);
        });
      }
    } catch {
      // URL parsing or capture failed — non-critical
    }

    // ── Password detection: read captured credentials BEFORE old page unloads ──
    // Supports multi-step logins (Gmail, Microsoft): username on page 1, password on page 2
    try {
      wc.executeJavaScript('window.__osBrowserDetectedCreds')
        .then((detectedCreds: any) => {
          if (!detectedCreds) return;
          wc.executeJavaScript('window.__osBrowserDetectedCreds = null').catch(() => {});

          const previousUrl = wc.getURL();
          let domain = '';
          try { domain = new URL(previousUrl).hostname; } catch {}

          const hasUsername = !!(detectedCreds.username);
          const hasPassword = !!(detectedCreds.password);

          if (hasUsername && hasPassword) {
            // Both captured on same page — standard single-page login
            console.log('[PasswordDetect] Full credentials for', domain);
            mainWindow.webContents.send('password:detected', {
              tabId, url: previousUrl, domain,
              username: detectedCreds.username,
              password: detectedCreds.password,
            });
            pendingUsernames.delete(tabId);

          } else if (hasUsername && !hasPassword) {
            // Step 1 of multi-step login — store username for later
            console.log('[PasswordDetect] Username captured for', domain, '- waiting for password step');
            pendingUsernames.set(tabId, {
              username: detectedCreds.username,
              domain,
              timestamp: Date.now(),
            });

          } else if (hasPassword && !hasUsername) {
            // Step 2 of multi-step login — pair with stored username
            const pending = pendingUsernames.get(tabId);
            // Only pair if same domain (or related — e.g., accounts.google.com → mail.google.com)
            const domainMatch = pending && (
              pending.domain === domain ||
              pending.domain.endsWith('.' + domain) ||
              domain.endsWith('.' + pending.domain) ||
              // Google special case: accounts.google.com → myaccount.google.com
              (pending.domain.includes('google') && domain.includes('google')) ||
              (pending.domain.includes('microsoft') && domain.includes('microsoft')) ||
              (pending.domain.includes('apple') && domain.includes('apple'))
            );
            // Also check timestamp — expire after 2 minutes
            const isRecent = pending && (Date.now() - pending.timestamp < 120000);

            if (pending && domainMatch && isRecent) {
              console.log('[PasswordDetect] Password captured, paired with stored username for', domain);
              mainWindow.webContents.send('password:detected', {
                tabId, url: previousUrl, domain,
                username: pending.username,
                password: detectedCreds.password,
              });
              pendingUsernames.delete(tabId);
            } else {
              console.log('[PasswordDetect] Password captured but no matching username found for', domain);
            }
          }
        })
        .catch(() => {});
    } catch {}
  }) as any);

  wc.on('page-favicon-updated', (_e, favicons) => {
    if (wc.isDestroyed() || mainWindow.isDestroyed()) return;
    if (favicons.length > 0) {
      try { db.prepare('UPDATE tabs SET favicon_path = ? WHERE id = ?').run(favicons[0], tabId); } catch {}
      try { mainWindow.webContents.send('tab:favicon-updated', { id: tabId, favicon: favicons[0] }); } catch {}
    }
  });
}

export function getTabViews(): Map<string, WebContentsView> {
  return getAllTabViews();
}
