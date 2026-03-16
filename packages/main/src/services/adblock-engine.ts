import { app, session, ipcMain, WebContents } from 'electron';
import { ElectronBlocker } from '@ghostery/adblocker-electron';
import fetch from 'cross-fetch';
import fs from 'fs';
import path from 'path';

// ── Filter list URLs ────────────────────────────────────────────────────────
const FILTER_LIST_URLS = [
  'https://easylist.to/easylist/easylist.txt',
  'https://easylist.to/easylist/easyprivacy.txt',
  'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=1&mimetype=plaintext',
  'https://secure.fanboy.co.nz/fanboy-annoyance.txt',
  'https://raw.githubusercontent.com/nicktejeda/nicktejeda-blocklist/master/nicktejeda-blocklist-V2.txt',
  'https://raw.githubusercontent.com/nicktejeda/nicktejeda-blocklist/master/nicktejeda-blocklist-V1.txt',
];

// ── YouTube Ad Blocker Script ───────────────────────────────────────────────
const YOUTUBE_AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__osBrowserYTAdBlock) return;
  window.__osBrowserYTAdBlock = true;

  // ── Layer 1: Intercept fetch() to strip ad data from YouTube API responses ──
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next')) {
      try {
        const clone = response.clone();
        const json = await clone.json();
        // Strip ad placements
        if (json.adPlacements) delete json.adPlacements;
        if (json.adSlots) delete json.adSlots;
        if (json.playerAds) delete json.playerAds;
        if (json.adBreakHeartbeatParams) delete json.adBreakHeartbeatParams;
        if (json.playerConfig?.adRequestConfig) delete json.playerConfig.adRequestConfig;
        // Strip ad-related overlay
        if (json.overlay?.autoplay?.autoplayVideoRenderer?.promotedSparkAdRenderer) {
          delete json.overlay.autoplay.autoplayVideoRenderer.promotedSparkAdRenderer;
        }
        return new Response(JSON.stringify(json), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch { return response; }
    }
    return response;
  };

  // ── Layer 2: Override ytInitialPlayerResponse ──
  try {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ytInitialPlayerResponse');
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get: function() { return _ytInitialPlayerResponse; },
      set: function(val) {
        if (val && typeof val === 'object') {
          if (val.adPlacements) delete val.adPlacements;
          if (val.adSlots) delete val.adSlots;
          if (val.playerAds) delete val.playerAds;
          if (val.adBreakHeartbeatParams) delete val.adBreakHeartbeatParams;
        }
        _ytInitialPlayerResponse = val;
      },
      configurable: true,
    });
  } catch {}

  // ── Layer 3: Auto-skip ads (click skip button, fast-forward ad videos) ──
  const adSkipper = setInterval(() => {
    try {
      // Click skip button if available
      const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, [id="skip-button:"] button, .ytp-ad-skip-button-slot button');
      if (skipBtn instanceof HTMLElement) { skipBtn.click(); return; }

      // Fast-forward ad videos
      const video = document.querySelector('video');
      const adOverlay = document.querySelector('.ad-showing, .ytp-ad-player-overlay');
      if (video && adOverlay) {
        video.currentTime = video.duration || 9999;
        video.playbackRate = 16;
      }

      // Close overlay ads
      const closeOverlay = document.querySelector('.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container');
      if (closeOverlay instanceof HTMLElement) closeOverlay.click();
    } catch {}
  }, 500);

  // ── Layer 4: Suppress anti-adblock detection ──
  try {
    const origDefine = Object.defineProperty;
    Object.defineProperty = function(obj, prop, desc) {
      if (prop === 'adBlocksFound' || prop === 'hasAdBlocker') {
        desc = { ...desc, value: 0, writable: true };
      }
      return origDefine.call(this, obj, prop, desc);
    };
  } catch {}

  // ── Layer 5: CSS cosmetic hiding of YouTube ad elements ──
  const style = document.createElement('style');
  style.textContent = [
    'ytd-ad-slot-renderer',
    'ytd-banner-promo-renderer',
    'ytd-companion-slot-renderer',
    'ytd-display-ad-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-statement-banner-renderer',
    'ytd-video-masthead-ad-v3-renderer',
    'ytd-player-legacy-desktop-watch-ads-renderer',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    '#player-ads',
    '#masthead-ad',
    '.ytp-ad-module',
    '.ytp-ad-overlay-container',
    '.ytp-ad-progress',
    '.ytp-ad-progress-list',
    '.ytd-merch-shelf-renderer',
    '.ytd-action-companion-ad-renderer',
    'tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)',
    'div#player-ads.style-scope.ytd-watch-flexy',
    'div#panels.style-scope.ytd-watch-flexy > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
  ].join(', ') + ' { display: none !important; }';
  document.head.appendChild(style);

  // Cleanup on page unload
  window.addEventListener('unload', () => clearInterval(adSkipper), { once: true });
})();
`;

// ── Default whitelisted hostnames ─────────────────────────────────────────
const DEFAULT_GOV_WHITELIST_PATTERNS = ['*.gov.gh', '*.mil.gh', '*.edu.gh'];

export class AdBlockService {
  private blocker: ElectronBlocker | null = null;
  private enabled = true;
  private whitelistedSites = new Set<string>();
  private blockedCounts = new Map<number, number>();
  private updateTimer: ReturnType<typeof setInterval> | null = null;
  private cachePath: string = '';

  constructor() {
    this.cachePath = '';
  }

  async initialize(): Promise<void> {
    this.cachePath = path.join(app.getPath('userData'), 'adblock-engine.bin');

    try {
      // Try loading from cache first (~50ms)
      if (fs.existsSync(this.cachePath)) {
        const buf = fs.readFileSync(this.cachePath);
        this.blocker = ElectronBlocker.deserialize(buf);
        console.log('[AdBlock] Loaded from cache');
      } else {
        // Download fresh filter lists (~2-5s)
        await this.downloadAndBuild();
      }
    } catch (err) {
      console.error('[AdBlock] Cache load failed, downloading fresh:', err);
      try {
        await this.downloadAndBuild();
      } catch (downloadErr) {
        console.error('[AdBlock] Download failed, creating empty blocker:', downloadErr);
        this.blocker = await ElectronBlocker.fromLists(fetch, []);
      }
    }

    if (this.blocker) {
      // Enable blocking on the default session
      this.blocker.enableBlockingInSession(session.defaultSession);

      // Track blocked requests
      this.blocker.on('request-blocked', (request: { tabId: number }) => {
        const tabId = request.tabId ?? -1;
        this.blockedCounts.set(tabId, (this.blockedCounts.get(tabId) || 0) + 1);
      });
    }

    // Register IPC handlers
    this.registerIPC();

    // Schedule background updates every 24 hours
    this.updateTimer = setInterval(() => {
      this.downloadAndBuild().catch((err) => {
        console.error('[AdBlock] Background update failed:', err);
      });
    }, 24 * 60 * 60 * 1000);
  }

  private async downloadAndBuild(): Promise<void> {
    console.log('[AdBlock] Downloading filter lists...');
    this.blocker = await ElectronBlocker.fromLists(
      fetch,
      FILTER_LIST_URLS,
      { enableCompression: true },
      { path: this.cachePath, read: fs.promises.readFile, write: fs.promises.writeFile }
    );
    console.log('[AdBlock] Filter lists downloaded and cached');
  }

  /**
   * Apply cosmetic filters and YouTube ad blocking to a WebContents
   * Called on did-navigate and did-navigate-in-page events
   */
  applyCosmeticFilters(wc: WebContents, url: string): void {
    if (!this.enabled || !url) return;

    // Skip internal pages
    if (url.startsWith('os-browser://') || url.startsWith('about:') || url.startsWith('data:') || url.startsWith('chrome:')) return;

    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return;
    }

    // Skip whitelisted sites
    if (this.isSiteWhitelisted(hostname)) return;

    // Apply Ghostery cosmetic filters (CSS hiding)
    if (this.blocker) {
      try {
        const cosmetics = this.blocker.getCosmeticsFilters({
          url,
          hostname,
          domain: this.getDomain(hostname),
        });

        if (cosmetics.styles) {
          wc.insertCSS(cosmetics.styles).catch(() => {});
        }

        if (cosmetics.scripts && cosmetics.scripts.length > 0) {
          for (const script of cosmetics.scripts) {
            wc.executeJavaScript(script).catch(() => {});
          }
        }
      } catch (err) {
        console.error('[AdBlock] Cosmetic filter error:', err);
      }
    }

    // YouTube-specific ad blocking
    if (hostname === 'www.youtube.com' || hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      wc.executeJavaScript(YOUTUBE_AD_BLOCK_SCRIPT).catch(() => {});
    }
  }

  /**
   * Check if a hostname matches government/whitelisted patterns
   */
  private isSiteWhitelisted(hostname: string): boolean {
    // Check per-site whitelist
    if (this.whitelistedSites.has(hostname)) return true;

    // Check .gov.gh and other default patterns
    for (const pattern of DEFAULT_GOV_WHITELIST_PATTERNS) {
      if (pattern.startsWith('*.')) {
        const suffix = pattern.slice(1); // e.g. ".gov.gh"
        if (hostname.endsWith(suffix) || hostname === suffix.slice(1)) return true;
      } else if (hostname === pattern) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract domain from hostname (e.g. "www.example.com" -> "example.com")
   */
  private getDomain(hostname: string): string {
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;
    return parts.slice(-2).join('.');
  }

  private registerIPC(): void {
    ipcMain.handle('adblock:get-status', () => {
      return {
        enabled: this.enabled,
        totalBlocked: this.getTotalBlocked(),
        whitelistedSites: Array.from(this.whitelistedSites),
      };
    });

    ipcMain.handle('adblock:toggle-global', () => {
      this.enabled = !this.enabled;
      if (this.blocker) {
        if (this.enabled) {
          this.blocker.enableBlockingInSession(session.defaultSession);
        } else {
          this.blocker.disableBlockingInSession(session.defaultSession);
        }
      }
      return { enabled: this.enabled };
    });

    ipcMain.handle('adblock:toggle-site', (_event, hostname: string) => {
      if (this.whitelistedSites.has(hostname)) {
        this.whitelistedSites.delete(hostname);
      } else {
        this.whitelistedSites.add(hostname);
      }
      return { whitelisted: this.whitelistedSites.has(hostname) };
    });

    ipcMain.handle('adblock:is-site-enabled', (_event, hostname: string) => {
      // Site is "enabled" for blocking if it's NOT whitelisted
      const isGov = this.isSiteWhitelisted(hostname);
      const isUserWhitelisted = this.whitelistedSites.has(hostname);
      return {
        enabled: this.enabled && !isUserWhitelisted && !isGov,
        isGovSite: isGov && !isUserWhitelisted,
        isUserWhitelisted,
        globalEnabled: this.enabled,
      };
    });

    ipcMain.handle('adblock:get-blocked-count', () => {
      return { totalBlocked: this.getTotalBlocked() };
    });
  }

  private getTotalBlocked(): number {
    let total = 0;
    for (const count of this.blockedCounts.values()) {
      total += count;
    }
    return total;
  }

  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    if (this.blocker) {
      try {
        this.blocker.disableBlockingInSession(session.defaultSession);
      } catch {}
      this.blocker = null;
    }
    // Remove IPC handlers
    ipcMain.removeHandler('adblock:get-status');
    ipcMain.removeHandler('adblock:toggle-global');
    ipcMain.removeHandler('adblock:toggle-site');
    ipcMain.removeHandler('adblock:is-site-enabled');
    ipcMain.removeHandler('adblock:get-blocked-count');
  }
}

// Singleton instance — exported so tabs.ts can import it
let adBlockServiceInstance: AdBlockService | null = null;

export function getAdBlockService(): AdBlockService {
  if (!adBlockServiceInstance) {
    adBlockServiceInstance = new AdBlockService();
  }
  return adBlockServiceInstance;
}

export function setAdBlockService(instance: AdBlockService): void {
  adBlockServiceInstance = instance;
}
