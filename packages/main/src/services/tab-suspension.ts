import { BrowserWindow } from 'electron';
import { getDatabase } from '../db/database';
import { getAllTabViews, getTabView, destroyTabView } from '../tabs/TabWebContents';

// ── Config ──────────────────────────────────────────────────────
const CHECK_INTERVAL_MS = 60_000;        // Check every 60s
const SUSPEND_AFTER_MS = 15 * 60_000;    // Suspend after 15min inactive
const MIN_TABS_FOR_SUSPEND = 5;          // Only suspend when 5+ tabs open

// ── State ───────────────────────────────────────────────────────
let interval: NodeJS.Timeout | null = null;
let mainWindowRef: BrowserWindow | null = null;
const suspendedTabs = new Map<string, { url: string; memorySavedBytes: number; suspendedAt: number }>();
let excludedDomains: string[] = [];

// ── Init ────────────────────────────────────────────────────────
export function initMemorySaver(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;
  // Load excluded domains from DB
  loadExcludedDomains();
  interval = setInterval(checkAndSuspend, CHECK_INTERVAL_MS);
}

export function stopMemorySaver(): void {
  if (interval) { clearInterval(interval); interval = null; }
}

// ── Core logic ──────────────────────────────────────────────────
async function checkAndSuspend(): Promise<void> {
  if (!mainWindowRef) return;
  const tabViews = getAllTabViews();
  if (tabViews.size < MIN_TABS_FOR_SUSPEND) return;

  const db = getDatabase();
  const now = Date.now();
  const tabs = db.prepare('SELECT id, url, last_accessed_at, is_active, is_pinned FROM tabs ORDER BY last_accessed_at ASC').all() as any[];

  for (const tab of tabs) {
    // Skip: active, pinned, already suspended, internal pages
    if (tab.is_active || tab.is_pinned || suspendedTabs.has(tab.id)) continue;
    if (!tab.url || tab.url.startsWith('os-browser://')) continue;

    // Skip excluded domains
    try {
      const domain = new URL(tab.url).hostname;
      if (excludedDomains.some(d => domain === d || domain.endsWith('.' + d))) continue;
    } catch {}

    const lastAccessed = new Date(tab.last_accessed_at).getTime();
    if (now - lastAccessed < SUSPEND_AFTER_MS) continue;

    const view = getTabView(tab.id);
    if (!view) continue;

    // Capture memory usage before destroying
    let memoryBytes = 0;
    try {
      const info = await view.webContents.getProcessMemoryInfo();
      memoryBytes = (info.private || 0) * 1024; // Convert KB to bytes
    } catch {}

    // Destroy the view
    destroyTabView(tab.id, mainWindowRef);
    suspendedTabs.set(tab.id, {
      url: tab.url,
      memorySavedBytes: memoryBytes,
      suspendedAt: now,
    });

    // Notify renderer
    mainWindowRef.webContents.send('tab:suspended', {
      id: tab.id,
      memorySavedBytes: memoryBytes,
    });
  }
}

// ── Queries ─────────────────────────────────────────────────────
export function isTabSuspended(tabId: string): boolean {
  return suspendedTabs.has(tabId);
}

export function getTabSuspendInfo(tabId: string): { memorySavedBytes: number; suspendedAt: number } | null {
  return suspendedTabs.get(tabId) || null;
}

export function markTabRestored(tabId: string): void {
  suspendedTabs.delete(tabId);
}

export function getTotalMemorySaved(): number {
  let total = 0;
  for (const info of suspendedTabs.values()) total += info.memorySavedBytes;
  return total;
}

export function getSuspendedTabCount(): number {
  return suspendedTabs.size;
}

// ── Exclude list ────────────────────────────────────────────────
function loadExcludedDomains(): void {
  const db = getDatabase();
  try {
    const rows = db.prepare('SELECT * FROM memory_saver_excludes').all() as any[];
    excludedDomains = rows.map((r: any) => r.domain);
  } catch {
    excludedDomains = [];
  }
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
