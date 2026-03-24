import React, { useEffect } from 'react';
import { Zap, X } from 'lucide-react';

interface MemorySaverBannerProps {
  tabId: string;
  memorySavedBytes: number;
  domain: string;
  onDismiss: () => void;
  onExcludeSite: (domain: string) => void;
}

export function MemorySaverBanner({ tabId, memorySavedBytes, domain, onDismiss, onExcludeSite }: MemorySaverBannerProps) {
  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const savedMB = (memorySavedBytes / (1024 * 1024)).toFixed(0);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px',
      background: 'var(--color-surface-1)',
      borderBottom: '1px solid var(--color-border-1)',
      fontSize: 13,
      color: 'var(--color-text-primary)',
      animation: 'slideDown 200ms ease-out',
    }}>
      {/* Icon */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'rgba(59, 130, 246, 0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Zap size={16} style={{ color: '#3B82F6' }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 600 }}>Memory Saver</span>
        <span style={{ color: 'var(--color-text-secondary)', marginLeft: 6 }}>
          {savedMB !== '0' ? `${savedMB} MB was freed while this tab was inactive.` : 'Memory was freed while this tab was inactive.'}
        </span>
      </div>

      {/* Exclude site button */}
      <button
        onClick={() => onExcludeSite(domain)}
        style={{
          padding: '5px 12px',
          borderRadius: 8,
          border: '1px solid var(--color-border-1)',
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
        title="Always keep this site active"
      >
        Keep active
      </button>

      {/* OK / Dismiss */}
      <button
        onClick={onDismiss}
        style={{
          padding: '5px 16px',
          borderRadius: 8,
          background: '#3B82F6',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          border: 'none',
          flexShrink: 0,
        }}
      >
        OK
      </button>

      {/* Close X */}
      <button
        onClick={onDismiss}
        style={{
          width: 24, height: 24, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-muted)', flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
