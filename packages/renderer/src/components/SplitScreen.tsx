import React, { useState, useRef, useCallback } from 'react';
import { X, ArrowLeftRight, Columns } from 'lucide-react';
import { useSplitScreenStore } from '@/store/splitscreen';
import { useTabsStore } from '@/store/tabs';

// Tab picker modal — shown when activating split screen
export function SplitScreenPicker({ onClose }: { onClose: () => void }) {
  const { tabs, activeTabId } = useTabsStore();
  const { activate } = useSplitScreenStore();

  const otherTabs = tabs.filter(t => t.id !== activeTabId && t.url !== 'os-browser://newtab');

  if (otherTabs.length === 0) {
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative rounded-xl border p-6 text-center max-w-sm"
          style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
          onClick={e => e.stopPropagation()}>
          <Columns size={32} className="mx-auto mb-3 text-text-muted" />
          <h3 className="text-[15px] font-bold text-text-primary mb-2">Need More Tabs</h3>
          <p className="text-[13px] text-text-secondary mb-4">
            Open at least 2 tabs with websites to use Split Screen.
          </p>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-medium"
            style={{ background: 'var(--color-accent)', color: '#fff' }}>
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-[400px] rounded-xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
        onClick={e => e.stopPropagation()}>

        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
          <h3 className="text-[15px] font-bold text-text-primary flex items-center gap-2">
            <Columns size={18} style={{ color: 'var(--color-accent)' }} />
            Split Screen
          </h3>
          <p className="text-[12px] text-text-muted mt-1">
            Choose a tab to show on the right side
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-text-muted"
              style={{ background: 'var(--color-surface-3)' }}>
              Ctrl+Shift+<span className="text-[11px]">&larr;</span> Snap Left
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-text-muted"
              style={{ background: 'var(--color-surface-3)' }}>
              Ctrl+Shift+<span className="text-[11px]">&rarr;</span> Snap Right
            </span>
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto py-2">
          {otherTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (activeTabId) {
                  activate(activeTabId, tab.id);
                }
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors"
            >
              <div className="w-5 h-5 rounded bg-surface-3 flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ color: 'var(--color-accent)' }}>
                {(tab.title || 'T').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-text-primary truncate">{tab.title || 'New Tab'}</div>
                <div className="text-[11px] text-text-muted truncate">{tab.url}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Split screen divider handle
function Divider({ onDrag }: { onDrag: (ratio: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current?.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      onDrag(ratio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onDrag]);

  return (
    <div
      ref={containerRef}
      className={`w-[6px] shrink-0 cursor-col-resize flex items-center justify-center group transition-colors
        ${isDragging ? '' : 'hover:bg-surface-3'}`}
      style={{ background: isDragging ? 'var(--color-accent)' : 'var(--color-border-1)' }}
      onMouseDown={handleMouseDown}
    >
      <div className="w-1 h-8 rounded-full bg-text-muted/30 group-hover:bg-text-muted/60" />
    </div>
  );
}

// Split screen toolbar (shown above the split content)
export function SplitScreenToolbar() {
  const { isActive, deactivate, swapPanes, leftTabId, rightTabId } = useSplitScreenStore();
  const { tabs } = useTabsStore();

  if (!isActive) return null;

  const leftTab = tabs.find(t => t.id === leftTabId);
  const rightTab = tabs.find(t => t.id === rightTabId);

  return (
    <div className="h-7 flex items-center justify-between px-3 shrink-0 border-b"
      style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}>
      <div className="flex items-center gap-2">
        <Columns size={12} style={{ color: 'var(--color-accent)' }} />
        <span className="text-[11px] text-text-muted">
          {leftTab?.title || 'Left'} | {rightTab?.title || 'Right'}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={swapPanes} className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-3" title="Swap panes">
          <ArrowLeftRight size={11} className="text-text-muted" />
        </button>
        <button onClick={deactivate} className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-3" title="Exit split screen">
          <X size={11} className="text-text-muted" />
        </button>
      </div>
    </div>
  );
}

// Main split screen content area
export function SplitScreenContent() {
  const { splitRatio, setSplitRatio, leftTabId, rightTabId } = useSplitScreenStore();
  const { tabs, switchTab } = useTabsStore();

  const leftTab = tabs.find(t => t.id === leftTabId);
  const rightTab = tabs.find(t => t.id === rightTabId);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left pane */}
      <div
        className="overflow-hidden flex flex-col border-r"
        style={{ width: `${splitRatio * 100}%`, borderColor: 'var(--color-border-1)' }}
        onClick={() => leftTabId && switchTab(leftTabId)}
      >
        <div className="h-6 flex items-center px-2 shrink-0 border-b"
          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}>
          <span className="text-[10px] text-text-muted truncate">{leftTab?.title || 'Left Pane'}</span>
        </div>
        <div className="flex-1" style={{ pointerEvents: 'none' }}>
          {/* WebContentsView renders here natively */}
        </div>
      </div>

      {/* Drag handle */}
      <Divider onDrag={setSplitRatio} />

      {/* Right pane */}
      <div
        className="overflow-hidden flex flex-col"
        style={{ width: `${(1 - splitRatio) * 100}%` }}
        onClick={() => rightTabId && switchTab(rightTabId)}
      >
        <div className="h-6 flex items-center px-2 shrink-0 border-b"
          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}>
          <span className="text-[10px] text-text-muted truncate">{rightTab?.title || 'Right Pane'}</span>
        </div>
        <div className="flex-1" style={{ pointerEvents: 'none' }}>
          {/* WebContentsView renders here natively */}
        </div>
      </div>
    </div>
  );
}
