import { ipcMain } from 'electron';
import { IPC } from '../../../shared/dist';
import { getDatabase } from '../db/database';

export function registerBookmarkHandlers(): void {
  ipcMain.handle(IPC.BOOKMARK_LIST, () => {
    const db = getDatabase();
    const bookmarks = db.prepare('SELECT * FROM bookmarks ORDER BY position').all();
    const folders = db.prepare('SELECT * FROM bookmark_folders ORDER BY position').all();
    return { bookmarks, folders };
  });

  ipcMain.handle(IPC.BOOKMARK_ADD, (_event, data: { url: string; title: string; description?: string; folder_id?: number }) => {
    if (!data || typeof data.url !== 'string' || typeof data.title !== 'string') return null;
    if (data.url.length > 4096 || data.title.length > 1024) return null;
    if (data.description && (typeof data.description !== 'string' || data.description.length > 2048)) return null;
    try {
      const parsed = new URL(data.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    } catch { return null; }
    const db = getDatabase();
    const position = (db.prepare('SELECT MAX(position) as max FROM bookmarks').get() as any)?.max + 1 || 0;
    const result = db.prepare(
      'INSERT INTO bookmarks (url, title, description, folder_id, position) VALUES (?, ?, ?, ?, ?)'
    ).run(data.url, data.title, data.description || null, data.folder_id || null, position);

    // Async favicon fetch — don't block the response
    try {
      const domain = new URL(data.url).hostname;
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      // Store the favicon URL directly — it's a reliable Google CDN URL
      db.prepare('UPDATE bookmarks SET favicon_path = ? WHERE id = ?').run(faviconUrl, result.lastInsertRowid);
    } catch (err) { console.warn('[Bookmarks] Favicon fetch failed:', err); }

    return { id: result.lastInsertRowid, ...data, position };
  });

  ipcMain.handle(IPC.BOOKMARK_UPDATE, (_event, id: number, data: any) => {
    if (typeof id !== 'number' || id < 1 || !data || typeof data !== 'object') return;
    const db = getDatabase();
    const allowed = ['url', 'title', 'description', 'folder_id', 'position'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;
    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => data[f]);
    db.prepare(`UPDATE bookmarks SET ${sets} WHERE id = ?`).run(...values, id);
  });

  ipcMain.handle(IPC.BOOKMARK_DELETE, (_event, id: number) => {
    if (typeof id !== 'number' || id < 1) return;
    const db = getDatabase();
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC.BOOKMARK_IS_BOOKMARKED, (_event, url: string) => {
    if (typeof url !== 'string' || url.length > 4096) return false;
    const db = getDatabase();
    const row = db.prepare('SELECT id FROM bookmarks WHERE url = ? LIMIT 1').get(url);
    return !!row;
  });

  ipcMain.handle(IPC.BOOKMARK_FOLDER_CREATE, (_event, data: { name: string; parent_id?: number }) => {
    if (!data || typeof data.name !== 'string' || data.name.length > 256) return null;
    const db = getDatabase();
    const position = (db.prepare('SELECT MAX(position) as max FROM bookmark_folders').get() as any)?.max + 1 || 0;
    const result = db.prepare(
      'INSERT INTO bookmark_folders (name, parent_id, position) VALUES (?, ?, ?)'
    ).run(data.name, data.parent_id || null, position);
    return { id: result.lastInsertRowid, ...data, position };
  });

  ipcMain.handle(IPC.BOOKMARK_FOLDER_DELETE, (_event, id: number) => {
    if (typeof id !== 'number' || id < 1) return;
    const db = getDatabase();
    db.prepare('DELETE FROM bookmark_folders WHERE id = ?').run(id);
  });

  ipcMain.handle('bookmark:folder:update', (_event, id: number, data: any) => {
    if (typeof id !== 'number' || id < 1 || !data || typeof data !== 'object') return;
    const db = getDatabase();
    const allowed = ['name', 'position', 'parent_id'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;
    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => data[f]);
    db.prepare(`UPDATE bookmark_folders SET ${sets} WHERE id = ?`).run(...values, id);
  });
}
