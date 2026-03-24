import { ipcMain, BrowserWindow } from 'electron';
import { getTabViews } from './tabs';
import { getDatabase } from '../db/database';
import {
  captureCurrentPage,
  listVaultEntries,
  getVaultImage,
  deleteVaultEntry,
  getVaultStats,
  isGovCaptureDomain,
} from '../services/interaction-vault';

export function registerVaultHandlers(mainWindow: BrowserWindow): void {
  // ── Manual capture of current active tab ──
  ipcMain.handle('vault:capture-page', async (_event, pageAction?: string) => {
    try {
      const db = getDatabase();
      const activeTab = db.prepare('SELECT id, url, title FROM tabs WHERE is_active = 1').get() as any;
      if (!activeTab) return { success: false, error: 'No active tab' };

      const views = getTabViews();
      const view = views.get(activeTab.id);
      if (!view) return { success: false, error: 'No view for active tab' };

      const entry = await captureCurrentPage(view.webContents, {
        url: activeTab.url || '',
        title: activeTab.title || '',
        pageAction: (pageAction as any) || 'manual',
      });

      // Notify renderer about new capture
      mainWindow.webContents.send('vault:captured', {
        id: entry.id,
        url: entry.url,
        title: entry.title,
        timestamp: entry.timestamp,
        pageAction: entry.pageAction,
      });

      return { success: true, entry };
    } catch (err: any) {
      console.error('[Vault] Capture failed:', err);
      return { success: false, error: err.message };
    }
  });

  // ── List vault entries with optional search and date range ──
  ipcMain.handle('vault:list', (_event, search?: string, dateFrom?: string, dateTo?: string) => {
    try {
      const dateRange = (dateFrom || dateTo) ? { from: dateFrom, to: dateTo } : undefined;
      const entries = listVaultEntries(search, dateRange);
      // Return entries without full thumbnail paths (renderer uses vault:get-image)
      return entries.map(e => ({
        id: e.id,
        url: e.url,
        title: e.title,
        timestamp: e.timestamp,
        pageAction: e.pageAction,
        sha256Hash: e.sha256Hash,
      }));
    } catch (err: any) {
      console.error('[Vault] List failed:', err);
      return [];
    }
  });

  // ── Get base64 image data for a vault entry ──
  ipcMain.handle('vault:get-image', (_event, id: string) => {
    if (!id || typeof id !== 'string') return null;
    try {
      return getVaultImage(id);
    } catch (err: any) {
      console.error('[Vault] Get image failed:', err);
      return null;
    }
  });

  // ── Delete a vault entry ──
  ipcMain.handle('vault:delete', (_event, id: string) => {
    if (!id || typeof id !== 'string') return false;
    try {
      return deleteVaultEntry(id);
    } catch (err: any) {
      console.error('[Vault] Delete failed:', err);
      return false;
    }
  });

  // ── Get vault stats ──
  ipcMain.handle('vault:get-stats', () => {
    try {
      return getVaultStats();
    } catch (err: any) {
      console.error('[Vault] Stats failed:', err);
      return { totalCaptures: 0 };
    }
  });

  // ── Check if current URL is a gov capture domain ──
  ipcMain.handle('vault:is-gov-site', (_event, url: string) => {
    if (!url || typeof url !== 'string') return false;
    return isGovCaptureDomain(url);
  });
}
