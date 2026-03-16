import React, { useState } from 'react';
import { Pin, Trash2, Users, Shield, Info } from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';
import type { ChatRoom } from '@/types/govchat';
import { CLASSIFICATION_COLORS } from '@/types/govchat';

/* ─────────── helpers ─────────── */

function formatRelativeDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d`;
  return new Date(ts).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ─────────── room avatar ─────────── */

function RoomAvatar({ room }: { room: ChatRoom }) {
  const bgColors = ['#CE1126', '#006B3F', '#D4A017', '#1565C0', '#6A1B9A'];
  const colorIndex = room.name.charCodeAt(0) % bgColors.length;

  // Determine if any member is online (for DMs, check the other person)
  const hasOnlineMember = room.isDirect && room.members.some(m => m.isOnline);

  return (
    <div className="relative shrink-0">
      <div
        className="rounded-full flex items-center justify-center font-semibold text-white select-none"
        style={{
          width: 36,
          height: 36,
          fontSize: 13,
          background: bgColors[colorIndex],
        }}
      >
        {room.isDirect ? (
          getInitials(room.name)
        ) : (
          <Users size={16} />
        )}
      </div>
      {hasOnlineMember && (
        <div
          className="absolute bottom-0 right-0 rounded-full border-2"
          style={{
            width: 10,
            height: 10,
            background: '#4CAF50',
            borderColor: 'var(--color-surface-1)',
          }}
        />
      )}
    </div>
  );
}

/* ─────────── main component ─────────── */

export function ChatListItem({
  room,
  isActive,
  onSelect,
  onPin,
  onDelete,
}: {
  room: ChatRoom;
  isActive: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const currentUser = useGovChatStore(s => s.currentUser);
  const typingUsers = useGovChatStore(s => s.typingByRoom[room.roomId]);
  const [showCtx, setShowCtx] = useState(false);

  // Determine last message preview
  const lastMsgPreview = (() => {
    if (typingUsers && typingUsers.length > 0) {
      const name = typingUsers.length === 1 ? typingUsers[0] : `${typingUsers.length} people`;
      return <em style={{ color: '#006B3F' }}>{name} typing...</em>;
    }
    if (!room.lastMessage) return 'No messages yet';
    const prefix =
      currentUser && room.lastMessage.senderId === currentUser.userId
        ? 'You: '
        : '';
    const body = room.lastMessage.body;
    return prefix + (body.length > 40 ? body.slice(0, 40) + '...' : body);
  })();

  const classificationColor = CLASSIFICATION_COLORS[room.classification];

  return (
    <div
      className="relative group"
      onContextMenu={e => {
        e.preventDefault();
        setShowCtx(prev => !prev);
      }}
    >
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-2 px-2.5 py-2.5 transition-colors duration-100 text-left"
        style={{
          background: isActive ? 'var(--color-surface-2)' : 'transparent',
          borderLeft: isActive ? '3px solid #006B3F' : '3px solid transparent',
        }}
      >
        <RoomAvatar room={room} />

        <div className="flex-1 min-w-0">
          {/* Row 1: name + timestamp */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[12px] font-semibold text-text-primary truncate flex items-center gap-1">
              {room.isPinned && <Pin size={9} style={{ color: '#D4A017' }} className="shrink-0" />}
              {/* Classification dot */}
              <span
                className="shrink-0 rounded-full inline-block"
                style={{
                  width: 6,
                  height: 6,
                  background: classificationColor,
                }}
                title={room.classification}
              />
              <span className="truncate">{room.name}</span>
            </span>
            <span className="text-[9.5px] text-text-muted shrink-0">
              {room.lastMessage ? formatRelativeDate(room.lastMessage.timestamp) : ''}
            </span>
          </div>

          {/* Row 2: preview + unread badge */}
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="text-[10.5px] text-text-muted truncate">
              {lastMsgPreview}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {room.unreadCount > 0 && (
                <span
                  className="min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1"
                  style={{ background: '#006B3F' }}
                >
                  {room.unreadCount > 99 ? '99+' : room.unreadCount}
                </span>
              )}
            </div>
          </div>

          {/* Row 3: ministry badge (if present) */}
          {room.ministry && (
            <div className="mt-0.5">
              <span
                className="inline-flex items-center text-[8.5px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: `${room.ministry.color}18`,
                  color: room.ministry.color,
                }}
              >
                {room.ministry.abbreviation}
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Context menu */}
      {showCtx && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowCtx(false)} />
          <div
            className="absolute right-2 top-10 w-40 rounded-lg border py-1 shadow-xl z-50"
            style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
          >
            <button
              onClick={() => { onPin(); setShowCtx(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11.5px] text-text-primary hover:bg-surface-2 transition-colors"
            >
              <Pin size={12} style={{ color: room.isPinned ? '#D4A017' : undefined }} />
              {room.isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              onClick={() => { onDelete(); setShowCtx(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11.5px] hover:bg-surface-2 transition-colors"
              style={{ color: '#CE1126' }}
            >
              <Trash2 size={12} />
              Delete
            </button>
            <div className="my-1 border-t" style={{ borderColor: 'var(--color-border-1)' }} />
            <div className="px-3 py-1.5 text-[10px] text-text-muted flex items-center gap-1.5">
              <Info size={10} />
              <span>
                <span
                  className="inline-block w-[6px] h-[6px] rounded-full mr-1"
                  style={{ background: classificationColor }}
                />
                {room.classification} &middot; {room.retentionDays}d retention
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
