import React from 'react';
import { Shield, Lock, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useConnectivityStore } from '@/store/connectivity';
import { useSettingsStore } from '@/store/settings';
import { useStatsStore } from '@/store/stats';
import { useNavigationStore } from '@/store/navigation';
import { FocusIndicator } from '@/components/FocusMode';
import { DataStatusIndicator } from '@/components/DataSaver/DataStatusIndicator';
import { useTabsStore } from '@/store/tabs';

export function StatusBar() {
  const { status, queuedCount } = useConnectivityStore();
  const { settings } = useSettingsStore();
  const { totalAdsBlocked } = useStatsStore();
  const { currentUrl, isLoading, isSecure } = useNavigationStore();
  const { createTab } = useTabsStore();

  const isNewTab = currentUrl === 'os-browser://newtab';
  const displayUrl = isNewTab ? '' : currentUrl;

  const connectivityIcon = {
    online: <Wifi size={10} className="text-ghana-green" />,
    intermittent: <AlertTriangle size={10} className="text-yellow-500" />,
    offline: <WifiOff size={10} className="text-ghana-red" />,
  }[status];

  const connectivityLabel = {
    online: '',
    intermittent: 'Unstable',
    offline: `Offline${queuedCount > 0 ? ` (${queuedCount})` : ''}`,
  }[status];

  return (
    <div
      className="h-[22px] bg-surface-1 border-t border-border-1/40 flex items-center justify-between px-3 shrink-0 group transition-opacity duration-200 ease-out opacity-60 hover:opacity-100"
      aria-live="polite"
    >
      {/* Left: URL / status */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isLoading && (
          <span className="text-[10px] text-text-muted truncate">
            Loading...
          </span>
        )}
        {!isLoading && displayUrl && (
          <span className="text-[10px] text-text-muted truncate max-w-[400px] font-mono">
            {displayUrl}
          </span>
        )}
      </div>

      {/* Right: indicators */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Data Usage Indicator */}
        <DataStatusIndicator onClick={() => createTab('os-browser://data' as any)} />

        {/* Focus Mode indicator */}
        <FocusIndicator />

        {/* Connectivity — only show if not online */}
        {status !== 'online' && (
          <span className="flex items-center gap-1 text-[10px] text-text-muted">
            {connectivityIcon}
            {connectivityLabel}
          </span>
        )}

        {/* Privacy mode */}
        {settings?.privacy_mode && (
          <span className="flex items-center gap-1 text-[10px] text-ghana-gold/70">
            <Shield size={9} />
            Private
          </span>
        )}

        {/* Security */}
        {!isNewTab && isSecure && (
          <span className="flex items-center gap-1 text-[10px] text-ghana-green/70">
            <Lock size={9} />
            Secure
          </span>
        )}

        {/* Ad block stats */}
        {settings?.ad_blocking && totalAdsBlocked > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-text-muted">
            <Shield size={9} className="text-ghana-green/70" />
            {totalAdsBlocked.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
