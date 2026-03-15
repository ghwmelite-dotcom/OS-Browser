import React from 'react';
import { BarChart3, Zap } from 'lucide-react';
import { useDataSaverStore } from '@/store/datasaver';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function DataStatusIndicator({ onClick }: { onClick?: () => void }) {
  const { totalBytesToday, totalBytesSaved, budget, liteModeEnabled } = useDataSaverStore();

  const usedPercent = budget
    ? Math.min(100, (totalBytesToday / (budget.monthlyLimitGB * 1024 * 1024 * 1024)) * 100)
    : 0;
  const barColor =
    usedPercent > 90 ? '#CE1126' : usedPercent > 75 ? '#FCD116' : '#006B3F';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-surface-2 transition-colors text-[11px]"
      title="Data Usage Dashboard"
    >
      <BarChart3 size={11} style={{ color: 'var(--color-accent)' }} />
      <span className="text-text-secondary">{formatBytes(totalBytesToday)}</span>
      {budget && (
        <div
          className="w-16 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--color-border-1)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${usedPercent}%`, background: barColor }}
          />
        </div>
      )}
      {totalBytesSaved > 0 && (
        <span className="text-text-muted">Saved: {formatBytes(totalBytesSaved)}</span>
      )}
      {liteModeEnabled && (
        <span className="flex items-center gap-0.5" style={{ color: 'var(--color-accent)' }}>
          <Zap size={9} /> Lite
        </span>
      )}
    </button>
  );
}
