import { app, BrowserWindow, Menu, MenuItem, clipboard, screen, dialog, Notification, nativeImage, ipcMain } from 'electron';
import path from 'path';
import { initDatabase, getDatabase, closeDatabase, runMigrations } from './db/database';
import { seedDatabase } from './db/seed';
import { registerAllHandlers } from './ipc/handlers';
import { initAutoUpdater } from './services/auto-update';
import { stopConnectivityMonitor } from './net/connectivity';
import { stopTabSuspension } from './services/tab-suspension';
import { AdBlockService, setAdBlockService } from './services/adblock-engine';

let mainWindow: BrowserWindow | null = null;
const adBlockService = new AdBlockService();
setAdBlockService(adBlockService);

function getWindowState() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM window_state WHERE id = 1').get() as any;
}

function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const db = getDatabase();
  db.prepare(`
    UPDATE window_state SET
      x = ?, y = ?, width = ?, height = ?,
      is_maximized = ?, is_fullscreen = ?,
      updated_at = datetime('now')
    WHERE id = 1
  `).run(
    bounds.x, bounds.y, bounds.width, bounds.height,
    mainWindow.isMaximized() ? 1 : 0,
    mainWindow.isFullScreen() ? 1 : 0,
  );
}

function createWindow() {
  const state = getWindowState();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;

  // Smart default sizing based on screen resolution:
  // - Use 85% of screen width/height for a balanced initial window
  // - Minimum 1024x600 for usability
  // - Cap at screen size minus some margin
  const defaultWidth = Math.max(1024, Math.min(Math.round(screenW * 0.85), screenW - 80));
  const defaultHeight = Math.max(600, Math.min(Math.round(screenH * 0.85), screenH - 60));
  // Center on screen if no saved position
  const defaultX = Math.round((screenW - defaultWidth) / 2);
  const defaultY = Math.round((screenH - defaultHeight) / 2);

  mainWindow = new BrowserWindow({
    x: state?.x ?? defaultX,
    y: state?.y ?? defaultY,
    width: state?.width ?? defaultWidth,
    height: state?.height ?? defaultHeight,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#fce8c8', // Light mode default
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload', 'dist', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    },
  });

  if (state?.is_maximized) {
    mainWindow.maximize();
  }

  // Fix: frameless windows on Windows overlap the taskbar when maximized.
  // Constrain the maximized bounds to the display's work area.
  mainWindow.on('maximize', () => {
    setTimeout(() => {
      if (!mainWindow || !mainWindow.isMaximized()) return;
      const display = screen.getDisplayMatching(mainWindow.getBounds());
      const { x, y, width, height } = display.workArea;
      mainWindow.setBounds({ x, y, width, height });
    }, 50);
  });

  // Right-click context menu for the browser chrome (UI layer)
  mainWindow.webContents.on('context-menu', (_e, params) => {
    const menu = new Menu();

    if (params.isEditable) {
      if (params.selectionText) {
        menu.append(new MenuItem({ role: 'cut' }));
        menu.append(new MenuItem({ role: 'copy' }));
      }
      menu.append(new MenuItem({ role: 'paste' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
    } else if (params.selectionText) {
      menu.append(new MenuItem({ role: 'copy' }));
    }

    if (params.linkURL) {
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Copy Link',
        click: () => {
          clipboard.writeText(params.linkURL);
        },
      }));
    }

    // Dev tools — only in development or explicit debug mode
    if (!app.isPackaged || process.env.OS_BROWSER_DEBUG === '1') {
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Inspect Element',
        click: () => {
          mainWindow?.webContents.inspectElement(params.x, params.y);
        },
      }));
    }

    if (menu.items.length > 0) {
      menu.popup();
    }
  });

  // Register IPC handlers
  registerAllHandlers(mainWindow);

  // Desktop notification handler
  ipcMain.handle('notification:show', (_event, data: { title: string; body: string; type?: string }) => {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: data.title,
        body: data.body,
        silent: false,
        icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
      });

      notification.on('click', () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          // Send event to renderer to navigate to the relevant feature
          mainWindow.webContents.send('notification:clicked', data);
        }
      });

      notification.show();
    }
  });

  // Taskbar badge handler (Windows overlay icon with count)
  ipcMain.handle('notification:badge', (_event, count: number) => {
    if (!mainWindow) return;
    if (count > 0) {
      // Create a small badge image with the count
      const badgeCanvas = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
        <circle cx="8" cy="8" r="8" fill="#CE1126"/>
        <text x="8" y="12" text-anchor="middle" fill="white" font-size="10" font-family="Arial" font-weight="bold">${count > 99 ? '99+' : count}</text>
      </svg>`;
      const badge = nativeImage.createFromBuffer(Buffer.from(badgeCanvas));
      mainWindow.setOverlayIcon(badge, `${count} notifications`);
    } else {
      mainWindow.setOverlayIcon(null, '');
    }
  });

  // Auto-updater — checks GitHub Releases for new versions
  initAutoUpdater(mainWindow);

  // Load renderer
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Fallback to built files if dev server isn't running
    mainWindow.webContents.on('did-fail-load', () => {
      mainWindow!.loadFile(
        path.join(__dirname, '..', '..', 'renderer', 'dist', 'index.html')
      );
    });
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '..', '..', 'renderer', 'dist', 'index.html')
    );
  }

  // Save window state on move/resize (debounced to avoid excessive disk writes)
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWindowState, 500);
  };
  mainWindow.on('resize', debouncedSave);
  mainWindow.on('move', debouncedSave);

  // Confirm close when multiple tabs are open
  mainWindow.on('close', (e) => {
    saveWindowState();

    const db = getDatabase();
    const tabCount = (db.prepare('SELECT COUNT(*) as count FROM tabs').get() as any)?.count || 0;

    if (tabCount > 1) {
      const choice = dialog.showMessageBoxSync(mainWindow!, {
        type: 'question',
        buttons: ['Close All Tabs', 'Cancel'],
        defaultId: 1,
        title: 'Close OS Browser?',
        message: `You have ${tabCount} tabs open.`,
        detail: 'Are you sure you want to close the browser? All open tabs will be closed.',
        cancelId: 1,
      });

      if (choice === 1) {
        e.preventDefault(); // Cancel the close
        return;
      }
    }
  });

  mainWindow.on('closed', () => {
    stopConnectivityMonitor();
    stopTabSuspension();
    adBlockService.destroy();
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await initDatabase();
  runMigrations();
  const db = getDatabase();
  seedDatabase(db);

  // Initialize ad blocker — wrapped in try-catch so browser always starts
  try {
    await adBlockService.initialize();
  } catch (err) {
    console.error('[AdBlock] Initialization failed, browser starting without ad blocking:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  app.quit();
});
