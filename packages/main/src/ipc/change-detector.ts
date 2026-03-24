// ── IPC Handlers for Website Change Detector ─────────────────────────
import { ipcMain } from 'electron';
import {
  addWatch,
  removeWatch,
  listWatches,
  getWatchDiff,
  forceCheck,
  updateWatchConfig,
  markRead,
  getUnreadCount,
} from '../services/change-detector';

export function registerChangeDetectorHandlers(): void {
  // Add a URL to the watchlist
  ipcMain.handle('watcher:add', (_event, url: string, interval: number, selector?: string, title?: string) => {
    if (!url || typeof url !== 'string') return { error: 'URL is required' };
    if (!interval || typeof interval !== 'number' || interval < 60_000) {
      interval = 3_600_000; // Default 1 hour
    }

    try {
      const entry = addWatch(url, interval, selector, title);
      return { success: true, watch: entry };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  // Remove a watch
  ipcMain.handle('watcher:remove', (_event, id: string) => {
    if (!id || typeof id !== 'string') return { error: 'Watch ID is required' };
    const removed = removeWatch(id);
    return { success: removed };
  });

  // List all watches
  ipcMain.handle('watcher:list', () => {
    return listWatches();
  });

  // Get diff for a specific watch
  ipcMain.handle('watcher:get-diff', (_event, id: string) => {
    if (!id) return null;
    return getWatchDiff(id);
  });

  // Force immediate check
  ipcMain.handle('watcher:check-now', async (_event, id: string) => {
    if (!id || typeof id !== 'string') return { error: 'Watch ID is required' };
    try {
      await forceCheck(id);
      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  // Update watch configuration
  ipcMain.handle('watcher:update-config', (_event, id: string, config: any) => {
    if (!id || typeof id !== 'string') return { error: 'Watch ID is required' };
    if (!config || typeof config !== 'object') return { error: 'Config is required' };

    const updated = updateWatchConfig(id, config);
    if (!updated) return { error: 'Watch not found' };
    return { success: true, watch: updated };
  });

  // Mark a watch as read
  ipcMain.handle('watcher:mark-read', (_event, id: string) => {
    if (!id) return;
    markRead(id);
    return { success: true };
  });

  // Get unread count
  ipcMain.handle('watcher:unread-count', () => {
    return getUnreadCount();
  });
}
