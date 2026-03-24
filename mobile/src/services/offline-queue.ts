/* ------------------------------------------------------------------ */
/*  Offline Message Queue                                              */
/*  Queues messages when offline, auto-sends when connection returns   */
/* ------------------------------------------------------------------ */

import { matrixSendMessage, matrixUploadMedia, matrixSendFile, matrixSendVoiceNote } from '../api';

export interface QueuedMessage {
  id: string;
  roomId: string;
  body: string;
  type: 'text' | 'file' | 'voice';
  timestamp: number;
  file?: { name: string; mimeType: string; size: number };
  voiceMeta?: { duration: number; waveform: number[] };
  /** Stored as base64 for localStorage persistence */
  fileBase64?: string;
}

const STORAGE_KEY = 'os_mobile_offline_queue';

class OfflineQueue {
  private queue: QueuedMessage[] = [];
  private processing = false;
  private listeners: Array<() => void> = [];

  constructor() {
    this.load();
    window.addEventListener('online', () => this.flush());
  }

  /** Subscribe to queue changes */
  onChange(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  enqueue(msg: Omit<QueuedMessage, 'id' | 'timestamp'>): string {
    const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const queued: QueuedMessage = {
      ...msg,
      id,
      timestamp: Date.now(),
    };
    this.queue.push(queued);
    this.save();
    this.notify();
    return id;
  }

  async flush(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const msg = this.queue[0];
      try {
        if (msg.type === 'text') {
          await matrixSendMessage(msg.roomId, msg.body);
        } else if (msg.type === 'file' && msg.fileBase64 && msg.file) {
          const blob = base64ToBlob(msg.fileBase64, msg.file.mimeType);
          const contentUri = await matrixUploadMedia(blob, msg.file.name);
          await matrixSendFile(msg.roomId, contentUri, msg.file.name, msg.file.mimeType, msg.file.size);
        } else if (msg.type === 'voice' && msg.fileBase64 && msg.voiceMeta) {
          const blob = base64ToBlob(msg.fileBase64, 'audio/webm');
          const contentUri = await matrixUploadMedia(blob, 'voice-message.ogg');
          await matrixSendVoiceNote(
            msg.roomId, contentUri,
            msg.voiceMeta.duration, msg.voiceMeta.waveform,
            'audio/webm', blob.size,
          );
        }

        // Success — remove from queue
        this.queue.shift();
        this.save();
        this.notify();
      } catch {
        // Stop processing on failure — will retry when online again
        break;
      }
    }

    this.processing = false;
  }

  remove(id: string): void {
    this.queue = this.queue.filter(m => m.id !== id);
    this.save();
    this.notify();
  }

  getForRoom(roomId: string): QueuedMessage[] {
    return this.queue.filter(m => m.roomId === roomId);
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch { /* ignore corrupt data */ }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch { /* storage full — ignore */ }
  }

  get pending(): number {
    return this.queue.length;
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

export const offlineQueue = new OfflineQueue();
