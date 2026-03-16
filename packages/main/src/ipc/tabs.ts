import { ipcMain, BrowserWindow, WebContentsView, nativeImage, net, Menu, MenuItem, clipboard, shell } from 'electron';
import { IPC } from '@os-browser/shared';
import { getDatabase } from '../db/database';
import crypto from 'crypto';
import path from 'path';
// import { cachePage } from '../services/page-cache'; // Disabled: automatic page caching removed (I5 security fix)
import { isTabSuspended, markTabRestored } from '../services/tab-suspension';
import { getAdBlockService } from '../services/adblock-engine';

// Track which tabs have already had PWA detection run (once per page load)
const pwaDetectedTabs = new Set<string>();

const tabViews = new Map<string, WebContentsView>();

export function registerTabHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(IPC.TAB_CREATE, (_event, url?: string) => {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const tabUrl = url || 'os-browser://newtab';
    const position = (db.prepare('SELECT MAX(position) as max FROM tabs').get() as any)?.max + 1 || 0;

    db.prepare('UPDATE tabs SET is_active = 0 WHERE is_active = 1').run();
    db.prepare(
      'INSERT INTO tabs (id, title, url, position, is_active, last_accessed_at) VALUES (?, ?, ?, ?, 1, datetime("now"))'
    ).run(id, 'New Tab', tabUrl, position);

    // Only create a WebContentsView for real URLs — not internal os-browser:// pages
    // Internal pages (newtab, settings, etc.) are rendered by React in the renderer
    if (!tabUrl.startsWith('os-browser://')) {
      const view = new WebContentsView();
      mainWindow.contentView.addChildView(view);
      resizeViewToContent(view, mainWindow);
      setupViewEvents(view, id, mainWindow);
      view.webContents.loadURL(tabUrl);
      tabViews.set(id, view);
    }

    const title = tabUrl === 'os-browser://settings' ? 'Settings' : 'New Tab';
    return { id, title, url: tabUrl, position, is_pinned: false, is_active: true, is_muted: false, favicon_path: null, last_accessed_at: new Date().toISOString() };
  });

  ipcMain.handle(IPC.TAB_CLOSE, (_event, id: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM tabs WHERE id = ?').run(id);
    const view = tabViews.get(id);
    if (view) {
      mainWindow.contentView.removeChildView(view);
      (view.webContents as any).destroy?.();
      tabViews.delete(id);
    }
  });

  ipcMain.handle(IPC.TAB_SWITCH, (_event, id: string) => {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET is_active = 0').run();
    db.prepare('UPDATE tabs SET is_active = 1, last_accessed_at = datetime("now") WHERE id = ?').run(id);

    // Hide all views, show target
    for (const [viewId, view] of tabViews) {
      view.setVisible(viewId === id);
    }

    const tab = db.prepare('SELECT * FROM tabs WHERE id = ?').get(id) as any;
    // Only create WebContentsView for real URLs — not internal os-browser:// pages
    if (tab && tab.url && !tab.url.startsWith('os-browser://') && !tabViews.has(id)) {
      const view = new WebContentsView();
      mainWindow.contentView.addChildView(view);
      resizeViewToContent(view, mainWindow);
      setupViewEvents(view, id, mainWindow);
      view.webContents.loadURL(tab.url);
      tabViews.set(id, view);
      if (isTabSuspended(id)) {
        markTabRestored(id);
      }
    }

    // Hide all views when switching to an internal page
    if (tab && tab.url && tab.url.startsWith('os-browser://')) {
      for (const view of tabViews.values()) {
        view.setVisible(false);
      }
    }

    return tab;
  });

  ipcMain.handle(IPC.TAB_LIST, () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tabs ORDER BY position').all();
  });

  ipcMain.handle(IPC.TAB_NAVIGATE, (_event, id: string, url: string) => {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET url = ?, last_accessed_at = datetime("now") WHERE id = ?').run(url, id);

    // Don't create WebContentsView for internal pages
    if (url.startsWith('os-browser://')) return;

    let view = tabViews.get(id);
    if (!view) {
      view = new WebContentsView();
      mainWindow.contentView.addChildView(view);
      resizeViewToContent(view, mainWindow);
      setupViewEvents(view, id, mainWindow);
      tabViews.set(id, view);
    }
    view.setVisible(true);
    view.webContents.loadURL(url);
  });

  ipcMain.handle(IPC.TAB_GO_BACK, (_event, id: string) => {
    const view = tabViews.get(id);
    if (view?.webContents.canGoBack()) view.webContents.goBack();
  });

  ipcMain.handle(IPC.TAB_GO_FORWARD, (_event, id: string) => {
    const view = tabViews.get(id);
    if (view?.webContents.canGoForward()) view.webContents.goForward();
  });

  ipcMain.handle(IPC.TAB_RELOAD, (_event, id: string) => {
    const view = tabViews.get(id);
    view?.webContents.reload();
  });

  ipcMain.handle(IPC.TAB_STOP, (_event, id: string) => {
    const view = tabViews.get(id);
    view?.webContents.stop();
  });

  ipcMain.handle(IPC.TAB_UPDATE, (_event, id: string, data: any) => {
    const db = getDatabase();
    const allowed = ['title', 'url', 'favicon_path', 'is_pinned', 'is_muted', 'position'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;
    const sets = fields.map(f => `\`${f}\` = ?`).join(', ');
    const values = fields.map(f => data[f]);
    db.prepare(`UPDATE tabs SET ${sets} WHERE id = ?`).run(...values, id);
  });

  ipcMain.handle('tab:print', (_event, id: string) => {
    const view = tabViews.get(id);
    if (view) {
      view.webContents.print({}, (success, failureReason) => {
        mainWindow.webContents.send('print:result', { success, failureReason });
      });
    }
  });

  ipcMain.handle('tab:print-to-pdf', async (_event, id: string) => {
    const view = tabViews.get(id);
    if (!view) return null;

    const { dialog } = require('electron');
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

  // PWA install handler — opens a standalone BrowserWindow for the PWA
  ipcMain.handle('pwa:install', async (_event, data: { name: string; startUrl: string; iconUrl: string }) => {
    const pwaWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: data.name,
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

    pwaWindow.loadURL(data.startUrl);

    // Create a desktop shortcut (Windows)
    try {
      const { shell, app } = require('electron');
      // Sanitize inputs to prevent command injection via shortcut args
      const safeName = data.name.replace(/["\\/]/g, '');
      const safeUrl = data.startUrl.replace(/"/g, '');
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

  // Resize views when window resizes
  mainWindow.on('resize', () => {
    for (const view of tabViews.values()) {
      if (view.getVisible?.() !== false) {
        resizeViewToContent(view, mainWindow);
      }
    }
  });
}

function resizeViewToContent(view: WebContentsView, win: BrowserWindow): void {
  const bounds = win.getContentBounds();
  // Browser chrome heights (measured from actual components):
  // TitleBar: 32px, TabBar: 36px, NavigationBar: 44px = 112px base
  // BookmarksBar: ~28px, KenteStatusBar: ~28px = 56px additional
  // Total: 168px when all visible
  const topOffset = 168;
  // Kente Sidebar icon rail width = 48px (always visible on the left)
  const sidebarWidth = 48;
  // Bottom safety margin — prevents covering the Windows taskbar on maximize
  const bottomMargin = 2;
  const height = Math.max(100, bounds.height - topOffset - bottomMargin);
  const width = Math.max(100, bounds.width - sidebarWidth);
  view.setBounds({ x: sidebarWidth, y: topOffset, width, height });
}

function setupViewEvents(view: WebContentsView, tabId: string, mainWindow: BrowserWindow): void {
  const wc = view.webContents;
  const db = getDatabase();

  // Right-click context menu
  wc.on('context-menu', (_e, params) => {
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
            mainWindow.webContents.send('tab:navigate-new', `https://www.google.com/search?q=${q}`);
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
          click: () => mainWindow.webContents.send('tab:navigate-new', params.linkURL),
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
          click: () => mainWindow.webContents.send('tab:navigate-new', params.srcURL),
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      menu.append(new MenuItem({
        label: 'Copy Page URL',
        click: () => clipboard.writeText(wc.getURL()),
      }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'View Page Source', accelerator: 'Ctrl+U', click: () => {
        mainWindow.webContents.send('tab:navigate-new', `view-source:${wc.getURL()}`);
      }}));
      menu.append(new MenuItem({ label: 'Inspect Element', accelerator: 'Ctrl+Shift+I', click: () => wc.openDevTools() }));
    }

    menu.popup({ window: mainWindow });
  });

  wc.on('page-title-updated', (_e, title) => {
    db.prepare('UPDATE tabs SET title = ? WHERE id = ?').run(title, tabId);
    mainWindow.webContents.send('tab:title-updated', { id: tabId, title });
  });

  wc.on('did-navigate', (_e, url) => {
    // Clear PWA detection for this tab so it re-checks on the new page
    for (const key of pwaDetectedTabs) {
      if (key.startsWith(`${tabId}:`)) pwaDetectedTabs.delete(key);
    }
    db.prepare('UPDATE tabs SET url = ? WHERE id = ?').run(url, tabId);
    mainWindow.webContents.send('tab:url-updated', { id: tabId, url, canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward() });

    // Record history
    db.prepare(`
      INSERT INTO history (url, title, last_visited_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(url) DO UPDATE SET visit_count = visit_count + 1, last_visited_at = datetime('now'), title = excluded.title
    `).run(url, '');

    // Apply cosmetic filters + YouTube ad blocking
    try { getAdBlockService().applyCosmeticFilters(wc, url); } catch {}
  });

  wc.on('did-navigate-in-page', (_e, url) => {
    mainWindow.webContents.send('tab:url-updated', { id: tabId, url, canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward() });

    // Apply cosmetic filters + YouTube ad blocking (YouTube is a SPA)
    try { getAdBlockService().applyCosmeticFilters(wc, url); } catch {}
  });

  wc.on('did-start-loading', () => {
    mainWindow.webContents.send('tab:loading', { id: tabId, isLoading: true });
  });

  wc.on('did-stop-loading', () => {
    mainWindow.webContents.send('tab:loading', { id: tabId, isLoading: false });
  });

  // Page caching disabled — was caching every page load including potentially sensitive content
  // (banking pages, email, etc.). Use the Offline Library "Save Page" feature instead for
  // explicit user-initiated caching of specific pages.
  // wc.on('did-finish-load', async () => { cachePage(...) });

  // ── PWA Detection ──────────────────────────────────────────────────
  // Uses async IIFE inside executeJavaScript (the correct Electron pattern)
  // plus net.fetch fallback for URL guessing
  wc.on('did-finish-load', async () => {
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

  wc.on('page-favicon-updated', (_e, favicons) => {
    if (favicons.length > 0) {
      db.prepare('UPDATE tabs SET favicon_path = ? WHERE id = ?').run(favicons[0], tabId);
      mainWindow.webContents.send('tab:favicon-updated', { id: tabId, favicon: favicons[0] });
    }
  });
}

export function getTabViews(): Map<string, WebContentsView> {
  return tabViews;
}
