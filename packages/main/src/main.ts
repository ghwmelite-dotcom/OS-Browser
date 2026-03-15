import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initDatabase, getDatabase, closeDatabase, runMigrations } from './db/database';
import { seedDatabase } from './db/seed';
import { registerAllHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;

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
  const { screen } = require('electron');
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
    const { screen } = require('electron');
    const display = screen.getDisplayMatching(mainWindow!.getBounds());
    const { x, y, width, height } = display.workArea;
    mainWindow!.setBounds({ x, y, width, height });
  });

  // Register IPC handlers
  registerAllHandlers(mainWindow);

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

  // Save window state on move/resize
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('close', saveWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await initDatabase();
  runMigrations();
  const db = getDatabase();
  seedDatabase(db);

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
