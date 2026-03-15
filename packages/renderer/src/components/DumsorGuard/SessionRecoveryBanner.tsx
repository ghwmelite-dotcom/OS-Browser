import React from 'react';
import { Zap, RefreshCw, X } from 'lucide-react';

interface SessionRecoveryBannerProps {
  tabCount: number;
  formCount: number;
  timestamp: string;
  onRestoreAll: () => void;
  onRestoreTabsOnly: () => void;
  onDismiss: () => void;
}

export function SessionRecoveryBanner({
  tabCount,
  formCount,
  timestamp,
  onRestoreAll,
  onRestoreTabsOnly,
  onDismiss,
}: SessionRecoveryBannerProps) {
  return (
    <div
      className="border-b px-4 py-3 animate-fade-up"
      style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
    >
      <div className="max-w-[900px] mx-auto flex items-center gap-4">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(252, 209, 22, 0.15)' }}
        >
          <Zap size={20} style={{ color: 'var(--color-accent)' }} />
        </div>

        {/* Message */}
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-text-primary">
            ⚡ Dumsor Guard recovered your session from {timestamp}
          </p>
          <p className="text-[12px] text-text-muted">
            {tabCount} tab{tabCount !== 1 ? 's' : ''}
            {formCount > 0
              ? `, ${formCount} form${formCount !== 1 ? 's' : ''} with unsaved data`
              : ''}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRestoreAll}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{ background: 'var(--color-accent)', color: '#000' }}
          >
            <RefreshCw size={12} className="inline mr-1" />
            Restore Everything
          </button>
          {formCount > 0 && (
            <button
              onClick={onRestoreTabsOnly}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium border hover:bg-surface-3"
              style={{
                borderColor: 'var(--color-border-1)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Tabs Only
            </button>
          )}
          <button
            onClick={onDismiss}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-3"
          >
            <X size={14} className="text-text-muted" />
          </button>
        </div>
      </div>
    </div>
  );
}
