import { BrowserWindow } from 'electron';
import { getDatabase } from '../db/database';
import { getConnectivityStatus } from '../net/connectivity';
import { aiRequest } from '../net/cloudflare';
import { IPC } from '@os-browser/shared';

let mainWindowRef: BrowserWindow | null = null;
let processing = false;

export function initOfflineQueue(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;
}

export function queueRequest(endpoint: string, payload: Record<string, any>, priority: number = 2): number {
  const db = getDatabase();
  const result = db.prepare(
    'INSERT INTO offline_queue (endpoint, payload_json, priority) VALUES (?, ?, ?)'
  ).run(endpoint, JSON.stringify(payload), priority);

  notifyQueueCount();
  return result.lastInsertRowid as number;
}

export function getQueueCount(): number {
  const db = getDatabase();
  return (db.prepare("SELECT COUNT(*) as count FROM offline_queue WHERE status = 'queued'").get() as any).count;
}

function notifyQueueCount(): void {
  mainWindowRef?.webContents.send(IPC.OFFLINE_QUEUE_STATUS, { count: getQueueCount() });
}

export async function processQueue(): Promise<void> {
  if (processing || getConnectivityStatus() === 'offline') return;
  processing = true;

  const db = getDatabase();

  try {
    const items = db.prepare(
      "SELECT * FROM offline_queue WHERE status = 'queued' ORDER BY priority ASC, created_at ASC LIMIT 10"
    ).all() as any[];

    for (const item of items) {
      if (getConnectivityStatus() === 'offline') break;

      db.prepare("UPDATE offline_queue SET status = 'processing' WHERE id = ?").run(item.id);

      try {
        const payload = JSON.parse(item.payload_json);
        await aiRequest(item.endpoint, payload);
        db.prepare("UPDATE offline_queue SET status = 'completed' WHERE id = ?").run(item.id);
      } catch (err) {
        const retries = item.retry_count + 1;
        if (retries >= 3) {
          db.prepare("UPDATE offline_queue SET status = 'failed', retry_count = ? WHERE id = ?").run(retries, item.id);
        } else {
          db.prepare("UPDATE offline_queue SET status = 'queued', retry_count = ? WHERE id = ?").run(retries, item.id);
        }
      }

      notifyQueueCount();
    }
  } finally {
    processing = false;
  }

  // Clean up completed items older than 1 hour
  db.prepare("DELETE FROM offline_queue WHERE status = 'completed' AND created_at < datetime('now', '-1 hour')").run();
}
