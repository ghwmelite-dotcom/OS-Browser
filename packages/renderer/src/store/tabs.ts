import { create } from 'zustand';
import { useWorkspaceStore } from './workspaces';
import { useNavigationStore } from './navigation';

// ── Types ──────────────────────────────────────────────────────

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon_path: string | null;
  position: number;
  is_pinned: number;
  is_active: number;
  is_muted: number;
  is_loading?: boolean;
  is_audio_playing?: boolean;
  group_id: string | null;
}

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  collapsed: number;
  position: number;
}

interface ClosedTab {
  id: string;
  title: string;
  url: string;
  favicon_path: string | null;
  closedAt: number;
}

interface TabsState {
  tabs: Tab[];
  groups: TabGroup[];
  activeTabId: string | null;
  closedTabs: ClosedTab[];
  selectedTabIds: string[];

  // Init & sync
  loadTabs: () => Promise<void>;
  syncFromMain: (state: { tabs: Tab[]; groups: TabGroup[]; closedTabs: ClosedTab[]; audioPlaying?: Record<string, boolean> }) => void;

  // Tab CRUD
  createTab: (url?: string) => Promise<void>;
  closeTab: (id: string) => Promise<void>;
  switchTab: (id: string) => Promise<void>;
  updateTab: (id: string, data: Partial<Tab>) => void;

  // Extended operations
  duplicateTab: (id: string) => Promise<void>;
  reopenLastClosed: () => Promise<void>;
  reorderTab: (id: string, newIndex: number) => Promise<void>;
  pinTab: (id: string) => Promise<void>;
  unpinTab: (id: string) => Promise<void>;
  muteTab: (id: string) => Promise<void>;
  unmuteTab: (id: string) => Promise<void>;
  closeOtherTabs: (id: string) => Promise<void>;
  closeTabsToRight: (id: string) => Promise<void>;
  moveTabLeft: (id: string) => Promise<void>;
  moveTabRight: (id: string) => Promise<void>;

