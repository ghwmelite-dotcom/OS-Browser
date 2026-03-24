import { ipcMain, BrowserWindow, app, nativeImage, clipboard } from 'electron';
import { IPC } from '../../../shared/dist';
import { registerSettingsHandlers } from './settings';
import { registerTabHandlers, getTabViews } from './tabs';
import { registerHistoryHandlers } from './history';
import { registerBookmarkHandlers } from './bookmarks';
// Old basic adblock replaced by adblock-engine.ts (Ghostery-based)
// import { initAdBlocker, getAdBlockStats } from '../services/adblock';
import { registerAIHandlers } from './ai';
import { initConnectivityMonitor, getConnectivityStatus } from '../net/connectivity';
import { initOfflineQueue, getQueueCount } from '../services/offline-queue';
import { registerAgentHandlers } from './agents';
import { initTray } from '../services/tray';
import { registerCredentialHandlers } from './credentials';
import { initDownloadManager } from '../services/download-manager';
import { initMemorySaver } from '../services/tab-suspension';
import { initCertHandler } from '../services/cert-handler';
import { registerBookmarkImportHandlers, registerBookmarkExportHandler } from '../services/bookmark-import';
import { getDatabase } from '../db/database';
import { initDataTracker } from '../services/data-tracker';
import { initPowerMonitor } from '../services/power-monitor';
import { registerVaultHandlers } from './vault';
import { registerRecordingHandlers } from './recordings';
import { registerChangeDetectorHandlers } from './change-detector';
import { initChangeDetector } from '../services/change-detector';
import { detectBrowsers, importFromBrowser } from '../services/browser-import';

