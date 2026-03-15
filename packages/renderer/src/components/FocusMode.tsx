import React, { useState, useEffect } from 'react';
import { Target, Clock, Shield, X, Plus } from 'lucide-react';
import { useFocusStore } from '@/store/focus';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Focus timer display in the StatusBar area
export function FocusIndicator() {
  const { isActive, startedAt } = useFocusStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive || !startedAt) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, startedAt]);

  if (!isActive) return null;

  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--color-accent)' }}>
      <Target size={11} />
      Focused {formatTime(elapsed)}
    </span>
  );
}

// Focus mode blocked page
export function FocusBlockedPage({ url }: { url: string }) {
  const { toggleFocus } = useFocusStore();

  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'var(--color-accent)', color: '#fff' }}>
          <Shield size={28} />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Stay Focused!</h2>
        <p className="text-[14px] text-text-secondary mb-2">
          <span className="font-mono font-medium">{url}</span> is blocked during Focus Mode.
        </p>
        <p className="text-[13px] text-text-muted mb-6">
          Keep going — you're doing great! This site is on your distraction blocklist.
        </p>
        <button
          onClick={toggleFocus}
          className="px-5 py-2 rounded-lg text-[13px] font-medium border transition-colors hover:bg-surface-2"
          style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}
        >
          End Focus Session
        </button>
      </div>
    </div>
  );
}

// Focus mode settings panel (shown in a dropdown from nav bar)
export function FocusSettings({ onClose }: { onClose: () => void }) {
  const { isActive, blockedSites, toggleFocus, addBlockedSite, removeBlockedSite, totalFocusTime } = useFocusStore();
  const [newSite, setNewSite] = useState('');

  const handleAdd = () => {
    if (newSite.trim()) {
      addBlockedSite(newSite.trim());
      setNewSite('');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onClose} />
      <div
        className="absolute top-[36px] right-0 w-[300px] rounded-xl border shadow-2xl z-[100] overflow-hidden"
        style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)', maxHeight: 'calc(100vh - 100px)' }}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
              <Target size={16} style={{ color: 'var(--color-accent)' }} />
              Focus Mode
            </h3>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-2">
              <X size={14} className="text-text-muted" />
            </button>
          </div>

          <button
            onClick={toggleFocus}
            className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all"
            style={{
              background: isActive ? 'var(--color-surface-2)' : 'var(--color-accent)',
              color: isActive ? 'var(--color-text-primary)' : '#fff',
              border: isActive ? '1px solid var(--color-border-1)' : 'none',
            }}
          >
            {isActive ? 'End Focus Session' : 'Start Focus Session'}
          </button>

          {totalFocusTime > 0 && (
            <p className="text-[11px] text-text-muted text-center mt-2">
              <Clock size={10} className="inline mr-1" />
              Total focused today: {formatTime(totalFocusTime)}
            </p>
          )}
        </div>

        <div className="p-4">
          <p className="text-[12px] font-medium text-text-secondary mb-2">Blocked Sites</p>

          <div className="flex gap-2 mb-3">
            <input
              type="text" value={newSite} onChange={e => setNewSite(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Add site to block..."
              className="flex-1 px-3 py-1.5 rounded-lg text-[12px] outline-none border"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
            />
            <button onClick={handleAdd} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-2">
              <Plus size={14} className="text-text-muted" />
            </button>
          </div>

          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {blockedSites.map(site => (
              <div key={site} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-2 group">
                <span className="text-[12px] text-text-secondary">{site}</span>
                <button onClick={() => removeBlockedSite(site)} className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-surface-3">
                  <X size={10} className="text-text-muted" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
