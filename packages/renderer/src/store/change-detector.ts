import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────
export type WatchStatus = 'unchanged' | 'changed' | 'error' | 'pending';

export interface WatchEntry {
  id: string;
  url: string;
  interval: number;
  selector?: string;
  title?: string;
  createdAt: string;
  status: WatchStatus;
  lastChecked: string | null;
  lastHash: string | null;
  errorMessage?: string;
  unread: boolean;
}

export interface DiffLine {
  type: 'add' | 'remove' | 'same';
  text: string;
}

export interface DiffResult {
  lines: DiffLine[];
  summary: { added: number; removed: number; unchanged: number };
}

// ── Store ──────────────────────────────────────────────────────────────
interface ChangeDetectorState {
  watches: WatchEntry[];
  unreadCount: number;
  isLoading: boolean;
  viewingDiffId: string | null;
  currentDiff: DiffResult | null;

  // Actions
  init: () => () => void;
  loadWatches: () => Promise<void>;
  addWatch: (url: string, interval: number, selector?: string, title?: string) => Promise<void>;
  removeWatch: (id: string) => Promise<void>;
  checkNow: (id: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  viewDiff: (id: string) => Promise<void>;
  closeDiff: () => void;
  updateConfig: (id: string, config: { interval?: number; selector?: string; title?: string }) => Promise<void>;
  getUnreadCount: () => number;
}

export const useChangeDetectorStore = create<ChangeDetectorState>((set, get) => ({
  watches: [],
  unreadCount: 0,
  isLoading: false,
  viewingDiffId: null,
  currentDiff: null,

  init: () => {
    const api = (window as any).osBrowser?.watcher;
    if (!api) return () => {};

    // Load initial data
    get().loadWatches();

    // Listen for change-detected events from main process
    const unsub = api.onChangeDetected((data: any) => {
      // Reload watches to get updated status
      get().loadWatches();
    });

    return unsub;
  },

  loadWatches: async () => {
    const api = (window as any).osBrowser?.watcher;
    if (!api) return;

    set({ isLoading: true });
    try {
      const watches = await api.list();
      const unreadCount = Array.isArray(watches)
        ? watches.filter((w: WatchEntry) => w.unread).length
        : 0;
      set({ watches: watches || [], unreadCount, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addWatch: async (url, interval, selector, title) => {
    const api = (window as any).osBrowser?.watcher;
    if (!api) return;

    set({ isLoading: true });
    try {
      await api.add(url, interval, selector, title);
      await get().loadWatches();
    } catch {
      set({ isLoading: false });
    }
  },

  removeWatch: async (id) => {
    const api = (window as any).osBrowser?.watcher;
    if (!api) return;

    await api.remove(id);
    set(s => ({
      watches: s.watches.filter(w => w.id !== id),
      unreadCount: s.watches.filter(w => w.id !== id && w.unread).length,
      viewingDiffId: s.viewingDiffId === id ? null : s.viewingDiffId,
      currentDiff: s.viewingDiffId === id ? null : s.currentDiff,
    }));
  },

  checkNow: async (id) => {
    const api = (window as any).osBrowser?.watcher;
    if (!api) return;

    await api.checkNow(id);
    // Brief delay then reload to get updated status
    setTimeout(() => get().loadWatches(), 1000);
  },

  markRead: async (id) => {
    const api = (window as any).osBrowser?.watcher;
    if (!api) return;

    await api.markRead(id);
    set(s => ({
      watches: s.watches.map(w => w.id === id ? { ...w, unread: false, status: 'unchanged' as WatchStatus } : w),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  viewDiff: async (id) => {
    const api = (window as any).osBrowser?.watcher;
    if (!api) return;

    const diff = await api.getDiff(id);
    set({ viewingDiffId: id, currentDiff: diff });
  },

  closeDiff: () => {
    set({ viewingDiffId: null, currentDiff: null });
  },

  updateConfig: async (id, config) => {
    const api = (window as any).osBrowser?.watcher;
    if (!api) return;

    await api.updateConfig(id, config);
    await get().loadWatches();
  },

  getUnreadCount: () => {
    return get().unreadCount;
  },
}));
