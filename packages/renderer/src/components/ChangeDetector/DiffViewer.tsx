import React from 'react';
import { ExternalLink, Check, X } from 'lucide-react';
import { DiffResult, WatchEntry, useChangeDetectorStore } from '@/store/change-detector';

interface DiffViewerProps {
  watch: WatchEntry;
  diff: DiffResult;
  stripColor: string;
  onClose: () => void;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ watch, diff, stripColor, onClose }) => {
  const { markRead } = useChangeDetectorStore();

  const handleMarkRead = () => {
    markRead(watch.id);
    onClose();
  };

  const handleOpenPage = () => {
    (window as any).osBrowser?.tabs?.create(watch.url);
  };

  // Only show diff lines that are additions or removals, plus a few context lines
  const significantLines = diff.lines.filter(l => l.type !== 'same').slice(0, 200);
  const hasMore = diff.lines.filter(l => l.type !== 'same').length > 200;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Change Diff</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={watch.url}
        >
          {watch.title || watch.url}
        </span>

        {/* Summary */}
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
          <span style={{ color: '#22C55E' }}>+{diff.summary.added} added</span>
          <span style={{ color: '#EF4444' }}>-{diff.summary.removed} removed</span>
          {watch.lastChecked && (
            <span style={{ color: 'var(--color-text-muted)' }}>
              {formatRelativeTime(watch.lastChecked)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleMarkRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              border: '1px solid var(--color-border-1)',
              background: `${stripColor}15`,
              color: stripColor,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            <Check size={12} />
            Mark as Read
          </button>
          <button
            onClick={handleOpenPage}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              border: '1px solid var(--color-border-1)',
              background: 'transparent',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <ExternalLink size={12} />
            Open Page
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", monospace',
          fontSize: '11px',
          lineHeight: '1.6',
        }}
      >
        {significantLines.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '13px',
            }}
          >
            No visible text changes detected.
          </div>
        ) : (
          significantLines.map((line, i) => (
            <div
              key={i}
              style={{
                padding: '2px 8px',
                borderRadius: '3px',
                marginBottom: '1px',
                wordBreak: 'break-all',
                ...(line.type === 'add'
                  ? { background: '#10B98120', color: '#059669' }
                  : line.type === 'remove'
                    ? { background: '#EF444420', color: '#DC2626', textDecoration: 'line-through' }
                    : { color: 'var(--color-text-muted)' }),
              }}
            >
              <span style={{ userSelect: 'none', opacity: 0.5, marginRight: '8px' }}>
                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
              </span>
              {line.text || '\u00A0'}
            </div>
          ))
        )}
        {hasMore && (
          <div
            style={{
              padding: '8px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '11px',
              fontStyle: 'italic',
            }}
          >
            ... and more changes (showing first 200 lines)
          </div>
        )}
      </div>
    </div>
  );
};

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export { DiffViewer };
export default DiffViewer;
