import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useFeatureCommands } from '@/hooks/useFeatureRegistry';
import {
  FeatureCategory,
  FEATURE_CATEGORIES,
  EnrichedCommand,
} from '@/features/registry';
import { KenteCommandItem } from './KenteCommandItem';

// ── Types ────────────────────────────────────────────────────────────
interface ScoredCommand extends EnrichedCommand {
  score: number;
}

interface KenteCommandBarProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Default quick-action labels ──────────────────────────────────────
const DEFAULT_LABELS = [
  'Save page offline',
  'Translate this page',
  'Take screenshot',
  'Explain this page',
  'Toggle lite mode',
];

// ── Search logic ─────────────────────────────────────────────────────
function searchCommands(
  query: string,
  allCommands: EnrichedCommand[],
): ScoredCommand[] {
  if (!query.trim()) return getDefaultCommands(allCommands);

  const q = query.toLowerCase();

  return allCommands
    .map((cmd) => {
      let score = 0;

      if (cmd.label.toLowerCase().startsWith(q)) score += 100;
      if (cmd.label.toLowerCase().includes(q)) score += 50;
      if (cmd.description?.toLowerCase().includes(q)) score += 30;

      for (const kw of cmd.keywords) {
        if (kw.startsWith(q)) score += 80;
        if (kw.includes(q)) score += 40;
      }

      return { ...cmd, score };
    })
    .filter((cmd) => cmd.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function getDefaultCommands(allCommands: EnrichedCommand[]): ScoredCommand[] {
  // Try to match predefined quick actions
  const defaults: ScoredCommand[] = [];

  for (const label of DEFAULT_LABELS) {
    const lower = label.toLowerCase();
    const match = allCommands.find(
      (c) =>
        c.label.toLowerCase().includes(lower) ||
        lower.includes(c.label.toLowerCase()),
    );
    if (match) {
      defaults.push({ ...match, score: 1000 });
    }
  }

  // If we didn't find enough defaults, fill with top-priority commands
  if (defaults.length < 5) {
    for (const cmd of allCommands) {
      if (defaults.length >= 5) break;
      if (!defaults.find((d) => d.id === cmd.id)) {
        defaults.push({ ...cmd, score: 500 });
      }
    }
  }

  return defaults.slice(0, 5);
}

// ── Group results by category ────────────────────────────────────────
interface GroupedResults {
  category: FeatureCategory;
  label: string;
  commands: ScoredCommand[];
}

function groupByCategory(commands: ScoredCommand[]): GroupedResults[] {
  const map = new Map<FeatureCategory, ScoredCommand[]>();

  for (const cmd of commands) {
    // Determine category from the command's featureId in the registry
    // We store category info by looking it up through the group or the feature data
    const existing = map.get(cmd.group as FeatureCategory) || [];
    existing.push(cmd);
    map.set(cmd.group as FeatureCategory, existing);
  }

  // If that doesn't work well (group may not match category keys),
  // fall back to grouping by the EnrichedCommand's own data
  if (map.size === 0 || (map.size === 1 && map.has(undefined as any))) {
    map.clear();
    // Just return ungrouped
    return [
      {
        category: 'productivity' as FeatureCategory,
        label: 'Results',
        commands,
      },
    ];
  }

  const groups: GroupedResults[] = [];
  for (const [cat, cmds] of map) {
    const catMeta = FEATURE_CATEGORIES[cat as FeatureCategory];
    groups.push({
      category: cat as FeatureCategory,
      label: catMeta?.label || (cat as string) || 'Other',
      commands: cmds,
    });
  }

  // Sort by FEATURE_CATEGORIES sort order
  groups.sort((a, b) => {
    const oa = FEATURE_CATEGORIES[a.category]?.sortOrder ?? 99;
    const ob = FEATURE_CATEGORIES[b.category]?.sortOrder ?? 99;
    return oa - ob;
  });

  return groups;
}

// ── Component ────────────────────────────────────────────────────────
export function KenteCommandBar({ isOpen, onClose }: KenteCommandBarProps) {
  const allCommands = useFeatureCommands();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Compute results
  const results = useMemo(
    () => searchCommands(query, allCommands),
    [query, allCommands],
  );

  // Should we show category headers?
  const groups = useMemo(() => groupByCategory(results), [results]);
  const showHeaders = groups.length >= 2;

  // Build flat list for keyboard nav (including header offsets)
  const flatItems = useMemo(() => {
    if (!showHeaders) return results;
    return results; // headers are visual only — nav skips them
  }, [results, showHeaders]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Keep selected item in scroll view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard nav
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = flatItems[selectedIndex];
        if (cmd) {
          cmd.action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [flatItems, selectedIndex, onClose],
  );

  if (!isOpen) return null;

  // Flatten index counter for rendering
  let globalIdx = 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          width: 560,
          maxHeight: 420,
          borderRadius: 16,
          border: '1px solid var(--color-border-1)',
          background: 'var(--color-surface-1)',
          boxShadow:
            '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'kenteCommandFadeUp 150ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          style={{
            height: 44,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
            borderBottom: '1px solid var(--color-border-1)',
            flexShrink: 0,
          }}
        >
          <Search
            size={16}
            strokeWidth={1.8}
            style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            spellCheck={false}
            autoComplete="off"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 0',
          }}
        >
          {/* Empty query: show "Recent" header */}
          {!query.trim() && results.length > 0 && (
            <div
              style={{
                padding: '8px 16px 4px',
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--color-text-muted)',
              }}
            >
              Recent
            </div>
          )}

          {/* Results with optional grouping */}
          {query.trim() && results.length > 0 && showHeaders
            ? groups.map((group) => (
                <div key={group.category}>
                  <div
                    style={{
                      padding: '10px 16px 4px',
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {group.label}
                  </div>
                  {group.commands.map((cmd) => {
                    const idx = globalIdx++;
                    return (
                      <KenteCommandItem
                        key={cmd.id}
                        label={cmd.label}
                        description={cmd.description}
                        shortcut={cmd.shortcut}
                        stripColor={cmd.stripColor}
                        icon={cmd.featureIcon}
                        isSelected={idx === selectedIndex}
                        onSelect={() => {
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      />
                    );
                  })}
                </div>
              ))
            : results.map((cmd, i) => (
                <KenteCommandItem
                  key={cmd.id}
                  label={cmd.label}
                  description={cmd.description}
                  shortcut={cmd.shortcut}
                  stripColor={cmd.stripColor}
                  icon={cmd.featureIcon}
                  isSelected={i === selectedIndex}
                  onSelect={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                />
              ))}

          {/* Empty state: no results */}
          {query.trim() && results.length === 0 && (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                }}
              >
                No results for &ldquo;{query}&rdquo;
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  opacity: 0.7,
                }}
              >
                Try: &ldquo;gov&rdquo;, &ldquo;translate&rdquo;,
                &ldquo;screenshot&rdquo;, &ldquo;pay&rdquo;
              </div>
            </div>
          )}

          {/* No commands registered at all */}
          {!query.trim() && results.length === 0 && (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--color-text-muted)',
              }}
            >
              No commands available yet.
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div
          style={{
            height: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '0 16px',
            borderTop: '1px solid var(--color-border-1)',
            fontSize: 10,
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}
        >
          <span>
            <kbd style={{ fontFamily: 'inherit' }}>&uarr;&darr;</kbd> navigate
          </span>
          <span>
            <kbd style={{ fontFamily: 'inherit' }}>&crarr;</kbd> select
          </span>
          <span>
            <kbd style={{ fontFamily: 'inherit' }}>esc</kbd> close
          </span>
        </div>
      </div>

      {/* Keyframe animation (injected once) */}
      <style>{`
        @keyframes kenteCommandFadeUp {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
