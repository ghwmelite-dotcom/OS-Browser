import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useFeatureRegistry } from '@/hooks/useFeatureRegistry';
import { useNavigationStore } from '@/store/navigation';
import type { FeatureDefinition, ToolbarConfig, ToolbarDropdownItem } from '@/features/registry';

// ── ToolbarButton ────────────────────────────────────────────────────
function ToolbarButton({
  feature,
  config,
}: {
  feature: FeatureDefinition;
  config: ToolbarConfig;
}) {
  const [hovered, setHovered] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isActive = config.getIsActive?.() ?? false;
  const Icon = config.icon;
  const hasDropdown = config.dropdownItems && config.dropdownItems.length > 0;

  // Tooltip delay
  const onMouseEnter = useCallback(() => {
    setHovered(true);
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 500);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHovered(false);
    setShowTooltip(false);
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const handleClick = () => {
    if (hasDropdown) {
      setShowDropdown((prev) => !prev);
    } else {
      config.onClick();
    }
  };

  const iconColor = isActive
    ? feature.stripColor
    : hovered
      ? 'var(--color-text-secondary)'
      : 'var(--color-text-muted)';

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        aria-label={config.label}
        style={{
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          background: hovered || showDropdown ? 'var(--color-surface-2)' : 'transparent',
          transition: 'background 100ms ease, color 100ms ease',
          position: 'relative',
        }}
      >
        <Icon size={15} strokeWidth={1.8} style={{ color: iconColor }} />
        {hasDropdown && (
          <ChevronDown
            size={10}
            strokeWidth={2}
            style={{
              color: iconColor,
              marginLeft: -2,
              transition: 'transform 150ms ease',
              transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-1)',
            borderRadius: 6,
            padding: '4px 8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 300,
            pointerEvents: 'none',
          }}
        >
          {config.label}
        </div>
      )}

      {/* Dropdown menu */}
      {showDropdown && hasDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: 200,
            borderRadius: 12,
            border: '1px solid var(--color-border-1)',
            background: 'var(--color-surface-1)',
            boxShadow:
              '0 20px 40px -8px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
            padding: '4px 0',
            zIndex: 300,
            animation: 'kenteDropdownIn 120ms ease-out',
          }}
        >
          {config.dropdownItems!.map((item) => (
            <DropdownMenuItem
              key={item.id}
              item={item}
              onSelect={() => {
                item.onClick();
                setShowDropdown(false);
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes kenteDropdownIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Dropdown menu item ───────────────────────────────────────────────
function DropdownMenuItem({
  item,
  onSelect,
}: {
  item: ToolbarDropdownItem;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        background: hovered ? 'var(--color-surface-2)' : 'transparent',
        transition: 'background 75ms ease',
      }}
    >
      {Icon && (
        <Icon
          size={14}
          strokeWidth={1.8}
          style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
        />
      )}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: 'var(--color-text-primary)',
        }}
      >
        {item.label}
      </span>
      {item.shortcut && (
        <span
          style={{
            fontSize: 10,
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface-2)',
            padding: '2px 6px',
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          {item.shortcut}
        </span>
      )}
    </button>
  );
}

// ── KenteToolbar (main export) ───────────────────────────────────────
export function KenteToolbar() {
  const features = useFeatureRegistry();
  const { currentUrl } = useNavigationStore();

  const toolbarFeatures = features
    .filter((f) => f.surfaces.toolbar)
    .filter((f) => {
      const cond = f.surfaces.toolbar!.showCondition;
      if (!cond) return true;
      return cond(currentUrl || '');
    })
    .sort((a, b) => a.surfaces.toolbar!.order - b.surfaces.toolbar!.order);

  if (toolbarFeatures.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {toolbarFeatures.map((f) => (
        <ToolbarButton key={f.id} feature={f} config={f.surfaces.toolbar!} />
      ))}
    </div>
  );
}
