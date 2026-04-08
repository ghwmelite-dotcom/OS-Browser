import { BrowserWindow } from 'electron';
import { getDatabase } from '../db/database';
import { getAllTabViews, getTabView, destroyTabView } from '../tabs/TabWebContents';

// ── Lifecycle States ──────────────────────────────────────────
export type TabLifecycleState = 'active' | 'throttled' | 'frozen' | 'discarded';

interface TabLifecycleInfo {
  state: TabLifecycleState;
  stateChangedAt: number;
  memorySavedBytes: number;
  savedScrollY?: number;
  savedFormData?: Record<string, string>;
}

// ── Config ────────────────────────────────────────────────────
const CHECK_INTERVAL_MS = 30_000;
const FREEZE_AFTER_MS = 5 * 60_000;
const DISCARD_AFTER_MS = 15 * 60_000;
const MIN_TABS_FOR_LIFECYCLE = 3;
const REACTIVATION_DEBOUNCE_MS = 30_000;

// ── State ─────────────────────────────────────────────────────
let interval: NodeJS.Timeout | null = null;
let mainWindowRef: BrowserWindow | null = null;
const tabStates = new Map<string, TabLifecycleInfo>();
let excludedDomains: string[] = [];

// ── Init / Stop ───────────────────────────────────────────────
export function initTabLifecycle(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;
  loadExcludedDomains();
  interval = setInterval(checkLifecycle, CHECK_INTERVAL_MS);
}

export function stopTabLifecycle(): void {
  if (interval) { clearInterval(interval); interval = null; }
}

// ── Core Check ────────────────────────────────────────────────
async function checkLifecycle(): Promise<void> {
  if (!mainWindowRef) return;
  const tabViews = getAllTabViews();
  if (tabViews.size < MIN_TABS_FOR_LIFECYCLE) return;

  const db = getDatabase();
  const now = Date.now();
  const tabs = db.prepare(
    'SELECT id, url, last_accessed_at, is_active, is_pinned FROM tabs ORDER BY last_accessed_at ASC'
  ).all() as any[];

  for (const tab of tabs) {
    if (tab.is_active || tab.is_pinned) continue;
    if (!tab.url || tab.url.startsWith('os-browser://')) continue;
    if (isDomainExcluded(tab.url)) continue;

    const lastAccessed = new Date(tab.last_accessed_at).getTime();
    const inactiveMs = now - lastAccessed;
    if (inactiveMs < REACTIVATION_DEBOUNCE_MS) continue;

    const currentState = tabStates.get(tab.id);

    // Tier 1: Throttle
    if (!currentState) {
      const view = getTabView(tab.id);
      if (view) {
        view.webContents.setBackgroundThrottling(true);
        tabStates.set(tab.id, { state: 'throttled', stateChangedAt: now, memorySavedBytes: 0 });
        mainWindowRef.webContents.send('tab:lifecycle-changed', { id: tab.id, state: 'throttled' });
      }
      continue;
    }

    // Tier 2: Freeze
    if (currentState.state === 'throttled' && inactiveMs >= FREEZE_AFTER_MS) {
      const view = getTabView(tab.id);
      if (view) {
        try { await view.webContents.executeJavaScript(`document.dispatchEvent(new Event('freeze'));`); } catch {}
        tabStates.set(tab.id, { ...currentState, state: 'frozen', stateChangedAt: now });
        mainWindowRef.webContents.send('tab:lifecycle-changed', { id: tab.id, state: 'frozen' });
      }
      continue;
    }

    // Tier 3: Discard
    if (currentState.state === 'frozen' && inactiveMs >= DISCARD_AFTER_MS) {
      const view = getTabView(tab.id);
      if (!view) continue;

      let savedScrollY = 0;
      let savedFormData: Record<string, string> = {};
      try { savedScrollY = await view.webContents.executeJavaScript('window.scrollY'); } catch {}
      try {
        savedFormData = await view.webContents.executeJavaScript(`
          (() => {
            const data = {};
            document.querySelectorAll('input, textarea, select').forEach((el, i) => {
              const key = el.id || el.name || 'field_' + i;
              data[key] = el.value || '';
            });
            return data;
          })()
        `);
      } catch {}

      let memoryBytes = 0;
      try {
        const info = await view.webContents.getProcessMemoryInfo();
        memoryBytes = (info.private || 0) * 1024;
      } catch {}

      destroyTabView(tab.id, mainWindowRef);
      tabStates.set(tab.id, { state: 'discarded', stateChangedAt: now, memorySavedBytes: memoryBytes, savedScrollY, savedFormData });
      mainWindowRef.webContents.send('tab:lifecycle-changed', { id: tab.id, state: 'discarded', memorySavedBytes: memoryBytes });
      mainWindowRef.webContents.send('tab:suspended', { id: tab.id, memorySavedBytes: memoryBytes });
    }
  }
}

