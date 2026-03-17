import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Check, CheckCheck, Loader2, AlertCircle, Shield,
  MessageSquare, FileText, Download, Play, Pause, Plus, Reply,
} from 'lucide-react';
import { useGovChatStore, CURRENT_USER_ID } from '@/store/govchat';
import { CLASSIFICATION_COLORS, QUICK_REACTIONS } from '@/types/govchat';
import type { GovChatMessage, MessageReaction } from '@/types/govchat';

/* ─────────── helpers ─────────── */

function formatTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ─────────── status icon ─────────── */

function StatusIcon({ status, isOwn }: { status: GovChatMessage['status']; isOwn: boolean }) {
  if (status === 'sending') {
    return <Loader2 size={12} className="animate-spin" style={{ color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--color-text-muted)' }} />;
  }
  if (status === 'sent') {
    return <Check size={12} style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)' }} />;
  }
  if (status === 'delivered') {
    return <CheckCheck size={12} style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)' }} />;
  }
  if (status === 'read') {
    return <CheckCheck size={12} style={{ color: '#4FC3F7' }} />;
  }
  if (status === 'failed') {
    return <AlertCircle size={12} style={{ color: '#CE1126' }} />;
  }
  return null;
}

/* ─────────── voice waveform ─────────── */

function VoiceWaveform({ waveform, isOwn }: { waveform: number[]; isOwn: boolean }) {
  // Normalize to a fixed number of bars
  const barCount = 32;
  const normalized: number[] = [];
  const step = waveform.length / barCount;
  for (let i = 0; i < barCount; i++) {
    const idx = Math.floor(i * step);
    normalized.push(waveform[Math.min(idx, waveform.length - 1)] ?? 0.3);
  }

  return (
    <div className="flex items-end gap-[1.5px] h-[24px]">
      {normalized.map((amp, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 2.5,
            height: Math.max(3, amp * 24),
            background: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--color-text-muted)',
            transition: 'height 0.15s ease-out',
          }}
        />
      ))}
    </div>
  );
}

/* ─────────── reaction chips ─────────── */

