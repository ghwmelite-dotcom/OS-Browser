import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';
import { QUICK_REACTIONS } from '@/types/govchat';

/* ─────────── Emoji data by category ─────────── */

const EMOJI_CATEGORIES: { label: string; emoji: string[] }[] = [
  {
    label: 'Smileys',
    emoji: [
      '\u{1F600}', '\u{1F603}', '\u{1F604}', '\u{1F601}', '\u{1F605}', '\u{1F606}',
      '\u{1F609}', '\u{1F60A}', '\u{1F60D}', '\u{1F618}', '\u{1F917}', '\u{1F914}',
      '\u{1F610}', '\u{1F611}', '\u{1F644}', '\u{1F60F}', '\u{1F612}', '\u{1F61E}',
      '\u{1F622}', '\u{1F62D}', '\u{1F624}', '\u{1F621}', '\u{1F631}', '\u{1F633}',
      '\u{1F60E}', '\u{1F634}', '\u{1F637}', '\u{1F911}', '\u{1F913}', '\u{1F920}',
    ],
  },
  {
    label: 'Hand Gestures',
    emoji: [
      '\u{1F44D}', '\u{1F44E}', '\u{1F44F}', '\u{1F64C}', '\u{1F64F}', '\u{1F4AA}',
      '\u270C\uFE0F', '\u{1F91E}', '\u{1F44C}', '\u{1F448}', '\u{1F449}', '\u{1F446}',
      '\u{1F447}', '\u270B', '\u{1F44B}', '\u{1F91A}', '\u{1F91F}', '\u{1F918}',
      '\u{1F919}', '\u270D\uFE0F', '\u{1F91D}', '\u{1F590}\uFE0F',
    ],
  },
  {
    label: 'Hearts',
    emoji: [
      '\u2764\uFE0F', '\u{1F9E1}', '\u{1F49B}', '\u{1F49A}', '\u{1F499}', '\u{1F49C}',
      '\u{1F5A4}', '\u{1F90D}', '\u{1F90E}', '\u{1F498}', '\u{1F49D}', '\u{1F496}',
      '\u{1F497}', '\u{1F493}', '\u{1F49E}', '\u{1F495}', '\u{1F48C}',
    ],
  },
  {
    label: 'Office',
    emoji: [
      '\u{1F4BC}', '\u{1F4DD}', '\u{1F4CB}', '\u{1F4C4}', '\u{1F4C3}', '\u{1F4D1}',
      '\u{1F4CA}', '\u{1F4C8}', '\u{1F4C9}', '\u{1F4C5}', '\u{1F4C6}', '\u{1F4CC}',
      '\u{1F4CE}', '\u{1F4CF}', '\u{1F4D0}', '\u2702\uFE0F', '\u{1F4E7}', '\u{1F4E8}',
      '\u{1F4E9}', '\u{1F4E6}', '\u260E\uFE0F', '\u{1F4DE}', '\u{1F4BB}', '\u{1F5A8}\uFE0F',
    ],
  },
];

const ALL_EMOJI = EMOJI_CATEGORIES.flatMap(c => c.emoji);

const RECENT_KEY = 'govchat_recent_emoji';
const MAX_RECENT = 12;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(emoji: string) {
  try {
    const current = loadRecent();
    const updated = [emoji, ...current.filter(e => e !== emoji)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // storage unavailable
  }
}

/* ─────────── Props ─────────── */

interface ReactionPickerProps {
  roomId: string;
  eventId: string;
  onClose: () => void;
  position?: { x: number; y: number };
}

/* ─────────── Component ─────────── */

export function ReactionPicker({ roomId, eventId, onClose, position }: ReactionPickerProps) {
  const addReaction = useGovChatStore(s => s.addReaction);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [recentEmoji, setRecentEmoji] = useState<string[]>(loadRecent);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Focus search when expanded
  useEffect(() => {
    if (expanded && searchRef.current) {
      searchRef.current.focus();
    }
  }, [expanded]);

  const handleReact = useCallback(
    (emoji: string) => {
      addReaction(roomId, eventId, emoji);
      saveRecent(emoji);
      setRecentEmoji(loadRecent());
      onClose();
    },
    [addReaction, roomId, eventId, onClose],
  );

  // Filtered emoji for search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return EMOJI_CATEGORIES;
    // Simple search: match category labels (very basic — real impl would use emoji names)
    const q = search.toLowerCase();
    return EMOJI_CATEGORIES.filter(c => c.label.toLowerCase().includes(q)).length > 0
      ? EMOJI_CATEGORIES.filter(c => c.label.toLowerCase().includes(q))
      : EMOJI_CATEGORIES; // fallback to all if no match
  }, [search]);

  /* ── Positioning ── */
  const posStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translateY(-100%)',
        zIndex: 9999,
      }
    : {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        marginBottom: 6,
        zIndex: 9999,
      };

  return (
    <div ref={containerRef} style={posStyle}>
      <div
        className="rounded-xl shadow-lg border overflow-hidden"
        style={{
          background: 'var(--color-surface-1)',
          borderColor: 'var(--color-border-1)',
          minWidth: expanded ? 280 : 'auto',
        }}
      >
        {/* ── Quick Reaction Bar ── */}
        <div className="flex items-center gap-1 px-2 py-1.5">
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         hover:bg-[var(--color-surface-2)] transition-all duration-150
                         hover:scale-110 active:scale-95 text-[18px]"
              title={emoji}
            >
              {emoji}
            </button>
          ))}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       hover:bg-[var(--color-surface-2)] transition-all duration-150
                       hover:scale-110 active:scale-95"
            style={{ color: 'var(--color-text-muted)' }}
            title={expanded ? 'Close picker' : 'More emoji'}
          >
            {expanded ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>

        {/* ── Expanded Picker ── */}
        {expanded && (
          <div
            className="border-t"
            style={{ borderColor: 'var(--color-border-1)', maxHeight: 300, width: 280 }}
          >
            {/* Search */}
            <div className="px-2 pt-2 pb-1">
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <Search size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search emoji..."
                  className="bg-transparent text-[12px] outline-none w-full"
                  style={{ color: 'var(--color-text-primary)' }}
                />
              </div>
            </div>

            {/* Scrollable grid */}
            <div className="overflow-y-auto px-2 pb-2" style={{ maxHeight: 244 }}>
              {/* Recent */}
              {recentEmoji.length > 0 && !search.trim() && (
                <div className="mb-2">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-1 px-0.5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Recent
                  </p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {recentEmoji.map(emoji => (
                      <button
                        key={`recent-${emoji}`}
                        onClick={() => handleReact(emoji)}
                        className="w-8 h-8 flex items-center justify-center rounded-md
                                   hover:bg-[var(--color-surface-2)] transition-all duration-150
                                   hover:scale-110 active:scale-95 text-[17px]"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              {filteredCategories.map(category => (
                <div key={category.label} className="mb-2">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-1 px-0.5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {category.label}
                  </p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {category.emoji.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReact(emoji)}
                        className="w-8 h-8 flex items-center justify-center rounded-md
                                   hover:bg-[var(--color-surface-2)] transition-all duration-150
                                   hover:scale-110 active:scale-95 text-[17px]"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Arrow / triangle pointing down to source */}
      <div
        className="w-0 h-0 ml-4"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid var(--color-surface-1)',
        }}
      />
    </div>
  );
}
