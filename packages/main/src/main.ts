import { app, BrowserWindow, Menu, MenuItem, clipboard, screen, dialog, Notification, nativeImage, ipcMain, desktopCapturer, session } from 'electron';
import path from 'path';
import { initDatabase, getDatabase, closeDatabase, runMigrations } from './db/database';
import { seedDatabase } from './db/seed';
import { registerAllHandlers } from './ipc/handlers';
import { initAutoUpdater } from './services/auto-update';
import { stopConnectivityMonitor } from './net/connectivity';
import { stopMemorySaver } from './services/tab-suspension';
import { AdBlockService, setAdBlockService } from './services/adblock-engine';
import { updateTrayTooltip } from './services/tray';
import { initProfileManager, getActiveProfileId, getProfileDataDir } from './services/profile-manager';
import { registerProfileHandlers } from './ipc/profiles';

let mainWindow: BrowserWindow | null = null;
const adBlockService = new AdBlockService();
setAdBlockService(adBlockService);

// Track URL passed via protocol (e.g. user clicks a link when OS Browser is default)
let pendingProtocolUrl: string | null = null;

// Single instance lock — if a second instance is opened with a URL, forward it to the first
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    // On Windows, the URL is the last argument
    const url = argv.find(a => a.startsWith('http://') || a.startsWith('https://'));
    if (url && mainWindow) {
      // createTabFromMain creates the tab in DB + WebContentsView and sends tabs:refresh
      const { createTabFromMain } = require('./ipc/tabs');
      if (typeof createTabFromMain === 'function') {
        createTabFromMain(mainWindow, url);
      }
    }
    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('[App] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[App] Uncaught exception:', err);
});

// On Windows, protocol URLs come as command line arguments
if (process.platform === 'win32') {
  const url = process.argv.find(a => a.startsWith('http://') || a.startsWith('https://'));
  if (url) pendingProtocolUrl = url;
}

