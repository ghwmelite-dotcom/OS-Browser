import { create } from 'zustand';
import { useWorkspaceStore } from './workspaces';
import { useNavigationStore } from './navigation';

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
    // Switch to the new tab in the main process (hides old WebContentsView, shows new content)
    await window.osBrowser.tabs.switch(tab.id);
    // Update navigation store so OmniBar shows the new tab's URL (or empty for newtab)
    useNavigationStore.getState().setUrl(tab.url || '');
    useNavigationStore.getState().setLoading(false);
    // Add the new tab to the active workspace
    try {
      useWorkspaceStore.getState().addTabToWorkspace(tab.id);
    } catch {}
  },

  closeTab: async (id) => {
    const { tabs } = get();
    const closing = tabs.find(t => t.id === id);
    if (!closing) return;

    await window.osBrowser.tabs.close(id);
    // Remove the tab from its workspace
    try {
      useWorkspaceStore.getState().removeTabFromWorkspace(id);
    } catch {}

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

    // Update navigation store with the new tab's URL so the OmniBar reflects it
    const tab = get().tabs.find(t => t.id === id);
    const url = tab?.url || '';
    useNavigationStore.getState().setUrl(url);
    useNavigationStore.getState().setLoading(false);
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
