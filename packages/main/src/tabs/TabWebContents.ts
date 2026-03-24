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

// ── Visibility ──────────────────────────────────────────────────────────

export function showTabView(tabId: string): void {
  for (const [id, view] of tabViews) {
    view.setVisible(id === tabId);
  }
}

export function hideAllTabViews(): void {
  for (const view of tabViews.values()) {
    view.setVisible(false);
  }
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
  for (const view of tabViews.values()) {
    resizeView(view, mainWindow);
  }
}
