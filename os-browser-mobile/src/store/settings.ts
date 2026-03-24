import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';
import type { ThemeMode } from '../constants/theme';

// ── Types ───────────────────────────────────────────────────────────────────

export type SearchEngine = 'google' | 'bing' | 'duckduckgo';

interface SettingsState {
  theme: ThemeMode;
  searchEngine: SearchEngine;
  adBlockEnabled: boolean;

  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSearchEngine: (engine: SearchEngine) => void;
  setAdBlockEnabled: (enabled: boolean) => void;
}

// ── Search engine URL builders ──────────────────────────────────────────────

const SEARCH_URLS: Record<SearchEngine, string> = {
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
};

export function buildSearchUrl(query: string, engine: SearchEngine): string {
  return SEARCH_URLS[engine] + encodeURIComponent(query);
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      searchEngine: 'google',
      adBlockEnabled: true,

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setSearchEngine: (searchEngine) => set({ searchEngine }),
      setAdBlockEnabled: (adBlockEnabled) => set({ adBlockEnabled }),
    }),
    {
      name: 'os-browser-settings',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
