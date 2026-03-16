import { ipcMain, BrowserWindow, WebContentsView, nativeImage, net, Menu, MenuItem, clipboard, shell } from 'electron';
import { IPC } from '@os-browser/shared';
import { getDatabase } from '../db/database';
import crypto from 'crypto';
import path from 'path';
import { cachePage } from '../services/page-cache';
import { isTabSuspended, markTabRestored } from '../services/tab-suspension';

// Track which tabs have already had PWA detection run (once per page load)
const pwaDetectedTabs = new Set<string>();

const tabViews = new Map<string, WebContentsView>();

export function registerTabHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(IPC.TAB_CREATE, (_event, url?: string) => {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const tabUrl = url || 'os-browser://newtab';
    const position = (db.prepare('SELECT MAX(position) as max FROM tabs').get() as any)?.max + 1 || 0;

    db.prepare('UPDATE tabs SET is_active = 0 WHERE is_active = 1').run();
    db.prepare(
      'INSERT INTO tabs (id, title, url, position, is_active, last_accessed_at) VALUES (?, ?, ?, ?, 1, datetime("now"))'
    ).run(id, 'New Tab', tabUrl, position);

    // Only create a WebContentsView for real URLs — not internal os-browser:// pages
    // Internal pages (newtab, settings, etc.) are rendered by React in the renderer
    if (!tabUrl.startsWith('os-browser://')) {
      const view = new WebContentsView();
      mainWindow.contentView.addChildView(view);
      resizeViewToContent(view, mainWindow);
      setupViewEvents(view, id, mainWindow);
      view.webContents.loadURL(tabUrl);
      tabViews.set(id, view);
    }

    const title = tabUrl === 'os-browser://settings' ? 'Settings' : 'New Tab';
    return { id, title, url: tabUrl, position, is_pinned: false, is_active: true, is_muted: false, favicon_path: null, last_accessed_at: new Date().toISOString() };
  });

  ipcMain.handle(IPC.TAB_CLOSE, (_event, id: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM tabs WHERE id = ?').run(id);
    const view = tabViews.get(id);
    if (view) {
      mainWindow.contentView.removeChildView(view);
      (view.webContents as any).destroy?.();
      tabViews.delete(id);
    }
  });

  ipcMain.handle(IPC.TAB_SWITCH, (_event, id: string) => {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET is_active = 0').run();
    db.prepare('UPDATE tabs SET is_active = 1, last_accessed_at = datetime("now") WHERE id = ?').run(id);

    // Hide all views, show target
    for (const [viewId, view] of tabViews) {
      view.setVisible(viewId === id);
    }

    const tab = db.prepare('SELECT * FROM tabs WHERE id = ?').get(id) as any;
    // Only create WebContentsView for real URLs — not internal os-browser:// pages
    if (tab && tab.url && !tab.url.startsWith('os-browser://') && !tabViews.has(id)) {
      const view = new WebContentsView();
      mainWindow.contentView.addChildView(view);
      resizeViewToContent(view, mainWindow);
      setupViewEvents(view, id, mainWindow);
      view.webContents.loadURL(tab.url);
      tabViews.set(id, view);
      if (isTabSuspended(id)) {
        markTabRestored(id);
      }
    }

    // Hide all views when switching to an internal page
    if (tab && tab.url && tab.url.startsWith('os-browser://')) {
      for (const view of tabViews.values()) {
        view.setVisible(false);
      }
    }

    return tab;
  });

  ipcMain.handle(IPC.TAB_LIST, () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tabs ORDER BY position').all();
  });

  ipcMain.handle(IPC.TAB_NAVIGATE, (_event, id: string, url: string) => {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET url = ?, last_accessed_at = datetime("now") WHERE id = ?').run(url, id);

    // Don't create WebContentsView for internal pages
    if (url.startsWith('os-browser://')) return;

    let view = tabViews.get(id);
    if (!view) {
      view = new WebContentsView();
      mainWindow.contentView.addChildView(view);
      resizeViewToContent(view, mainWindow);
      setupViewEvents(view, id, mainWindow);
      tabViews.set(id, view);
    }
    view.setVisible(true);
    view.webContents.loadURL(url);
  });

  ipcMain.handle(IPC.TAB_GO_BACK, (_event, id: string) => {
    const view = tabViews.get(id);
    if (view?.webContents.canGoBack()) view.webContents.goBack();
  });

  ipcMain.handle(IPC.TAB_GO_FORWARD, (_event, id: string) => {
    const view = tabViews.get(id);
    if (view?.webContents.canGoForward()) view.webContents.goForward();
  });

  ipcMain.handle(IPC.TAB_RELOAD, (_event, id: string) => {
    const view = tabViews.get(id);
    view?.webContents.reload();
  });

  ipcMain.handle(IPC.TAB_STOP, (_event, id: string) => {
    const view = tabViews.get(id);
    view?.webContents.stop();
  });

  ipcMain.handle(IPC.TAB_UPDATE, (_event, id: string, data: any) => {
    const db = getDatabase();
    const allowed = ['title', 'url', 'favicon_path', 'is_pinned', 'is_muted', 'position'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;
    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => data[f]);
    db.prepare(`UPDATE tabs SET ${sets} WHERE id = ?`).run(...values, id);
  });

  ipcMain.handle('tab:print', (_event, id: string) => {
    const view = tabViews.get(id);
    if (view) {
      view.webContents.print({}, (success, failureReason) => {
        mainWindow.webContents.send('print:result', { success, failureReason });
      });
    }
  });

  ipcMain.handle('tab:print-to-pdf', async (_event, id: string) => {
    const view = tabViews.get(id);
    if (!view) return null;

    const { dialog } = require('electron');
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save as PDF',
      defaultPath: 'page.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (!filePath) return null;

    const data = await view.webContents.printToPDF({});
    const fs = require('fs');
    fs.writeFileSync(filePath, data);
    return filePath;
  });

  // PWA install handler — opens a standalone BrowserWindow for the PWA
  ipcMain.handle('pwa:install', async (_event, data: { name: string; startUrl: string; iconUrl: string }) => {
    const pwaWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: data.name,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Set the window icon if available
    if (data.iconUrl) {
      try {
        const response = await net.fetch(data.iconUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const icon = nativeImage.createFromBuffer(buffer);
        pwaWindow.setIcon(icon);
      } catch { /* icon fetch failed — use default */ }
    }

    pwaWindow.loadURL(data.startUrl);

    // Create a desktop shortcut (Windows)
    try {
      const { shell, app } = require('electron');
      const shortcutPath = path.join(
        app.getPath('appData'),
        'Microsoft/Windows/Start Menu/Programs',
        `${data.name}.lnk`
      );
      shell.writeShortcutLink(shortcutPath, {
        target: process.execPath,
        args: `--pwa-url="${data.startUrl}" --pwa-name="${data.name}"`,
        description: data.name,
      });
    } catch { /* shortcut creation failed — non-critical */ }

    return { success: true };
  });

  // Resize views when window resizes
  mainWindow.on('resize', () => {
    for (const view of tabViews.values()) {
      if (view.getVisible?.() !== false) {
        resizeViewToContent(view, mainWindow);
      }
    }
  });
}

