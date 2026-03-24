import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';

interface NetworkState {
  isConnected: boolean;
  connectionType: string; // 'wifi' | 'cellular' | 'none' | 'unknown'
  cellularGeneration: string | null; // '2g' | '3g' | '4g' | '5g' | null

  // Data tracking (estimated from WebView navigation count + rough averages)
  sessionDataMB: number;
  totalDataMB: number;
  pageLoads: number;
  todayDataMB: number;
  todayDate: string;

  // Actions
  setConnection: (isConnected: boolean, type: string, generation: string | null) => void;
  recordPageLoad: (estimatedKB?: number) => void;
  resetSession: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

// Average page size estimates (in KB)
const DEFAULT_PAGE_KB = 350; // average mobile web page ~350KB

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      isConnected: true,
      connectionType: 'unknown',
      cellularGeneration: null,

      sessionDataMB: 0,
      totalDataMB: 0,
      pageLoads: 0,
      todayDataMB: 0,
      todayDate: today(),

      setConnection: (isConnected, type, generation) =>
        set({ isConnected, connectionType: type, cellularGeneration: generation }),

      recordPageLoad: (estimatedKB = DEFAULT_PAGE_KB) => {
        const state = get();
        const addedMB = estimatedKB / 1024;
        const currentDate = today();
        const isSameDay = state.todayDate === currentDate;

        set({
          sessionDataMB: state.sessionDataMB + addedMB,
          totalDataMB: state.totalDataMB + addedMB,
          pageLoads: state.pageLoads + 1,
          todayDataMB: isSameDay ? state.todayDataMB + addedMB : addedMB,
          todayDate: currentDate,
        });
      },

      resetSession: () => set({ sessionDataMB: 0 }),
    }),
    {
      name: 'os-browser-network',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        totalDataMB: state.totalDataMB,
        pageLoads: state.pageLoads,
        todayDataMB: state.todayDataMB,
        todayDate: state.todayDate,
      }),
    },
  ),
);
