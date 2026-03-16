import { ipcMain, BrowserWindow, app } from 'electron';
import { IPC } from '@os-browser/shared';
import { registerSettingsHandlers } from './settings';
import { registerTabHandlers } from './tabs';
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
import { initDownloadProtection } from '../services/downloads';
import { initTabSuspension } from '../services/tab-suspension';
import { getTabViews } from './tabs';
import { initCertHandler } from '../services/cert-handler';
import { registerBookmarkImportHandlers, registerBookmarkExportHandler } from '../services/bookmark-import';
import { getDatabase } from '../db/database';

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
    const { getTabViews } = require('./tabs');
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, error: 'No window found' };

    try {
      // Find the active tab's WebContentsView
      const db = getDatabase();
      const activeTab = db.prepare('SELECT id FROM tabs WHERE is_active = 1').get() as any;
      const views = getTabViews();
      const view = activeTab ? views.get(activeTab.id) : null;

      // Make view visible for capture
      if (view) view.setVisible(true);

      // Brief delay to ensure view is rendered
      await new Promise(r => setTimeout(r, 200));

      // Capture
      let image;
      if (view && view.webContents) {
        image = await view.webContents.capturePage();
      } else {
        image = await win.webContents.capturePage();
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
    const { getDatabase } = require('../db/database');
    const db = getDatabase();
    const allowed = ['name', 'url', 'category', 'position', 'is_visible'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;
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
  initDownloadProtection(mainWindow);

  // Certificate error handling and bookmark import
  initCertHandler(mainWindow);
  registerBookmarkImportHandlers(mainWindow);
  registerBookmarkExportHandler(mainWindow);

  // Tab suspension — automatically suspends inactive tabs when over the concurrent limit
  initTabSuspension(mainWindow, getTabViews());

  // System tray
  initTray(mainWindow);

  // Connectivity status
  ipcMain.handle(IPC.CONNECTIVITY_STATUS, () => getConnectivityStatus());

  // Offline queue count
  ipcMain.handle(IPC.OFFLINE_QUEUE_COUNT, () => getQueueCount());
}
