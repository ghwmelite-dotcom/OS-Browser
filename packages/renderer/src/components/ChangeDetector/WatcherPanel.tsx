import React, { useEffect, useState, useCallback } from 'react';
import {
  Eye,
  Plus,
  MoreVertical,
  RefreshCw,
  Pencil,
  Trash2,
  ExternalLink,
  X,
  ChevronDown,
} from 'lucide-react';
import { SidebarPanelProps } from '@/features/registry';
import { useChangeDetectorStore, WatchEntry } from '@/store/change-detector';
import { useTabsStore } from '@/store/tabs';
import DiffViewer from './DiffViewer';

// ── Interval Options ───────────────────────────────────────────────────
const INTERVAL_OPTIONS = [
  { label: 'Every 30 minutes', value: 1_800_000 },
  { label: 'Every 1 hour', value: 3_600_000 },
  { label: 'Every 6 hours', value: 21_600_000 },
  { label: 'Every 12 hours', value: 43_200_000 },
  { label: 'Every day', value: 86_400_000 },
];

function intervalLabel(ms: number): string {
  const opt = INTERVAL_OPTIONS.find(o => o.value === ms);
  if (opt) return opt.label;
  const hours = ms / 3_600_000;
  if (hours < 1) return `Every ${Math.round(ms / 60_000)}min`;
  if (hours < 24) return `Every ${hours}h`;
  return `Every ${Math.round(hours / 24)}d`;
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Never';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Status Dot ─────────────────────────────────────────────────────────
const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  const color =
    status === 'changed' ? '#F59E0B' :
    status === 'error' ? '#EF4444' :
    status === 'pending' ? '#9CA3AF' :
    '#22C55E';

  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        flexShrink: 0,
      }}
      title={status}
    />
  );
};

// ── Add Watch Form ─────────────────────────────────────────────────────
const AddWatchForm: React.FC<{
  stripColor: string;
  onClose: () => void;
  editWatch?: WatchEntry;
}> = ({ stripColor, onClose, editWatch }) => {
  const activeUrl = useTabsStore(s => {
    const active = s.tabs.find(t => t.is_active);
    return active?.url || '';
  });

  const [url, setUrl] = useState(editWatch?.url || activeUrl);
  const [interval, setInterval] = useState(editWatch?.interval || 3_600_000);
  const [selector, setSelector] = useState(editWatch?.selector || '');
  const [title, setTitle] = useState(editWatch?.title || '');
  const [submitting, setSubmitting] = useState(false);

  const { addWatch, updateConfig } = useChangeDetectorStore();

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      if (editWatch) {
        await updateConfig(editWatch.id, {
          interval,
          selector: selector.trim() || undefined,
          title: title.trim() || undefined,
        });
      } else {
        await addWatch(url.trim(), interval, selector.trim() || undefined, title.trim() || undefined);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: '12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border-1)',
    background: 'var(--color-surface-2)',
    color: 'var(--color-text-primary)',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border-1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '12px' }}>
          {editWatch ? 'Edit Watch' : 'Watch a Page'}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Label (optional)"
        style={inputStyle}
      />

      {/* URL */}
      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://example.com"
        style={inputStyle}
        disabled={!!editWatch}
      />

      {/* Interval */}
      <div style={{ position: 'relative' }}>
        <select
          value={interval}
          onChange={e => setInterval(Number(e.target.value))}
          style={{
            ...inputStyle,
            appearance: 'none',
            paddingRight: '28px',
            cursor: 'pointer',
          }}
        >
          {INTERVAL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown
          size={14}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--color-text-muted)',
          }}
        />
      </div>

      {/* CSS Selector */}
      <input
        type="text"
        value={selector}
        onChange={e => setSelector(e.target.value)}
        placeholder="CSS selector (optional, e.g. #content, .main)"
        style={inputStyle}
      />

      <button
        onClick={handleSubmit}
        disabled={submitting || !url.trim()}
        style={{
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 600,
          borderRadius: '6px',
          border: 'none',
          background: stripColor,
          color: '#fff',
          cursor: submitting || !url.trim() ? 'not-allowed' : 'pointer',
          opacity: submitting || !url.trim() ? 0.6 : 1,
          fontFamily: 'inherit',
        }}
      >
        {submitting ? 'Saving...' : editWatch ? 'Update' : 'Start Watching'}
      </button>
    </div>
  );
};

