import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X, PenSquare, Search, Lock, SendHorizontal, Check, CheckCheck,
  Pin, MessageCircle, Trash2, MailPlus,
} from 'lucide-react';
import { useMessagingStore, CURRENT_USER } from '@/store/messaging';
import type { Contact, Conversation, Message } from '@/store/messaging';

/* ─────────── helpers ─────────── */

function formatTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatRelativeDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(ts).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
}

function formatDateSeparator(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/* ─────────── status icon ─────────── */

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'sent') return <Check size={12} className="text-white/60" />;
  if (status === 'delivered') return <CheckCheck size={12} className="text-white/60" />;
  return <CheckCheck size={12} style={{ color: '#4FC3F7' }} />;
}

function ReceivedStatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'read') return <CheckCheck size={12} style={{ color: '#006B3F' }} />;
  return null;
}

/* ─────────── typing indicator ─────────── */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-xl w-fit" style={{ background: 'var(--color-surface-2)' }}>
      <span className="typing-dot" style={{ animationDelay: '0ms' }} />
      <span className="typing-dot" style={{ animationDelay: '200ms' }} />
      <span className="typing-dot" style={{ animationDelay: '400ms' }} />
      <style>{`
        .typing-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--color-text-muted);
          display: inline-block;
          animation: typingBounce 1.2s ease-in-out infinite;
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

/* ─────────── avatar ─────────── */

function ContactAvatar({ contact, size = 40 }: { contact: Contact; size?: number }) {
  const bgColors = ['#CE1126', '#006B3F', '#D4A017', '#1565C0', '#6A1B9A'];
  const colorIndex = contact.name.charCodeAt(0) % bgColors.length;

  return (
    <div className="relative shrink-0">
      <div
        className="rounded-full flex items-center justify-center font-semibold text-white select-none"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          background: bgColors[colorIndex],
        }}
      >
        {getInitials(contact.name)}
      </div>
      {contact.isOnline && (
        <div
          className="absolute bottom-0 right-0 rounded-full border-2"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            background: '#4CAF50',
            borderColor: 'var(--color-surface-1)',
          }}
        />
      )}
    </div>
  );
}

/* ─────────── conversation list item ─────────── */

function ConversationItem({
  convo,
  isActive,
  onClick,
  onPin,
  onDelete,
}: {
  convo: Conversation;
  isActive: boolean;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const contact = convo.participants[0];
  const [showCtx, setShowCtx] = useState(false);

  return (
    <div
      className="relative group"
      onContextMenu={e => { e.preventDefault(); setShowCtx(!showCtx); }}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors duration-100 text-left"
        style={{
          background: isActive ? 'var(--color-surface-2)' : 'transparent',
          borderLeft: isActive ? '3px solid #006B3F' : '3px solid transparent',
        }}
      >
        <ContactAvatar contact={contact} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[12.5px] font-semibold text-text-primary truncate flex items-center gap-1">
              {convo.isPinned && <Pin size={10} style={{ color: '#D4A017' }} className="shrink-0" />}
              {contact.name}
            </span>
            <span className="text-[10px] text-text-muted shrink-0">
              {convo.lastMessage ? formatRelativeDate(convo.lastMessage.timestamp) : ''}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="text-[11px] text-text-muted truncate">
              {convo.lastMessage
                ? (convo.lastMessage.senderId === CURRENT_USER ? 'You: ' : '') + convo.lastMessage.text
                : 'No messages yet'}
            </span>
            {convo.unreadCount > 0 && (
              <span
                className="shrink-0 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                style={{ background: '#006B3F' }}
              >
                {convo.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* context menu */}
      {showCtx && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowCtx(false)} />
          <div
            className="absolute right-2 top-10 w-36 rounded-lg border py-1 shadow-xl z-50"
            style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
          >
            <button
              onClick={() => { onPin(); setShowCtx(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary hover:bg-surface-2"
            >
              <Pin size={13} /> {convo.isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              onClick={() => { onDelete(); setShowCtx(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-surface-2"
              style={{ color: '#CE1126' }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────── compose overlay ─────────── */

function ComposeOverlay({ onClose }: { onClose: () => void }) {
  const { contacts, createConversation } = useMessagingStore();
  const [query, setQuery] = useState('');

  const filtered = contacts.filter(c => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q)
      || c.email.toLowerCase().includes(q)
      || c.department.toLowerCase().includes(q);
  });

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: 'var(--color-surface-1)' }}>
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
        <span className="text-[14px] font-semibold text-text-primary">New Message</span>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-2 transition-colors">
          <X size={16} className="text-text-muted" />
        </button>
      </div>

      {/* search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search contacts..."
            className="flex-1 bg-transparent text-[12.5px] text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* gov.gh notice */}
      <div className="px-4 py-1.5">
        <span className="text-[10.5px] text-text-muted flex items-center gap-1">
          <Lock size={10} /> Only @gov.gh email holders can be contacted
        </span>
      </div>

      {/* contacts */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(contact => (
          <button
            key={contact.id}
            onClick={() => createConversation(contact)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors text-left"
          >
            <ContactAvatar contact={contact} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-text-primary truncate">{contact.name}</div>
              <div className="text-[11px] text-text-muted truncate">{contact.email}</div>
              <div className="text-[10.5px] text-text-muted">{contact.department}</div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-text-muted">No contacts found</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── chat area ─────────── */

function ChatArea() {
  const {
    activeConversationId,
    conversations,
    messages,
    sendMessage,
  } = useMessagingStore();

  const [input, setInput] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversation = conversations.find(c => c.id === activeConversationId);
  const chatMessages = activeConversationId ? (messages[activeConversationId] || []) : [];
  const contact = conversation?.participants[0];

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, showTyping]);

  // Focus input when conversation changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConversationId]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !activeConversationId) return;
    sendMessage(activeConversationId, text);
    setInput('');

    // Brief typing indicator
    setShowTyping(true);
    setTimeout(() => setShowTyping(false), 1500);
  };

  if (!conversation || !contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6" style={{ background: 'var(--color-bg)' }}>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <MessageCircle size={36} className="text-text-muted" />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-semibold text-text-primary mb-1">Civil Service Messaging</p>
          <p className="text-[12px] text-text-muted max-w-[240px]">
            Select a conversation or start a new one to begin secure messaging with government colleagues.
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px]"
          style={{ background: 'rgba(0, 107, 63, 0.1)', color: '#006B3F' }}
        >
          <Lock size={11} />
          End-to-end encrypted
        </div>
      </div>
    );
  }

  // Group messages with date separators
  const renderMessages = () => {
    const elements: React.ReactNode[] = [];
    let lastDate: string | null = null;

    if (chatMessages.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <MailPlus size={32} className="text-text-muted" />
          <p className="text-[12.5px] text-text-muted text-center">Start the conversation with a greeting</p>
        </div>
      );
    }

    chatMessages.forEach((msg, i) => {
      const dateStr = formatDateSeparator(msg.timestamp);
      if (dateStr !== lastDate) {
        lastDate = dateStr;
        elements.push(
          <div key={`date-${i}`} className="flex items-center justify-center py-3">
            <span
              className="text-[10.5px] px-3 py-1 rounded-full font-medium"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            >
              {dateStr}
            </span>
          </div>
        );
      }

      const isMine = msg.senderId === CURRENT_USER;

      elements.push(
        <div
          key={msg.id}
          className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-3 mb-1.5`}
        >
          <div
            className="max-w-[85%] px-3 py-2 relative"
            style={{
              borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: isMine ? '#006B3F' : 'var(--color-surface-2)',
              color: isMine ? '#ffffff' : 'var(--color-text-primary)',
            }}
          >
            <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
              <span
                className="text-[9.5px]"
                style={{ color: isMine ? 'rgba(255,255,255,0.65)' : 'var(--color-text-muted)' }}
              >
                {formatTime(msg.timestamp)}
              </span>
              {isMine && <StatusIcon status={msg.status} />}
              {!isMine && <ReceivedStatusIcon status={msg.status} />}
            </div>
          </div>
        </div>
      );
    });

    return elements;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--color-bg)' }}>
      {/* Chat header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0"
        style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}
      >
        <ContactAvatar contact={contact} size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-text-primary truncate">{contact.name}</div>
          <div className="text-[10.5px] text-text-muted truncate">
            {contact.department}
            {contact.isOnline ? (
              <span style={{ color: '#4CAF50' }}> &bull; Online</span>
            ) : contact.lastSeen ? (
              <span> &bull; Last seen {formatRelativeDate(contact.lastSeen)}</span>
            ) : null}
          </div>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full text-[9.5px] font-medium shrink-0"
          style={{ background: 'rgba(0, 107, 63, 0.1)', color: '#006B3F' }}
        >
          <Lock size={10} />
          Encrypted
        </div>
      </div>

      {/* E2E banner */}
      <div
        className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] shrink-0"
        style={{ background: 'rgba(0, 107, 63, 0.08)', color: '#006B3F' }}
      >
        <Lock size={10} />
        End-to-end encrypted &mdash; Messages are stored locally. Cloud sync coming soon.
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto py-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {renderMessages()}
        {showTyping && (
          <div className="px-3 mb-1.5">
            <TypingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="px-3 py-2.5 border-t shrink-0"
        style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'var(--color-surface-2)' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-[12.5px] text-text-primary outline-none placeholder:text-text-muted"
            />
            <Lock size={11} className="text-text-muted shrink-0" />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 shrink-0"
            style={{
              background: input.trim() ? '#006B3F' : 'var(--color-surface-2)',
              cursor: input.trim() ? 'pointer' : 'default',
            }}
          >
            <SendHorizontal size={15} style={{ color: input.trim() ? '#fff' : 'var(--color-text-muted)' }} />
          </button>
        </div>
        <div className="flex items-center gap-1 mt-1.5 px-1">
          <Lock size={9} style={{ color: '#006B3F' }} />
          <span className="text-[9.5px]" style={{ color: '#006B3F' }}>Encrypted</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────── main panel ─────────── */

export function MessagingPanel({ onClose }: { onClose: () => void }) {
  const {
    conversations,
    activeConversationId,
    searchQuery,
    isComposing,
    selectConversation,
    setSearchQuery,
    setIsComposing,
    togglePin,
    deleteConversation,
  } = useMessagingStore();

  // Sort: pinned first, then by last message time
  const sortedConversations = useMemo(() => {
    let filtered = [...conversations];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.participants.some(p =>
          p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
        ),
      );
    }
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aTime = a.lastMessage?.timestamp || 0;
      const bTime = b.lastMessage?.timestamp || 0;
      return bTime - aTime;
    });
  }, [conversations, searchQuery]);

  return (
    <div
      className="h-full flex flex-col shrink-0"
      style={{
        width: '100%',
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} style={{ color: '#006B3F' }} />
          <span className="text-[13.5px] font-bold text-text-primary">Messages</span>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(212, 160, 23, 0.15)', color: '#D4A017' }}
          >
            Coming Soon
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsComposing(true)}
            className="p-1.5 rounded-md hover:bg-surface-2 transition-colors"
            title="New message"
          >
            <PenSquare size={15} className="text-text-secondary" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-2 transition-colors"
          >
            <X size={15} className="text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Compose overlay */}
        {isComposing && <ComposeOverlay onClose={() => setIsComposing(false)} />}

        {/* Conversation list (left) */}
        <div
          className="flex flex-col border-r shrink-0"
          style={{ width: 160, borderColor: 'var(--color-border-1)' }}
        >
          {/* Search */}
          <div className="px-2 py-2">
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <Search size={12} className="text-text-muted shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-[11px] text-text-primary outline-none placeholder:text-text-muted min-w-0"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {sortedConversations.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-[10.5px] text-text-muted">No conversations</p>
              </div>
            ) : (
              sortedConversations.map(convo => (
                <ConversationItem
                  key={convo.id}
                  convo={convo}
                  isActive={convo.id === activeConversationId}
                  onClick={() => selectConversation(convo.id)}
                  onPin={() => togglePin(convo.id)}
                  onDelete={() => deleteConversation(convo.id)}
                />
              ))
            )}
          </div>

          {/* Local-only notice */}
          <div className="px-2 py-2 border-t" style={{ borderColor: 'var(--color-border-1)' }}>
            <p className="text-[9px] text-text-muted text-center leading-tight">
              Messages stored locally. Cloud sync coming soon.
            </p>
          </div>
        </div>

        {/* Chat area (right) */}
        <ChatArea />
      </div>
    </div>
  );
}
