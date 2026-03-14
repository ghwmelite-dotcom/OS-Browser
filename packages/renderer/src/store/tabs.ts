import { create } from 'zustand';

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon_path: string | null;
  position: number;
  is_pinned: boolean;
  is_active: boolean;
  is_muted: boolean;
  is_loading?: boolean;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  recentlyClosed: Tab[];

  loadTabs: () => Promise<void>;
  createTab: (url?: string) => Promise<void>;
  closeTab: (id: string) => Promise<void>;
  switchTab: (id: string) => Promise<void>;
  updateTab: (id: string, data: Partial<Tab>) => void;
  reopenLastClosed: () => Promise<void>;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  recentlyClosed: [],

  loadTabs: async () => {
    const tabs = await window.osBrowser.tabs.list();
    const active = tabs.find((t: Tab) => t.is_active);
    set({ tabs, activeTabId: active?.id || null });
  },

  createTab: async (url) => {
    const tab = await window.osBrowser.tabs.create(url);
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.id,
    }));
  },

  closeTab: async (id) => {
    const { tabs } = get();
    const closing = tabs.find(t => t.id === id);
    if (!closing) return;

    await window.osBrowser.tabs.close(id);

    const remaining = tabs.filter(t => t.id !== id);
    let newActiveId = get().activeTabId;

    if (id === newActiveId) {
      const idx = tabs.findIndex(t => t.id === id);
      const next = remaining[Math.min(idx, remaining.length - 1)];
      newActiveId = next?.id || null;
      if (newActiveId) await window.osBrowser.tabs.switch(newActiveId);
    }

    if (remaining.length === 0) {
      await get().createTab();
      return;
    }

    set((s) => ({
      tabs: remaining,
      activeTabId: newActiveId,
      recentlyClosed: [closing, ...s.recentlyClosed].slice(0, 10),
    }));
  },

  switchTab: async (id) => {
    await window.osBrowser.tabs.switch(id);
    set({ activeTabId: id });
  },

  updateTab: (id, data) => {
    set((s) => ({
      tabs: s.tabs.map(t => t.id === id ? { ...t, ...data } : t),
    }));
  },

  reopenLastClosed: async () => {
    const { recentlyClosed } = get();
    if (recentlyClosed.length === 0) return;
    const [tab, ...rest] = recentlyClosed;
    await get().createTab(tab.url);
    set({ recentlyClosed: rest });
  },
}));
