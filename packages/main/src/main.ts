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

  mainWindow = new BrowserWindow({
    x: state?.x ?? 100,
    y: state?.y ?? 100,
    width: state?.width ?? 1280,
    height: state?.height ?? 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0c0e14',
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

  // Register IPC handlers
  registerAllHandlers(mainWindow);

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
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
