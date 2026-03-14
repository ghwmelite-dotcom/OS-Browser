import { ipcMain } from 'electron';
import { getDatabase } from '../db/database';
import { encryptCredential, decryptCredential } from '../services/credential-encryption';

export function registerCredentialHandlers(): void {
  ipcMain.handle('credential:save', (_event, data: { url_pattern: string; username: string; password: string; display_name?: string }) => {
    const db = getDatabase();
    const usernameEnc = encryptCredential(data.username);
    const passwordEnc = encryptCredential(data.password);
    const result = db.prepare(
      'INSERT INTO credentials (url_pattern, username_encrypted, password_encrypted, display_name, last_used_at) VALUES (?, ?, ?, ?, datetime("now"))'
    ).run(data.url_pattern, usernameEnc, passwordEnc, data.display_name || null);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('credential:get', (_event, url: string) => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM credentials ORDER BY last_used_at DESC').all() as any[];

    // Find matching credentials by URL pattern
    const matches = rows.filter((row: any) => {
      try {
        const pattern = row.url_pattern;
        return url.includes(pattern) || new RegExp(pattern.replace(/\*/g, '.*')).test(url);
      } catch {
        return url.includes(row.url_pattern);
      }
    });

    return matches.map((row: any) => ({
      id: row.id,
      url_pattern: row.url_pattern,
      username: decryptCredential(row.username_encrypted),
      display_name: row.display_name,
      last_used_at: row.last_used_at,
    }));
  });

  ipcMain.handle('credential:delete', (_event, id: number) => {
    const db = getDatabase();
    db.prepare('DELETE FROM credentials WHERE id = ?').run(id);
  });

  ipcMain.handle('credential:list', () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT id, url_pattern, display_name, last_used_at, created_at FROM credentials ORDER BY last_used_at DESC').all();
    return rows;
  });

  ipcMain.handle('credential:fill', (_event, id: number) => {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM credentials WHERE id = ?').get(id) as any;
    if (!row) return null;

    db.prepare('UPDATE credentials SET last_used_at = datetime("now") WHERE id = ?').run(id);

    return {
      username: decryptCredential(row.username_encrypted),
      password: decryptCredential(row.password_encrypted),
    };
  });
}
