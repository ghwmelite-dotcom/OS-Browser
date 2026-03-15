import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Pin, PinOff, ExternalLink, Clock, TrendingUp,
  ChevronDown, ChevronUp, Lock, Globe2, Building2
} from 'lucide-react';
import { useGovHubStore } from '@/store/govhub';
import { useTabsStore } from '@/store/tabs';

// ── Ghana flag palette ─────────────────────────────────────────────────────
const GHANA_RED   = '#CE1126';
const GHANA_GOLD  = '#D4A017';
const GHANA_GREEN = '#006B3F';

// ── Category config ────────────────────────────────────────────────────────
const CATEGORIES = [
  'General', 'Finance', 'HR', 'Health', 'Legal',
  'Identity', 'Procurement', 'Utilities', 'Communication', 'Land',
] as const;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  General:       { bg: 'rgba(212,160,23,0.12)',  text: GHANA_GOLD,  border: 'rgba(212,160,23,0.35)' },
  Finance:       { bg: 'rgba(0,107,63,0.12)',    text: GHANA_GREEN, border: 'rgba(0,107,63,0.35)'   },
  HR:            { bg: 'rgba(206,17,38,0.10)',   text: GHANA_RED,   border: 'rgba(206,17,38,0.30)'  },
  Health:        { bg: 'rgba(0,107,63,0.12)',    text: '#10b981',   border: 'rgba(16,185,129,0.30)' },
  Legal:         { bg: 'rgba(99,102,241,0.10)',  text: '#6366f1',   border: 'rgba(99,102,241,0.30)' },
  Identity:      { bg: 'rgba(212,160,23,0.12)',  text: GHANA_GOLD,  border: 'rgba(212,160,23,0.35)' },
  Procurement:   { bg: 'rgba(251,146,60,0.12)',  text: '#f97316',   border: 'rgba(249,115,22,0.30)' },
  Utilities:     { bg: 'rgba(14,165,233,0.10)',  text: '#0ea5e9',   border: 'rgba(14,165,233,0.30)' },
  Communication: { bg: 'rgba(168,85,247,0.10)',  text: '#a855f7',   border: 'rgba(168,85,247,0.30)' },
  Land:          { bg: 'rgba(0,107,63,0.08)',    text: '#4ade80',   border: 'rgba(74,222,128,0.30)' },
};

// ── Health dot ─────────────────────────────────────────────────────────────
function HealthDot({ status }: { status: 'online' | 'slow' | 'down' | 'unknown' }) {
  const styles: Record<string, string> = {
    online:  '#22c55e',
    slow:    GHANA_GOLD,
    down:    GHANA_RED,
    unknown: 'var(--color-border-2, #555)',
  };
  const labels: Record<string, string> = {
    online: 'Online', slow: 'Slow', down: 'Down', unknown: 'Status unknown',
  };
  return (
    <span
      title={labels[status]}
      style={{
        display: 'inline-block',
        width: 8, height: 8,
        borderRadius: '50%',
        background: styles[status],
        boxShadow: status === 'online' ? `0 0 6px ${styles[status]}` : undefined,
        flexShrink: 0,
      }}
    />
  );
}