// ── Reactivation ──────────────────────────────────────────────
export function reactivateTab(tabId: string): TabLifecycleInfo | null {
  const info = tabStates.get(tabId);
  if (!info) return null;

  if (info.state === 'frozen') {
    const view = getTabView(tabId);
    if (view) {
      try { view.webContents.executeJavaScript(`document.dispatchEvent(new Event('resume'));`); } catch {}
    }
  }

  tabStates.delete(tabId);
  if (mainWindowRef) {
    mainWindowRef.webContents.send('tab:lifecycle-changed', { id: tabId, state: 'active' });
    mainWindowRef.webContents.send('tab:restored', { id: tabId });
  }
  return info;
}

// ── Queries ───────────────────────────────────────────────────
export function getTabLifecycleState(tabId: string): TabLifecycleState {
  return tabStates.get(tabId)?.state || 'active';
}

export function getTabLifecycleInfo(tabId: string): TabLifecycleInfo | null {
  return tabStates.get(tabId) || null;
}

export function isTabDiscarded(tabId: string): boolean {
  return tabStates.get(tabId)?.state === 'discarded';
}

export function getTotalMemorySaved(): number {
  let total = 0;
  for (const info of tabStates.values()) total += info.memorySavedBytes;
  return total;
}

export function getDiscardedTabCount(): number {
  let count = 0;
  for (const info of tabStates.values()) { if (info.state === 'discarded') count++; }
  return count;
}

export function getSavedScrollPosition(tabId: string): number {
  return tabStates.get(tabId)?.savedScrollY || 0;
}

export function getSavedFormData(tabId: string): Record<string, string> {
  return tabStates.get(tabId)?.savedFormData || {};
}

// ── Exclude list ──────────────────────────────────────────────
function isDomainExcluded(url: string): boolean {
  try {
    const domain = new URL(url).hostname;
    return excludedDomains.some(d => domain === d || domain.endsWith('.' + d));
  } catch { return false; }
}

function loadExcludedDomains(): void {
  const db = getDatabase();
  try {
    const rows = db.prepare('SELECT * FROM memory_saver_excludes').all() as any[];
    excludedDomains = rows.map((r: any) => r.domain);
  } catch { excludedDomains = []; }
}

export function addExcludedDomain(domain: string): void {
  const db = getDatabase();
  const clean = domain.toLowerCase().replace(/^www\./, '');
  if (excludedDomains.includes(clean)) return;
  db.prepare('INSERT INTO memory_saver_excludes (domain, added_at) VALUES (?, ?)').run(clean, new Date().toISOString());
  excludedDomains.push(clean);
}

export function removeExcludedDomain(domain: string): void {
  const db = getDatabase();
  const clean = domain.toLowerCase().replace(/^www\./, '');
  db.prepare('DELETE FROM memory_saver_excludes WHERE domain = ?').run(clean);
  excludedDomains = excludedDomains.filter(d => d !== clean);
}

export function getExcludedDomains(): string[] {
  return [...excludedDomains];
}
