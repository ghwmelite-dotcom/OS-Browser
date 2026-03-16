import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Send, MessageSquare, User } from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';
import type { GovChatMessage } from '@/types/govchat';
import { CLASSIFICATION_COLORS } from '@/types/govchat';

/* ─────────── Helpers ─────────── */

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ─────────── Sender Avatar ─────────── */

function SenderAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = getInitials(name);
  // Deterministic color from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#006B3F', '#CE1126', '#D4A017', '#1565C0', '#7B1FA2', '#E65100'];
  const bg = colors[Math.abs(hash) % colors.length];

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-semibold"
      style={{
        width: size,
        height: size,
        background: bg,
        color: '#fff',
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}

/* ─────────── Root Message Card ─────────── */

function RootMessage({ message }: { message: GovChatMessage }) {
  return (
    <div
      className="px-3 py-3 border-b"
      style={{ borderColor: 'var(--color-border-1)' }}
    >
      <div className="flex items-start gap-2.5">
        <SenderAvatar name={message.senderName} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[12.5px] font-semibold truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {message.senderName}
            </span>
            <span
              className="text-[10px] shrink-0"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {formatTime(message.timestamp)}
            </span>
          </div>
          <p
            className="text-[12.5px] leading-relaxed whitespace-pre-wrap break-words"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {message.body}
          </p>
          {/* Classification badge */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{
                color: CLASSIFICATION_COLORS[message.classification],
                background: `${CLASSIFICATION_COLORS[message.classification]}18`,
              }}
            >
              {message.classification}
            </span>
            {message.reactions.length > 0 && (
              <div className="flex items-center gap-1">
                {message.reactions.map(r => (
                  <span
                    key={r.key}
                    className="text-[11px] px-1 py-0.5 rounded-md"
                    style={{ background: 'var(--color-surface-2)' }}
                  >
                    {r.key} {r.senders.length > 1 ? r.senders.length : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Thread Reply Item ─────────── */

function ThreadReply({ message }: { message: GovChatMessage }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2">
      <SenderAvatar name={message.senderName} size={24} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-[11.5px] font-semibold truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {message.senderName}
          </span>
          <span
            className="text-[9.5px] shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {formatTime(message.timestamp)}
          </span>
        </div>
        <p
          className="text-[12px] leading-relaxed whitespace-pre-wrap break-words"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {message.body}
        </p>
      </div>
    </div>
  );
}

/* ─────────── Props ─────────── */

interface ThreadViewProps {
  roomId: string;
  threadRootId: string;
  onClose: () => void;
}

/* ─────────── Component ─────────── */

export function ThreadView({ roomId, threadRootId, onClose }: ThreadViewProps) {
  const closeThread = useGovChatStore(s => s.closeThread);
  const sendMessage = useGovChatStore(s => s.sendMessage);
  const messages = useGovChatStore(s => s.messages);

  const [draft, setDraft] = useState('');
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const roomMessages = messages[roomId] || [];

  // Root message
  const rootMessage = useMemo(
    () => roomMessages.find(m => m.eventId === threadRootId),
    [roomMessages, threadRootId],
  );

  // Thread replies: messages whose threadRootId matches
  const replies = useMemo(
    () => roomMessages.filter(m => m.threadRootId === threadRootId && m.eventId !== threadRootId),
    [roomMessages, threadRootId],
  );

  // Auto-scroll to bottom on new replies
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  // Handle close
  const handleClose = useCallback(() => {
    closeThread();
    onClose();
  }, [closeThread, onClose]);

  // Handle send
  const handleSend = useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    // Send as a thread reply — the message body is sent and the parent
    // component / store integration should tag it with threadRootId.
    // For now we call sendMessage; a future phase can extend this to
    // include thread metadata in the Matrix event.
    sendMessage(roomId, body);
    setDraft('');
    // Re-focus textarea
    textareaRef.current?.focus();
  }, [draft, roomId, sendMessage]);

  // Keyboard handler: Enter sends, Shift+Enter inserts newline
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, [draft]);

  if (!rootMessage) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full"
        style={{ width: 320, background: 'var(--color-surface-1)' }}
      >
        <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
          Thread not found.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full border-l shrink-0"
      style={{
        width: 320,
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={15} style={{ color: '#006B3F' }} />
          <span
            className="text-[13px] font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Thread
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded-md hover:bg-[var(--color-surface-2)] transition-colors"
          title="Close thread"
        >
          <X size={15} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* ── Root message ── */}
      <RootMessage message={rootMessage} />

      {/* ── Reply count divider ── */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <div className="flex-1 h-px" style={{ background: 'var(--color-border-1)' }} />
        <span
          className="text-[10px] font-semibold shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--color-border-1)' }} />
      </div>

      {/* ── Thread replies (scrollable) ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-6">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0, 107, 63, 0.08)' }}
            >
              <MessageSquare size={18} style={{ color: '#006B3F' }} />
            </div>
            <p
              className="text-[11px] text-center"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No replies yet. Start the conversation.
            </p>
          </div>
        ) : (
          <div className="py-1">
            {replies.map(msg => (
              <ThreadReply key={msg.eventId} message={msg} />
            ))}
            <div ref={repliesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div
        className="shrink-0 border-t px-3 py-2"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in thread..."
            rows={1}
            className="flex-1 bg-transparent text-[12.5px] outline-none resize-none leading-relaxed"
            style={{
              color: 'var(--color-text-primary)',
              maxHeight: 96,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="p-1.5 rounded-lg transition-all duration-150 shrink-0
                       disabled:opacity-30 disabled:cursor-not-allowed
                       hover:scale-105 active:scale-95"
            style={{
              background: draft.trim() ? '#006B3F' : 'transparent',
              color: draft.trim() ? '#fff' : 'var(--color-text-muted)',
            }}
            title="Send reply"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