export function registerAllHandlers(mainWindow: BrowserWindow): void {
  // Window controls — use event.sender to find the calling window
  // so these work for new windows AND private windows, not just mainWindow
  ipcMain.handle(IPC.WINDOW_MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });
  ipcMain.handle(IPC.WINDOW_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) win.unmaximize();
    else win?.maximize();
  });
  ipcMain.handle(IPC.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });
  ipcMain.handle(IPC.WINDOW_FULLSCREEN, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.setFullScreen(!win.isFullScreen());
  });

  // Set OS Browser as default browser — writes Windows registry entries
  // so the app appears in Default Apps settings, then opens that page
  ipcMain.handle(IPC.APP_SET_DEFAULT_BROWSER, async () => {
    try {
      if (process.platform === 'win32') {
        const { execFileSync } = require('child_process');
        const { shell } = require('electron');
        const exePath = process.execPath;
        const appName = 'OSBrowser';
        const displayName = 'OS Browser';

        // Build all registry entries as [key, valueName, valueData] tuples
        // /ve = default value (no name), /v = named value
        const regEntries: Array<{ key: string; name?: string; data: string }> = [
          // StartMenuInternet registration — this is what makes it appear in Default Apps
          { key: `HKCU\\Software\\Clients\\StartMenuInternet\\${appName}`, data: displayName },
          { key: `HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\shell\\open\\command`, data: `"${exePath}"` },
          { key: `HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\DefaultIcon`, data: `"${exePath}",0` },

          // Capabilities
          { key: `HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities`, name: 'ApplicationName', data: displayName },
          { key: `HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities`, name: 'ApplicationDescription', data: "Ghana's AI-Powered Browser" },
          { key: `HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities`, name: 'ApplicationIcon', data: `"${exePath}",0` },

          // Capabilities — URL associations
          { key: `HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities\\URLAssociations`, name: 'http', data: 'OSBrowserURL' },
          { key: `HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities\\URLAssociations`, name: 'https', data: 'OSBrowserURL' },

          // Capabilities — File associations
          { key: `HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities\\FileAssociations`, name: '.html', data: 'OSBrowserHTML' },
          { key: `HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities\\FileAssociations`, name: '.htm', data: 'OSBrowserHTML' },

          // Capabilities — StartMenu
          { key: `HKCU\\Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities\\StartMenu`, name: 'StartMenuInternet', data: appName },

          // URL handler class
          { key: `HKCU\\Software\\Classes\\OSBrowserURL`, data: `${displayName} URL` },
          { key: `HKCU\\Software\\Classes\\OSBrowserURL`, name: 'URL Protocol', data: '' },
          { key: `HKCU\\Software\\Classes\\OSBrowserURL\\DefaultIcon`, data: `"${exePath}",0` },
          { key: `HKCU\\Software\\Classes\\OSBrowserURL\\shell\\open\\command`, data: `"${exePath}" "%1"` },

          // HTML file handler class
          { key: `HKCU\\Software\\Classes\\OSBrowserHTML`, data: `${displayName} HTML Document` },
          { key: `HKCU\\Software\\Classes\\OSBrowserHTML\\DefaultIcon`, data: `"${exePath}",0` },
          { key: `HKCU\\Software\\Classes\\OSBrowserHTML\\shell\\open\\command`, data: `"${exePath}" "%1"` },

          // RegisteredApplications — tells Windows to discover this browser
          { key: `HKCU\\Software\\RegisteredApplications`, name: displayName, data: `Software\\Clients\\StartMenuInternet\\${appName}\\Capabilities` },
        ];

        // Execute all registry commands using execFileSync (no shell injection)
        for (const entry of regEntries) {
          try {
            const args = ['add', entry.key];
            if (entry.name) {
              args.push('/v', entry.name);
            } else {
              args.push('/ve');
            }
            args.push('/d', entry.data, '/f');
            execFileSync('reg.exe', args, { windowsHide: true, stdio: 'ignore' });
          } catch (err) { console.warn('[Registry]', err); }
        }

        // Also register via Electron's API
        app.setAsDefaultProtocolClient('http');
        app.setAsDefaultProtocolClient('https');

        // Open Default Apps settings
        shell.openExternal('ms-settings:defaultapps');
      } else {
        app.setAsDefaultProtocolClient('http');
        app.setAsDefaultProtocolClient('https');
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Check if OS Browser is the default browser
  ipcMain.handle(IPC.APP_IS_DEFAULT_BROWSER, () => {
    const isHttp = app.isDefaultProtocolClient('http');
    const isHttps = app.isDefaultProtocolClient('https');
    return { isDefault: isHttp && isHttps, http: isHttp, https: isHttps };
  });

  // New window — smart sizing based on screen resolution
  ipcMain.handle('window:new', () => {
    const path = require('path');
    const { screen } = require('electron');
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
    const w = Math.max(1024, Math.round(sw * 0.8));
    const h = Math.max(600, Math.round(sh * 0.8));
    const newWin = new BrowserWindow({
      width: w, height: h, minWidth: 800, minHeight: 500,
      x: Math.round((sw - w) / 2) + 30, y: Math.round((sh - h) / 2) + 30,
      frame: false, titleBarStyle: 'hidden', backgroundColor: '#fce8c8',
      webPreferences: {
        preload: path.join(__dirname, '..', '..', 'preload', 'dist', 'index.js'),
        contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: false,
      },
    });
    if (app.isPackaged) {
      newWin.loadFile(path.join(__dirname, '..', '..', 'renderer', 'dist', 'index.html'));
    } else {
      newWin.loadURL('http://localhost:5173');
    }
  });

  // New private window — separate session, dark mode, no cache
  ipcMain.handle('window:new-private', () => {
    const path = require('path');
    const { screen } = require('electron');
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
    const w = Math.max(1024, Math.round(sw * 0.8));
    const h = Math.max(600, Math.round(sh * 0.8));
    const privWin = new BrowserWindow({
      width: w, height: h, minWidth: 800, minHeight: 500,
      x: Math.round((sw - w) / 2) + 50, y: Math.round((sh - h) / 2) + 50,
      frame: false, titleBarStyle: 'hidden', backgroundColor: '#0f1117',
      webPreferences: {
        preload: path.join(__dirname, '..', '..', 'preload', 'dist', 'index.js'),
        contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: false,
        // Private session — completely separate cookies, cache, storage
        partition: 'private-' + Date.now(),
      },
    });
    if (app.isPackaged) {
      privWin.loadFile(
        path.join(__dirname, '..', '..', 'renderer', 'dist', 'index.html'),
        { query: { private: 'true' } }
      );
    } else {
      privWin.loadURL('http://localhost:5173?private=true');
    }
  });

  // Hide/show WebContentsViews (needed when dropdowns/menus open over the page)
  ipcMain.handle('webviews:hide', () => {
    const { getTabViews } = require('./tabs');
    const views = getTabViews();
    for (const view of views.values()) {
      view.setVisible(false);
    }
  });

  ipcMain.handle('webviews:show', () => {
    const { getTabViews } = require('./tabs');
    const views = getTabViews();
    const db = getDatabase();
    // Only show the active tab's view
    const activeTab = db.prepare('SELECT id FROM tabs WHERE is_active = 1').get() as any;
    for (const [id, view] of views.entries()) {
      view.setVisible(activeTab && id === activeTab.id);
    }
  });

  // Screenshot capture — shows Save As dialog
  ipcMain.handle('screenshot:capture', async (event) => {
    const path = require('path');
    const fs = require('fs');
    const { dialog } = require('electron');
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, error: 'No window found' };

    try {
      // Find the active tab's WebContentsView via DB
      const active = getActiveTabView();
      let image;

      if (active) {
        // Make view visible for capture
        active.view.setVisible(true);
        await new Promise(r => setTimeout(r, 150));
        image = await active.view.webContents.capturePage();
      } else {
        // Fallback: capture the main window's webContents
        image = await win.webContents.capturePage();
      }

      if (!image || image.isEmpty()) {
        return { success: false, error: 'Captured empty image' };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultFilename = `OS-Browser-Screenshot-${timestamp}.png`;

      // Show Save As dialog — let user choose where to save
      const { filePath } = await dialog.showSaveDialog(win, {
        title: 'Save Screenshot',
        defaultPath: path.join(app.getPath('downloads'), defaultFilename),
        filters: [
          { name: 'PNG Image', extensions: ['png'] },
          { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
        ],
      });

      if (!filePath) {
        return { success: false, error: 'Cancelled' };
      }

      // Save based on extension
      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        fs.writeFileSync(filePath, image.toJPEG(90));
      } else {
        fs.writeFileSync(filePath, image.toPNG());
      }

      const filename = path.basename(filePath);
      return { success: true, filename, path: filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ── Screenshot helpers ─────────────────────────────────────────────
  // Find the active tab's WebContentsView reliably via DB
  function getActiveTabView(): { view: any; id: string } | null {
    const db = getDatabase();
    const activeTab = db.prepare('SELECT id FROM tabs WHERE is_active = 1').get() as any;
    if (!activeTab) return null;
    const views = getTabViews();
    const view = views.get(activeTab.id);
    if (!view || view.webContents.isDestroyed()) return null;
    return { view, id: activeTab.id };
  }

  // Copy nativeImage to system clipboard (reliable, works even without focus)
  function copyImageToClipboard(image: Electron.NativeImage): void {
    try {
      clipboard.writeImage(image);
    } catch (err) {
      console.warn('[Screenshot] clipboard.writeImage failed:', err);
    }
  }

  // Screenshot: capture visible tab
  ipcMain.handle('screenshot:capture-visible', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return { success: false, error: 'No window' };

      const active = getActiveTabView();
      if (!active) return { success: false, error: 'No active tab' };

      // Ensure view is visible for capture
      active.view.setVisible(true);
      await new Promise(r => setTimeout(r, 100));

      const image = await active.view.webContents.capturePage();
      if (image.isEmpty()) return { success: false, error: 'Captured empty image' };

      // Copy to system clipboard
      copyImageToClipboard(image);

      const base64 = image.toPNG().toString('base64');
      return { success: true, dataUrl: 'data:image/png;base64,' + base64, width: image.getSize().width, height: image.getSize().height };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Screenshot: full-page scroll-and-stitch capture
  ipcMain.handle('screenshot:capture-full', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return { success: false, error: 'No window' };

      const active = getActiveTabView();
      if (!active) return { success: false, error: 'No active tab' };

      // Ensure view is visible
      active.view.setVisible(true);
      await new Promise(r => setTimeout(r, 100));

      const wc = active.view.webContents;

      // Get page dimensions and current scroll position
      const dims = await wc.executeJavaScript(`
        ({
          scrollHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
          originalScrollY: window.scrollY,
          devicePixelRatio: window.devicePixelRatio || 1,
        })
      `);
      const { scrollHeight, viewportHeight, viewportWidth, originalScrollY, devicePixelRatio } = dims;

      // If the page fits in one viewport, just capture visible area
      if (scrollHeight <= viewportHeight + 5) {
        const image = await wc.capturePage();
        if (image.isEmpty()) return { success: false, error: 'Captured empty image' };
        copyImageToClipboard(image);
        const base64 = image.toPNG().toString('base64');
        return { success: true, dataUrl: 'data:image/png;base64,' + base64, width: image.getSize().width, height: image.getSize().height };
      }

      // Scroll-and-capture slices
      const sliceImages: Electron.NativeImage[] = [];
      const sliceCount = Math.ceil(scrollHeight / viewportHeight);

      for (let i = 0; i < sliceCount; i++) {
        const scrollTo = i * viewportHeight;
        await wc.executeJavaScript(`window.scrollTo(0, ${scrollTo})`);
        // Wait for render — longer for first slice, shorter for subsequent
        await new Promise(r => setTimeout(r, i === 0 ? 200 : 150));
        const img = await wc.capturePage();
        if (!img.isEmpty()) {
          sliceImages.push(img);
        }
      }

      // Restore scroll position
      await wc.executeJavaScript(`window.scrollTo(0, ${originalScrollY})`);

      if (sliceImages.length === 0) return { success: false, error: 'No slices captured' };

      // If only 1 slice, return it directly
      if (sliceImages.length === 1) {
        copyImageToClipboard(sliceImages[0]);
        const base64 = sliceImages[0].toPNG().toString('base64');
        return { success: true, dataUrl: 'data:image/png;base64,' + base64, width: sliceImages[0].getSize().width, height: sliceImages[0].getSize().height };
      }

      // Stitch slices: send data URLs to the PAGE's own context (no offscreen window needed)
      const sliceDataUrls = sliceImages.map(img => img.toDataURL());
      const totalHeight = sliceImages.reduce((sum, img) => sum + img.getSize().height, 0);
      const width = sliceImages[0].getSize().width;

      // Use the tab's own page to stitch via canvas — images are loaded with proper onload handling
      const stitchResult = await wc.executeJavaScript(`
        new Promise((resolve, reject) => {
          try {
            const srcs = ${JSON.stringify(sliceDataUrls)};
            const totalH = ${totalHeight};
            const w = ${width};
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = totalH;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(null); return; }

            // Load all images first, then draw them in order
            const imgs = [];
            let loaded = 0;
            srcs.forEach((src, i) => {
              const img = new Image();
              img.onload = () => {
                imgs[i] = img;
                loaded++;
                if (loaded === srcs.length) {
                  // All loaded — draw in order
                  let drawY = 0;
                  for (let j = 0; j < imgs.length; j++) {
                    ctx.drawImage(imgs[j], 0, drawY);
                    drawY += imgs[j].height;
                  }
                  resolve(canvas.toDataURL('image/png'));
                }
              };
              img.onerror = () => {
                loaded++;
                imgs[i] = null;
                if (loaded === srcs.length) {
                  let drawY = 0;
                  for (let j = 0; j < imgs.length; j++) {
                    if (imgs[j]) {
                      ctx.drawImage(imgs[j], 0, drawY);
                      drawY += imgs[j].height;
                    }
                  }
                  resolve(canvas.toDataURL('image/png'));
                }
              };
              img.src = src;
            });

            // Safety timeout
            setTimeout(() => resolve(null), 15000);
          } catch (e) {
            resolve(null);
          }
        })
      `);

      if (!stitchResult) return { success: false, error: 'Stitching failed' };

      // Copy stitched result to clipboard
      try {
        const stitchBase64 = stitchResult.replace(/^data:image\/png;base64,/, '');
        const stitchImage = nativeImage.createFromBuffer(Buffer.from(stitchBase64, 'base64'));
        copyImageToClipboard(stitchImage);
      } catch {}

      return { success: true, dataUrl: stitchResult, width, height: totalHeight };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Screenshot: capture a specific region (crop from visible capture)
  // The rect coordinates come from the renderer window (clientX/clientY).
  // We need to subtract the content area offset since capturePage() only
  // captures the WebContentsView's content, not the full window.
  ipcMain.handle('screenshot:capture-region', async (event, rect: { x: number; y: number; width: number; height: number }) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return { success: false, error: 'No window' };

      const active = getActiveTabView();
      if (!active) return { success: false, error: 'No active tab' };

      // Ensure view is visible
      active.view.setVisible(true);
      await new Promise(r => setTimeout(r, 100));

      // Get the view bounds relative to the window — this tells us where the content area starts
      const viewBounds = active.view.getBounds();

      // The rect coordinates are relative to the renderer window (0,0 = top-left of window).
      // capturePage() captures starting from (0,0) of the WebContentsView.
      // So we subtract the view's position to map window coords → view coords.
      const adjustedRect = {
        x: Math.max(0, Math.round(rect.x - viewBounds.x)),
        y: Math.max(0, Math.round(rect.y - viewBounds.y)),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };

      // Capture the full visible page first
      const image = await active.view.webContents.capturePage();
      if (image.isEmpty()) return { success: false, error: 'Captured empty image' };

      const imageSize = image.getSize();

      // Account for device pixel ratio — capturePage() returns at native resolution
      const dpr = imageSize.width / viewBounds.width;
      const scaledRect = {
        x: Math.round(adjustedRect.x * dpr),
        y: Math.round(adjustedRect.y * dpr),
        width: Math.round(adjustedRect.width * dpr),
        height: Math.round(adjustedRect.height * dpr),
      };

      // Clamp to image bounds
      scaledRect.x = Math.max(0, Math.min(scaledRect.x, imageSize.width - 1));
      scaledRect.y = Math.max(0, Math.min(scaledRect.y, imageSize.height - 1));
      scaledRect.width = Math.min(scaledRect.width, imageSize.width - scaledRect.x);
      scaledRect.height = Math.min(scaledRect.height, imageSize.height - scaledRect.y);

      if (scaledRect.width <= 0 || scaledRect.height <= 0) {
        return { success: false, error: 'Region is outside the content area' };
      }

      const cropped = image.crop(scaledRect);
      if (cropped.isEmpty()) return { success: false, error: 'Crop produced empty image' };

      // Copy to system clipboard
      copyImageToClipboard(cropped);

      const base64 = cropped.toPNG().toString('base64');
      return { success: true, dataUrl: 'data:image/png;base64,' + base64, width: cropped.getSize().width, height: cropped.getSize().height };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Screenshot: save a dataUrl to file via Save As dialog
  ipcMain.handle('screenshot:save', async (event, dataUrl: string) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      const { dialog } = require('electron');
      const result = await dialog.showSaveDialog(win!, {
        defaultPath: `screenshot-${Date.now()}.png`,
        filters: [
          { name: 'PNG Image', extensions: ['png'] },
          { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
        ],
      });
      if (result.canceled || !result.filePath) return { success: false };
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const fs = require('fs');
      fs.writeFileSync(result.filePath, Buffer.from(base64Data, 'base64'));
      return { success: true, path: result.filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // App info
  ipcMain.handle(IPC.APP_GET_VERSION, () => app.getVersion());

  ipcMain.handle(IPC.APP_CHECK_UPDATE, () => {
    // Auto-updater would check here; for now just return current version
    return { currentVersion: app.getVersion(), updateAvailable: false };
  });

  // Gov Portals
  ipcMain.handle(IPC.GOV_PORTAL_LIST, () => {
    const { getDatabase } = require('../db/database');
    const db = getDatabase();
    return db.prepare('SELECT * FROM gov_portals WHERE is_visible = 1 ORDER BY position').all();
  });

  ipcMain.handle(IPC.GOV_PORTAL_UPDATE, (_event: any, id: number, data: any) => {
    if (typeof id !== 'number' || id < 1 || !data || typeof data !== 'object') return;
    const { getDatabase } = require('../db/database');
    const db = getDatabase();
    const allowed = ['name', 'url', 'category', 'position', 'is_visible'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;
    // Validate string values — reject oversized inputs
    for (const field of fields) {
      const value = data[field];
      if (typeof value === 'string' && value.length > 2048) return;
    }
    const sets = fields.map(f => `\`${f}\` = ?`).join(', ');
    const values = fields.map(f => data[f]);
    db.prepare(`UPDATE gov_portals SET ${sets} WHERE id = ?`).run(...values, id);
  });

  // Stats
  ipcMain.handle(IPC.STATS_GET, () => {
    const { getDatabase } = require('../db/database');
    const db = getDatabase();
    return {
      totalPages: (db.prepare('SELECT COUNT(*) as count FROM history').get() as any).count,
      totalBookmarks: (db.prepare('SELECT COUNT(*) as count FROM bookmarks').get() as any).count,
      totalConversations: (db.prepare('SELECT COUNT(*) as count FROM conversations').get() as any).count,
      totalAdsBlocked: (db.prepare('SELECT COALESCE(SUM(ads_blocked), 0) as total FROM adblock_stats').get() as any).total,
    };
  });

  // Ad block stats — now served by adblock-engine IPC handlers
  // Legacy handler kept for compatibility with renderer stats display
  ipcMain.handle(IPC.ADBLOCK_STATS_UPDATE, async () => {
    try {
      const { getAdBlockService } = require('../services/adblock-engine');
      const svc = getAdBlockService();
      const status = await ipcMain.emit('adblock:get-status');
      return { ads_blocked: 0, trackers_blocked: 0 }; // Stats now tracked per-request in adblock-engine
    } catch {
      return { ads_blocked: 0, trackers_blocked: 0 };
    }
  });

  // Register domain handlers
  registerSettingsHandlers();
  registerTabHandlers(mainWindow);
  registerHistoryHandlers();
  registerBookmarkHandlers();

  // Ad blocker now initialized in main.ts via AdBlockService (Ghostery engine)

  // AI, connectivity, and offline queue
  registerAIHandlers(mainWindow);
  initConnectivityMonitor(mainWindow);
  initOfflineQueue(mainWindow);

  // Custom AI agents
  registerAgentHandlers();

  // Credential manager and download protection
  registerCredentialHandlers();
  initDownloadManager(mainWindow);

  // Certificate error handling and bookmark import
  initCertHandler(mainWindow);
  registerBookmarkImportHandlers(mainWindow);
  registerBookmarkExportHandler(mainWindow);

  // Browser import — detect installed browsers and import bookmarks/history
  ipcMain.handle('browser-import:detect', () => {
    try {
      return detectBrowsers();
    } catch {
      return [];
    }
  });
  ipcMain.handle('browser-import:run', async (_event, browserId: string) => {
    try {
      console.log(`[browser-import] Starting import for: ${browserId}`);
      const result = await importFromBrowser(browserId);
      console.log(`[browser-import] Import complete:`, result);
      // Notify ALL renderer windows to refresh bookmarks/history after import
      try {
        const { BrowserWindow } = require('electron');
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send('bookmarks:refresh');
        }
      } catch {}
      return result;
    } catch (err: any) {
      console.error(`[browser-import] Import failed:`, err);
      return { bookmarks: 0, history: 0, error: err.message };
    }
  });

  // Memory Saver — Chrome-style tab suspension with memory tracking & exclude list
  initMemorySaver(mainWindow);

  // System tray
  initTray(mainWindow);

  // Connectivity status
  ipcMain.handle(IPC.CONNECTIVITY_STATUS, () => getConnectivityStatus());

  // Offline queue count
  ipcMain.handle(IPC.OFFLINE_QUEUE_COUNT, () => getQueueCount());

  // Data usage tracker and power monitor (DumsorGuard)
  initDataTracker(mainWindow);
  initPowerMonitor(mainWindow);

  // Interaction Vault — proof of interaction capture system
  registerVaultHandlers(mainWindow);

  // Screen recordings — save to profile directory
  registerRecordingHandlers(mainWindow);

  // Website Change Detector — watch URLs for content changes
  registerChangeDetectorHandlers();
  initChangeDetector(mainWindow);
}
