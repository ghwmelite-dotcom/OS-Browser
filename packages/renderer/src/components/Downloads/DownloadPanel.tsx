import React, { useEffect } from 'react';
import {
  Download,
  Pause,
  Play,
  X,
  RotateCcw,
  Trash2,
  CheckCircle,
  AlertCircle,
  ArrowDownToLine,
} from 'lucide-react';
import { SidebarPanelProps } from '@/features/registry';
import { useDownloadStore, DownloadItem } from '@/store/downloads';

// ── Format helpers ───────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '—';
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatETA(seconds: number): string {
  if (seconds <= 0) return '';
  if (seconds < 60) return `${seconds}s left`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s left`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m left`;
}

function stateColor(state: string): string {
  switch (state) {
    case 'downloading': return '#22C55E';
    case 'paused':      return '#F59E0B';
    case 'failed':
    case 'cancelled':   return '#EF4444';
    case 'completed':   return '#6B7280';
    default:            return '#6B7280';
  }
}

function stateLabel(state: string): string {
  switch (state) {
    case 'downloading': return 'Downloading';
    case 'paused':      return 'Paused';
    case 'failed':      return 'Failed';
    case 'cancelled':   return 'Cancelled';
    case 'completed':   return 'Completed';
    default:            return state;
  }
}

// ── Single download row ──────────────────────────────────────────────
const DownloadRow: React.FC<{ item: DownloadItem; stripColor: string }> = ({ item, stripColor }) => {
  const { pauseDownload, resumeDownload, cancelDownload, retryDownload } = useDownloadStore();
  const pct = item.totalBytes > 0 ? Math.round((item.receivedBytes / item.totalBytes) * 100) : 0;
  const isActive = item.state === 'downloading' || item.state === 'paused';
  const isFailed = item.state === 'failed' || item.state === 'cancelled';

  return (
    <div
      style={{
        padding: '10px 12px',
        margin: '4px 0',
        borderRadius: '8px',
        background: 'var(--color-surface-2)',
      }}
    >
      {/* Filename + state badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <ArrowDownToLine size={14} style={{ color: stripColor, flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={item.filename}
        >
          {item.filename}
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '4px',
            background: `${stateColor(item.state)}20`,
            color: stateColor(item.state),
            whiteSpace: 'nowrap',
          }}
        >
          {stateLabel(item.state)}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '4px',
          borderRadius: '2px',
          background: 'var(--color-surface-3, rgba(0,0,0,0.1))',
          marginBottom: '6px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: '2px',
            background: stateColor(item.state),
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Info line: size, speed, ETA */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          marginBottom: '6px',
        }}
      >
        <span>
          {formatBytes(item.receivedBytes)}
          {item.totalBytes > 0 ? ` / ${formatBytes(item.totalBytes)}` : ''}
          {item.totalBytes > 0 ? ` (${pct}%)` : ''}
        </span>
        <span>
          {item.state === 'downloading' && (
            <>
              {formatSpeed(item.speed)}
              {item.eta > 0 && ` \u00B7 ${formatETA(item.eta)}`}
            </>
          )}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {item.state === 'downloading' && (
          <ActionBtn icon={Pause} label="Pause" onClick={() => pauseDownload(item.id)} />
        )}
        {item.state === 'paused' && (
          <ActionBtn icon={Play} label="Resume" onClick={() => resumeDownload(item.id)} />
        )}
        {isActive && (
          <ActionBtn icon={X} label="Cancel" onClick={() => cancelDownload(item.id)} />
        )}
        {isFailed && (
          <ActionBtn icon={RotateCcw} label="Retry" onClick={() => retryDownload(item.id)} />
        )}
      </div>
    </div>
  );
};

const ActionBtn: React.FC<{ icon: React.ElementType; label: string; onClick: () => void }> = ({
  icon: Icon,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    title={label}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      fontSize: '11px',
      borderRadius: '4px',
      border: '1px solid var(--color-border-1)',
      background: 'transparent',
      color: 'var(--color-text-primary)',
      cursor: 'pointer',
      fontFamily: 'inherit',
    }}
  >
    <Icon size={12} />
    {label}
  </button>
);

// ── Main Panel ───────────────────────────────────────────────────────
const DownloadPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
  const { downloads, clearCompleted, init } = useDownloadStore();

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  const activeDownloads = downloads.filter(d => d.state === 'downloading' || d.state === 'paused');
  const totalSpeed = activeDownloads.reduce((sum, d) => sum + d.speed, 0);
  const hasCompleted = downloads.some(
    d => d.state === 'completed' || d.state === 'failed' || d.state === 'cancelled',
  );

  return (
    <div
      style={{
        width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `3px solid ${stripColor}`,
        background: 'var(--color-surface-1)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--color-border-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} style={{ color: stripColor }} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Downloads</span>
        </div>
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
          {'\u00D7'}
        </button>
      </div>

      {/* Summary bar */}
      <div
        style={{
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          borderBottom: '1px solid var(--color-border-1)',
        }}
      >
        <span>
          {activeDownloads.length > 0
            ? `${activeDownloads.length} active \u00B7 ${formatSpeed(totalSpeed)}`
            : `${downloads.length} download${downloads.length !== 1 ? 's' : ''}`}
        </span>
        {hasCompleted && (
          <button
            onClick={clearCompleted}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid var(--color-border-1)',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Trash2 size={11} />
            Clear Completed
          </button>
        )}
      </div>

      {/* Download list (scrollable) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {downloads.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--color-text-muted)',
              gap: '12px',
              padding: '40px 16px',
              textAlign: 'center',
            }}
          >
            <Download size={32} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: '13px' }}>No downloads yet</span>
          </div>
        ) : (
          downloads
            .slice()
            .sort((a, b) => b.startedAt - a.startedAt)
            .map(item => <DownloadRow key={item.id} item={item} stripColor={stripColor} />)
        )}
      </div>
    </div>
  );
};

export { DownloadPanel };
export default DownloadPanel;
