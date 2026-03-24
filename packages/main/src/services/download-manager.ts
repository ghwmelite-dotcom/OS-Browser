import { app, session, ipcMain, BrowserWindow, dialog } from 'electron';
import path from 'path';
import crypto from 'crypto';

// ── Types ────────────────────────────────────────────────────────────
interface TrackedDownload {
  id: string;
  url: string;
  filename: string;
  savePath: string;
  totalBytes: number;
  receivedBytes: number;
  state: 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  speed: number; // bytes/sec
  startedAt: number;
  /** Reference to Electron DownloadItem — NOT sent over IPC */
  _item?: Electron.DownloadItem;
  /** Rolling speed samples for 3-second average */
  _speedSamples: { bytes: number; time: number }[];
}

type DownloadSerialized = Omit<TrackedDownload, '_item' | '_speedSamples'>;

const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.msi', '.scr', '.com', '.vbs', '.wsf'];
const PROGRESS_INTERVAL_MS = 500;

// ── Singleton ────────────────────────────────────────────────────────
let instance: DownloadManager | null = null;

class DownloadManager {
  private downloads = new Map<string, TrackedDownload>();
  private mainWindow: BrowserWindow;
  private progressTimers = new Map<string, NodeJS.Timeout>();

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.hookSession();
    this.registerIPC();
  }

  // ── Electron session hook ────────────────────────────────────────
  private hookSession(): void {
    session.defaultSession.on('will-download', (event, item, _webContents) => {
      const filename = item.getFilename();
      const url = item.getURL();
      const ext = path.extname(filename).toLowerCase();

      // Dangerous extension warning
      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        const choice = dialog.showMessageBoxSync(this.mainWindow, {
          type: 'warning',
          buttons: ['Download Anyway', 'Cancel'],
          defaultId: 1,
          title: 'Potentially Dangerous File',
          message: `"${filename}" is an executable file that could harm your computer.`,
          detail: `Source: ${url}\n\nOnly download files from sources you trust.`,
        });

        if (choice === 1) {
          event.preventDefault();
          this.send('download:blocked', { filename, reason: 'dangerous-extension' });
          return;
        }
      }

      // HTTPS enforcement
      if (!url.startsWith('https://') && !url.startsWith('file://') && !url.startsWith('blob:')) {
        this.send('download:blocked', { filename, reason: 'insecure-source' });
        event.preventDefault();
        return;
      }

      const id = crypto.randomUUID();
      const totalBytes = item.getTotalBytes();

      const tracked: TrackedDownload = {
        id,
        url,
        filename,
        savePath: item.getSavePath() || path.join(app.getPath('downloads'), filename),
        totalBytes,
        receivedBytes: 0,
        state: 'downloading',
        speed: 0,
        startedAt: Date.now(),
        _item: item,
        _speedSamples: [{ bytes: 0, time: Date.now() }],
      };

      this.downloads.set(id, tracked);
      this.send('download:started', this.serialize(tracked));

      // Start throttled progress updates
      this.startProgressTimer(id);

      item.on('updated', (_event, state) => {
        const dl = this.downloads.get(id);
        if (!dl) return;

        dl.receivedBytes = item.getReceivedBytes();
        dl.totalBytes = item.getTotalBytes(); // can change for chunked transfers

        if (state === 'interrupted') {
          dl.state = 'paused';
        } else {
          dl.state = item.isPaused() ? 'paused' : 'downloading';
        }

        // Record speed sample
        dl._speedSamples.push({ bytes: dl.receivedBytes, time: Date.now() });
        // Keep only last 3 seconds of samples
        const cutoff = Date.now() - 3000;
        dl._speedSamples = dl._speedSamples.filter(s => s.time >= cutoff);
        dl.speed = this.calcSpeed(dl._speedSamples);
      });

      item.once('done', (_event, state) => {
        const dl = this.downloads.get(id);
        if (!dl) return;

        this.stopProgressTimer(id);
        dl.savePath = item.getSavePath();
        dl.receivedBytes = item.getReceivedBytes();

        if (state === 'completed') {
          dl.state = 'completed';
          dl.speed = 0;
          this.send('download:complete', this.serialize(dl));
        } else {
          dl.state = state === 'cancelled' ? 'cancelled' : 'failed';
          dl.speed = 0;
          this.send('download:failed', this.serialize(dl));
        }

        // Remove internal reference to free memory
        dl._item = undefined;
      });
    });
  }

  // ── IPC handlers ─────────────────────────────────────────────────
  private registerIPC(): void {
    ipcMain.handle('download:list', () => {
      return Array.from(this.downloads.values()).map(d => this.serialize(d));
    });

    ipcMain.handle('download:pause', (_e, id: string) => {
      const dl = this.downloads.get(id);
      if (dl?._item && dl.state === 'downloading') {
        dl._item.pause();
        dl.state = 'paused';
        dl.speed = 0;
        this.sendProgress(dl);
      }
    });

    ipcMain.handle('download:resume', (_e, id: string) => {
      const dl = this.downloads.get(id);
      if (dl?._item && dl.state === 'paused') {
        if (dl._item.canResume()) {
          dl._item.resume();
          dl.state = 'downloading';
          dl._speedSamples = [{ bytes: dl.receivedBytes, time: Date.now() }];
          this.startProgressTimer(id);
          this.sendProgress(dl);
        }
      }
    });

    ipcMain.handle('download:cancel', (_e, id: string) => {
      const dl = this.downloads.get(id);
      if (dl?._item && (dl.state === 'downloading' || dl.state === 'paused')) {
        dl._item.cancel();
        dl.state = 'cancelled';
        dl.speed = 0;
        this.stopProgressTimer(id);
        this.send('download:failed', this.serialize(dl));
        dl._item = undefined;
      }
    });

    ipcMain.handle('download:retry', (_e, id: string) => {
      const dl = this.downloads.get(id);
      if (dl && (dl.state === 'failed' || dl.state === 'cancelled')) {
        // Re-trigger download by navigating the main window to the URL
        // Electron will fire will-download again
        this.downloads.delete(id);
        this.mainWindow.webContents.downloadURL(dl.url);
      }
    });

    ipcMain.handle('download:clear-completed', () => {
      for (const [id, dl] of this.downloads) {
        if (dl.state === 'completed' || dl.state === 'cancelled' || dl.state === 'failed') {
          this.downloads.delete(id);
        }
      }
      // Send updated list
      this.send('download:started', null); // trigger re-fetch in renderer
    });
  }

  // ── Speed calculation (rolling 3s average) ───────────────────────
  private calcSpeed(samples: { bytes: number; time: number }[]): number {
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = (last.time - first.time) / 1000;
    if (dt <= 0) return 0;
    return Math.round((last.bytes - first.bytes) / dt);
  }

  // ── Throttled progress timer ─────────────────────────────────────
  private startProgressTimer(id: string): void {
    if (this.progressTimers.has(id)) return;
    const timer = setInterval(() => {
      const dl = this.downloads.get(id);
      if (!dl || dl.state !== 'downloading') {
        this.stopProgressTimer(id);
        return;
      }
      this.sendProgress(dl);
    }, PROGRESS_INTERVAL_MS);
    this.progressTimers.set(id, timer);
  }

  private stopProgressTimer(id: string): void {
    const timer = this.progressTimers.get(id);
    if (timer) {
      clearInterval(timer);
      this.progressTimers.delete(id);
    }
  }

  private sendProgress(dl: TrackedDownload): void {
    this.send('download:progress', this.serialize(dl));
  }

  // ── Helpers ──────────────────────────────────────────────────────
  private serialize(dl: TrackedDownload): DownloadSerialized {
    const eta =
      dl.speed > 0 && dl.totalBytes > 0
        ? Math.round((dl.totalBytes - dl.receivedBytes) / dl.speed)
        : 0;

    return {
      id: dl.id,
      url: dl.url,
      filename: dl.filename,
      savePath: dl.savePath,
      totalBytes: dl.totalBytes,
      receivedBytes: dl.receivedBytes,
      state: dl.state,
      speed: dl.speed,
      startedAt: dl.startedAt,
    };
  }

  private send(channel: string, data: any): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

// ── Public API ──────────────────────────────────────────────────────
export function initDownloadManager(mainWindow: BrowserWindow): void {
  if (instance) return;
  instance = new DownloadManager(mainWindow);
}

export function getDownloadManager(): DownloadManager | null {
  return instance;
}