// ── Watch Row ──────────────────────────────────────────────────────────
const WatchRow: React.FC<{
  watch: WatchEntry;
  stripColor: string;
  onViewDiff: (id: string) => void;
  onEdit: (watch: WatchEntry) => void;
}> = ({ watch, stripColor, onViewDiff, onEdit }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { removeWatch, checkNow, markRead } = useChangeDetectorStore();

  const handleCheckNow = () => {
    setMenuOpen(false);
    checkNow(watch.id);
  };

  const handleRemove = () => {
    setMenuOpen(false);
    removeWatch(watch.id);
  };

  const handleEdit = () => {
    setMenuOpen(false);
    onEdit(watch);
  };

  const handleOpenPage = () => {
    (window as any).osBrowser?.tabs?.create(watch.url);
  };

  const displayUrl = (() => {
    try {
      const u = new URL(watch.url);
      return u.hostname + (u.pathname !== '/' ? u.pathname : '');
    } catch {
      return watch.url;
    }
  })();

  return (
    <div
      style={{
        padding: '10px 12px',
        margin: '4px 0',
        borderRadius: '8px',
        background: watch.unread ? `${stripColor}08` : 'var(--color-surface-2)',
        border: watch.unread ? `1px solid ${stripColor}30` : '1px solid transparent',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <StatusDot status={watch.status} />
        <span
          style={{
            flex: 1,
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={watch.url}
        >
          {watch.title || displayUrl}
        </span>

        {/* Three-dot menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px',
              display: 'flex',
            }}
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setMenuOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  background: 'var(--color-surface-1)',
                  border: '1px solid var(--color-border-1)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  zIndex: 100,
                  minWidth: '140px',
                  overflow: 'hidden',
                }}
              >
                <MenuBtn icon={RefreshCw} label="Check Now" onClick={handleCheckNow} />
                <MenuBtn icon={Pencil} label="Edit" onClick={handleEdit} />
                <MenuBtn icon={ExternalLink} label="Open Page" onClick={handleOpenPage} />
                <MenuBtn icon={Trash2} label="Remove" onClick={handleRemove} danger />
              </div>
            </>
          )}
        </div>
      </div>

      {/* URL (smaller, muted) */}
      {watch.title && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '4px',
            paddingLeft: '16px',
          }}
          title={watch.url}
        >
          {displayUrl}
        </div>
      )}

      {/* Status line */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: '16px',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
        }}
      >
        <span>
          {intervalLabel(watch.interval)} | Checked {formatRelativeTime(watch.lastChecked)}
        </span>
      </div>

      {/* Changed badge + view diff button */}
      {watch.status === 'changed' && (
        <div style={{ marginTop: '6px', paddingLeft: '16px' }}>
          <button
            onClick={() => onViewDiff(watch.id)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '4px',
              border: 'none',
              background: `${stripColor}20`,
              color: stripColor,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            View Diff
          </button>
        </div>
      )}

      {/* Error message */}
      {watch.status === 'error' && watch.errorMessage && (
        <div
          style={{
            marginTop: '4px',
            paddingLeft: '16px',
            fontSize: '10px',
            color: '#EF4444',
          }}
        >
          {watch.errorMessage}
        </div>
      )}
    </div>
  );
};

const MenuBtn: React.FC<{
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon: Icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      padding: '8px 12px',
      fontSize: '12px',
      border: 'none',
      background: 'transparent',
      color: danger ? '#EF4444' : 'var(--color-text-primary)',
      cursor: 'pointer',
      fontFamily: 'inherit',
      textAlign: 'left',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
  >
    <Icon size={13} />
    {label}
  </button>
);

// ── Main Panel ─────────────────────────────────────────────────────────
const WatcherPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
  const { watches, init, viewDiff, viewingDiffId, currentDiff, closeDiff, isLoading } =
    useChangeDetectorStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWatch, setEditingWatch] = useState<WatchEntry | null>(null);

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  const handleViewDiff = useCallback(
    async (id: string) => {
      await viewDiff(id);
    },
    [viewDiff],
  );

  const handleEdit = (watch: WatchEntry) => {
    setEditingWatch(watch);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingWatch(null);
  };

  // Find the watch being viewed in diff mode
  const diffWatch = viewingDiffId ? watches.find(w => w.id === viewingDiffId) : null;

  // If viewing a diff, show the diff viewer instead
  if (diffWatch && currentDiff) {
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
        <DiffViewer
          watch={diffWatch}
          diff={currentDiff}
          stripColor={stripColor}
          onClose={closeDiff}
        />
      </div>
    );
  }

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
          <Eye size={16} style={{ color: stripColor }} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Change Detector</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => {
              setEditingWatch(null);
              setShowAddForm(!showAddForm);
            }}
            title="Watch a page"
            style={{
              background: showAddForm ? `${stripColor}20` : 'transparent',
              border: 'none',
              color: showAddForm ? stripColor : 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
            }}
          >
            <Plus size={16} />
          </button>
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
      </div>

      {/* Add/Edit form */}
      {showAddForm && (
        <AddWatchForm
          stripColor={stripColor}
          onClose={handleCloseForm}
          editWatch={editingWatch || undefined}
        />
      )}

      {/* Summary bar */}
      <div
        style={{
          padding: '8px 16px',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          borderBottom: '1px solid var(--color-border-1)',
        }}
      >
        {watches.length === 0
          ? 'No pages being watched'
          : `${watches.length} page${watches.length !== 1 ? 's' : ''} watched`}
        {watches.filter(w => w.unread).length > 0 && (
          <span style={{ color: stripColor, fontWeight: 600, marginLeft: '8px' }}>
            {watches.filter(w => w.unread).length} changed
          </span>
        )}
      </div>

      {/* Watch list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {isLoading && watches.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--color-text-muted)',
              fontSize: '13px',
            }}
          >
            Loading...
          </div>
        ) : watches.length === 0 ? (
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
            <Eye size={32} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: '13px' }}>No pages being watched</span>
            <span style={{ fontSize: '11px' }}>
              Click the + button to start watching a page for changes.
            </span>
          </div>
        ) : (
          watches.map(watch => (
            <WatchRow
              key={watch.id}
              watch={watch}
              stripColor={stripColor}
              onViewDiff={handleViewDiff}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>
    </div>
  );
};

export { WatcherPanel };
export default WatcherPanel;
