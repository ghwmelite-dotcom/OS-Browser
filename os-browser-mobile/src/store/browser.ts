import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';

// ── Types ───────────────────────────────────────────────────────────────────

export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon: string;
  /** Timestamp of last activity — used for LRU eviction hints */
  lastActive: number;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon: string;
  visitedAt: number;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon: string;
  createdAt: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_TABS = 8;
const MAX_HISTORY = 200;
const NEW_TAB_URL = '';
const NEW_TAB_TITLE = 'New Tab';

// ── Store ───────────────────────────────────────────────────────────────────

interface BrowserState {
  tabs: Tab[];
  activeTabId: string;
  history: HistoryEntry[];
  bookmarks: Bookmark[];

  // Tab actions
  addTab: (url?: string, title?: string) => void;
  removeTab: (id: string) => void;
  switchTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<Pick<Tab, 'url' | 'title' | 'favicon'>>) => void;

  // History actions
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'visitedAt'>) => void;
  clearHistory: () => void;

  // Bookmark actions
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (url: string) => boolean;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const initialTab: Tab = {
  id: generateId(),
  url: NEW_TAB_URL,
  title: NEW_TAB_TITLE,
  favicon: '',
  lastActive: Date.now(),
};

export const useBrowserStore = create<BrowserState>()(
  persist(
    (set, get) => ({
      tabs: [initialTab],
      activeTabId: initialTab.id,
      history: [],
      bookmarks: [],

      addTab: (url = NEW_TAB_URL, title = NEW_TAB_TITLE) => {
        const state = get();
        if (state.tabs.length >= MAX_TABS) return; // Hard cap at 8
        const newTab: Tab = {
          id: generateId(),
          url,
          title,
          favicon: '',
          lastActive: Date.now(),
        };
        set({ tabs: [...state.tabs, newTab], activeTabId: newTab.id });
      },

      removeTab: (id: string) => {
        const state = get();
        const remaining = state.tabs.filter((t) => t.id !== id);
        if (remaining.length === 0) {
          // Always keep at least one tab
          const freshTab: Tab = {
            id: generateId(),
            url: NEW_TAB_URL,
            title: NEW_TAB_TITLE,
            favicon: '',
            lastActive: Date.now(),
          };
          set({ tabs: [freshTab], activeTabId: freshTab.id });
          return;
        }
        const needSwitch = state.activeTabId === id;
        set({
          tabs: remaining,
          activeTabId: needSwitch ? remaining[remaining.length - 1].id : state.activeTabId,
        });
      },

      switchTab: (id: string) => {
        set((state) => ({
          activeTabId: id,
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, lastActive: Date.now() } : t,
          ),
        }));
      },

      updateTab: (id, patch) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
      },

      addHistoryEntry: (entry) => {
        set((state) => {
          const newEntry: HistoryEntry = {
            ...entry,
            id: generateId(),
            visitedAt: Date.now(),
          };
          const updated = [newEntry, ...state.history].slice(0, MAX_HISTORY);
          return { history: updated };
        });
      },

      clearHistory: () => set({ history: [] }),

      addBookmark: (bookmark) => {
        set((state) => {
          // Prevent duplicate bookmarks
          if (state.bookmarks.some((b) => b.url === bookmark.url)) return state;
          const newBookmark: Bookmark = {
            ...bookmark,
            id: generateId(),
            createdAt: Date.now(),
          };
          return { bookmarks: [...state.bookmarks, newBookmark] };
        });
      },

      removeBookmark: (id: string) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        }));
      },

      isBookmarked: (url: string) => {
        return get().bookmarks.some((b) => b.url === url);
      },
    }),
    {
      name: 'os-browser-tabs',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist bookmarks and history — tabs are ephemeral
      partialize: (state) => ({
        history: state.history,
        bookmarks: state.bookmarks,
      }),
    },
  ),
);
