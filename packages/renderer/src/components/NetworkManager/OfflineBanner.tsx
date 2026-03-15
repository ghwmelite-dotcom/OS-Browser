import React from 'react';
import { WifiOff, BookOpen } from 'lucide-react';
import { useNetworkStore } from '@/store/network';
import { useTabsStore } from '@/store/tabs';

export function OfflineBanner() {
  const { isOnline } = useNetworkStore();
  const { createTab } = useTabsStore();

  if (isOnline) return null;

  return (
    <div
      className="border-b px-4 py-2 flex items-center gap-3 shrink-0"
      style={{
        background: 'rgba(206, 17, 38, 0.08)',
        borderColor: 'rgba(206, 17, 38, 0.2)',
      }}
    >
      <WifiOff size={14} style={{ color: '#CE1126' }} />
      <span className="text-[12px] text-text-primary flex-1">
        You're offline. Showing cached content where available.
      </span>
      <button
        onClick={() => createTab('os-browser://help')}
        className="text-[11px] font-medium flex items-center gap-1 hover:underline"
        style={{ color: 'var(--color-accent)' }}
      >
        <BookOpen size={11} /> Open Offline Library
      </button>
    </div>
  );
}
