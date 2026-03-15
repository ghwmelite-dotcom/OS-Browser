import { create } from 'zustand';

interface SplitScreenState {
  isActive: boolean;
  leftTabId: string | null;
  rightTabId: string | null;
  splitRatio: number; // 0.0 to 1.0, default 0.5

  activate: (leftTabId: string, rightTabId: string) => void;
  deactivate: () => void;
  setSplitRatio: (ratio: number) => void;
  swapPanes: () => void;
}

export const useSplitScreenStore = create<SplitScreenState>((set) => ({
  isActive: false,
  leftTabId: null,
  rightTabId: null,
  splitRatio: 0.5,

  activate: (leftTabId, rightTabId) => set({
    isActive: true, leftTabId, rightTabId, splitRatio: 0.5,
  }),

  deactivate: () => set({
    isActive: false, leftTabId: null, rightTabId: null,
  }),

  setSplitRatio: (ratio) => set({
    splitRatio: Math.max(0.2, Math.min(0.8, ratio)),
  }),

  swapPanes: () => set((s) => ({
    leftTabId: s.rightTabId, rightTabId: s.leftTabId,
  })),
}));
