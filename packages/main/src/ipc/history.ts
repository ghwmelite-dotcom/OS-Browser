import { ipcMain } from 'electron';
import { IPC } from '@os-browser/shared';
import { getDatabase } from '../db/database';

export function registerHistoryHandlers(): void {
  ipcMain.handle(IPC.HISTORY_LIST, (_event, page: number = 0) => {
    const db = getDatabase();
    const limit = 50;
    const offset = page * limit;
    return db.prepare('SELECT * FROM history ORDER BY last_visited_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  });

  ipcMain.handle(IPC.HISTORY_ADD, (_event, entry: { url: string; title: string }) => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO history (url, title, last_visited_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(url) DO UPDATE SET visit_count = visit_count + 1, last_visited_at = datetime('now'), title = excluded.title
    `).run(entry.url, entry.title);
  });

  ipcMain.handle(IPC.HISTORY_DELETE, (_event, id: number) => {
    const db = getDatabase();
    db.prepare('DELETE FROM history WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC.HISTORY_CLEAR, () => {
    const db = getDatabase();
    db.prepare('DELETE FROM history').run();
    db.prepare('DELETE FROM history_fts').run();
    db.prepare('DELETE FROM history_fts_map').run();
  });

  ipcMain.handle(IPC.HISTORY_SEARCH, (_event, query: string) => {
    const db = getDatabase();
    // Search by URL and title with LIKE for simplicity; FTS5 for full-text later
    const pattern = `%${query}%`;
    return db.prepare('SELECT * FROM history WHERE url LIKE ? OR title LIKE ? ORDER BY last_visited_at DESC LIMIT 50').all(pattern, pattern);
  });
}
