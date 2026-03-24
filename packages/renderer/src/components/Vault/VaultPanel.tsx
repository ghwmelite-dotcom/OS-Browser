import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  Grid3X3,
  List,
  Trash2,
  Calendar,
  X,
  Download,
  ChevronLeft,
  Camera,
  Clock,
  Hash,
  ExternalLink,
} from 'lucide-react';
import { SidebarPanelProps } from '@/features/registry';
import { useVaultStore, VaultEntry } from '@/store/vault';

// ── Format helpers ───────────────────────────────────────────────────
function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;

    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return ts;
  }
}

function formatFullTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return ts;
  }
}

function truncateHash(hash: string): string {
  return hash.slice(0, 8);
}

function actionLabel(action: string): string {
  switch (action) {
    case 'pre-submit': return 'Auto';
    case 'post-submit': return 'Auto';
    case 'manual': return 'Manual';
    default: return action;
  }
}

function actionColor(action: string): string {
  switch (action) {
    case 'pre-submit': return '#10B981';
    case 'post-submit': return '#10B981';
    case 'manual': return '#D4A017';
    default: return '#6B7280';
  }
}

// ── Entry Detail View ────────────────────────────────────────────────
function EntryDetail({
  entry,
  onBack,
  onDelete,
}: {
  entry: VaultEntry;
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getImage } = useVaultStore();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getImage(entry.id).then(data => {
      if (!cancelled) {
        setImageData(data);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [entry.id, getImage]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border-1)' }}>
        <button onClick={onBack}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors">
          <ChevronLeft size={16} className="text-text-secondary" />
        </button>
        <span className="text-[13px] font-semibold text-text-primary flex-1 truncate">
          {entry.title || 'Untitled'}
        </span>
      </div>

      {/* Screenshot */}
      <div className="p-3 flex-1 overflow-y-auto">
        <div className="rounded-xl overflow-hidden border mb-3"
          style={{ borderColor: 'var(--color-border-1)' }}>
          {isLoading ? (
            <div className="w-full aspect-video flex items-center justify-center"
              style={{ background: 'var(--color-surface-2)' }}>
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--color-border-2)', borderTopColor: 'transparent' }} />
            </div>
          ) : imageData ? (
            <img
              src={`data:image/png;base64,${imageData}`}
              alt={entry.title}
              className="w-full"
              style={{ imageRendering: 'auto' }}
            />
          ) : (
            <div className="w-full aspect-video flex items-center justify-center text-text-muted text-[12px]"
              style={{ background: 'var(--color-surface-2)' }}>
              Image unavailable
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          {/* URL */}
          <div className="flex items-start gap-2">
            <ExternalLink size={13} className="text-text-muted mt-0.5 shrink-0" />
            <span className="text-[12px] text-text-secondary break-all">{entry.url}</span>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-text-muted shrink-0" />
            <span className="text-[12px] text-text-secondary">{formatFullTimestamp(entry.timestamp)}</span>
          </div>

          {/* Type */}
          <div className="flex items-center gap-2">
            <Camera size={13} className="text-text-muted shrink-0" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: `${actionColor(entry.pageAction)}20`, color: actionColor(entry.pageAction) }}>
              {actionLabel(entry.pageAction)}
            </span>
          </div>

          {/* SHA-256 Hash */}
          <div className="flex items-center gap-2">
            <Hash size={13} className="text-text-muted shrink-0" />
            <span className="text-[11px] font-mono text-text-muted" title={entry.sha256Hash}>
              SHA-256: {entry.sha256Hash}
            </span>
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(entry.id)}
          className="w-full mt-4 py-2 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1.5 border transition-colors hover:bg-red-500/10"
          style={{ borderColor: 'var(--color-border-1)', color: '#EF4444' }}
        >
          <Trash2 size={13} />
          Delete Capture
        </button>
      </div>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────
const VaultPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
  const {
    entries,
    totalCaptures,
    isLoading,
    search,
    viewMode,
    setSearch,
    setViewMode,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    loadEntries,
    loadStats,
    captureCurrentPage,
    deleteEntry,
  } = useVaultStore();

  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Load data on mount
  useEffect(() => {
    loadEntries();
    loadStats();
  }, [loadEntries, loadStats]);

  // Load thumbnails for visible entries
  useEffect(() => {
    const loadThumbs = async () => {
      const osBrowser = (window as any).osBrowser;
      if (!osBrowser?.vault) return;

      for (const entry of entries) {
        if (thumbnails[entry.id]) continue;
        try {
          const data = await osBrowser.vault.getImage(entry.id);
          if (data) {
            setThumbnails(prev => ({ ...prev, [entry.id]: data }));
          }
        } catch {}
      }
    };
    if (entries.length > 0) loadThumbs();
  }, [entries]);

  const handleCapture = useCallback(async () => {
    setIsCapturing(true);
    // Show web views for accurate capture
    (window as any).osBrowser?.showWebViews?.();
    await new Promise(r => setTimeout(r, 300));
    await captureCurrentPage('manual');
    setIsCapturing(false);
  }, [captureCurrentPage]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteEntry(id);
    setSelectedEntry(null);
    // Clear thumbnail cache for deleted entry
    setThumbnails(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [deleteEntry]);

  // ── Detail view ──
  if (selectedEntry) {
    return (
      <div className="h-full flex flex-col" style={{ width, background: 'var(--color-surface-1)' }}>
        <EntryDetail entry={selectedEntry} onBack={() => setSelectedEntry(null)} onDelete={handleDelete} />
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="h-full flex flex-col" style={{ width, background: 'var(--color-surface-1)' }}>
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} style={{ color: stripColor }} />
            <h2 className="text-[15px] font-bold text-text-primary">Interaction Vault</h2>
          </div>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors">
            <X size={14} className="text-text-muted" />
          </button>
        </div>

        {/* Capture button */}
        <button
          onClick={handleCapture}
          disabled={isCapturing}
          className="w-full py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all mb-3 disabled:opacity-50"
          style={{ background: stripColor, color: '#fff' }}
        >
          <Camera size={14} />
          {isCapturing ? 'Capturing...' : 'Capture This Page'}
        </button>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}>
            <Search size={13} className="text-text-muted shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search captures..."
              className="flex-1 bg-transparent text-[12px] outline-none text-text-primary placeholder:text-text-muted"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-text-muted hover:text-text-secondary">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Date filter toggle */}
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${showDateFilter ? 'bg-surface-3' : 'hover:bg-surface-2'}`}
            title="Date filter"
          >
            <Calendar size={14} className="text-text-muted" />
          </button>

          {/* View mode toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors"
            title={viewMode === 'grid' ? 'List view' : 'Grid view'}
          >
            {viewMode === 'grid' ? <List size={14} className="text-text-muted" /> : <Grid3X3 size={14} className="text-text-muted" />}
          </button>
        </div>

        {/* Date range filter */}
        {showDateFilter && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="flex-1 px-2 py-1 rounded-lg text-[11px] outline-none border"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
            />
            <span className="text-[11px] text-text-muted">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="flex-1 px-2 py-1 rounded-lg text-[11px] outline-none border"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
            />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-text-muted hover:text-text-secondary">
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-text-muted">
            {entries.length} capture{entries.length !== 1 ? 's' : ''}
            {totalCaptures > entries.length ? ` (${totalCaptures} total)` : ''}
          </span>
        </div>
      </div>

      {/* ── Entries ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--color-border-2)', borderTopColor: 'transparent' }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <ShieldCheck size={40} className="text-text-muted mb-3 opacity-30" />
            <p className="text-[13px] font-medium text-text-secondary mb-1">No captures yet</p>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Capture proof of your interactions on government websites. Click "Capture This Page" or visit a .gov.gh site for automatic captures.
            </p>
          </div>
        ) : viewMode === 'list' ? (
          /* ── List View ── */
          <div className="divide-y" style={{ borderColor: 'var(--color-border-1)' }}>
            {entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-[60px] h-[45px] rounded-lg overflow-hidden shrink-0 border"
                  style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-2)' }}>
                  {thumbnails[entry.id] ? (
                    <img
                      src={`data:image/png;base64,${thumbnails[entry.id]}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShieldCheck size={16} className="text-text-muted opacity-30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[12px] font-medium text-text-primary truncate">
                      {entry.title || 'Untitled'}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0"
                      style={{ background: `${actionColor(entry.pageAction)}20`, color: actionColor(entry.pageAction) }}>
                      {actionLabel(entry.pageAction)}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted truncate">{entry.url}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-text-muted">{formatTimestamp(entry.timestamp)}</span>
                    <span className="text-[9px] font-mono text-text-muted opacity-60" title={`SHA-256: ${entry.sha256Hash}`}>
                      #{truncateHash(entry.sha256Hash)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* ── Grid View ── */
          <div className="grid grid-cols-2 gap-2 p-3">
            {entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="rounded-xl overflow-hidden border text-left hover:border-opacity-80 transition-all group"
                style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-2)' }}
              >
                {/* Thumbnail */}
                <div className="w-full aspect-[4/3] overflow-hidden">
                  {thumbnails[entry.id] ? (
                    <img
                      src={`data:image/png;base64,${thumbnails[entry.id]}`}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: 'var(--color-surface-3)' }}>
                      <ShieldCheck size={20} className="text-text-muted opacity-30" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="px-2.5 py-2">
                  <p className="text-[11px] font-medium text-text-primary truncate">{entry.title || 'Untitled'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] text-text-muted">{formatTimestamp(entry.timestamp)}</span>
                    <span className="inline-flex items-center px-1 py-0 rounded-full text-[8px] font-bold"
                      style={{ background: `${actionColor(entry.pageAction)}20`, color: actionColor(entry.pageAction) }}>
                      {actionLabel(entry.pageAction)}
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-text-muted opacity-50 block mt-0.5">
                    #{truncateHash(entry.sha256Hash)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { VaultPanel };
export default VaultPanel;
