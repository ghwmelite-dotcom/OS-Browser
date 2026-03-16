import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown } from 'lucide-react';
import type { ClassificationLevel } from '@/types/govchat';
import { CLASSIFICATION_COLORS } from '@/types/govchat';
import { ClassificationBadge, ClassificationDot } from './ClassificationBadge';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                 */
/* ------------------------------------------------------------------ */

interface ClassificationSelectorProps {
  value: ClassificationLevel;
  onChange: (level: ClassificationLevel) => void;
  compact?: boolean;
}

interface LevelOption {
  level: ClassificationLevel;
  description: string;
  retention: string;
}

const LEVELS: LevelOption[] = [
  { level: 'UNCLASSIFIED', description: 'Public information', retention: '1 year retention' },
  { level: 'OFFICIAL', description: 'Standard government business', retention: '2 year retention' },
  { level: 'SENSITIVE', description: 'Limited distribution', retention: '5 year retention' },
  { level: 'SECRET', description: 'Restricted access only', retention: '7 year retention' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export const ClassificationSelector: React.FC<ClassificationSelectorProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [dropAbove, setDropAbove] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<ClassificationLevel | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ---- Position dropdown above/below ---- */
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setDropAbove(spaceBelow < 260);
  }, [open]);

  /* ---- Close on outside click ---- */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setShowWarning(false);
        setPendingLevel(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* ---- Selection handler ---- */
  const handleSelect = useCallback(
    (level: ClassificationLevel) => {
      if (level === 'SECRET' && value !== 'SECRET') {
        setPendingLevel(level);
        setShowWarning(true);
        return;
      }
      onChange(level);
      setOpen(false);
      setShowWarning(false);
      setPendingLevel(null);
    },
    [onChange, value],
  );

  const confirmSecret = useCallback(() => {
    if (pendingLevel) {
      onChange(pendingLevel);
    }
    setOpen(false);
    setShowWarning(false);
    setPendingLevel(null);
  }, [onChange, pendingLevel]);

  const cancelSecret = useCallback(() => {
    setShowWarning(false);
    setPendingLevel(null);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        style={{
          padding: '2px 6px 2px 2px',
          border: '1px solid var(--color-border-1)',
          backgroundColor: 'var(--color-surface-1)',
          color: 'var(--color-text-primary)',
        }}
      >
        <ClassificationBadge level={value} size="sm" />
        <ChevronDown
          size={12}
          className="transition-transform"
          style={{
            transform: open ? 'rotate(180deg)' : undefined,
            color: 'var(--color-text-muted)',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-64 rounded-lg overflow-hidden shadow-lg"
          style={{
            [dropAbove ? 'bottom' : 'top']: '100%',
            [dropAbove ? 'marginBottom' : 'marginTop']: 6,
            left: 0,
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-1)',
          }}
        >
          {/* Secret warning banner */}
          {showWarning && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 text-[11px] leading-snug"
              style={{
                backgroundColor: `${CLASSIFICATION_COLORS.SECRET}15`,
                borderBottom: '1px solid var(--color-border-1)',
                color: CLASSIFICATION_COLORS.SECRET,
              }}
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Restricted Classification</p>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Messages will be restricted. Only cleared personnel can access.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={confirmSecret}
                    className="px-2.5 py-1 rounded text-[10px] font-semibold text-white"
                    style={{ backgroundColor: CLASSIFICATION_COLORS.SECRET }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={cancelSecret}
                    className="px-2.5 py-1 rounded text-[10px] font-semibold"
                    style={{
                      backgroundColor: 'var(--color-surface-2)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="py-1">
            {LEVELS.map(({ level, description, retention }) => {
              const selected = level === value;
              const color = CLASSIFICATION_COLORS[level];

              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleSelect(level)}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors hover:brightness-95"
                  style={{
                    backgroundColor: selected
                      ? `${color}10`
                      : 'transparent',
                  }}
                >
                  <ClassificationDot level={level} size={8} />

                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[11px] font-semibold leading-tight"
                      style={{ color }}
                    >
                      {level}
                    </div>
                    {!compact && (
                      <>
                        <div
                          className="text-[10px] mt-0.5 leading-tight"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {description}
                        </div>
                        <div
                          className="text-[9px] mt-0.5 leading-tight"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {retention}
                        </div>
                      </>
                    )}
                  </div>

                  {selected && (
                    <Check
                      size={14}
                      className="shrink-0 mt-0.5"
                      style={{ color }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassificationSelector;
