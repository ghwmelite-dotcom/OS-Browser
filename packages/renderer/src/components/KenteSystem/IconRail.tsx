import React, { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import type { FeatureDefinition } from '@/features/registry';

interface IconRailProps {
  features: FeatureDefinition[];
  activePanel: string | null;
  onTogglePanel: (featureId: string) => void;
  onOpenSettings: () => void;
}

/**
 * IconRail — 48px vertical icon strip on the left of the content area.
 *
 * Each icon shows the feature's sidebar icon with:
 * - Active state: 3px left accent bar in `stripColor`, tinted bg, icon in `stripColor`
 * - Badge count when `getBadgeCount` returns > 0
 * - Tooltip on hover (500ms delay)
 */
export function IconRail({
  features,
  activePanel,
  onTogglePanel,
  onOpenSettings,
}: IconRailProps) {
  return (
    <div
      style={{
        width: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--color-surface-1)',
        borderRight: '1px solid var(--color-border-1)',
        paddingTop: 8,
        paddingBottom: 8,
        flexShrink: 0,
        height: '100%',
        justifyContent: 'space-between',
      }}
    >
      {/* Feature icons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          width: '100%',
        }}
      >
        {features.map((f) => (
          <RailIcon
            key={f.id}
            feature={f}
            isActive={activePanel === f.id}
            onClick={() => onTogglePanel(f.id)}
          />
        ))}
      </div>

      {/* Settings gear pinned to bottom */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <RailIconButton
          icon={<Settings size={18} />}
          label="Settings"
          isActive={false}
          stripColor="var(--color-text-muted)"
          onClick={onOpenSettings}
        />
      </div>
    </div>
  );
}

/* ─── Individual rail icon ─── */

function RailIcon({
  feature,
  isActive,
  onClick,
}: {
  feature: FeatureDefinition;
  isActive: boolean;
  onClick: () => void;
}) {
  const sidebarDef = feature.surfaces.sidebar!;
  const IconComp = feature.icon;
  const badgeCount =
    typeof sidebarDef.getBadgeCount === 'function'
      ? sidebarDef.getBadgeCount()
      : 0;

  return (
    <RailIconButton
      icon={<IconComp size={18} />}
      label={feature.name}
      isActive={isActive}
      stripColor={feature.stripColor}
      badge={badgeCount > 0 ? badgeCount : undefined}
      onClick={onClick}
    />
  );
}

/* ─── Reusable rail icon button ─── */

function RailIconButton({
  icon,
  label,
  isActive,
  stripColor,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  stripColor: string;
  badge?: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
  }, []);

  const handleMouseEnter = () => {
    setHovered(true);
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 500);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setShowTooltip(false);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  };

  const activeBg = isActive
    ? hexToRgba(stripColor, 0.1)
    : hovered
      ? 'var(--color-surface-2)'
      : 'transparent';

  const iconColor = isActive ? stripColor : hovered ? 'var(--color-text-secondary)' : 'var(--color-text-muted)';

  return (
    <div
      style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}
    >
      {/* Active accent bar — 3px left strip */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 6,
            width: 3,
            borderRadius: '0 2px 2px 0',
            background: stripColor,
          }}
        />
      )}

      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={label}
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          border: 'none',
          background: activeBg,
          color: iconColor,
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 150ms ease, color 150ms ease',
          padding: 0,
        }}
      >
        {icon}

        {/* Badge */}
        {badge != null && badge > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              background: '#CE1126',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              lineHeight: 1,
            }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            left: 52,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'var(--color-surface-3)',
            color: 'var(--color-text-primary)',
            fontSize: 11,
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            border: '1px solid var(--color-border-1)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */

/** Convert a CSS color to rgba string. Handles hex and css var fallback. */
function hexToRgba(color: string, alpha: number): string {
  // If it's a CSS variable, we can't parse it — use a semi-transparent overlay approach
  if (color.startsWith('var(')) {
    return `color-mix(in srgb, ${color.replace('var(', '').replace(')', '')} ${Math.round(alpha * 100)}%, transparent)`;
  }
  // Parse hex
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export default IconRail;
