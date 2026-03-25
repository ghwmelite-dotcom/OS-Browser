/**
 * Single-user profile store — stores the ACTIVE user's display info
 * (name, email, avatar, staffId, department, ministry) in localStorage.
 *
 * For multi-profile management (create/switch/lock/PIN), see ./profiles.ts
 */
import { create } from 'zustand';

/* ──────────────── localStorage persistence ──────────────── */

const STORAGE_KEY = 'os_browser_profile';

interface ProfileData {
  displayName: string;
  email: string;
  avatarUrl: string; // base64 data URL
  staffId: string;
  department: string;
  ministry: string;
}

const EMPTY_PROFILE: ProfileData = {
  displayName: '',
  email: '',
  avatarUrl: '',
  staffId: '',
  department: '',
  ministry: '',
};

function loadProfile(): ProfileData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    return { ...EMPTY_PROFILE, ...JSON.parse(raw) } as ProfileData;
  } catch {
    return EMPTY_PROFILE;
  }
}

function saveProfile(data: ProfileData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

/* ──────────────── State Interface ──────────────── */

interface ProfileState extends ProfileData {
  setProfile: (partial: Partial<ProfileData>) => void;
  setAvatar: (base64DataUrl: string) => void;
  clearProfile: () => void;
}

/* ──────────────── Store ──────────────── */

export const useProfileStore = create<ProfileState>((set, get) => {
  const initial = loadProfile();

  return {
    ...initial,

    setProfile: (partial: Partial<ProfileData>) => {
      const updated = { ...pick(get()), ...partial };
      saveProfile(updated);
      set(partial);
    },

    setAvatar: (base64DataUrl: string) => {
      const updated = { ...pick(get()), avatarUrl: base64DataUrl };
      saveProfile(updated);
      set({ avatarUrl: base64DataUrl });
    },

    clearProfile: () => {
      saveProfile(EMPTY_PROFILE);
      set(EMPTY_PROFILE);
    },
  };
});

/* ──────────────── Helpers ──────────────── */

/** Pick only the persisted data fields from state (exclude actions). */
function pick(state: ProfileState): ProfileData {
  return {
    displayName: state.displayName,
    email: state.email,
    avatarUrl: state.avatarUrl,
    staffId: state.staffId,
    department: state.department,
    ministry: state.ministry,
  };
}

/** Return up to 2-character initials from a display name. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
