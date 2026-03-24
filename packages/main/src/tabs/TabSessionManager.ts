import { getDatabase } from '../db/database';
import { TabManager } from './TabManager';

export class TabSessionManager {
  private saveInterval: NodeJS.Timeout | null = null;

  /** Start auto-saving every 30 seconds */
  startAutoSave(tabManager: TabManager): void {
    this.saveInterval = setInterval(() => {
      this.save(tabManager);
    }, 30000);
  }

  stopAutoSave(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

  /** Save current tab state to session_data table */
  save(tabManager: TabManager): void {
    const db = getDatabase();
    const state = tabManager.getState();
    const sessionData = {
      tabs: state.tabs.map(t => ({
        url: t.url,
        title: t.title,
        position: t.position,
        is_pinned: t.is_pinned,
        group_id: t.group_id,
        favicon_path: t.favicon_path,
      })),
      groups: state.groups,
      cleanExit: false,
      savedAt: new Date().toISOString(),
    };

    const existing = db.prepare('SELECT * FROM session_data WHERE key = ?').get('last_session');
    if (existing) {
      db.prepare('UPDATE session_data SET value = ?, updated_at = ? WHERE key = ?').run(
        JSON.stringify(sessionData),
        new Date().toISOString(),
        'last_session',
      );
    } else {
      db.prepare('INSERT INTO session_data (key, value, updated_at) VALUES (?, ?, ?)').run(
        'last_session',
        JSON.stringify(sessionData),
        new Date().toISOString(),
      );
    }
  }

  /** Mark that the app exited cleanly */
  markCleanExit(): void {
    const db = getDatabase();
    const raw = db.prepare('SELECT * FROM session_data WHERE key = ?').get('last_session') as any;
    if (!raw) return;
    try {
      const data = JSON.parse(raw.value);
      data.cleanExit = true;
      db.prepare('UPDATE session_data SET value = ? WHERE key = ?').run(
        JSON.stringify(data),
        'last_session',
      );
    } catch {
      // Ignore parse errors
    }
  }

  /** Restore session data (returns null if no session found) */
  restore(): { tabs: any[]; groups: any[]; wasClean: boolean } | null {
    const db = getDatabase();
    const raw = db.prepare('SELECT * FROM session_data WHERE key = ?').get('last_session') as any;
    if (!raw?.value) return null;
    try {
      const data = JSON.parse(raw.value);
      return {
        tabs: data.tabs || [],
        groups: data.groups || [],
        wasClean: !!data.cleanExit,
      };
    } catch {
      return null;
    }
  }
}
