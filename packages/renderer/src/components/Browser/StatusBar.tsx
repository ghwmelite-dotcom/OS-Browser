import React from 'react';
import { Shield, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useConnectivityStore } from '@/store/connectivity';
import { useSettingsStore } from '@/store/settings';
import { useStatsStore } from '@/store/stats';

export function StatusBar() {
  const { status, queuedCount } = useConnectivityStore();
  const { settings } = useSettingsStore();
  const { totalAdsBlocked } = useStatsStore();

  const connectivityIcon = {
    online: <Wifi size={12} className="text-ghana-green" />,
    intermittent: <AlertTriangle size={12} className="text-yellow-500" />,
    offline: <WifiOff size={12} className="text-ghana-red" />,
  }[status];

  const connectivityLabel = {
    online: 'Online',
    intermittent: 'Unstable connection',
    offline: `Offline${queuedCount > 0 ? ` · ${queuedCount} queued` : ''}`,
  }[status];

  return (
    <div className="h-6 bg-surface-1 border-t border-border-1 flex items-center justify-between px-3 shrink-0 text-xs text-text-muted" aria-live="polite">
      <div className="flex items-center gap-3">
        {/* Connectivity */}
        <span className="flex items-center gap-1">
          {connectivityIcon}
          {connectivityLabel}
        </span>

        {/* Privacy mode */}
        {settings?.privacy_mode && (
          <span className="flex items-center gap-1 text-ghana-gold">
            <Shield size={11} />
            Privacy Mode
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Ad block stats */}
        {settings?.ad_blocking && totalAdsBlocked > 0 && (
          <span className="flex items-center gap-1">
            <Shield size={11} className="text-ghana-green" />
            {totalAdsBlocked.toLocaleString()} ads blocked
          </span>
        )}
      </div>
    </div>
  );
}
