import { ipcMain, BrowserWindow, app } from 'electron';
import { IPC } from '@os-browser/shared';
import { registerSettingsHandlers } from './settings';
import { registerTabHandlers } from './tabs';
import { registerHistoryHandlers } from './history';
import { registerBookmarkHandlers } from './bookmarks';
import { initAdBlocker, getAdBlockStats } from '../services/adblock';
import { registerAIHandlers } from './ai';
import { initConnectivityMonitor, getConnectivityStatus } from '../net/connectivity';
import { initOfflineQueue, getQueueCount } from '../services/offline-queue';
import { registerAgentHandlers } from './agents';
import { initTray } from '../services/tray';
import { registerCredentialHandlers } from './credentials';
import { initDownloadProtection } from '../services/downloads';
import { initCertHandler } from '../services/cert-handler';
import { registerBookmarkImportHandlers } from '../services/bookmark-import';

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

  // New window
  ipcMain.handle('window:new', () => {
    const path = require('path');
    const newWin = new BrowserWindow({
      width: 1280, height: 800, minWidth: 800, minHeight: 600,
      frame: false, titleBarStyle: 'hidden', backgroundColor: '#0a0a08',
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
    const privWin = new BrowserWindow({
      width: 1280, height: 800, minWidth: 800, minHeight: 600,
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

  // App info
  ipcMain.handle(IPC.APP_GET_VERSION, () => app.getVersion());

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
    const sets = fields.map(f => `${f} = ?`).join(', ');
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

  // Ad block stats
  ipcMain.handle(IPC.ADBLOCK_STATS_UPDATE, () => getAdBlockStats());

  // Register domain handlers
  registerSettingsHandlers();
  registerTabHandlers(mainWindow);
  registerHistoryHandlers();
  registerBookmarkHandlers();

  // Initialize ad blocker network interception
  initAdBlocker();

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

  // System tray
  initTray(mainWindow);

  // Connectivity status
  ipcMain.handle(IPC.CONNECTIVITY_STATUS, () => getConnectivityStatus());

  // Offline queue count
  ipcMain.handle(IPC.OFFLINE_QUEUE_COUNT, () => getQueueCount());
}
