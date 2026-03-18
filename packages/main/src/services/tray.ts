import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function initTray(mainWindow: BrowserWindow): void {
  // Create a simple tray icon (1x1 pixel as fallback — real icon from assets/)
  const iconPath = path.join(__dirname, '..', '..', '..', 'assets', 'tray-icon.png');

  try {
    tray = new Tray(iconPath);
  } catch {
    // Fallback: create from empty image if icon not found
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
  }

  tray.setToolTip('OS Browser');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open OS Browser', click: () => mainWindow.show() },
    { label: 'New Tab', click: () => mainWindow.webContents.send('shortcut:new-tab') },
    { label: 'Notifications', click: () => {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('navigate:notifications');
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit(); } },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });
}

export function updateTrayTooltip(unreadCount: number): void {
  if (!tray) return;
  if (unreadCount > 0) {
    tray.setToolTip(`OS Browser — ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`);
  } else {
    tray.setToolTip('OS Browser');
  }
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
