import { create } from 'zustand';

interface StatsState {
  totalPages: number;
  totalBookmarks: number;
  totalConversations: number;
  totalAdsBlocked: number;
  loadStats: () => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  totalPages: 0,
  totalBookmarks: 0,
  totalConversations: 0,
  totalAdsBlocked: 0,
  loadStats: async () => {
    const stats = await window.osBrowser.stats.get();
    set(stats);
  },
}));