// ── Service letter icon ────────────────────────────────────────────────────
function ServiceIcon({ shortName, category }: { shortName: string; category: string }) {
  const col = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.General;
  return (
    <div
      style={{
        width: 44, height: 44, borderRadius: 12,
        background: col.bg,
        border: `1px solid ${col.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: col.text,
        flexShrink: 0, letterSpacing: '-0.5px',
        userSelect: 'none',
      }}
    >
      {shortName.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Single service card ────────────────────────────────────────────────────
function ServiceCard({
  service,
  onOpen,
  onTogglePin,
  compact = false,
}: {
  service: ReturnType<typeof useGovHubStore.getState>['services'][number];
  onOpen: (url: string, id: string) => void;
  onTogglePin: (id: string) => void;
  compact?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const col = CATEGORY_COLORS[service.category] ?? CATEGORY_COLORS.General;

  const isPinned = service.isPinned;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: 'var(--color-surface-1)',
        border: isPinned
          ? `1.5px solid ${GHANA_GOLD}`
          : `1px solid var(--color-border-1)`,
        borderRadius: 14,
        padding: compact ? '12px 14px' : '16px',
        cursor: 'pointer',
        transition: 'transform 120ms ease-out, box-shadow 120ms ease-out, border-color 120ms',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? isPinned
            ? `0 8px 24px rgba(212,160,23,0.18), 0 2px 8px rgba(0,0,0,0.12)`
            : '0 8px 24px rgba(0,0,0,0.10)'
          : isPinned
            ? `0 2px 12px rgba(212,160,23,0.10)`
            : '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        gap: compact ? 12 : 10,
        alignItems: compact ? 'center' : 'flex-start',
        minHeight: compact ? 0 : 140,
      }}
    >
      {/* Gold top accent stripe for pinned cards */}
      {isPinned && (
        <div style={{
          position: 'absolute', top: 0, left: 16, right: 16, height: 2,
          background: `linear-gradient(90deg, ${GHANA_GOLD}, rgba(212,160,23,0.3))`,
          borderRadius: '0 0 4px 4px',
        }} />
      )}

      {/* Icon */}
      <ServiceIcon shortName={service.shortName} category={service.category} />

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }} onClick={() => onOpen(service.url, service.id)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}>{service.name}</span>
          {service.requiresAuth && (
            <Lock size={10} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          )}
          <HealthDot status={service.health} />
        </div>

        {!compact && (
          <p style={{
            fontSize: 11, color: 'var(--color-text-muted)',
            lineHeight: 1.5, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{service.description}</p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: compact ? 0 : 8, flexWrap: 'wrap' }}>
          {service.ministry && (
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: col.text,
              background: col.bg,
              border: `1px solid ${col.border}`,
              borderRadius: 6, padding: '1px 6px',
              whiteSpace: 'nowrap',
            }}>{service.ministry}</span>
          )}
          {!compact && (
            <span style={{
              fontSize: 10, color: 'var(--color-text-muted)',
              background: 'var(--color-surface-2)',
              borderRadius: 6, padding: '1px 6px',
              border: '1px solid var(--color-border-1)',
            }}>{service.category}</span>
          )}
          {service.visitCount > 0 && (
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              {service.visitCount} visit{service.visitCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div style={{
        position: compact ? 'static' : 'absolute',
        top: compact ? undefined : 12,
        right: compact ? undefined : 12,
        display: 'flex', gap: 4,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 150ms',
        flexShrink: 0,
      }}>
        <button
          onClick={e => { e.stopPropagation(); onTogglePin(service.id); }}
          title={isPinned ? 'Unpin' : 'Pin to top'}
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: isPinned ? `rgba(212,160,23,0.15)` : 'var(--color-surface-2)',
            border: isPinned ? `1px solid rgba(212,160,23,0.5)` : '1px solid var(--color-border-1)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 100ms',
          }}
        >
          {isPinned
            ? <PinOff size={13} style={{ color: GHANA_GOLD }} />
            : <Pin size={13} style={{ color: 'var(--color-text-muted)' }} />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); onOpen(service.url, service.id); }}
          title="Open in new tab"
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-1)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ExternalLink size={13} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>
    </div>
  );
}

// ── Collapsible category section ──────────────────────────────────────────
function CategorySection({
  category,
  services,
  onOpen,
  onTogglePin,
}: {
  category: string;
  services: ReturnType<typeof useGovHubStore.getState>['services'];
  onOpen: (url: string, id: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const col = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.General;

  if (services.length === 0) return null;

  return (
    <section style={{ marginBottom: 24 }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', background: 'none', border: 'none',
          cursor: 'pointer', padding: '4px 0', marginBottom: collapsed ? 0 : 12,
          textAlign: 'left',
        }}
      >
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: col.text, flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', flex: 1 }}>
          {category}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: col.text, background: col.bg,
          border: `1px solid ${col.border}`,
          borderRadius: 8, padding: '2px 8px',
        }}>{services.length}</span>
        {collapsed
          ? <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
          : <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} />}
      </button>

      {!collapsed && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          {services.map(svc => (
            <ServiceCard
              key={svc.id}
              service={svc}
              onOpen={onOpen}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Sidebar list item ──────────────────────────────────────────────────────
function SidebarItem({
  service,
  onOpen,
  meta,
}: {
  service: ReturnType<typeof useGovHubStore.getState>['services'][number];
  onOpen: (url: string, id: string) => void;
  meta: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onOpen(service.url, service.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', background: hovered ? 'var(--color-surface-2)' : 'none',
        border: 'none', cursor: 'pointer',
        padding: '8px 10px', borderRadius: 10,
        textAlign: 'left', transition: 'background 100ms',
      }}
    >
      <ServiceIcon shortName={service.shortName} category={service.category} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {service.shortName}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{meta}</div>
      </div>
      <HealthDot status={service.health} />
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export function GovHubPage() {
  const {
    services, searchQuery, selectedCategory,
    togglePin, recordVisit, setSearchQuery, setCategory,
  } = useGovHubStore();
  const { createTab } = useTabsStore();

  const openService = (url: string, id: string) => {
    recordVisit(id);
    createTab(url);
  };

  // Filtered + searched services
  const filtered = useMemo(() => {
    let list = services;
    if (selectedCategory) list = list.filter(s => s.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.shortName.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q)) ||
        s.ministry?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [services, searchQuery, selectedCategory]);

  const pinned = useMemo(() => filtered.filter(s => s.isPinned), [filtered]);
  const unpinned = useMemo(() => filtered.filter(s => !s.isPinned), [filtered]);

  // Group unpinned by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof services>();
    CATEGORIES.forEach(cat => {
      const items = unpinned.filter(s => s.category === cat);
      if (items.length) map.set(cat, items);
    });
    // Catch any extra categories
    unpinned.forEach(s => {
      if (!CATEGORIES.includes(s.category as typeof CATEGORIES[number])) {
        const existing = map.get(s.category) ?? [];
        map.set(s.category, [...existing, s]);
      }
    });
    return map;
  }, [unpinned]);

  // Sidebar: frequently used (top 5 by visitCount)
  const frequentlyUsed = useMemo(() =>
    [...services]
      .filter(s => s.visitCount > 0)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5),
    [services]
  );

  // Sidebar: recently used (last 10 by lastVisited)
  const recentlyUsed = useMemo(() =>
    [...services]
      .filter(s => s.lastVisited !== null)
      .sort((a, b) => (b.lastVisited ?? 0) - (a.lastVisited ?? 0))
      .slice(0, 10),
    [services]
  );

  const formatRelative = (ts: number | null) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100%', background: 'var(--color-bg)',
      overflowY: 'auto',
    }}>
      {/* ── Hero header ── */}
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

        {/* Star watermark */}
        <div style={{
          position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)',
          fontSize: 96, opacity: 0.06, color: GHANA_GOLD,
          pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
        }}>&#9733;</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'rgba(255,255,255,0.12)',
            border: `1.5px solid rgba(255,255,255,0.25)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <Building2 size={26} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
              Ghana Government Services Hub
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
              {services.length} official services — quick access for civil servants
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
            placeholder="Search services, ministries, tags..."
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

      {/* ── Category filter pills ── */}
      <div style={{
        padding: '14px 32px', display: 'flex', gap: 8, flexWrap: 'wrap',
        borderBottom: '1px solid var(--color-border-1)',
        background: 'var(--color-surface-1)',
      }}>
        <FilterPill
          label="All Services"
          count={services.length}
          active={selectedCategory === null}
          onClick={() => setCategory(null)}
          color={GHANA_GOLD}
        />
        {CATEGORIES.map(cat => {
          const cnt = services.filter(s => s.category === cat).length;
          if (!cnt) return null;
          const col = CATEGORY_COLORS[cat];
          return (
            <FilterPill
              key={cat}
              label={cat}
              count={cnt}
              active={selectedCategory === cat}
              onClick={() => setCategory(selectedCategory === cat ? null : cat)}
              color={col.text}
            />
          );
        })}
      </div>

      {/* ── Body: main content + sidebar ── */}
      <div style={{ display: 'flex', flex: 1, gap: 0, minHeight: 0 }}>
        {/* Main scrollable content */}
        <div style={{ flex: 1, minWidth: 0, padding: '24px 32px', overflowY: 'auto' }}>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <Globe2 size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.25, margin: '0 auto 16px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                No services found
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Try a different search term or category
              </p>
            </div>
          )}

          {/* Pinned section */}
          {pinned.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Pin size={15} style={{ color: GHANA_GOLD }} />
                <h2 style={{
                  margin: 0, fontSize: 13, fontWeight: 700,
                  color: GHANA_GOLD, letterSpacing: '0.3px', textTransform: 'uppercase',
                }}>Pinned Services</h2>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: GHANA_GOLD, background: 'rgba(212,160,23,0.12)',
                  border: `1px solid rgba(212,160,23,0.35)`,
                  borderRadius: 8, padding: '2px 8px',
                }}>{pinned.length}</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 14,
              }}>
                {pinned.map(svc => (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    onOpen={openService}
                    onTogglePin={togglePin}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Divider after pinned */}
          {pinned.length > 0 && unpinned.length > 0 && (
            <div style={{
              height: 1, background: 'var(--color-border-1)',
              marginBottom: 28,
            }} />
          )}

          {/* Grouped category sections */}
          {Array.from(grouped.entries()).map(([cat, svcs]) => (
            <CategorySection
              key={cat}
              category={cat}
              services={svcs}
              onOpen={openService}
              onTogglePin={togglePin}
            />
          ))}
        </div>

        {/* Sidebar */}
        <aside style={{
          width: 240, flexShrink: 0,
          borderLeft: '1px solid var(--color-border-1)',
          background: 'var(--color-surface-1)',
          padding: '20px 0',
          overflowY: 'auto',
        }}>
          {/* Frequently used */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', marginBottom: 10 }}>
              <TrendingUp size={13} style={{ color: GHANA_GREEN }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Frequently Used
              </span>
            </div>
            {frequentlyUsed.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', padding: '0 16px', fontStyle: 'italic' }}>
                No visits yet. Click a service to get started.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 6px' }}>
                {frequentlyUsed.map(svc => (
                  <SidebarItem
                    key={svc.id}
                    service={svc}
                    onOpen={openService}
                    meta={`${svc.visitCount} visit${svc.visitCount !== 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--color-border-1)', margin: '0 16px 20px' }} />

          {/* Recently used */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', marginBottom: 10 }}>
              <Clock size={13} style={{ color: GHANA_GOLD }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Recently Used
              </span>
            </div>
            {recentlyUsed.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', padding: '0 16px', fontStyle: 'italic' }}>
                No recent visits.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 6px' }}>
                {recentlyUsed.map(svc => (
                  <SidebarItem
                    key={svc.id}
                    service={svc}
                    onOpen={openService}
                    meta={formatRelative(svc.lastVisited)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer legend */}
          <div style={{ margin: '28px 16px 0', padding: '12px', borderRadius: 10, background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Health Legend
            </p>
            {([
              ['online',  '#22c55e', 'Online'],
              ['slow',    GHANA_GOLD, 'Slow response'],
              ['down',    GHANA_RED,  'Down / unreachable'],
              ['unknown', 'var(--color-border-2, #555)', 'Status unknown'],
            ] as const).map(([, color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{label}</span>
              </div>
            ))}
            <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Live health checks coming soon.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Filter pill sub-component ──────────────────────────────────────────────
function FilterPill({
  label, count, active, onClick, color,
}: {
  label: string; count: number; active: boolean; onClick: () => void; color: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', borderRadius: 20,
        fontSize: 12, fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        border: active ? `1.5px solid ${color}` : '1px solid var(--color-border-1)',
        background: active
          ? `${color}1a`
          : hovered ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
        color: active ? color : 'var(--color-text-secondary)',
        transition: 'all 120ms',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <span style={{
        fontSize: 10, fontWeight: 600,
        background: active ? `${color}22` : 'var(--color-surface-2)',
        color: active ? color : 'var(--color-text-muted)',
        borderRadius: 8, padding: '0px 5px',
        border: active ? `1px solid ${color}44` : '1px solid var(--color-border-1)',
      }}>{count}</span>
    </button>
  );
}
