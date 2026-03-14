import { create } from 'zustand';

interface Settings {
  display_name: string;
  email: string | null;
  default_model: string;
  theme: 'dark' | 'light' | 'system';
  language: string;
  sidebar_position: 'left' | 'right';
  ad_blocking: boolean;
  privacy_mode: boolean;
  search_engine: string;
  sync_enabled: boolean;
}

interface SettingsState {
  settings: Settings | null;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoaded: false,

  loadSettings: async () => {
    const settings = await window.osBrowser.settings.get();
    set({ settings, isLoaded: true });
  },

  updateSettings: async (data) => {
    // Optimistically update local state first (don't depend on IPC return)
    set((s) => ({
      settings: s.settings ? { ...s.settings, ...data } as Settings : s.settings,
    }));
    // Fire IPC to persist to database (don't await — fire and forget)
    try {
      await window.osBrowser.settings.update(data);
    } catch {}
  },
}));
