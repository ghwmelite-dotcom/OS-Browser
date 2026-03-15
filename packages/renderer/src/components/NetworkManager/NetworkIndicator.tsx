import React from 'react';
import { WifiOff, Signal, SignalLow, SignalMedium, SignalHigh, Wifi } from 'lucide-react';
import { useNetworkStore } from '@/store/network';

export function NetworkIndicator({ onClick }: { onClick?: () => void }) {
  const { isOnline, connectionType, downlinkMbps, signalQuality, suspendedTabCount } =
    useNetworkStore();

  const getIcon = () => {
    if (!isOnline) return <WifiOff size={11} style={{ color: '#CE1126' }} />;
    switch (signalQuality) {
      case 'excellent':
        return <SignalHigh size={11} style={{ color: '#006B3F' }} />;
      case 'good':
        return <Signal size={11} style={{ color: '#006B3F' }} />;
      case 'fair':
        return <SignalMedium size={11} style={{ color: '#FCD116' }} />;
      case 'poor':
        return <SignalLow size={11} style={{ color: '#CE1126' }} />;
      default:
        return <Wifi size={11} className="text-text-muted" />;
    }
  };

  const label = isOnline
    ? `${connectionType.toUpperCase()} · ${downlinkMbps.toFixed(1)} Mbps`
    : 'Offline';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-surface-2 transition-colors text-[11px]"
      title="Network Status"
    >
      {getIcon()}
      <span className="text-text-secondary">{label}</span>
      {suspendedTabCount > 0 && (
        <span className="text-text-muted">· {suspendedTabCount} paused</span>
      )}
    </button>
  );
}