// On macOS, protocol URLs come via open-url event
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    const { createTabFromMain } = require('./ipc/tabs');
    if (typeof createTabFromMain === 'function') {
      createTabFromMain(mainWindow, url);
    }
  } else {
    pendingProtocolUrl = url;
  }
});

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

  // Check if onboarding is still pending — if so, use Chrome-style centered window
  let isFirstLaunch = true;
  try {
    const db = getDatabase();
    const profile = db.prepare("SELECT onboarding_completed FROM user_profile WHERE id = 1").get() as any;
    isFirstLaunch = !profile || !profile.onboarding_completed;
  } catch {
    // Table/column may not exist yet on very first run — treat as first launch
  }

  // Chrome-style default: 1342×901, clamped to screen if smaller
  const defaultWidth = Math.min(1342, screenW - 80);
  const defaultHeight = Math.min(901, screenH - 60);
  const defaultX = Math.round((screenW - defaultWidth) / 2);
  const defaultY = Math.round((screenH - defaultHeight) / 2);

  // On first launch, always use the centered defaults regardless of saved state
  const useWidth = isFirstLaunch ? defaultWidth : (state?.width ?? defaultWidth);
  const useHeight = isFirstLaunch ? defaultHeight : (state?.height ?? defaultHeight);
  const useX = isFirstLaunch ? defaultX : (state?.x ?? defaultX);
  const useY = isFirstLaunch ? defaultY : (state?.y ?? defaultY);

  mainWindow = new BrowserWindow({
    x: useX,
    y: useY,
    width: useWidth,
    height: useHeight,
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

  // Only restore maximized state after onboarding is done
  if (!isFirstLaunch && state?.is_maximized) {
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
    stopMemorySaver();
    adBlockService.destroy();
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Initialize profile system (handles migration of existing data)
  initProfileManager();

  // Register profile IPC handlers before window creation
  registerProfileHandlers();

  // Initialize database scoped to the active profile's directory
  const activeId = getActiveProfileId();
  const profileDir = activeId ? getProfileDataDir(activeId) : undefined;
  await initDatabase(profileDir);
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

  // If the app was opened via a protocol URL, load it once the window is ready
  if (pendingProtocolUrl && mainWindow) {
    const urlToLoad = pendingProtocolUrl;
    pendingProtocolUrl = null;
    mainWindow.webContents.once('did-finish-load', () => {
      const { createTabFromMain } = require('./ipc/tabs');
      if (typeof createTabFromMain === 'function' && mainWindow) {
        createTabFromMain(mainWindow, urlToLoad);
      }
    });
  }

  // ── Referrer Policy Enforcement ──────────────────────────────────────
  // Strip full referrer for cross-origin requests, keep origin-only
  try {
    const OAUTH_REFERRER_EXEMPT = [
      'accounts.google.com', 'login.microsoftonline.com', 'login.live.com',
      'appleid.apple.com', 'github.com', 'auth0.com', 'facebook.com',
      'api.twitter.com', 'discord.com', 'slack.com',
    ];
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders };
      const refHeader = headers['Referer'] || headers['referer'];
      if (refHeader) {
        try {
          const ref = new URL(refHeader);
          const req = new URL(details.url);
          if (ref.hostname !== req.hostname) {
            // Don't strip referrer for OAuth flows — they need it for CSRF validation
            const isOAuth = OAUTH_REFERRER_EXEMPT.some(h => req.hostname === h || req.hostname.endsWith('.' + h));
            if (!isOAuth) {
              headers['Referer'] = ref.origin + '/';
              if (headers['referer']) headers['referer'] = ref.origin + '/';
            }
          }
        } catch { /* URL parsing failed — leave as-is */ }
      }
      callback({ requestHeaders: headers });
    });
  } catch (err) {
    console.error('[Privacy] Referrer policy setup failed:', err);
  }

  // ── Cross-Origin-Opener-Policy relaxation for OAuth popups ──────────
  // COOP headers block popup ↔ opener communication (window.closed, postMessage)
  // which breaks Google Sign-In, Microsoft login, and other OAuth flows.
  // Strip COOP (and COEP which can also block cross-origin auth) from responses.
  try {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = details.responseHeaders || {};
      // Remove all case variations of COOP/COEP headers
      // Electron may return headers in various casings
      const keysToRemove = Object.keys(headers).filter(k => {
        const lower = k.toLowerCase();
        return lower === 'cross-origin-opener-policy' ||
               lower === 'cross-origin-opener-policy-report-only' ||
               lower === 'cross-origin-embedder-policy' ||
               lower === 'cross-origin-embedder-policy-report-only';
      });
      for (const key of keysToRemove) {
        delete headers[key];
      }
      callback({ responseHeaders: headers });
    });
  } catch (err) {
    console.error('[Auth] COOP relaxation setup failed:', err);
  }

  // ── Permission Handlers (OAuth FedCM, media, notifications, etc.) ──
  // Grant permissions that web pages need for login flows and media access.
  // Electron blocks FedCM (identity-credentials-get) by default which breaks
  // Google Sign-In on sites like claude.ai. We allow it here.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const ALLOWED_PERMISSIONS = [
      'media',              // Camera/microphone
      'notifications',      // Desktop notifications
      'clipboard-read',     // Clipboard access
      'clipboard-sanitized-write',
      'fullscreen',         // Fullscreen API
      'pointerLock',        // Pointer lock for games
      'idle-detection',     // Idle detection API
      'identity-credentials-get', // FedCM — Google Sign-In, Microsoft login, etc.
      'window-management',  // Window placement API (PiP windows)
    ];
    if (ALLOWED_PERMISSIONS.includes(permission)) {
      callback(true);
    } else {
      // Log denied permissions for debugging
      console.log('[Permission] Denied:', permission);
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const ALLOWED_PERMISSIONS = [
      'media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write',
      'fullscreen', 'pointerLock', 'idle-detection', 'identity-credentials-get',
      'window-management',
    ];
    return ALLOWED_PERMISSIONS.includes(permission);
  });

  // ── Screen Capture support ──────────────────────────────────────────
  // Grant display media permission so the renderer can use getUserMedia
  // with a desktopCapturer source ID (sandbox blocks getDisplayMedia directly)
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      if (sources.length > 0) {
        callback({ video: sources[0] });
      } else {
        callback({});
      }
    });
  }, { useSystemPicker: true });

  // IPC handler to get available capture sources for a picker UI
  try {
    ipcMain.handle('recorder:get-sources', async () => {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 320, height: 180 },
      });
      return sources.map(s => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail.toDataURL(),
        appIcon: s.appIcon?.toDataURL() || null,
      }));
    });
  } catch { /* already registered */ }

  // Desktop notification handler — registered once outside createWindow to avoid duplicates
  try {
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
  } catch { /* already registered */ }

  // Taskbar badge handler — registered once outside createWindow to avoid duplicates
  try {
    ipcMain.handle('notification:badge', (_event, count: number) => {
      if (!mainWindow) return;
      if (count > 0) {
        // Flash taskbar to attract attention
        mainWindow.flashFrame(true);
        // Set the overlay text (Windows supports this)
        mainWindow.setTitle(`(${count}) OS Browser`);
      } else {
        mainWindow.flashFrame(false);
        mainWindow.setTitle('OS Browser');
      }
      // Clear any previous overlay icon
      mainWindow.setOverlayIcon(null, '');
      // Update tray tooltip with unread count
      updateTrayTooltip(count);
    });
  } catch { /* already registered */ }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  const { shutdownChangeDetector } = require('./services/change-detector');
  shutdownChangeDetector();
  closeDatabase();
  app.quit();
});
