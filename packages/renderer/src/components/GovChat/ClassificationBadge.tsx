import React, { useState } from 'react';
import type { ClassificationLevel } from '@/types/govchat';
import { CLASSIFICATION_COLORS, DEFAULT_RETENTION_DAYS } from '@/types/govchat';

/* ------------------------------------------------------------------ */
/*  ClassificationDot                                                 */
/* ------------------------------------------------------------------ */

interface ClassificationDotProps {
  level: ClassificationLevel;
  size?: number;
}

export const ClassificationDot: React.FC<ClassificationDotProps> = ({
  level,
  size = 8,
}) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      minWidth: size,
      borderRadius: '50%',
      backgroundColor: CLASSIFICATION_COLORS[level],
    }}
  />
);

/* ------------------------------------------------------------------ */
/*  ClassificationBadge                                               */
/* ------------------------------------------------------------------ */

interface ClassificationBadgeProps {
  level: ClassificationLevel;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { text: 'text-[9px]', padding: 'px-1.5 py-0.5', dot: 5, gap: 'gap-1' },
  md: { text: 'text-[10.5px]', padding: 'px-2 py-1', dot: 6, gap: 'gap-1.5' },
  lg: { text: 'text-[12px]', padding: 'px-3 py-1.5', dot: 7, gap: 'gap-1.5' },
} as const;

export const ClassificationBadge: React.FC<ClassificationBadgeProps> = ({
  level,
  size = 'md',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const s = SIZE_MAP[size];
  const color = CLASSIFICATION_COLORS[level];

  const retentionDays = DEFAULT_RETENTION_DAYS[level];
  const retentionYears = Math.round(retentionDays / 365);
  const retentionLabel =
    retentionYears === 1 ? '1 year' : `${retentionYears} years`;

  return (
    <span
      className="relative inline-flex items-center select-none"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`inline-flex items-center ${s.gap} ${s.padding} ${s.text} font-semibold rounded-full leading-none whitespace-nowrap`}
        style={{
          backgroundColor: `${color}26`,
          color,
        }}
      >
        <ClassificationDot level={level} size={s.dot} />
        {level}
      </span>

      {/* Tooltip */}
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
          Retained for {retentionLabel}
        </span>
      )}
    </span>
  );
};

export default ClassificationBadge;
