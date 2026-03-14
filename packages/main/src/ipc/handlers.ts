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

export function registerAllHandlers(mainWindow: BrowserWindow): void {
  // Window controls
  ipcMain.handle(IPC.WINDOW_MINIMIZE, () => mainWindow.minimize());
  ipcMain.handle(IPC.WINDOW_MAXIMIZE, () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.handle(IPC.WINDOW_CLOSE, () => mainWindow.close());
  ipcMain.handle(IPC.WINDOW_FULLSCREEN, () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
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

  // System tray
  initTray(mainWindow);

  // Connectivity status
  ipcMain.handle(IPC.CONNECTIVITY_STATUS, () => getConnectivityStatus());

  // Offline queue count
  ipcMain.handle(IPC.OFFLINE_QUEUE_COUNT, () => getQueueCount());
}
