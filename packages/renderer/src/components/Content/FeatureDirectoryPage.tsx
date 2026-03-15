import React, { useState, useMemo } from 'react';
import { Search, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useFeatureRegistry } from '@/hooks/useFeatureRegistry';
import { useKenteSidebarStore } from '@/store/kente-sidebar';
import { useTabsStore } from '@/store/tabs';
import {
  FEATURE_CATEGORIES,
  FeatureCategory,
  FeatureDefinition,
} from '@/features/registry';

// ── Feature Card ─────────────────────────────────────────────────────
function FeatureCard({ feature }: { feature: FeatureDefinition }) {
  const [hovered, setHovered] = useState(false);
  const { togglePanel } = useKenteSidebarStore();
  const Icon = feature.icon;

  const handleClick = () => {
    // If feature has a sidebar panel, open it
    if (feature.surfaces?.sidebar) {
      togglePanel(feature.id);
      return;
    }
    // If feature has an internal page, navigate to it
    if (feature.internalPageUrl) {
      useTabsStore.getState().createTab(feature.internalPageUrl);
      return;
    }
    // Fallback: dispatch event
    window.dispatchEvent(new CustomEvent(`os-browser:${feature.id}`));
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'left',
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--color-border-1)',
        borderLeft: `3px solid ${hovered ? feature.stripColor : feature.stripColor + '99'}`,
        background: 'var(--color-surface-1)',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 8px 24px -4px rgba(0,0,0,0.12), 0 2px 6px -2px rgba(0,0,0,0.08)'
          : '0 1px 3px rgba(0,0,0,0.06)',
        minHeight: 140,
      }}
    >
      {/* Top: icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: feature.stripColor + '1F',
            flexShrink: 0,
          }}
        >
          <Icon size={18} strokeWidth={1.8} style={{ color: feature.stripColor }} />
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          {feature.name}
        </span>
      </div>

      {/* Middle: description */}
      <div
        style={{
          fontSize: 13,
          lineHeight: '1.5',
          color: 'var(--color-text-muted)',
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {feature.description}
      </div>

      {/* Bottom: status badge */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center' }}>
        {feature.requiresSetup ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 500,
              color: feature.stripColor,
              padding: '3px 8px',
              borderRadius: 6,
              border: `1px solid ${feature.stripColor}44`,
              background: `${feature.stripColor}0D`,
            }}
          >
            Set up <ArrowRight size={10} strokeWidth={2} />
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 500,
              color: '#16a34a',
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(22,163,74,0.08)',
            }}
          >
            <CheckCircle2 size={11} strokeWidth={2} /> Enabled
          </span>
        )}
      </div>
    </button>
  );
}

// ── Category Section ─────────────────────────────────────────────────
function CategorySection({
  category,
  features,
}: {
  category: FeatureCategory;
  features: FeatureDefinition[];
}) {
  const meta = FEATURE_CATEGORIES[category];
  if (!meta || features.length === 0) return null;
  const CatIcon = meta.icon;

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Category heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <CatIcon size={18} strokeWidth={1.8} style={{ color: 'var(--color-text-secondary)' }} />
        <div>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            {meta.label}
          </h2>
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              margin: 0,
              marginTop: 2,
            }}
          >
            {meta.description}
          </p>
        </div>
      </div>

      {/* Cards grid: 3 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {features.map((f) => (
          <FeatureCard key={f.id} feature={f} />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export function FeatureDirectoryPage() {
  const allFeatures = useFeatureRegistry();
  const [query, setQuery] = useState('');

  // Filter by search
  const filteredFeatures = useMemo(() => {
    if (!query.trim()) return allFeatures;
    const q = query.toLowerCase();
    return allFeatures.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q),
    );
  }, [allFeatures, query]);

  // Group by category, sorted by FEATURE_CATEGORIES sortOrder
  const categorized = useMemo(() => {
    const catOrder = (Object.keys(FEATURE_CATEGORIES) as FeatureCategory[]).sort(
      (a, b) => FEATURE_CATEGORIES[a].sortOrder - FEATURE_CATEGORIES[b].sortOrder,
    );

    return catOrder
      .map((cat) => ({
        category: cat,
        features: filteredFeatures.filter((f) => f.category === cat),
      }))
      .filter((g) => g.features.length > 0);
  }, [filteredFeatures]);

  return (
    <div
      style={{
        minHeight: '100%',
        background: 'var(--color-bg)',
        overflowY: 'auto',
      }}
    >
      {/* Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #D4A017 0%, #b8860b 40%, #8B6914 100%)',
          padding: '48px 32px 40px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Sparkles size={24} strokeWidth={1.8} style={{ color: '#fff' }} />
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 6px',
              letterSpacing: '-0.3px',
            }}
          >
            OS Browser Features
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)',
              margin: '0 0 24px',
            }}
          >
            Everything your browser can do for you
          </p>

          {/* Search input */}
          <div
            style={{
              maxWidth: 400,
              margin: '0 auto',
              position: 'relative',
            }}
          >
            <Search
              size={16}
              strokeWidth={1.8}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.5)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search features..."
              spellCheck={false}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#fff',
                fontSize: 14,
                padding: '0 14px 0 40px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      </div>

      {/* Feature count */}
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '24px 32px 0',
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-muted)',
            marginBottom: 24,
          }}
        >
          {filteredFeatures.length} feature{filteredFeatures.length !== 1 ? 's' : ''} available
          {query.trim() ? ` matching "${query}"` : ''}
        </p>
      </div>

      {/* Category sections */}
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '0 32px 48px',
        }}
      >
        {categorized.map((g) => (
          <CategorySection
            key={g.category}
            category={g.category}
            features={g.features}
          />
        ))}

        {/* No results */}
        {categorized.length === 0 && query.trim() && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 0',
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: 'var(--color-text-muted)',
                marginBottom: 8,
              }}
            >
              No features match &ldquo;{query}&rdquo;
            </div>
            <button
              onClick={() => setQuery('')}
              style={{
                fontSize: 13,
                color: '#D4A017',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: 'inherit',
              }}
            >
              Clear search
            </button>
          </div>
        )}

        {/* No features at all */}
        {allFeatures.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 0',
              fontSize: 14,
              color: 'var(--color-text-muted)',
            }}
          >
            No features registered yet. Features will appear as they are initialized.
          </div>
        )}
      </div>
    </div>
  );
}
