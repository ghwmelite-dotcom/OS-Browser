import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGovChatStore } from '@/store/govchat';

interface MentionAutocompleteProps {
  query: string;
  roomId: string;
  onSelect: (userId: string, displayName: string) => void;
  onClose: () => void;
}

const MAX_VISIBLE = 5;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold" style={{ color: '#D4A017' }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  query,
  roomId,
  onSelect,
  onClose,
}) => {
  const { rooms } = useGovChatStore();
  const room = rooms.find(r => r.roomId === roomId);
  const members = room?.members || [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return members;
    return members.filter(
      m =>
        m.displayName.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.staffId.toLowerCase().includes(q),
    );
  }, [query, members]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (filtered.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filtered.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[selectedIndex]) {
            onSelect(filtered[selectedIndex].userId, filtered[selectedIndex].displayName);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [filtered, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleClick = useCallback(
    (userId: string, displayName: string) => {
      onSelect(userId, displayName);
    },
    [onSelect],
  );

  if (filtered.length === 0) {
    return (
      <div
        className="absolute bottom-full left-0 z-50 mb-1 w-72 overflow-hidden rounded-xl shadow-xl"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-border-1)',
        }}
      >
        <div className="px-4 py-3">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No members found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-full left-0 z-50 mb-1 w-72 overflow-hidden rounded-xl shadow-xl"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border-1)',
      }}
    >
      {/* Header */}
      <div
        className="border-b px-3 py-2"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          Members
        </p>
      </div>

      {/* List */}
      <div
        ref={listRef}
        className="overflow-y-auto"
        style={{ maxHeight: MAX_VISIBLE * 52 }}
      >
        {filtered.map((member, idx) => {
          const isSelected = idx === selectedIndex;
          // Generate a deterministic color from userId
          const hue =
            member.userId
              .split('')
              .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

          return (
            <button
              key={member.userId}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
              style={{
                backgroundColor: isSelected ? 'var(--color-surface-1)' : 'transparent',
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => handleClick(member.userId, member.displayName)}
            >
              {/* Avatar */}
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.displayName}
                  className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{
                    backgroundColor: `hsl(${hue}, 55%, 45%)`,
                  }}
                >
                  {getInitials(member.displayName)}
                </div>
              )}

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {highlightMatch(member.displayName, query)}
                </p>
                <p className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {member.department}
                </p>
              </div>

              {/* Online indicator */}
              {member.isOnline && (
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Hint */}
      <div
        className="border-t px-3 py-1.5"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
          <kbd className="rounded border px-1" style={{ borderColor: 'var(--color-border-1)' }}>
            ↑↓
          </kbd>{' '}
          navigate{' '}
          <kbd className="rounded border px-1" style={{ borderColor: 'var(--color-border-1)' }}>
            Enter
          </kbd>{' '}
          select{' '}
          <kbd className="rounded border px-1" style={{ borderColor: 'var(--color-border-1)' }}>
            Esc
          </kbd>{' '}
          close
        </p>
      </div>
    </div>
  );
};

export default MentionAutocomplete;
