import { BrowserWindow, WebContentsView } from 'electron';
import { getDatabase } from '../db/database';
import { TAB_SUSPEND_AFTER_MS, MAX_CONCURRENT_TABS } from '@os-browser/shared';

let interval: NodeJS.Timeout | null = null;
let tabViewsRef: Map<string, WebContentsView> | null = null;
let mainWindowRef: BrowserWindow | null = null;
const suspendedTabs = new Set<string>();

export function initTabSuspension(
  mainWindow: BrowserWindow,
  tabViews: Map<string, WebContentsView>
): void {
  mainWindowRef = mainWindow;
  tabViewsRef = tabViews;

  // Check every 60 seconds
  interval = setInterval(checkAndSuspend, 60000);
}

function checkAndSuspend(): void {
  if (!tabViewsRef || !mainWindowRef) return;

  const db = getDatabase();
  const now = Date.now();

  // Only suspend if we're over the concurrent tab limit
  if (tabViewsRef.size <= MAX_CONCURRENT_TABS) return;

  // Get all tabs sorted by last accessed time
  const tabs = db.prepare(
    'SELECT id, url, last_accessed_at, is_active FROM tabs ORDER BY last_accessed_at ASC'
  ).all() as any[];

  for (const tab of tabs) {
    // Don't suspend active tab or already-suspended tabs
    if (tab.is_active || suspendedTabs.has(tab.id)) continue;
    // Don't suspend new tab pages
    if (tab.url === 'os-browser://newtab') continue;

    const lastAccessed = new Date(tab.last_accessed_at).getTime();
    const inactive = now - lastAccessed;

    if (inactive > TAB_SUSPEND_AFTER_MS && tabViewsRef.has(tab.id)) {
      suspendTab(tab.id);

      // Stop if we're back under the limit
      if (tabViewsRef.size <= MAX_CONCURRENT_TABS) break;
    }
  }
}

function suspendTab(tabId: string): void {
  if (!tabViewsRef || !mainWindowRef) return;

  const view = tabViewsRef.get(tabId);
  if (!view) return;

  // Remove and destroy the view
  mainWindowRef.contentView.removeChildView(view);
  (view.webContents as any).destroy?.();
  tabViewsRef.delete(tabId);
  suspendedTabs.add(tabId);

  // Notify renderer
  mainWindowRef.webContents.send('tab:suspended', { id: tabId });
}

export function isTabSuspended(tabId: string): boolean {
  return suspendedTabs.has(tabId);
}

export function markTabRestored(tabId: string): void {
  suspendedTabs.delete(tabId);
}

export function stopTabSuspension(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
