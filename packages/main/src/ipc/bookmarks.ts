import { ipcMain } from 'electron';
import { IPC } from '@os-browser/shared';
import { getDatabase } from '../db/database';

export function registerBookmarkHandlers(): void {
  ipcMain.handle(IPC.BOOKMARK_LIST, () => {
    const db = getDatabase();
    const bookmarks = db.prepare('SELECT * FROM bookmarks ORDER BY position').all();
    const folders = db.prepare('SELECT * FROM bookmark_folders ORDER BY position').all();
    return { bookmarks, folders };
  });

  ipcMain.handle(IPC.BOOKMARK_ADD, (_event, data: { url: string; title: string; description?: string; folder_id?: number }) => {
    const db = getDatabase();
    const position = (db.prepare('SELECT MAX(position) as max FROM bookmarks').get() as any)?.max + 1 || 0;
    const result = db.prepare(
      'INSERT INTO bookmarks (url, title, description, folder_id, position) VALUES (?, ?, ?, ?, ?)'
    ).run(data.url, data.title, data.description || null, data.folder_id || null, position);
    return { id: result.lastInsertRowid, ...data, position };
  });

  ipcMain.handle(IPC.BOOKMARK_UPDATE, (_event, id: number, data: any) => {
    const db = getDatabase();
    const allowed = ['url', 'title', 'description', 'folder_id', 'position'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;
    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => data[f]);
    db.prepare(`UPDATE bookmarks SET ${sets} WHERE id = ?`).run(...values, id);
  });

  ipcMain.handle(IPC.BOOKMARK_DELETE, (_event, id: number) => {
    const db = getDatabase();
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC.BOOKMARK_IS_BOOKMARKED, (_event, url: string) => {
    const db = getDatabase();
    const row = db.prepare('SELECT id FROM bookmarks WHERE url = ? LIMIT 1').get(url);
    return !!row;
  });

  ipcMain.handle(IPC.BOOKMARK_FOLDER_CREATE, (_event, data: { name: string; parent_id?: number }) => {
    const db = getDatabase();
    const position = (db.prepare('SELECT MAX(position) as max FROM bookmark_folders').get() as any)?.max + 1 || 0;
    const result = db.prepare(
      'INSERT INTO bookmark_folders (name, parent_id, position) VALUES (?, ?, ?)'
    ).run(data.name, data.parent_id || null, position);
    return { id: result.lastInsertRowid, ...data, position };
  });

  ipcMain.handle(IPC.BOOKMARK_FOLDER_DELETE, (_event, id: number) => {
    const db = getDatabase();
    db.prepare('DELETE FROM bookmark_folders WHERE id = ?').run(id);
  });
}
