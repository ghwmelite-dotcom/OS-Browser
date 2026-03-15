import { create } from 'zustand';

interface Settings {
  display_name: string;
  email: string | null;
  avatar_path: string | null;
  default_model: string;
  theme: 'dark' | 'light' | 'system';
  language: string;
  sidebar_position: 'left' | 'right';
  ad_blocking: boolean;
  privacy_mode: boolean;
  search_engine: string;
  sync_enabled: boolean;
  startup_mode: string;
  [key: string]: any; // Allow arbitrary extra fields
}

interface SettingsState {
  settings: Settings | null;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (data: Record<string, any>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoaded: false,

  loadSettings: async () => {
    const settings = await window.osBrowser.settings.get();
    set({ settings, isLoaded: true });
  },

  updateSettings: async (data) => {
    // Optimistically update local state — merge all fields
    set((s) => ({
      settings: s.settings ? { ...s.settings, ...data } : s.settings,
    }));
    // Persist to database
    try {
      await window.osBrowser.settings.update(data);
    } catch {}
  },
}));
