import { ipcMain } from 'electron';
import { IPC } from '../../../shared/dist';
import { getDatabase } from '../db/database';

export function registerHistoryHandlers(): void {
  ipcMain.handle(IPC.HISTORY_LIST, (_event, page: number = 0) => {
    if (typeof page !== 'number' || page < 0) page = 0;
    const db = getDatabase();
    const limit = 50;
    const offset = Math.floor(page) * limit;
    return db.prepare('SELECT * FROM history ORDER BY last_visited_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  });

  ipcMain.handle(IPC.HISTORY_ADD, (_event, entry: { url: string; title: string }) => {
    if (!entry || typeof entry.url !== 'string' || typeof entry.title !== 'string') return;
    if (entry.url.length > 4096 || entry.title.length > 1024) return;
    const db = getDatabase();
    db.prepare(`
      INSERT INTO history (url, title, last_visited_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(url) DO UPDATE SET visit_count = visit_count + 1, last_visited_at = datetime('now'), title = excluded.title
    `).run(entry.url, entry.title);
  });

  ipcMain.handle(IPC.HISTORY_DELETE, (_event, id: number) => {
    if (typeof id !== 'number' || id < 1) return;
    const db = getDatabase();
    db.prepare('DELETE FROM history WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC.HISTORY_CLEAR, () => {
    const db = getDatabase();
    db.prepare('DELETE FROM history').run();
    db.prepare('DELETE FROM history_fulltext').run();
  });

  ipcMain.handle(IPC.HISTORY_SEARCH, (_event, query: string) => {
    if (typeof query !== 'string' || query.length > 500) return [];
    const db = getDatabase();
    const pattern = `%${query}%`;
    return db.prepare('SELECT * FROM history WHERE url LIKE ? OR title LIKE ? ORDER BY last_visited_at DESC LIMIT 50').all(pattern, pattern);
  });
}
