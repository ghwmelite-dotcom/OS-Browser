import { create } from 'zustand';

interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  favicon_path: string | null;
  visit_count: number;
  last_visited_at: string;
  ai_summary: string | null;
}

interface HistoryState {
  entries: HistoryEntry[];
  loadHistory: (page?: number) => Promise<void>;
  searchHistory: (query: string) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  loadHistory: async (page) => {
    const entries = await window.osBrowser.history.list(page);
    set({ entries });
  },
  searchHistory: async (query) => {
    const entries = await window.osBrowser.history.search(query);
    set({ entries });
  },
  deleteEntry: async (id) => {
    await window.osBrowser.history.delete(id);
    set((s) => ({ entries: s.entries.filter(e => e.id !== id) }));
  },
  clearAll: async () => {
    await window.osBrowser.history.clear();
    set({ entries: [] });
  },
}));
