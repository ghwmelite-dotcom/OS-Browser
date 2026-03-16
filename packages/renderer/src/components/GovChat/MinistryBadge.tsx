import React, { useState } from 'react';
import type { MinistryInfo } from '@/types/govchat';

/* ------------------------------------------------------------------ */
/*  MinistryBadge                                                     */
/* ------------------------------------------------------------------ */

interface MinistryBadgeProps {
  ministry: MinistryInfo;
  size?: 'sm' | 'md';
}

const SIZE_MAP = {
  sm: { text: 'text-[9px]', padding: 'px-1.5 py-0.5' },
  md: { text: 'text-[11px]', padding: 'px-2 py-1' },
} as const;

export const MinistryBadge: React.FC<MinistryBadgeProps> = ({
  ministry,
  size = 'md',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const s = SIZE_MAP[size];

  return (
    <span
      className="relative inline-flex items-center select-none"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`inline-flex items-center ${s.padding} ${s.text} font-semibold rounded-full leading-none whitespace-nowrap`}
        style={{
          backgroundColor: `${ministry.color}26`,
          color: ministry.color,
        }}
      >
        {ministry.abbreviation}
      </span>

      {/* Tooltip — full ministry name */}
      {showTooltip && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded text-[10px] leading-tight whitespace-nowrap pointer-events-none z-50"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-1)',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)',
          }}
        >
          {ministry.name}
        </span>
      )}
    </span>
  );
};

export default MinistryBadge;
