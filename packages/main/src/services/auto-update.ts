import { BrowserWindow, app } from 'electron';

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  // Only run auto-updater in packaged builds
  if (!app.isPackaged) return;

  try {
    const { autoUpdater } = require('electron-updater');

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info: any) => {
      mainWindow.webContents.send('update:available', info);
    });

    autoUpdater.on('update-downloaded', (info: any) => {
      mainWindow.webContents.send('update:downloaded', info);
      // Show a native dialog to prompt restart
      const { dialog } = require('electron');
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `OS Browser v${info.version} is ready to install.`,
        detail: 'The update will be applied when you restart the browser.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
      }).then((result: any) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    autoUpdater.on('error', () => {
      // Silently fail — updates are not critical
    });

    // Check for updates every 6 hours
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 6 * 60 * 60 * 1000);

    // Initial check after 30 seconds
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 30000);
  } catch {
    // electron-updater not available — skip
  }
}
