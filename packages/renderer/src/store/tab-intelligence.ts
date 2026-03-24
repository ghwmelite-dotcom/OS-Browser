import { create } from 'zustand';

// ── Types ────────────────────────────────────────────────────────────
export interface SnoozedTab {
  id: string;
  url: string;
  title: string;
  wakeAt: number;
}

export interface TabGroup {
  domain: string;
  color: string;
  tabIds: string[];
}

interface TabIntelligenceState {
  snoozedTabs: SnoozedTab[];
  tabGroups: TabGroup[];
  showTabSearch: boolean;
  snoozeTab: (tabId: string, url: string, title: string, wakeAt: number) => void;
  cancelSnooze: (id: string) => void;
  checkSnoozedTabs: () => SnoozedTab[];
  computeGroups: (tabs: Array<{ id: string; url: string }>) => void;
  toggleTabSearch: () => void;
  getDuplicates: (tabs: Array<{ id: string; url: string }>) => string[][];
}

// ── Helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'os-browser-snoozed-tabs';

function loadSnoozed(): SnoozedTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function persistSnoozed(tabs: SnoozedTab[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // quota exceeded
  }
}

/** Hash a hostname string to a consistent HSL hue (0-360). */
function hostnameToHue(hostname: string): number {
  let hash = 0;
  for (let i = 0; i < hostname.length; i++) {
    hash = ((hash << 5) - hash + hostname.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ── Store ────────────────────────────────────────────────────────────
export const useTabIntelligenceStore = create<TabIntelligenceState>((set, get) => ({
  snoozedTabs: loadSnoozed(),
  tabGroups: [],
  showTabSearch: false,

  snoozeTab: (tabId, url, title, wakeAt) => {
    const entry: SnoozedTab = { id: tabId, url, title, wakeAt };
    set(s => {
      const next = [...s.snoozedTabs.filter(t => t.id !== tabId), entry];
      persistSnoozed(next);
      return { snoozedTabs: next };
    });
  },

  cancelSnooze: (id) => {
    set(s => {
      const next = s.snoozedTabs.filter(t => t.id !== id);
      persistSnoozed(next);
      return { snoozedTabs: next };
    });
  },

  checkSnoozedTabs: () => {
    const now = Date.now();
    const { snoozedTabs } = get();
    const waking = snoozedTabs.filter(t => t.wakeAt <= now);
    if (waking.length > 0) {
      const remaining = snoozedTabs.filter(t => t.wakeAt > now);
      persistSnoozed(remaining);
      set({ snoozedTabs: remaining });
    }
    return waking;
  },

  computeGroups: (tabs) => {
    const byDomain = new Map<string, string[]>();
    for (const tab of tabs) {
      const domain = getDomain(tab.url);
      const existing = byDomain.get(domain) || [];
      existing.push(tab.id);
      byDomain.set(domain, existing);
    }
    const groups: TabGroup[] = Array.from(byDomain.entries()).map(([domain, tabIds]) => ({
      domain,
      color: `hsl(${hostnameToHue(domain)}, 65%, 55%)`,
      tabIds,
    }));
    set({ tabGroups: groups });
  },

  toggleTabSearch: () => {
    set(s => ({ showTabSearch: !s.showTabSearch }));
  },

  getDuplicates: (tabs) => {
    const byUrl = new Map<string, string[]>();
    for (const tab of tabs) {
      const key = tab.url.replace(/\/$/, ''); // normalize trailing slash
      const existing = byUrl.get(key) || [];
      existing.push(tab.id);
      byUrl.set(key, existing);
    }
    return Array.from(byUrl.values()).filter(group => group.length > 1);
  },
}));