function resizeViewToContent(view: WebContentsView, win: BrowserWindow): void {
  const bounds = win.getContentBounds();
  // Browser chrome heights (measured from actual components):
  // TitleBar: 32px, TabBar: 36px, NavigationBar: 44px, BookmarksBar: 28px, KenteStatusBar: 28px = 168px
  const topOffset = 168;
  // Kente Sidebar icon rail width = 48px (always visible on the left)
  const sidebarWidth = 48;
  const height = Math.max(100, bounds.height - topOffset);
  const width = Math.max(100, bounds.width - sidebarWidth);
  view.setBounds({ x: sidebarWidth, y: topOffset, width, height });
}

function setupViewEvents(view: WebContentsView, tabId: string, mainWindow: BrowserWindow): void {
  const wc = view.webContents;
  const db = getDatabase();

  // Right-click context menu
  wc.on('context-menu', (_e, params) => {
    const menu = new Menu();

    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Undo', role: 'undo' }));
      menu.append(new MenuItem({ label: 'Redo', role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
      menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
      menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
    } else {
      if (params.selectionText) {
        menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
        menu.append(new MenuItem({
          label: `Search Google for "${params.selectionText.substring(0, 30)}${params.selectionText.length > 30 ? '...' : ''}"`,
          click: () => {
            const q = encodeURIComponent(params.selectionText);
            mainWindow.webContents.send('tab:navigate-new', `https://www.google.com/search?q=${q}`);
          },
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      menu.append(new MenuItem({ label: 'Back', accelerator: 'Alt+Left', enabled: wc.canGoBack(), click: () => wc.goBack() }));
      menu.append(new MenuItem({ label: 'Forward', accelerator: 'Alt+Right', enabled: wc.canGoForward(), click: () => wc.goForward() }));
      menu.append(new MenuItem({ label: 'Reload', accelerator: 'Ctrl+R', click: () => wc.reload() }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Save Page As...', accelerator: 'Ctrl+S', click: () => wc.downloadURL(wc.getURL()) }));
      menu.append(new MenuItem({ label: 'Print...', accelerator: 'Ctrl+P', click: () => wc.print() }));
      menu.append(new MenuItem({ type: 'separator' }));

      if (params.linkURL) {
        menu.append(new MenuItem({
          label: 'Open Link in New Tab',
          click: () => mainWindow.webContents.send('tab:navigate-new', params.linkURL),
        }));
        menu.append(new MenuItem({
          label: 'Copy Link Address',
          click: () => clipboard.writeText(params.linkURL),
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      if (params.mediaType === 'image' && params.srcURL) {
        menu.append(new MenuItem({
          label: 'Copy Image Address',
          click: () => clipboard.writeText(params.srcURL),
        }));
        menu.append(new MenuItem({
          label: 'Open Image in New Tab',
          click: () => mainWindow.webContents.send('tab:navigate-new', params.srcURL),
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      menu.append(new MenuItem({
        label: 'Copy Page URL',
        click: () => clipboard.writeText(wc.getURL()),
      }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'View Page Source', accelerator: 'Ctrl+U', click: () => {
        mainWindow.webContents.send('tab:navigate-new', `view-source:${wc.getURL()}`);
      }}));
      menu.append(new MenuItem({ label: 'Inspect Element', accelerator: 'Ctrl+Shift+I', click: () => wc.openDevTools() }));
    }

    menu.popup({ window: mainWindow });
  });

  wc.on('page-title-updated', (_e, title) => {
    db.prepare('UPDATE tabs SET title = ? WHERE id = ?').run(title, tabId);
    mainWindow.webContents.send('tab:title-updated', { id: tabId, title });
  });

  wc.on('did-navigate', (_e, url) => {
    // Clear PWA detection for this tab so it re-checks on the new page
    for (const key of pwaDetectedTabs) {
      if (key.startsWith(`${tabId}:`)) pwaDetectedTabs.delete(key);
    }
    db.prepare('UPDATE tabs SET url = ? WHERE id = ?').run(url, tabId);
    mainWindow.webContents.send('tab:url-updated', { id: tabId, url, canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward() });

    // Record history
    db.prepare(`
      INSERT INTO history (url, title, last_visited_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(url) DO UPDATE SET visit_count = visit_count + 1, last_visited_at = datetime('now'), title = excluded.title
    `).run(url, '');
  });

  wc.on('did-navigate-in-page', (_e, url) => {
    mainWindow.webContents.send('tab:url-updated', { id: tabId, url, canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward() });
  });

  wc.on('did-start-loading', () => {
    mainWindow.webContents.send('tab:loading', { id: tabId, isLoading: true });
  });

  wc.on('did-stop-loading', () => {
    mainWindow.webContents.send('tab:loading', { id: tabId, isLoading: false });
  });

  wc.on('did-finish-load', async () => {
    try {
      const pageHtml = await wc.executeJavaScript('document.documentElement.outerHTML');
      const pageTitle = await wc.executeJavaScript('document.title');
      const pageUrl = wc.getURL();
      if (pageUrl && !pageUrl.startsWith('os-browser://')) {
        cachePage(pageUrl, pageHtml, pageTitle);
      }
    } catch { /* ignore errors from navigation */ }

  });

  // PWA manifest detection — runs after page fully loads
  // Uses a delay + retry because SPAs often inject <link rel="manifest"> after initial render
  // PWA detection — NO executeJavaScript (broken on WebContentsView)
  // Instead, directly fetch common manifest paths from the main process
  wc.on('did-finish-load', () => {
    const loadUrl = wc.getURL();
    if (!loadUrl || loadUrl.startsWith('os-browser://') || loadUrl.startsWith('about:') || loadUrl.startsWith('data:')) return;

    const detectionKey = `${tabId}:${loadUrl}`;
    if (pwaDetectedTabs.has(detectionKey)) return;
    pwaDetectedTabs.add(detectionKey);

    // Run after a short delay to not block page rendering
    setTimeout(async () => {
      // Log to renderer console so user can see debug output
      const logToRenderer = (msg: string) => {
        try { mainWindow.webContents.executeJavaScript(`console.log('[PWA]', ${JSON.stringify(msg)})`); } catch {}
      };

      try {
        const origin = new URL(loadUrl).origin;
        logToRenderer(`Checking ${origin} for manifest...`);

        const paths = ['/manifest.json', '/manifest.webmanifest', '/site.webmanifest'];
        let manifestJson: any = null;
        let manifestUrl = '';

        for (const p of paths) {
          try {
            const url = origin + p;
            const res = await net.fetch(url);
            logToRenderer(`${p} → ${res.status}`);
            if (res.ok) {
              const text = await res.text();
              try {
                const parsed = JSON.parse(text);
                if (parsed && (parsed.name || parsed.short_name)) {
                  manifestJson = parsed;
                  manifestUrl = url;
                  logToRenderer(`Found valid manifest: ${parsed.name}, display=${parsed.display}`);
                  break;
                }
              } catch { /* not valid JSON */ }
            }
          } catch (e: any) {
            logToRenderer(`${p} fetch error: ${e?.message || e}`);
          }
        }

        if (!manifestJson) {
          logToRenderer('No valid manifest found');
          return;
        }

        const display = manifestJson.display || '';
        if (!['standalone', 'fullscreen', 'minimal-ui'].includes(display)) {
          logToRenderer(`Not installable — display: ${display}`);
          return;
        }

        // Resolve icon
        let iconUrl: string | null = null;
        if (manifestJson.icons && manifestJson.icons.length > 0) {
          const icon = manifestJson.icons.find((i: any) => i.sizes === '192x192')
            || manifestJson.icons.find((i: any) => i.sizes === '512x512')
            || manifestJson.icons[manifestJson.icons.length - 1];
          try { iconUrl = new URL(icon.src, manifestUrl).href; } catch {}
        }

        logToRenderer(`Sending pwa:installable to renderer — ${manifestJson.name}`);
        mainWindow.webContents.send('pwa:installable', {
          tabId,
          name: manifestJson.name || manifestJson.short_name || 'Web App',
          shortName: manifestJson.short_name || manifestJson.name,
          description: manifestJson.description || '',
          iconUrl,
          startUrl: manifestJson.start_url ? new URL(manifestJson.start_url, loadUrl).href : loadUrl,
          display,
          url: loadUrl,
        });
      } catch { /* ignore */ }
    }, 500);
  });

  wc.on('page-favicon-updated', (_e, favicons) => {
    if (favicons.length > 0) {
      db.prepare('UPDATE tabs SET favicon_path = ? WHERE id = ?').run(favicons[0], tabId);
      mainWindow.webContents.send('tab:favicon-updated', { id: tabId, favicon: favicons[0] });
    }
  });
}

export function getTabViews(): Map<string, WebContentsView> {
  return tabViews;
}
