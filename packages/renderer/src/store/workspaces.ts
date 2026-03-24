import { create } from 'zustand';

// ── Types ────────────────────────────────────────────────────────────
export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon: string;
  tabIds: string[];
  createdAt: number;
  autoArchiveMinutes: number; // 0 = disabled (default), e.g. 720 = 12h like Arc
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  globalPinnedTabIds: string[]; // tabs pinned globally — appear in ALL workspaces (Arc Favorites)

  // CRUD
  createWorkspace: (name: string, color: string, icon?: string) => string;
  deleteWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  recolorWorkspace: (id: string, color: string) => void;
  setWorkspaceAutoArchive: (id: string, minutes: number) => void;

  // Navigation
  switchWorkspace: (id: string) => void;

  // Tab management
  addTabToWorkspace: (tabId: string, workspaceId?: string) => void;
  removeTabFromWorkspace: (tabId: string) => void;
  moveTabToWorkspace: (tabId: string, targetWorkspaceId: string) => void;
  archiveStaleTab: (tabId: string) => void;

  // Global pins (Arc Favorites)
  pinTabGlobally: (tabId: string) => void;
  unpinTabGlobally: (tabId: string) => void;
  isGloballyPinned: (tabId: string) => boolean;

  // Derived
  getActiveWorkspace: () => Workspace;
  getTabWorkspace: (tabId: string) => Workspace | undefined;
  getVisibleTabIds: () => string[];
}

// ── Helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'os-browser-workspaces';

