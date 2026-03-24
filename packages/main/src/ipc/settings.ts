import { ipcMain } from 'electron';
import { IPC } from '../../../shared/dist';
import { getDatabase } from '../db/database';

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.SETTINGS_GET, () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  });

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_event, data: Record<string, any>) => {
    if (!data || typeof data !== 'object') return;
    const db = getDatabase();
    const allowed = [
      'display_name', 'email', 'avatar_path', 'avatar_color', 'default_model',
      'theme', 'language', 'sidebar_position', 'ad_blocking',
      'privacy_mode', 'search_engine', 'sync_enabled', 'startup_mode', 'onboarding_completed',
      'ghana_card_data',
    ];

    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;

    // Validate string values — reject oversized inputs
    for (const field of fields) {
      const value = data[field];
      if (typeof value === 'string' && value.length > 4096) return;
    }

    const sets = fields.map(f => `\`${f}\` = ?`).join(', ');
    const values = fields.map(f => data[f]);

    db.prepare(`UPDATE user_profile SET ${sets} WHERE id = 1`).run(...values);
    return db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  });
}
