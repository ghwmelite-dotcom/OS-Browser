import { ipcMain } from 'electron';
import { IPC } from '@os-browser/shared';
import { getDatabase } from '../db/database';

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.SETTINGS_GET, () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  });

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_event, data: Record<string, any>) => {
    const db = getDatabase();
    const allowed = [
      'display_name', 'email', 'avatar_path', 'default_model',
      'theme', 'language', 'sidebar_position', 'ad_blocking',
      'privacy_mode', 'search_engine', 'sync_enabled',
    ];

    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;

    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => data[f]);

    db.prepare(`UPDATE user_profile SET ${sets} WHERE id = 1`).run(...values);
    return db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  });
}
