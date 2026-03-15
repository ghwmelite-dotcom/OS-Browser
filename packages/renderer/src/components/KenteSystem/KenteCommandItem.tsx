import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface KenteCommandItemProps {
  label: string;
  description?: string;
  shortcut?: string;
  stripColor: string;
  icon: LucideIcon;
  isSelected: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
}

export function KenteCommandItem({
  label,
  description,
  shortcut,
  stripColor,
  icon: Icon,
  isSelected,
  onSelect,
  onMouseEnter,
}: KenteCommandItemProps) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 16px',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        background: isSelected ? 'var(--color-surface-2)' : 'transparent',
        transition: 'background 75ms ease',
      }}
    >
      {/* Colored dot */}
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: stripColor,
          flexShrink: 0,
        }}
      />

      {/* Feature icon */}
      <Icon
        size={16}
        strokeWidth={1.8}
        style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
      />

      {/* Label + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 1,
            }}
          >
            {description}
          </div>
        )}
      </div>

      {/* Shortcut badge */}
      {shortcut && (
        <span
          style={{
            fontSize: 10,
            fontFamily: 'system-ui, sans-serif',
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface-2)',
            padding: '2px 6px',
            borderRadius: 4,
            flexShrink: 0,
            lineHeight: '14px',
          }}
        >
          {shortcut}
        </span>
      )}
    </button>
  );
}
