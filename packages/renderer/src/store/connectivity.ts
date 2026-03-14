import { create } from 'zustand';

type ConnectivityStatus = 'online' | 'intermittent' | 'offline';

interface ConnectivityState {
  status: ConnectivityStatus;
  queuedCount: number;
  setStatus: (status: ConnectivityStatus) => void;
  setQueuedCount: (count: number) => void;
  init: () => () => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  status: 'online',
  queuedCount: 0,
  setStatus: (status) => set({ status }),
  setQueuedCount: (count) => set({ queuedCount: count }),

  init: () => {
    const unsubStatus = window.osBrowser.connectivity.onStatusChanged((status: string) => {
      set({ status: status as ConnectivityStatus });
    });
    const unsubQueue = window.osBrowser.offlineQueue.onStatus((data: any) => {
      set({ queuedCount: data.count || 0 });
    });
    return () => { unsubStatus(); unsubQueue(); };
  },
}));