  // Groups
  createGroup: (tabIds: string[], name?: string) => Promise<void>;
  addTabToGroup: (tabId: string, groupId: string) => Promise<void>;
  removeTabFromGroup: (tabId: string) => Promise<void>;
  updateGroup: (groupId: string, data: { name?: string; color?: string }) => Promise<void>;
  collapseGroup: (groupId: string) => Promise<void>;
  expandGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string, closeTabs?: boolean) => Promise<void>;

  // Multi-select
  toggleSelectTab: (id: string) => void;
  rangeSelectTab: (id: string) => void;
  clearSelection: () => void;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  groups: [],
  activeTabId: null,
  closedTabs: [],
  selectedTabIds: [],

  // ── Init & sync ────────────────────────────────────────────────

  loadTabs: async () => {
    try {
      const state = await window.osBrowser.tabs.getState();
      const active = state.tabs.find((t: Tab) => t.is_active);
      // Merge audio playing state into tabs
      const tabs = state.tabs.map((t: Tab) => ({
        ...t,
        is_audio_playing: state.audioPlaying?.[t.id] || false,
      }));
      set({
        tabs,
        groups: state.groups || [],
        closedTabs: state.closedTabs || [],
        activeTabId: active?.id || null,
      });
    } catch {
      // Fallback to legacy list endpoint
      const tabs = await window.osBrowser.tabs.list();
      const active = tabs.find((t: Tab) => t.is_active);
      set({ tabs, activeTabId: active?.id || null });
    }
  },

  syncFromMain: (state) => {
    const active = state.tabs.find(t => t.is_active);
    const tabs = state.tabs.map(t => ({
      ...t,
      is_audio_playing: state.audioPlaying?.[t.id] || false,
    }));
    set(s => ({
      tabs,
      groups: state.groups || s.groups,
      closedTabs: state.closedTabs || s.closedTabs,
      activeTabId: active?.id || s.activeTabId,
    }));
  },

  // ── Tab CRUD ───────────────────────────────────────────────────

  createTab: async (url) => {
    const tab = await window.osBrowser.tabs.create(url);
    set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
    await window.osBrowser.tabs.switch(tab.id);
    useNavigationStore.getState().setUrl(tab.url || '');
    useNavigationStore.getState().setLoading(false);
    try { useWorkspaceStore.getState().addTabToWorkspace(tab.id); } catch {}
  },

  closeTab: async (id) => {
    const { tabs } = get();
    const closing = tabs.find(t => t.id === id);
    if (!closing) return;

    try { useWorkspaceStore.getState().removeTabFromWorkspace(id); } catch {}
    await window.osBrowser.tabs.close(id);

    // Optimistic update — main process broadcasts authoritative state via syncFromMain
    const remaining = tabs.filter(t => t.id !== id);
    if (remaining.length === 0) {
      await get().createTab();
      return;
    }

    let newActiveId = get().activeTabId;
    if (id === newActiveId) {
      const idx = tabs.findIndex(t => t.id === id);
      const next = remaining[Math.min(idx, remaining.length - 1)];
      newActiveId = next?.id || null;
      if (newActiveId) {
        await window.osBrowser.tabs.switch(newActiveId);
        const nextTab = remaining.find(t => t.id === newActiveId);
        useNavigationStore.getState().setUrl(nextTab?.url || '');
        useNavigationStore.getState().setLoading(false);
      }
    }

    set({ tabs: remaining, activeTabId: newActiveId });
  },

  switchTab: async (id) => {
    await window.osBrowser.tabs.switch(id);
    set({ activeTabId: id, selectedTabIds: [] });
    const tab = get().tabs.find(t => t.id === id);
    useNavigationStore.getState().setUrl(tab?.url || '');
    useNavigationStore.getState().setLoading(false);
  },

  updateTab: (id, data) => {
    set(s => ({ tabs: s.tabs.map(t => t.id === id ? { ...t, ...data } : t) }));
  },

  // ── Extended operations ────────────────────────────────────────

  duplicateTab: async (id) => { await window.osBrowser.tabs.duplicate(id); },
  reopenLastClosed: async () => { await window.osBrowser.tabs.reopenClosed(); },
  reorderTab: async (id, newIndex) => { await window.osBrowser.tabs.reorder(id, newIndex); },
  pinTab: async (id) => { await window.osBrowser.tabs.pin(id); },
  unpinTab: async (id) => { await window.osBrowser.tabs.unpin(id); },
  muteTab: async (id) => { await window.osBrowser.tabs.mute(id); },
  unmuteTab: async (id) => { await window.osBrowser.tabs.unmute(id); },
  closeOtherTabs: async (id) => { await window.osBrowser.tabs.closeOthers(id); },
  closeTabsToRight: async (id) => { await window.osBrowser.tabs.closeToRight(id); },
  moveTabLeft: async (id) => { await window.osBrowser.tabs.moveLeft(id); },
  moveTabRight: async (id) => { await window.osBrowser.tabs.moveRight(id); },

  // ── Groups ─────────────────────────────────────────────────────

  createGroup: async (tabIds, name) => { await window.osBrowser.groups.create(tabIds, name); },
  addTabToGroup: async (tabId, groupId) => { await window.osBrowser.groups.addTab(tabId, groupId); },
  removeTabFromGroup: async (tabId) => { await window.osBrowser.groups.removeTab(tabId); },
  updateGroup: async (groupId, data) => { await window.osBrowser.groups.update(groupId, data); },
  collapseGroup: async (groupId) => { await window.osBrowser.groups.collapse(groupId); },
  expandGroup: async (groupId) => { await window.osBrowser.groups.expand(groupId); },
  deleteGroup: async (groupId, closeTabs) => { await window.osBrowser.groups.delete(groupId, closeTabs || false); },

  // ── Multi-select ───────────────────────────────────────────────

  toggleSelectTab: (id) => {
    set(s => ({
      selectedTabIds: s.selectedTabIds.includes(id)
        ? s.selectedTabIds.filter(i => i !== id)
        : [...s.selectedTabIds, id],
    }));
  },

  rangeSelectTab: (id) => {
    const { tabs, activeTabId } = get();
    if (!activeTabId) return;
    const activeIdx = tabs.findIndex(t => t.id === activeTabId);
    const targetIdx = tabs.findIndex(t => t.id === id);
    const [start, end] = [Math.min(activeIdx, targetIdx), Math.max(activeIdx, targetIdx)];
    set({ selectedTabIds: tabs.slice(start, end + 1).map(t => t.id) });
  },

  clearSelection: () => set({ selectedTabIds: [] }),
}));
