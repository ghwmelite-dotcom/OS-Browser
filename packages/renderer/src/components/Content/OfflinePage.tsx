import React, { useState, useMemo } from 'react';
import {
  WifiOff, Search, Trash2, Download, Clock, ArrowUpDown, RefreshCw,
  CheckCircle2, AlertCircle, Loader2, HardDrive, FileText, Globe,
  Plus, Shield, Lightbulb, X, Send, ToggleLeft, ToggleRight,
  SortAsc, SortDesc, Archive,
} from 'lucide-react';
import { useOfflineStore, type SavedPage, type QueuedSubmission } from '@/store/offline';
import { useTabsStore } from '@/store/tabs';

// ── Ghana flag palette ────────────────────────────────────────────────────
const GHANA_GREEN = '#006B3F';
const GHANA_GOLD  = '#D4A017';
const GHANA_RED   = '#CE1126';

// ── Category styling ──────────────────────────────────────────────────────
const CATEGORY_STYLES: Record<SavedPage['category'], { bg: string; text: string; border: string; label: string }> = {
  manual:       { bg: 'rgba(59,130,246,0.10)',  text: '#3b82f6', border: 'rgba(59,130,246,0.30)', label: 'Manual' },
  'auto-cached': { bg: 'rgba(212,160,23,0.10)', text: GHANA_GOLD, border: 'rgba(212,160,23,0.30)', label: 'Auto' },
  gov:          { bg: 'rgba(0,107,63,0.10)',     text: GHANA_GREEN, border: 'rgba(0,107,63,0.30)', label: 'Gov' },
};

// ── Status styling ────────────────────────────────────────────────────────
const STATUS_STYLES: Record<QueuedSubmission['status'], { bg: string; text: string; border: string; label: string }> = {
  pending:    { bg: 'rgba(212,160,23,0.10)', text: GHANA_GOLD, border: 'rgba(212,160,23,0.30)', label: 'Pending' },
  submitting: { bg: 'rgba(59,130,246,0.10)', text: '#3b82f6', border: 'rgba(59,130,246,0.30)', label: 'Submitting' },
  failed:     { bg: 'rgba(206,17,38,0.10)',  text: GHANA_RED, border: 'rgba(206,17,38,0.30)', label: 'Failed' },
  submitted:  { bg: 'rgba(0,107,63,0.10)',   text: '#22c55e', border: 'rgba(0,107,63,0.30)', label: 'Submitted' },
};

// ── Helpers ───────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function getLetterIcon(title: string): string {
  return (title || '?').charAt(0).toUpperCase();
}

type SortMode = 'recent' | 'largest' | 'az';
type TabId = 'saved' | 'queue' | 'settings';

// ── Tab Pill Button ────────────────────────────────────────────────────────
function TabPill({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 16px', borderRadius: 20,
        fontSize: 13, fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        border: active ? `1.5px solid ${GHANA_GREEN}` : '1px solid var(--color-border-1)',
        background: active ? 'rgba(0,107,63,0.12)' : 'var(--color-surface-1)',
        color: active ? GHANA_GREEN : 'var(--color-text-secondary)',
        transition: 'all 120ms',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <span style={{
        fontSize: 10, fontWeight: 600,
        background: active ? 'rgba(0,107,63,0.18)' : 'var(--color-surface-2)',
        color: active ? GHANA_GREEN : 'var(--color-text-muted)',
        borderRadius: 8, padding: '1px 6px',
        border: active ? '1px solid rgba(0,107,63,0.35)' : '1px solid var(--color-border-1)',
      }}>{count}</span>
    </button>
  );
}

// ── Sort Pill ──────────────────────────────────────────────────────────────
function SortPill({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 8,
        fontSize: 11, fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        border: active ? `1px solid ${GHANA_GOLD}` : '1px solid var(--color-border-1)',
        background: active ? 'rgba(212,160,23,0.10)' : 'transparent',
        color: active ? GHANA_GOLD : 'var(--color-text-muted)',
        transition: 'all 100ms',
      }}
    >
      {label}
    </button>
  );
}