function ReactionChips({
  reactions,
  roomId,
  eventId,
}: {
  reactions: MessageReaction[];
  roomId: string;
  eventId: string;
}) {
  const currentUser = useGovChatStore(s => s.currentUser);
  const addReaction = useGovChatStore(s => s.addReaction);
  const removeReaction = useGovChatStore(s => s.removeReaction);
  const currentUserId = currentUser?.userId ?? CURRENT_USER_ID;

  if (reactions.length === 0) return null;

  const handleToggle = (emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      removeReaction(roomId, eventId, emoji);
    } else {
      addReaction(roomId, eventId, emoji);
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map(reaction => {
        const hasReacted = reaction.senders.includes(currentUserId);
        return (
          <button
            key={reaction.key}
            onClick={() => handleToggle(reaction.key, hasReacted)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] transition-colors duration-100"
            style={{
              background: hasReacted ? 'rgba(0, 107, 63, 0.12)' : 'var(--color-surface-2)',
              border: `1px solid ${hasReacted ? '#006B3F' : 'var(--color-border-1)'}`,
              cursor: 'pointer',
            }}
          >
            <span>{reaction.key}</span>
            <span
              className="text-[10px] font-medium"
              style={{ color: hasReacted ? '#006B3F' : 'var(--color-text-muted)' }}
            >
              {reaction.senders.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────── quick reaction bar ─────────── */

function QuickReactionBar({
  roomId,
  eventId,
  onReply,
}: {
  roomId: string;
  eventId: string;
  onReply: () => void;
}) {
  const addReaction = useGovChatStore(s => s.addReaction);

  return (
    <div
      className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-1 rounded-xl shadow-lg border z-20"
      style={{
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      }}
    >
      {QUICK_REACTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => addReaction(roomId, eventId, emoji)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[15px] transition-transform duration-100 hover:scale-125"
          style={{ background: 'transparent' }}
        >
          {emoji}
        </button>
      ))}
      <div
        className="w-[1px] h-5 mx-0.5"
        style={{ background: 'var(--color-border-1)' }}
      />
      <button
        onClick={onReply}
        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-100"
        style={{ color: 'var(--color-text-muted)' }}
        title="Reply"
      >
        <Reply size={14} />
      </button>
      <button
        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-100"
        style={{ color: 'var(--color-text-muted)' }}
        title="More reactions"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ─────────── reply preview inside bubble ─────────── */

function ReplyPreview({ replyTo, isOwn }: { replyTo: NonNullable<GovChatMessage['replyTo']>; isOwn: boolean }) {
  return (
    <div
      className="mb-1.5 pl-2.5 py-1 rounded-r-md cursor-pointer"
      style={{
        borderLeft: '3px solid #D4A017',
        background: isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(212, 160, 23, 0.08)',
      }}
    >
      <p
        className="text-[10px] font-semibold truncate"
        style={{ color: isOwn ? 'rgba(255,255,255,0.85)' : '#D4A017' }}
      >
        {replyTo.senderName}
      </p>
      <p
        className="text-[10.5px] truncate leading-snug"
        style={{
          color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)',
          maxWidth: 220,
        }}
      >
        {replyTo.body}
      </p>
    </div>
  );
}

/* ─────────── media URL resolver ─────────── */

/** Convert mxc:// URLs to HTTPS download URLs via the authenticated client v1 media endpoint */
function resolveMediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('http')) return url;
  if (url.startsWith('mxc://')) {
    const parts = url.slice(6);
    const [server, ...rest] = parts.split('/');
    const mediaId = rest.join('/');
    // Use client v1 media endpoint (authenticated, works with modern Synapse)
    // Fallback: also works without auth for public media on older servers
    return `https://${server}/_matrix/client/v1/media/download/${server}/${mediaId}`;
  }
  return url;
}

/* ─────────── file attachment ─────────── */

function FileAttachmentView({ file, isOwn }: { file: NonNullable<GovChatMessage['file']>; isOwn: boolean }) {
  const isImage = file.mimeType.startsWith('image/');
  const resolvedUrl = resolveMediaUrl(file.url);
  const resolvedThumb = file.thumbnailUrl ? resolveMediaUrl(file.thumbnailUrl) : '';

  const handleDownload = () => {
    if (!resolvedUrl) return;
    if (resolvedUrl.startsWith('blob:')) {
      // Blob URLs: open in new window (Electron handles this)
      window.open(resolvedUrl, '_blank');
    } else {
      // HTTPS URLs: trigger download
      const a = document.createElement('a');
      a.href = resolvedUrl;
      a.download = file.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (isImage) {
    return (
      <div className="mb-1.5 rounded-lg overflow-hidden max-w-[240px]">
        <img
          src={resolvedThumb || resolvedUrl}
          alt={file.name}
          className="w-full h-auto rounded-lg cursor-pointer"
          style={{ maxHeight: 180, objectFit: 'cover' }}
          onClick={() => window.open(resolvedUrl, '_blank')}
        />
        <p
          className="text-[10px] mt-1 truncate"
          style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)' }}
        >
          {file.name}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2.5 mb-1.5 px-2.5 py-2 rounded-lg"
      style={{
        background: isOwn ? 'rgba(255,255,255,0.1)' : 'var(--color-surface-1)',
        border: isOwn ? 'none' : '1px solid var(--color-border-1)',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(0, 107, 63, 0.1)' }}
      >
        <FileText size={16} style={{ color: isOwn ? '#fff' : '#006B3F' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[11.5px] font-medium truncate"
          style={{ color: isOwn ? '#fff' : 'var(--color-text-primary)' }}
        >
          {file.name}
        </p>
        <p
          className="text-[9.5px]"
          style={{ color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--color-text-muted)' }}
        >
          {formatFileSize(file.size)}
        </p>
      </div>
      <button
        onClick={handleDownload}
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors"
        style={{
          background: isOwn ? 'rgba(255,255,255,0.15)' : 'var(--color-surface-2)',
        }}
      >
        <Download size={13} style={{ color: isOwn ? '#fff' : 'var(--color-text-muted)' }} />
      </button>
    </div>
  );
}

/* ─────────── voice note ─────────── */

function VoiceNoteView({ voiceNote, isOwn }: { voiceNote: NonNullable<GovChatMessage['voiceNote']>; isOwn: boolean }) {
  const src = resolveMediaUrl(voiceNote.url);

  return (
    <div style={{ marginBottom: 4, minWidth: 200 }}>
      {/* Native audio element — browser handles all playback */}
      <audio
        controls
        preload="auto"
        src={src}
        style={{
          width: '100%',
          height: 32,
          borderRadius: 8,
          outline: 'none',
          filter: isOwn ? 'invert(1) brightness(2)' : 'none',
          opacity: 0.9,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <VoiceWaveform waveform={voiceNote.waveform} isOwn={isOwn} />
        <span
          className="text-[9.5px] font-medium"
          style={{ color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--color-text-muted)' }}
        >
          {formatDuration(voiceNote.duration)}
        </span>
      </div>
    </div>
  );
}

/* ─────────── system message ─────────── */

function SystemMessage({ message }: { message: GovChatMessage }) {
  return (
    <div className="flex items-center justify-center py-2 px-3">
      <span
        className="text-[10.5px] px-3 py-1 rounded-full font-medium text-center"
        style={{
          background: 'var(--color-surface-2)',
          color: 'var(--color-text-muted)',
        }}
      >
        {message.body}
      </span>
    </div>
  );
}

/* ─────────── sender avatar for group chats ─────────── */

function SenderAvatar({ name }: { name: string }) {
  const bgColors = ['#CE1126', '#006B3F', '#D4A017', '#1565C0', '#6A1B9A'];
  const colorIndex = name.charCodeAt(0) % bgColors.length;

  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white select-none shrink-0"
      style={{ background: bgColors[colorIndex] }}
    >
      {getInitials(name)}
    </div>
  );
}

/* ─────────── main MessageBubble ─────────── */

interface MessageBubbleProps {
  message: GovChatMessage;
  isOwn: boolean;
  showSender: boolean;
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const openThread = useGovChatStore(s => s.openThread);
  const setReplyingTo = useGovChatStore(s => s.setReplyingTo);

  const classificationColor = CLASSIFICATION_COLORS[message.classification];

  // System messages get special treatment
  if (message.type === 'system') {
    return <SystemMessage message={message} />;
  }

  const handleReply = useCallback(() => {
    setReplyingTo({
      eventId: message.eventId,
      senderId: message.senderId,
      senderName: message.senderName,
      body: message.body.length > 80 ? message.body.slice(0, 80) + '...' : message.body,
    });
  }, [message, setReplyingTo]);

  const handleThreadOpen = useCallback(() => {
    openThread(message.eventId);
  }, [message.eventId, openThread]);

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-3 mb-1 ${showSender ? 'mt-2' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sender avatar for group chats (received only) */}
      {!isOwn && showSender && (
        <div className="mr-2 mt-auto mb-1">
          <SenderAvatar name={message.senderName} />
        </div>
      )}
      {/* Spacer when avatar is hidden but needed for alignment */}
      {!isOwn && !showSender && !isOwn && (
        <div className="w-7 mr-2 shrink-0" />
      )}

      <div className="relative max-w-[75%]">
        {/* Quick reaction bar on hover */}
        {isHovered && (
          <QuickReactionBar
            roomId={message.roomId}
            eventId={message.eventId}
            onReply={handleReply}
          />
        )}

        {/* Sender name label */}
        {showSender && !isOwn && (
          <p className="text-[10.5px] font-semibold mb-0.5 ml-1" style={{ color: '#D4A017' }}>
            {message.senderName}
          </p>
        )}

        {/* Bubble */}
        <div
          className="px-3 py-2 relative"
          style={{
            borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: isOwn ? '#006B3F' : 'var(--color-surface-2)',
            color: isOwn ? '#ffffff' : 'var(--color-text-primary)',
            opacity: message.status === 'sending' ? 0.8 : 1,
          }}
        >
          {/* Reply preview */}
          {message.replyTo && (
            <ReplyPreview replyTo={message.replyTo} isOwn={isOwn} />
          )}

          {/* File attachment */}
          {message.file && (
            <FileAttachmentView file={message.file} isOwn={isOwn} />
          )}

          {/* Voice note */}
          {message.voiceNote && (
            <VoiceNoteView voiceNote={message.voiceNote} isOwn={isOwn} />
          )}

          {/* Message text */}
          {message.type === 'text' && (
            <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap break-words">
              {message.body}
            </p>
          )}

          {/* Timestamp row */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {/* Classification dot */}
            <span
              className="w-[5px] h-[5px] rounded-full shrink-0"
              style={{ background: classificationColor }}
              title={message.classification}
            />

            {/* Edited indicator */}
            {message.editedAt && (
              <span
                className="text-[9px] italic"
                style={{ color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--color-text-muted)' }}
              >
                (edited)
              </span>
            )}

            {/* Timestamp */}
            <span
              className="text-[9.5px]"
              style={{ color: isOwn ? 'rgba(255,255,255,0.65)' : 'var(--color-text-muted)' }}
            >
              {formatTime(message.timestamp)}
            </span>

            {/* Status icon (own messages only) */}
            {isOwn && <StatusIcon status={message.status} isOwn={isOwn} />}
          </div>
        </div>

        {/* Reaction chips */}
        <ReactionChips
          reactions={message.reactions}
          roomId={message.roomId}
          eventId={message.eventId}
        />

        {/* Thread indicator */}
        {(message.threadReplyCount ?? 0) > 0 && (
          <button
            onClick={handleThreadOpen}
            className="flex items-center gap-1 mt-1 ml-1 text-[10.5px] font-medium transition-colors"
            style={{ color: '#1565C0' }}
          >
            <MessageSquare size={11} />
            {message.threadReplyCount} {message.threadReplyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>
    </div>
  );
}
