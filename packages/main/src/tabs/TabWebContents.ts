import { BrowserWindow, WebContentsView } from 'electron';

// ── Tab View Registry ───────────────────────────────────────────────────
// Single source of truth for all WebContentsView instances mapped to tab IDs.

const tabViews = new Map<string, WebContentsView>();

// ── Chrome height offsets ───────────────────────────────────────────────
// KenteCrown: 3px, TitleBar: 32px, TabBar: 36px, NavigationBar: 44px = 115px
// BookmarksBar: ~28px, KenteStatusBar: ~28px = 56px additional
// Total: 171px when all visible
const CHROME_TOP = 171;
// Kente Sidebar icon rail width (always visible on the left)
const CHROME_LEFT = 48;
// Bottom safety margin — prevents covering the Windows taskbar on maximize
const CHROME_BOTTOM = 2;

// ── View access ─────────────────────────────────────────────────────────

export function getTabView(tabId: string): WebContentsView | undefined {
  return tabViews.get(tabId);
}

export function getAllTabViews(): Map<string, WebContentsView> {
  return tabViews;
}

export function setTabView(tabId: string, view: WebContentsView): void {
  tabViews.set(tabId, view);
}

// ── View lifecycle ──────────────────────────────────────────────────────

export function createTabView(tabId: string, mainWindow: BrowserWindow): WebContentsView {
  const view = new WebContentsView();
  mainWindow.contentView.addChildView(view);
  resizeView(view, mainWindow);
  tabViews.set(tabId, view);
  return view;
}

export function destroyTabView(tabId: string, mainWindow: BrowserWindow): void {
  const view = tabViews.get(tabId);
  if (!view) return;
  mainWindow.contentView.removeChildView(view);
  (view.webContents as any).destroy?.();
  tabViews.delete(tabId);
}

export function detachTabView(tabId: string, sourceWindow: BrowserWindow): WebContentsView | undefined {
  const view = tabViews.get(tabId);
  if (!view) return undefined;
  sourceWindow.contentView.removeChildView(view);
  tabViews.delete(tabId);
  return view;
}

export function attachTabView(tabId: string, view: WebContentsView, targetWindow: BrowserWindow): void {
  targetWindow.contentView.addChildView(view);
  resizeView(view, targetWindow);
  tabViews.set(tabId, view);
}

// ── Visibility ──────────────────────────────────────────────────────────

let pipTabId: string | null = null;
let pipConsoleHandler: any = null;

export function showTabView(tabId: string, mainWindow?: BrowserWindow): void {
  for (const [id, view] of tabViews) {
    if (id === tabId) {
      view.setVisible(true);
    } else if (id === pipTabId) {
      // PiP tab stays visible in mini size — keep it on top
      view.setVisible(true);
      // Re-add as last child to ensure it renders above the active tab
      if (mainWindow) {
        try {
          mainWindow.contentView.removeChildView(view);
          mainWindow.contentView.addChildView(view);
        } catch {}
      }
    } else {
      view.setVisible(false);
    }
  }
}

export function hideAllTabViews(): void {
  for (const [id, view] of tabViews) {
    if (id === pipTabId) continue; // Keep PiP view visible
    view.setVisible(false);
  }
}

/**
 * Enter PiP mode: resize a tab's view to a small floating rectangle in the bottom-right.
 * The view stays visible and on top while the user browses other tabs.
 */
