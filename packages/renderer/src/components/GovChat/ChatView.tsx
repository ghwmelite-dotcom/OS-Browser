import React, { useEffect, useRef, useMemo } from 'react';
import {
  Shield, Users, Lock, MessageSquare, Hash,
} from 'lucide-react';
import { useGovChatStore, CURRENT_USER_ID } from '@/store/govchat';
import { CLASSIFICATION_COLORS } from '@/types/govchat';
import type { GovChatMessage, ClassificationLevel } from '@/types/govchat';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from '@/components/GovChat/MessageInput';

/* ─────────── helpers ─────────── */

function formatTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatDateSeparator(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ─────────── typing indicator ─────────── */

function TypingIndicator({ names }: { names: string[] }) {
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <div
        className="flex items-center gap-1 px-3 py-2 rounded-xl w-fit"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <span className="typing-dot" style={{ animationDelay: '0ms' }} />
        <span className="typing-dot" style={{ animationDelay: '200ms' }} />
        <span className="typing-dot" style={{ animationDelay: '400ms' }} />
      </div>
      <span className="text-[10.5px] italic" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <style>{`
        .typing-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--color-text-muted);
          display: inline-block;
          animation: gcTypingBounce 1.2s ease-in-out infinite;
        }
        @keyframes gcTypingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

/* ─────────── room avatar ─────────── */

function RoomAvatar({ name, isDirect, size = 36 }: { name: string; isDirect: boolean; size?: number }) {
  const bgColors = ['#CE1126', '#006B3F', '#D4A017', '#1565C0', '#6A1B9A'];
  const colorIndex = name.charCodeAt(0) % bgColors.length;

  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white select-none shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: bgColors[colorIndex],
      }}
    >
      {isDirect ? getInitials(name) : <Hash size={size * 0.45} />}
    </div>
  );
}

/* ─────────── classification badge ─────────── */

function ClassificationBadge({ level }: { level: ClassificationLevel }) {
  const color = CLASSIFICATION_COLORS[level];
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {level}
    </span>
  );
}

/* ─────────── main ChatView ─────────── */

export function ChatView() {
  const activeRoomId = useGovChatStore(s => s.activeRoomId);
  const rooms = useGovChatStore(s => s.rooms);
  const allMessages = useGovChatStore(s => s.messages);
  const typingByRoom = useGovChatStore(s => s.typingByRoom);
  const currentUser = useGovChatStore(s => s.currentUser);
  const markRoomAsRead = useGovChatStore(s => s.markRoomAsRead);
  const openThread = useGovChatStore(s => s.openThread);
  const addReaction = useGovChatStore(s => s.addReaction);
  const removeReaction = useGovChatStore(s => s.removeReaction);
  const setReplyingTo = useGovChatStore(s => s.setReplyingTo);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const room = rooms.find(r => r.roomId === activeRoomId);
  const chatMessages: GovChatMessage[] = activeRoomId ? (allMessages[activeRoomId] || []) : [];
  const currentUserId = currentUser?.userId ?? CURRENT_USER_ID;

  // Typing users for this room (exclude self)
  const typingUserIds = activeRoomId ? (typingByRoom[activeRoomId] || []) : [];
  const typingNames = useMemo(() => {
    if (!room) return [];
    return typingUserIds
      .filter(uid => uid !== currentUserId)
      .map(uid => {
        const member = room.members.find(m => m.userId === uid);
        return member?.displayName ?? 'Someone';
      });
  }, [typingUserIds, room, currentUserId]);

  // DM contact info
  const dmContact = useMemo(() => {
    if (!room || !room.isDirect) return null;
    return room.members.find(m => m.userId !== currentUserId) ?? null;
  }, [room, currentUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, typingNames.length]);

  // Mark room as read when it becomes active
  useEffect(() => {
    if (activeRoomId) {
      markRoomAsRead(activeRoomId);
    }
  }, [activeRoomId, markRoomAsRead]);

  if (!room || !activeRoomId) {
    return null;
  }

  // Build message elements with date separators
  const renderMessages = () => {
    if (chatMessages.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(212, 160, 23, 0.12)' }}
          >
            <MessageSquare size={28} style={{ color: '#D4A017' }} />
          </div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Start the conversation
          </p>
          <p className="text-[11px] text-center max-w-[220px]" style={{ color: 'var(--color-text-muted)' }}>
            Send the first message in this {room.isDirect ? 'direct chat' : 'group'}.
            All messages are end-to-end encrypted.
          </p>
        </div>
      );
    }

    const elements: React.ReactNode[] = [];
    let lastDateStr: string | null = null;

    chatMessages.forEach((msg, i) => {
      const dateStr = formatDateSeparator(msg.timestamp);
      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr;
        elements.push(
          <div key={`date-sep-${i}`} className="flex items-center justify-center py-3">
            <span
              className="text-[10.5px] px-3 py-1 rounded-full font-medium"
              style={{
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-muted)',
              }}
            >
              {dateStr}
            </span>
          </div>,
        );
      }

      const isOwn = msg.senderId === currentUserId;
      // Show sender name for group chats when the previous message was from a different sender
      const prevMsg = i > 0 ? chatMessages[i - 1] : null;
      const showSender = !room.isDirect && !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId);

      elements.push(
        <MessageBubble
          key={msg.eventId}
          message={msg}
          isOwn={isOwn}
          showSender={showSender}
        />,
      );
    });

    return elements;
  };

  const memberCount = room.members.length;

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--color-bg)' }}>
      {/* ── Chat Header ── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0"
        style={{
          borderColor: 'var(--color-border-1)',
          background: 'var(--color-surface-1)',
        }}
      >
        {/* Room avatar */}
        <div className="relative">
          <RoomAvatar name={room.name} isDirect={room.isDirect} size={34} />
          {/* Online indicator for DMs */}
          {dmContact?.isOnline && (
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
              style={{
                background: '#4CAF50',
                borderColor: 'var(--color-surface-1)',
              }}
            />
          )}
        </div>

        {/* Room info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {room.name}
            </span>
            <ClassificationBadge level={room.classification} />
          </div>
          <div className="text-[10.5px] truncate" style={{ color: 'var(--color-text-muted)' }}>
            {room.isDirect ? (
              dmContact ? (
                <>
                  {dmContact.department}
                  {dmContact.isOnline ? (
                    <span style={{ color: '#4CAF50' }}> &bull; Online</span>
                  ) : dmContact.lastSeen ? (
                    <span>
                      {' '}&bull; Last seen{' '}
                      {new Date(dmContact.lastSeen).toLocaleDateString('en-GH', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  ) : null}
                </>
              ) : (
                'Direct message'
              )
            ) : (
              <span className="flex items-center gap-1">
                <Users size={10} className="shrink-0" />
                {memberCount} members
                {room.topic && <span> &bull; {room.topic}</span>}
              </span>
            )}
          </div>
        </div>

        {/* E2E badge */}
        {room.isEncrypted && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[9.5px] font-medium shrink-0"
            style={{ background: 'rgba(0, 107, 63, 0.1)', color: '#006B3F' }}
          >
            <Shield size={10} />
            Encrypted
          </div>
        )}
      </div>

      {/* ── E2E Banner ── */}
      <div
        className="flex items-center justify-center gap-2 py-1.5 shrink-0"
        style={{ background: 'rgba(0, 107, 63, 0.06)' }}
      >
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#006B3F' }}>
          <Shield size={10} />
          Messages in this room are end-to-end encrypted
        </div>
        <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>|</span>
        <span className="text-[9.5px] font-semibold" style={{ color: CLASSIFICATION_COLORS[room.classification] }}>
          Classification: {room.classification}
        </span>
      </div>

      {/* ── Message List ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden py-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {renderMessages()}

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <TypingIndicator names={typingNames} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Message Input ── */}
      <MessageInput />
    </div>
  );
}
