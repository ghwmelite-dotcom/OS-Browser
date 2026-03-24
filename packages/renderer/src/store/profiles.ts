import { create } from 'zustand';

export interface ProfilePublic {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  avatarUrl?: string;
}

interface ProfileState {
  profiles: ProfilePublic[];
  activeProfile: ProfilePublic | null;
  /** Whether the profile launcher screen is showing */
  isLaunching: boolean;
  /** Whether the browser is locked (user clicked "Lock") */
  isLocked: boolean;

  loadProfiles: () => Promise<void>;
  createProfile: (name: string, color: string, pin: string) => Promise<{ success: boolean; profile?: ProfilePublic; error?: string }>;
  verifyPin: (id: string, pin: string) => Promise<boolean>;
  switchProfile: (id: string) => Promise<boolean>;
  deleteProfile: (id: string, pin: string) => Promise<boolean>;
  lock: () => void;
  setLaunching: (v: boolean) => void;
  loadActiveProfile: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  activeProfile: null,
  isLaunching: true,
  isLocked: false,

  loadProfiles: async () => {
    try {
      const profiles = await window.osBrowser.profiles.list();
      set({ profiles: profiles || [] });
    } catch {
      set({ profiles: [] });
    }
  },

  loadActiveProfile: async () => {
    try {
      const active = await window.osBrowser.profiles.getActive();
      set({ activeProfile: active });
    } catch {
      set({ activeProfile: null });
    }
  },

  createProfile: async (name, color, pin) => {
    try {
      const result = await window.osBrowser.profiles.create(name, color, pin);
      if (result.success) {
        await get().loadProfiles();
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  verifyPin: async (id, pin) => {
    try {
      return await window.osBrowser.profiles.verifyPin(id, pin);
    } catch {
      return false;
    }
  },

  switchProfile: async (id) => {
    try {
      const result = await window.osBrowser.profiles.switchProfile(id);
      if (result.success) {
        const active = await window.osBrowser.profiles.getActive();
        set({ activeProfile: active, isLaunching: false, isLocked: false });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteProfile: async (id, pin) => {
    try {
      const result = await window.osBrowser.profiles.delete(id, pin);
      if (result.success) {
        await get().loadProfiles();
      }
      return result.success;
    } catch {
      return false;
    }
  },

  lock: () => {
    set({ isLocked: true, isLaunching: true });
  },

  setLaunching: (v) => set({ isLaunching: v }),
}));