// ── Saved Page Card ────────────────────────────────────────────────────────
function SavedPageCard({ page, onOpen, onDelete }: {
  page: SavedPage; onOpen: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cat = CATEGORY_STYLES[page.category];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-1)',
        borderRadius: 14,
        padding: 16,
        cursor: 'pointer',
        transition: 'transform 120ms ease-out, box-shadow 120ms ease-out',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.10)' : '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 140,
      }}
      onClick={onOpen}
    >
      {/* Header: icon + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Favicon or letter icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: cat.bg,
          border: `1px solid ${cat.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: cat.text,
          flexShrink: 0,
        }}>
          {page.favicon ? (
            <img
              src={page.favicon}
              alt=""
              style={{ width: 22, height: 22, borderRadius: 4 }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.textContent = getLetterIcon(page.title);
              }}
            />
          ) : (
            getLetterIcon(page.title)
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {page.title}
          </div>
          <div style={{
            fontSize: 11, color: 'var(--color-text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginTop: 2,
          }}>
            {page.url}
          </div>
        </div>
      </div>

      {/* Meta row: date, size, category */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
        <span style={{
          fontSize: 10, color: 'var(--color-text-muted)',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <Clock size={10} />
          {formatRelativeTime(page.savedAt)}
        </span>

        <span style={{
          fontSize: 10, fontWeight: 600,
          color: 'var(--color-text-muted)',
          background: 'var(--color-surface-2)',
          borderRadius: 6, padding: '1px 6px',
          border: '1px solid var(--color-border-1)',
        }}>
          {formatBytes(page.size)}
        </span>

        <span style={{
          fontSize: 10, fontWeight: 600,
          color: cat.text,
          background: cat.bg,
          border: `1px solid ${cat.border}`,
          borderRadius: 6, padding: '1px 6px',
        }}>
          {cat.label}
        </span>
      </div>

      {/* Hover actions */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        display: 'flex', gap: 4,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 150ms',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          title="Open Offline"
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(0,107,63,0.12)',
            border: '1px solid rgba(0,107,63,0.30)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Globe size={13} style={{ color: GHANA_GREEN }} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete"
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(206,17,38,0.10)',
            border: '1px solid rgba(206,17,38,0.25)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Trash2 size={13} style={{ color: GHANA_RED }} />
        </button>
      </div>
    </div>
  );
}

// ── Submission Queue Item ──────────────────────────────────────────────────
function SubmissionItem({ sub, onRetry, onRemove }: {
  sub: QueuedSubmission; onRetry: () => void; onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const st = STATUS_STYLES[sub.status];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-1)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'background 100ms',
        ...(hovered ? { background: 'var(--color-surface-2)' } : {}),
      }}
    >
      {/* Status icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: st.bg,
        border: `1px solid ${st.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {sub.status === 'pending' && <Clock size={16} style={{ color: st.text }} />}
        {sub.status === 'submitting' && <Loader2 size={16} style={{ color: st.text, animation: 'spin 1s linear infinite' }} />}
        {sub.status === 'failed' && <AlertCircle size={16} style={{ color: st.text }} />}
        {sub.status === 'submitted' && <CheckCircle2 size={16} style={{ color: st.text }} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {sub.description}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--color-text-muted)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginTop: 2,
        }}>
          {sub.method} {sub.url}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Queued {formatRelativeTime(sub.queuedAt)}</span>
          {sub.retryCount > 0 && (
            <span style={{ color: GHANA_RED }}>
              {sub.retryCount} retr{sub.retryCount === 1 ? 'y' : 'ies'}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: st.text,
        background: st.bg,
        border: `1px solid ${st.border}`,
        borderRadius: 6, padding: '2px 8px',
        flexShrink: 0,
      }}>
        {st.label}
      </span>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, opacity: hovered ? 1 : 0, transition: 'opacity 150ms', flexShrink: 0 }}>
        {sub.status === 'failed' && (
          <button
            onClick={onRetry}
            title="Retry"
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(212,160,23,0.12)',
              border: '1px solid rgba(212,160,23,0.30)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshCw size={13} style={{ color: GHANA_GOLD }} />
          </button>
        )}
        <button
          onClick={onRemove}
          title="Remove"
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(206,17,38,0.08)',
            border: '1px solid rgba(206,17,38,0.20)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={13} style={{ color: GHANA_RED }} />
        </button>
      </div>
    </div>
  );
}

// ── Storage Progress Bar ───────────────────────────────────────────────────
function StorageBar({ used, limit, height = 8 }: { used: number; limit: number; height?: number }) {
  const pct = Math.min((used / limit) * 100, 100);
  // Green -> Gold -> Red gradient based on fill
  const color = pct < 50 ? GHANA_GREEN : pct < 80 ? GHANA_GOLD : GHANA_RED;

  return (
    <div style={{
      width: '100%', height,
      borderRadius: height / 2,
      background: 'var(--color-surface-3)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        borderRadius: height / 2,
        background: `linear-gradient(90deg, ${GHANA_GREEN}, ${color})`,
        transition: 'width 300ms ease-out',
      }} />
    </div>
  );
}

// ── Storage Breakdown Bar (horizontal) ────────────────────────────────────
function StorageBreakdown({ pages }: { pages: SavedPage[] }) {
  const categories: { key: SavedPage['category']; label: string; color: string }[] = [
    { key: 'gov', label: 'Government', color: GHANA_GREEN },
    { key: 'auto-cached', label: 'Auto-cached', color: GHANA_GOLD },
    { key: 'manual', label: 'Manual', color: '#3b82f6' },
  ];

  const total = pages.reduce((s, p) => s + p.size, 0);
  if (total === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Storage Breakdown
      </div>
      {categories.map(cat => {
        const catSize = pages.filter(p => p.category === cat.key).reduce((s, p) => s + p.size, 0);
        const pct = (catSize / total) * 100;
        if (catSize === 0) return null;
        return (
          <div key={cat.key} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{cat.label}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatBytes(catSize)} ({pct.toFixed(0)}%)</span>
            </div>
            <div style={{
              width: '100%', height: 6, borderRadius: 3,
              background: 'var(--color-surface-3)', overflow: 'hidden',
            }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 3,
                background: cat.color, transition: 'width 300ms ease-out',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Auto-Cache Rule Row ────────────────────────────────────────────────────
function AutoCacheRuleRow({ rule, onToggle }: {
  rule: { id: string; pattern: string; label: string; enabled: boolean };
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
        border: '1px solid var(--color-border-1)',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'background 100ms',
      }}
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', padding: 0, flexShrink: 0,
        }}
        title={rule.enabled ? 'Disable rule' : 'Enable rule'}
      >
        {rule.enabled ? (
          <ToggleRight size={24} style={{ color: GHANA_GREEN }} />
        ) : (
          <ToggleLeft size={24} style={{ color: 'var(--color-text-muted)' }} />
        )}
      </button>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {rule.label}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--color-text-muted)',
          fontFamily: 'monospace',
          marginTop: 2,
        }}>
          {rule.pattern}
        </div>
      </div>

      {/* Enabled/Disabled badge */}
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: rule.enabled ? GHANA_GREEN : 'var(--color-text-muted)',
        background: rule.enabled ? 'rgba(0,107,63,0.10)' : 'var(--color-surface-2)',
        border: `1px solid ${rule.enabled ? 'rgba(0,107,63,0.30)' : 'var(--color-border-1)'}`,
        borderRadius: 6, padding: '2px 8px',
        flexShrink: 0,
      }}>
        {rule.enabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  );
}

