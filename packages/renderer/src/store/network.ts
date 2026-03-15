import { create } from 'zustand';

type ConnectionType = 'offline' | '2g' | '3g' | '4g' | '5g' | 'wifi' | 'ethernet' | 'unknown';
type SignalQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

interface NetworkState {
  isOnline: boolean;
  connectionType: ConnectionType;
  downlinkMbps: number;
  latencyMs: number;
  signalQuality: SignalQuality;
  suspendedTabCount: number;
  memorySavedMB: number;
  autoSuspendEnabled: boolean;
  autoLiteModeEnabled: boolean;

  updateStatus: (status: Partial<NetworkState>) => void;
  toggleAutoSuspend: () => void;
  toggleAutoLiteMode: () => void;
  init: () => () => void;
}

function getSignalQuality(mbps: number, isOnline: boolean): SignalQuality {
  if (!isOnline) return 'offline';
  if (mbps >= 10) return 'excellent';
  if (mbps >= 5) return 'good';
  if (mbps >= 1) return 'fair';
  return 'poor';
}

function getConnectionType(mbps: number): ConnectionType {
  if (mbps >= 50) return '5g';
  if (mbps >= 10) return '4g';
  if (mbps >= 1) return '3g';
  if (mbps > 0) return '2g';
  return 'unknown';
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: navigator.onLine,
  connectionType: 'unknown',
  downlinkMbps: 0,
  latencyMs: 0,
  signalQuality: 'good',
  suspendedTabCount: 0,
  memorySavedMB: 0,
  autoSuspendEnabled: true,
  autoLiteModeEnabled: false,

  updateStatus: (status) => set(status),
  toggleAutoSuspend: () => set((s) => ({ autoSuspendEnabled: !s.autoSuspendEnabled })),
  toggleAutoLiteMode: () => set((s) => ({ autoLiteModeEnabled: !s.autoLiteModeEnabled })),

  init: () => {
    const updateOnline = () =>
      set({
        isOnline: navigator.onLine,
        signalQuality: navigator.onLine ? 'good' : 'offline',
      });
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    // Check connection info if available
    const conn = (navigator as any).connection;
    if (conn) {
      const update = () => {
        const mbps = conn.downlink || 0;
        set({
          downlinkMbps: mbps,
          connectionType: getConnectionType(mbps),
          signalQuality: getSignalQuality(mbps, navigator.onLine),
          latencyMs: conn.rtt || 0,
        });
      };
      conn.addEventListener?.('change', update);
      update();
    }

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  },
}));
