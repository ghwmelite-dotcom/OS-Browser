import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck } from 'lucide-react';

export function DumsorGuardIndicator() {
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [saving, setSaving] = useState(false);

  // Simulate auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSaving(true);
      setTimeout(() => {
        setLastSaved(Date.now());
        setSaving(false);
      }, 500);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const secondsAgo = Math.floor((Date.now() - lastSaved) / 1000);
  const timeLabel = secondsAgo < 5 ? 'just now' : secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <span
      className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:bg-surface-2 px-1.5 py-0.5 rounded transition-colors"
      title="Dumsor Guard — Session auto-saved"
    >
      {saving ? (
        <>
          <Shield size={11} className="animate-pulse" style={{ color: 'var(--color-accent)' }} />
          <span className="text-text-muted">Saving...</span>
        </>
      ) : (
        <>
          <ShieldCheck size={11} style={{ color: '#006B3F' }} />
          <span className="text-text-muted">Saved {timeLabel}</span>
        </>
      )}
    </span>
  );
}
