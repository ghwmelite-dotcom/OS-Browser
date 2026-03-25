import { create } from 'zustand';

export interface VaultEntry {
  id: string;
  url: string;
  title: string;
  timestamp: string;
  pageAction: 'pre-submit' | 'post-submit' | 'manual';
  sha256Hash: string;
}

interface VaultState {
  entries: VaultEntry[];
  totalCaptures: number;
  isLoading: boolean;
  search: string;
  dateFrom: string;
  dateTo: string;
  viewMode: 'grid' | 'list';

  setSearch: (search: string) => void;
  setDateFrom: (d: string) => void;
  setDateTo: (d: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  loadEntries: () => Promise<void>;
  loadStats: () => Promise<void>;
  captureCurrentPage: (pageAction?: string) => Promise<{ success: boolean; error?: string }>;
  deleteEntry: (id: string) => Promise<boolean>;
  getImage: (id: string) => Promise<string | null>;
  init: () => () => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  entries: [],
  totalCaptures: 0,
  isLoading: false,
  search: '',
  dateFrom: '',
  dateTo: '',
  viewMode: 'list',

  setSearch: (search) => {
    set({ search });
    get().loadEntries();
  },

  setDateFrom: (d) => {
    set({ dateFrom: d });
    get().loadEntries();
  },

  setDateTo: (d) => {
    set({ dateTo: d });
    get().loadEntries();
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  loadEntries: async () => {
    const osBrowser = (window as any).osBrowser;
    if (!osBrowser?.vault) return;
    set({ isLoading: true });
    try {
      const { search, dateFrom, dateTo } = get();
      const entries = await osBrowser.vault.list(
        search || undefined,
        dateFrom || undefined,
        dateTo || undefined,
      );
      set({ entries: entries || [], isLoading: false });
    } catch (err) {
      console.error('[Vault] loadEntries failed:', err);
      set({ isLoading: false });
    }
  },

  loadStats: async () => {
    const osBrowser = (window as any).osBrowser;
    if (!osBrowser?.vault) return;
    try {
      const stats = await osBrowser.vault.getStats();
      set({ totalCaptures: stats?.totalCaptures || 0 });
    } catch (err) {
      console.error('[Vault] loadStats failed:', err);
    }
  },

  captureCurrentPage: async (pageAction?: string) => {
    const osBrowser = (window as any).osBrowser;
    if (!osBrowser?.vault) return { success: false, error: 'Vault not available' };
    try {
      const result = await osBrowser.vault.capture(pageAction);
      if (result?.success) {
        // Reload entries and stats
        await get().loadEntries();
        await get().loadStats();
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  deleteEntry: async (id: string) => {
    const osBrowser = (window as any).osBrowser;
    if (!osBrowser?.vault) return false;
    try {
      const result = await osBrowser.vault.delete(id);
      if (result) {
        await get().loadEntries();
        await get().loadStats();
      }
      return result;
    } catch (err) {
      console.error('[Vault] deleteEntry failed:', err);
      return false;
    }
  },

  getImage: async (id: string) => {
    const osBrowser = (window as any).osBrowser;
    if (!osBrowser?.vault) return null;
    try {
      return await osBrowser.vault.getImage(id);
    } catch (err) {
      console.error('[Vault] getImage failed:', err);
      return null;
    }
  },

  init: () => {
    // Load initial data
    get().loadEntries();
    get().loadStats();

    // Listen for auto-capture events
    const osBrowser = (window as any).osBrowser;
    let cleanup1: (() => void) | undefined;
    let cleanup2: (() => void) | undefined;

    if (osBrowser?.vault?.onCaptured) {
      cleanup1 = osBrowser.vault.onCaptured(() => {
        get().loadEntries();
        get().loadStats();
      });
    }

    return () => {
      cleanup1?.();
      cleanup2?.();
    };
  },
}));