// ── Main Offline Page ──────────────────────────────────────────────────────
export function OfflinePage() {
  const {
    savedPages, queuedSubmissions, autoCacheRules,
    totalStorageUsed, storageLimit, searchQuery,
    removePage, clearAllPages, removeSubmission, retrySubmission,
    toggleAutoCacheRule, addAutoCacheRule, setSearchQuery,
  } = useOfflineStore();
  const { createTab } = useTabsStore();

  const [activeTab, setActiveTab] = useState<TabId>('saved');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleLabel, setNewRuleLabel] = useState('');
  const [showAddRule, setShowAddRule] = useState(false);

  // Filter + sort saved pages
  const filteredPages = useMemo(() => {
    let list = savedPages;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.url.toLowerCase().includes(q)
      );
    }
    switch (sortMode) {
      case 'recent':
        return [...list].sort((a, b) => b.savedAt - a.savedAt);
      case 'largest':
        return [...list].sort((a, b) => b.size - a.size);
      case 'az':
        return [...list].sort((a, b) => a.title.localeCompare(b.title));
      default:
        return list;
    }
  }, [savedPages, searchQuery, sortMode]);

  // Filter queued submissions
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return queuedSubmissions;
    const q = searchQuery.toLowerCase();
    return queuedSubmissions.filter(s =>
      s.description.toLowerCase().includes(q) ||
      s.url.toLowerCase().includes(q)
    );
  }, [queuedSubmissions, searchQuery]);

  const activeRulesCount = autoCacheRules.filter(r => r.enabled).length;

  const handleOpenOffline = (page: SavedPage) => {
    // Open in a new tab -- in a real implementation this would serve cached content
    createTab(page.url);
  };

  const handleAddRule = () => {
    if (newRulePattern.trim() && newRuleLabel.trim()) {
      addAutoCacheRule(newRulePattern.trim(), newRuleLabel.trim());
      setNewRulePattern('');
      setNewRuleLabel('');
      setShowAddRule(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100%', background: 'var(--color-bg)',
      overflowY: 'auto',
    }}>
      {/* ── Spinning keyframe for loader ── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Hero Header ── */}
      <div style={{
        background: `linear-gradient(135deg,
          ${GHANA_GREEN} 0%,
          rgba(0,107,63,0.85) 35%,
          rgba(212,160,23,0.15) 70%,
          var(--color-bg) 100%)`,
        padding: '32px 32px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative flag stripe */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${GHANA_RED} 33.3%, ${GHANA_GOLD} 33.3% 66.6%, ${GHANA_GREEN} 66.6%)`,
        }} />

        {/* Watermark */}
        <div style={{
          position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)',
          fontSize: 96, opacity: 0.06, color: '#fff',
          pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
        }}>
          <WifiOff size={96} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'rgba(255,255,255,0.12)',
            border: '1.5px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <WifiOff size={26} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
              Offline Library
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
              {savedPages.length} saved page{savedPages.length !== 1 ? 's' : ''} &middot; {formatBytes(totalStorageUsed)} used
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', maxWidth: 540 }}>
          <Search size={16} style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.55)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Search saved pages and queued submissions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '11px 16px 11px 42px',
              fontSize: 13, borderRadius: 12,
              background: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              color: '#fff', outline: 'none',
              backdropFilter: 'blur(12px)',
              boxSizing: 'border-box',
              transition: 'border-color 150ms',
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(212,160,23,0.7)'; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, lineHeight: 1,
              }}
              title="Clear search"
            >&#x2715;</button>
          )}
        </div>
      </div>

      {/* ── Tab pills ── */}
      <div style={{
        padding: '14px 32px', display: 'flex', gap: 8, flexWrap: 'wrap',
        borderBottom: '1px solid var(--color-border-1)',
        background: 'var(--color-surface-1)',
      }}>
        <TabPill label="Saved Pages" count={savedPages.length} active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} />
        <TabPill label="Submission Queue" count={queuedSubmissions.length} active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} />
        <TabPill label="Auto-Cache Settings" count={activeRulesCount} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </div>

      {/* ── Body: main content + sidebar ── */}
      <div style={{ display: 'flex', flex: 1, gap: 0, minHeight: 0 }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, padding: '24px 32px', overflowY: 'auto' }}>

          {/* ═══ Saved Pages Tab ═══ */}
          {activeTab === 'saved' && (
            <>
              {/* Sort bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <ArrowUpDown size={13} style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginRight: 4 }}>Sort:</span>
                <SortPill label="Recent" active={sortMode === 'recent'} onClick={() => setSortMode('recent')} />
                <SortPill label="Largest" active={sortMode === 'largest'} onClick={() => setSortMode('largest')} />
                <SortPill label="A-Z" active={sortMode === 'az'} onClick={() => setSortMode('az')} />
              </div>

              {filteredPages.length === 0 ? (
                /* Empty state */
                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <Archive size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.25, margin: '0 auto 16px', display: 'block' }} />
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6, margin: '0 0 6px' }}>
                    No saved pages
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                    Save pages for offline reading using the menu or Ctrl+Shift+S
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 14,
                }}>
                  {filteredPages.map(page => (
                    <SavedPageCard
                      key={page.id}
                      page={page}
                      onOpen={() => handleOpenOffline(page)}
                      onDelete={() => removePage(page.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ═══ Submission Queue Tab ═══ */}
          {activeTab === 'queue' && (
            <>
              {/* Top bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <button
                  disabled={queuedSubmissions.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 10,
                    fontSize: 12, fontWeight: 600,
                    background: GHANA_GREEN,
                    color: '#fff',
                    border: 'none',
                    cursor: queuedSubmissions.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: queuedSubmissions.length === 0 ? 0.4 : 1,
                    transition: 'opacity 150ms',
                  }}
                  title="Submit all pending items when online"
                >
                  <Send size={13} />
                  Submit All
                </button>
              </div>

              {/* Info notice */}
              <div style={{
                background: 'rgba(212,160,23,0.08)',
                border: '1px solid rgba(212,160,23,0.25)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <WifiOff size={14} style={{ color: GHANA_GOLD, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: GHANA_GOLD }}>
                  When you're back online, queued submissions will be sent automatically.
                </span>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <Send size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.25, margin: '0 auto 16px', display: 'block' }} />
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6, margin: '0 0 6px' }}>
                    No queued submissions
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                    Form submissions made while offline will appear here
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredSubmissions.map(sub => (
                    <SubmissionItem
                      key={sub.id}
                      sub={sub}
                      onRetry={() => retrySubmission(sub.id)}
                      onRemove={() => removeSubmission(sub.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ═══ Auto-Cache Settings Tab ═══ */}
          {activeTab === 'settings' && (
            <>
              {/* Storage quota bar */}
              <div style={{
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-1)',
                borderRadius: 14,
                padding: 20,
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HardDrive size={16} style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Storage Quota</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {formatBytes(totalStorageUsed)} / {formatBytes(storageLimit)}
                  </span>
                </div>
                <StorageBar used={totalStorageUsed} limit={storageLimit} height={10} />

                <StorageBreakdown pages={savedPages} />
              </div>

              {/* Auto-cache rules */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Auto-Cache Rules
                </h3>
                <button
                  onClick={() => setShowAddRule(!showAddRule)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8,
                    fontSize: 12, fontWeight: 600,
                    background: 'rgba(0,107,63,0.10)',
                    color: GHANA_GREEN,
                    border: '1px solid rgba(0,107,63,0.30)',
                    cursor: 'pointer',
                    transition: 'background 100ms',
                  }}
                >
                  <Plus size={13} />
                  Add Custom Rule
                </button>
              </div>

              {/* Add rule form */}
              {showAddRule && (
                <div style={{
                  background: 'var(--color-surface-1)',
                  border: '1px solid var(--color-border-1)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="text"
                      placeholder="URL pattern (e.g., *.example.gh)"
                      value={newRulePattern}
                      onChange={e => setNewRulePattern(e.target.value)}
                      style={{
                        flex: 1, padding: '8px 12px',
                        fontSize: 13, borderRadius: 8,
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border-1)',
                        color: 'var(--color-text-primary)',
                        outline: 'none', fontFamily: 'monospace',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Label (e.g., My Portal)"
                      value={newRuleLabel}
                      onChange={e => setNewRuleLabel(e.target.value)}
                      style={{
                        flex: 1, padding: '8px 12px',
                        fontSize: 13, borderRadius: 8,
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border-1)',
                        color: 'var(--color-text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setShowAddRule(false); setNewRulePattern(''); setNewRuleLabel(''); }}
                      style={{
                        padding: '6px 14px', borderRadius: 8,
                        fontSize: 12, background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border-1)',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddRule}
                      disabled={!newRulePattern.trim() || !newRuleLabel.trim()}
                      style={{
                        padding: '6px 14px', borderRadius: 8,
                        fontSize: 12, fontWeight: 600,
                        background: GHANA_GREEN,
                        color: '#fff',
                        border: 'none',
                        cursor: !newRulePattern.trim() || !newRuleLabel.trim() ? 'not-allowed' : 'pointer',
                        opacity: !newRulePattern.trim() || !newRuleLabel.trim() ? 0.4 : 1,
                      }}
                    >
                      Add Rule
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {autoCacheRules.map(rule => (
                  <AutoCacheRuleRow
                    key={rule.id}
                    rule={rule}
                    onToggle={() => toggleAutoCacheRule(rule.id)}
                  />
                ))}
              </div>

              {/* Danger zone */}
              <div style={{
                borderTop: '1px solid var(--color-border-1)',
                paddingTop: 20,
              }}>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete all cached pages? This cannot be undone.')) {
                      clearAllPages();
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 18px', borderRadius: 10,
                    fontSize: 13, fontWeight: 600,
                    background: 'rgba(206,17,38,0.08)',
                    color: GHANA_RED,
                    border: `1px solid rgba(206,17,38,0.25)`,
                    cursor: 'pointer',
                    transition: 'background 100ms',
                  }}
                >
                  <Trash2 size={14} />
                  Clear All Cached Pages
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Sidebar (right, 220px) ── */}
        <aside style={{
          width: 220, flexShrink: 0,
          borderLeft: '1px solid var(--color-border-1)',
          background: 'var(--color-surface-1)',
          padding: '20px 0',
          overflowY: 'auto',
        }}>
          {/* Storage overview card */}
          <div style={{
            margin: '0 12px 16px',
            padding: 14,
            borderRadius: 12,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <HardDrive size={13} style={{ color: GHANA_GREEN }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Storage
              </span>
            </div>
            <StorageBar used={totalStorageUsed} limit={storageLimit} />
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 6 }}>
              {formatBytes(totalStorageUsed)} of {formatBytes(storageLimit)}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{
            margin: '0 12px 16px',
            padding: 14,
            borderRadius: 12,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-1)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Quick Stats
            </div>
            {[
              { label: 'Total Pages', value: savedPages.length, icon: <FileText size={12} style={{ color: '#3b82f6' }} /> },
              { label: 'Queued', value: queuedSubmissions.length, icon: <Send size={12} style={{ color: GHANA_GOLD }} /> },
              { label: 'Auto-Cache Rules', value: activeRulesCount, icon: <Shield size={12} style={{ color: GHANA_GREEN }} /> },
            ].map(stat => (
              <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {stat.icon}
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', flex: 1 }}>{stat.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Save Current Page button */}
          <div style={{ margin: '0 12px 16px' }}>
            <button
              onClick={() => {
                // Dispatch a save-page event that SavePageButton listens to
                window.dispatchEvent(new CustomEvent('os-browser:save-page-offline'));
              }}
              style={{
                width: '100%',
                padding: '10px 14px', borderRadius: 10,
                fontSize: 12, fontWeight: 600,
                background: GHANA_GREEN,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'opacity 150ms',
              }}
            >
              <Download size={14} />
              Save Current Page
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--color-border-1)', margin: '0 12px 16px' }} />

          {/* Tips section */}
          <div style={{
            margin: '0 12px',
            padding: 14,
            borderRadius: 12,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Lightbulb size={13} style={{ color: GHANA_GOLD }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Offline Tips
              </span>
            </div>
            {[
              'Save frequently-used government forms before field visits.',
              'Auto-cache ensures .gov.gh pages are always available.',
              'Queued form submissions are sent automatically when internet returns.',
              'Use Ctrl+Shift+S to quickly save any page for offline reading.',
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < 3 ? 10 : 0 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'rgba(212,160,23,0.12)',
                  border: '1px solid rgba(212,160,23,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: GHANA_GOLD,
                  flexShrink: 0, marginTop: 1,
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {tip}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
