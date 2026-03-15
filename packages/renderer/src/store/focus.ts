import { create } from 'zustand';

interface FocusState {
  isActive: boolean;
  startedAt: number | null;
  blockedSites: string[];
  totalFocusTime: number; // seconds accumulated today

  toggleFocus: () => void;
  addBlockedSite: (site: string) => void;
  removeBlockedSite: (site: string) => void;
  isBlocked: (url: string) => boolean;
}

const DEFAULT_BLOCKED = [
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com',
  'youtube.com', 'reddit.com', 'netflix.com', 'twitch.tv',
];

export const useFocusStore = create<FocusState>((set, get) => ({
  isActive: false,
  startedAt: null,
  blockedSites: DEFAULT_BLOCKED,
  totalFocusTime: 0,

  toggleFocus: () => {
    const { isActive, startedAt } = get();
    if (isActive && startedAt) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      set(s => ({ isActive: false, startedAt: null, totalFocusTime: s.totalFocusTime + elapsed }));
    } else {
      set({ isActive: true, startedAt: Date.now() });
    }
  },

  addBlockedSite: (site) => set(s => ({
    blockedSites: [...s.blockedSites, site.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')],
  })),

  removeBlockedSite: (site) => set(s => ({
    blockedSites: s.blockedSites.filter(b => b !== site),
  })),

  isBlocked: (url) => {
    const { isActive, blockedSites } = get();
    if (!isActive) return false;
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      return blockedSites.some(blocked => hostname.includes(blocked));
    } catch {
      return false;
    }
  },
}));