export function enterPiPMode(tabId: string, mainWindow: BrowserWindow): boolean {
  const view = tabViews.get(tabId);
  if (!view) return false;

  const [winW, winH] = mainWindow.getContentSize();
  const pipW = 400;
  const pipH = 225; // 16:9 aspect ratio
  const margin = 16;
  const x = winW - pipW - margin;
  const y = winH - pipH - margin - 30; // 30px above status bar
  view.setBounds({ x, y, width: pipW, height: pipH });
  view.setVisible(true);

  // Bring PiP view to front by re-adding it as the last child
  try {
    mainWindow.contentView.removeChildView(view);
    mainWindow.contentView.addChildView(view);
  } catch { /* view re-ordering failed — non-critical */ }

  // Inject close button overlay + "Back to tab" button into the PiP page
  try {
    view.webContents.executeJavaScript(`
      (function() {
        if (document.getElementById('__os-pip-controls')) return;
        const bar = document.createElement('div');
        bar.id = '__os-pip-controls';
        bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:32px;background:linear-gradient(rgba(0,0,0,0.7),transparent);z-index:999999;display:flex;align-items:center;justify-content:space-between;padding:4px 8px;pointer-events:auto;';

        const backBtn = document.createElement('button');
        backBtn.textContent = '← Back to tab';
        backBtn.style.cssText = 'background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:11px;padding:4px 10px;border-radius:4px;cursor:pointer;font-family:system-ui;';
        backBtn.onmouseover = function() { this.style.background = 'rgba(255,255,255,0.3)'; };
        backBtn.onmouseout = function() { this.style.background = 'rgba(255,255,255,0.15)'; };
        backBtn.onclick = function() { console.log('__OS_PIP_BACK_TO_TAB__'); };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:14px;width:24px;height:24px;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;';
        closeBtn.onmouseover = function() { this.style.background = 'rgba(239,68,68,0.8)'; };
        closeBtn.onmouseout = function() { this.style.background = 'rgba(255,255,255,0.15)'; };
        closeBtn.onclick = function() { console.log('__OS_PIP_CLOSE__'); };

        bar.appendChild(backBtn);
        bar.appendChild(closeBtn);
        document.body.appendChild(bar);
      })()
    `).catch(() => {});

    // Remove any existing PiP console listener before adding a new one
    if (pipConsoleHandler && view.webContents.listenerCount('console-message') > 0) {
      view.webContents.removeListener('console-message', pipConsoleHandler);
    }

    // Listen for close/back button clicks via console messages
    pipConsoleHandler = (_event: any, _level: number, message: string) => {
      if (message === '__OS_PIP_CLOSE__') {
        exitPiPMode(mainWindow);
      } else if (message === '__OS_PIP_BACK_TO_TAB__') {
        // Switch back to this tab — broadcast event to renderer
        exitPiPMode(mainWindow);
        mainWindow.webContents.send('pip:back-to-tab', tabId);
      }
    };
    view.webContents.on('console-message', pipConsoleHandler);
  } catch { /* PiP controls injection failed — non-critical */ }

  pipTabId = tabId;
  return true;
}

/**
 * Exit PiP mode: restore the tab's view to full size or hide it.
 */
export function exitPiPMode(mainWindow: BrowserWindow): void {
  if (!pipTabId) return;
  const view = tabViews.get(pipTabId);
  if (view) {
    // Remove PiP console-message listener
    if (pipConsoleHandler) {
      try { view.webContents.removeListener('console-message', pipConsoleHandler); } catch { /* view may be destroyed */ }
      pipConsoleHandler = null;
    }
    // Remove the injected PiP controls overlay
    try {
      view.webContents.executeJavaScript(`
        (function() { var el = document.getElementById('__os-pip-controls'); if (el) el.remove(); })()
      `).catch(() => {});
    } catch { /* view may be destroyed */ }
    view.setVisible(false);
    resizeView(view, mainWindow);
  }
  pipTabId = null;
}

export function getPipTabId(): string | null {
  return pipTabId;
}

// ── Sizing ──────────────────────────────────────────────────────────────

export function resizeView(view: WebContentsView, mainWindow: BrowserWindow): void {
  try {
    const [winW, winH] = mainWindow.getContentSize();
    const x = CHROME_LEFT;
    const y = CHROME_TOP;
    const w = Math.max(0, winW - x);
    const h = Math.max(0, winH - y - CHROME_BOTTOM);
    view.setBounds({ x, y, width: w, height: h });
  } catch (err) {
    console.error('[TabWebContents] resizeView failed:', err);
  }
}

export function resizeAllViews(mainWindow: BrowserWindow): void {
  for (const [id, view] of tabViews) {
    if (id === pipTabId) {
      // Re-position PiP in bottom-right of resized window
      const [winW, winH] = mainWindow.getContentSize();
      view.setBounds({ x: winW - 416, y: winH - 271, width: 400, height: 225 });
    } else {
      resizeView(view, mainWindow);
    }
  }
}