const genId = () => `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 'ws-general', name: 'General', color: '#3B82F6', icon: '🌐', tabIds: [], createdAt: 0, autoArchiveMinutes: 0 },
  { id: 'ws-government', name: 'Government', color: '#006B3F', icon: '🏛️', tabIds: [], createdAt: 1, autoArchiveMinutes: 0 },
  { id: 'ws-personal', name: 'Personal', color: '#D4A017', icon: '👤', tabIds: [], createdAt: 2, autoArchiveMinutes: 0 },
];

interface PersistedData {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  globalPinnedTabIds: string[];
}

function loadFromStorage(): PersistedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.workspaces) && data.workspaces.length > 0) {
        // Ensure each workspace has autoArchiveMinutes (migration for old data)
        const workspaces = data.workspaces.map((w: any) => ({
          ...w,
          autoArchiveMinutes: w.autoArchiveMinutes ?? 0,
        }));
        return {
          workspaces,
          activeWorkspaceId: data.activeWorkspaceId || data.workspaces[0].id,
          globalPinnedTabIds: Array.isArray(data.globalPinnedTabIds) ? data.globalPinnedTabIds : [],
        };
      }
    }
  } catch {
    // ignore
  }
  return { workspaces: DEFAULT_WORKSPACES, activeWorkspaceId: 'ws-general', globalPinnedTabIds: [] };
}

function persist(state: PersistedData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      workspaces: state.workspaces,
      activeWorkspaceId: state.activeWorkspaceId,
      globalPinnedTabIds: state.globalPinnedTabIds,
    }));
  } catch {
    // quota exceeded — silently fail
  }
}

/** Helper to build the persisted snapshot from full state */
function snap(s: Pick<WorkspaceState, 'workspaces' | 'activeWorkspaceId' | 'globalPinnedTabIds'>): PersistedData {
  return { workspaces: s.workspaces, activeWorkspaceId: s.activeWorkspaceId, globalPinnedTabIds: s.globalPinnedTabIds };
}

// ── Store ────────────────────────────────────────────────────────────
const initial = loadFromStorage();

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: initial.workspaces,
  activeWorkspaceId: initial.activeWorkspaceId,
  globalPinnedTabIds: initial.globalPinnedTabIds,

  // ── CRUD ─────────────────────────────────────────────────────────
  createWorkspace: (name, color, icon = '📁') => {
    const id = genId();
    const ws: Workspace = { id, name, color, icon, tabIds: [], createdAt: Date.now(), autoArchiveMinutes: 0 };
    set(s => {
      const next = { ...s, workspaces: [...s.workspaces, ws] };
      persist(snap(next));
      return next;
    });
    return id;
  },

  deleteWorkspace: (id) => {
    const { workspaces, activeWorkspaceId } = get();
    if (workspaces.length <= 1) return; // can't delete last
    const remaining = workspaces.filter(w => w.id !== id);
    const newActive = id === activeWorkspaceId ? remaining[0].id : activeWorkspaceId;
    set(s => {
      const next = { ...s, workspaces: remaining, activeWorkspaceId: newActive };
      persist(snap(next));
      return next;
    });
  },

  renameWorkspace: (id, name) => {
    set(s => {
      const next = { ...s, workspaces: s.workspaces.map(w => w.id === id ? { ...w, name } : w) };
      persist(snap(next));
      return next;
    });
  },

  recolorWorkspace: (id, color) => {
    set(s => {
      const next = { ...s, workspaces: s.workspaces.map(w => w.id === id ? { ...w, color } : w) };
      persist(snap(next));
      return next;
    });
  },

  setWorkspaceAutoArchive: (id, minutes) => {
    set(s => {
      const next = { ...s, workspaces: s.workspaces.map(w => w.id === id ? { ...w, autoArchiveMinutes: minutes } : w) };
      persist(snap(next));
      return next;
    });
  },

  // ── Navigation ───────────────────────────────────────────────────
  switchWorkspace: (id) => {
    set(s => {
      const next = { ...s, activeWorkspaceId: id };
      persist(snap(next));
      return next;
    });
  },

  // ── Tab management ───────────────────────────────────────────────
  addTabToWorkspace: (tabId, workspaceId?) => {
    const targetId = workspaceId || get().activeWorkspaceId;
    set(s => {
      const next = {
        ...s,
        workspaces: s.workspaces.map(w => {
          if (w.id === targetId) {
            return w.tabIds.includes(tabId) ? w : { ...w, tabIds: [...w.tabIds, tabId] };
          }
          // Remove from other workspaces
          return { ...w, tabIds: w.tabIds.filter(t => t !== tabId) };
        }),
      };
      persist(snap(next));
      return next;
    });
  },

  removeTabFromWorkspace: (tabId) => {
    set(s => {
      const next = {
        ...s,
        workspaces: s.workspaces.map(w => ({
          ...w,
          tabIds: w.tabIds.filter(t => t !== tabId),
        })),
        // Also remove from global pins if present
        globalPinnedTabIds: s.globalPinnedTabIds.filter(t => t !== tabId),
      };
      persist(snap(next));
      return next;
    });
  },

  moveTabToWorkspace: (tabId, targetWorkspaceId) => {
    set(s => {
      const next = {
        ...s,
        workspaces: s.workspaces.map(w => {
          if (w.id === targetWorkspaceId) {
            return w.tabIds.includes(tabId) ? w : { ...w, tabIds: [...w.tabIds, tabId] };
          }
          // Remove from ALL other workspaces
          return { ...w, tabIds: w.tabIds.filter(t => t !== tabId) };
        }),
      };
      persist(snap(next));
      return next;
    });
  },

  archiveStaleTab: (tabId) => {
    // Remove tab from its workspace (archive = remove from workspace, tab still exists)
    set(s => {
      const next = {
        ...s,
        workspaces: s.workspaces.map(w => ({
          ...w,
          tabIds: w.tabIds.filter(t => t !== tabId),
        })),
      };
      persist(snap(next));
      return next;
    });
  },

  // ── Global pins (Arc Favorites) ──────────────────────────────────
  pinTabGlobally: (tabId) => {
    set(s => {
      if (s.globalPinnedTabIds.includes(tabId)) return s;
      const next = { ...s, globalPinnedTabIds: [...s.globalPinnedTabIds, tabId] };
      persist(snap(next));
      return next;
    });
  },

  unpinTabGlobally: (tabId) => {
    set(s => {
      const next = { ...s, globalPinnedTabIds: s.globalPinnedTabIds.filter(t => t !== tabId) };
      persist(snap(next));
      return next;
    });
  },

  isGloballyPinned: (tabId) => {
    return get().globalPinnedTabIds.includes(tabId);
  },

  // ── Derived ──────────────────────────────────────────────────────
  getActiveWorkspace: () => {
    const { workspaces, activeWorkspaceId } = get();
    return workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  },

  getTabWorkspace: (tabId) => {
    return get().workspaces.find(w => w.tabIds.includes(tabId));
  },

  getVisibleTabIds: () => {
    const { workspaces, activeWorkspaceId, globalPinnedTabIds } = get();
    const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
    if (!activeWs) return globalPinnedTabIds;

    // Combine active workspace tabIds + global pins, deduplicated
    const combined = new Set([...globalPinnedTabIds, ...activeWs.tabIds]);
    return Array.from(combined);
  },
}));
