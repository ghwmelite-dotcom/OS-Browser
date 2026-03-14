import { session, BrowserWindow, dialog } from 'electron';
import path from 'path';

const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.msi', '.scr', '.com', '.vbs', '.js', '.wsf'];

interface DownloadInfo {
  filename: string;
  url: string;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  isPaused: boolean;
}

const activeDownloads = new Map<string, DownloadInfo>();

export function initDownloadProtection(mainWindow: BrowserWindow): void {
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const filename = item.getFilename();
    const url = item.getURL();
    const ext = path.extname(filename).toLowerCase();

    // Warn on dangerous file types
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        buttons: ['Download Anyway', 'Cancel'],
        defaultId: 1,
        title: 'Potentially Dangerous File',
        message: `"${filename}" is an executable file that could harm your computer.`,
        detail: `Source: ${url}\n\nOnly download files from sources you trust.`,
      });

      if (choice === 1) {
        event.preventDefault();
        mainWindow.webContents.send('download:blocked', { filename, reason: 'dangerous-extension' });
        return;
      }
    }

    // Block non-HTTPS downloads (configurable)
    if (!url.startsWith('https://') && !url.startsWith('file://')) {
      mainWindow.webContents.send('download:blocked', { filename, reason: 'insecure-source' });
      event.preventDefault();
      return;
    }

    const downloadId = crypto.randomUUID();

    activeDownloads.set(downloadId, {
      filename,
      url,
      totalBytes: item.getTotalBytes(),
      receivedBytes: 0,
      state: 'progressing',
      isPaused: false,
    });

    mainWindow.webContents.send('download:started', { id: downloadId, filename, totalBytes: item.getTotalBytes() });

    item.on('updated', (_event, state) => {
      const info = activeDownloads.get(downloadId);
      if (info) {
        info.receivedBytes = item.getReceivedBytes();
        info.state = state as any;
        info.isPaused = item.isPaused();
        mainWindow.webContents.send('download:progress', {
          id: downloadId,
          receivedBytes: info.receivedBytes,
          totalBytes: info.totalBytes,
          state,
        });
      }
    });

    item.once('done', (_event, state) => {
      const info = activeDownloads.get(downloadId);
      if (info) {
        info.state = state as any;
        mainWindow.webContents.send('download:complete', {
          id: downloadId,
          filename,
          state,
          savePath: item.getSavePath(),
        });
        // Clean up after 30 seconds
        setTimeout(() => activeDownloads.delete(downloadId), 30000);
      }
    });
  });
}
