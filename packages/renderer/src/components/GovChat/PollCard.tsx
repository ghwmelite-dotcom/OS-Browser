import React, { useState, useMemo, useCallback } from 'react';
import { BarChart2, Check } from 'lucide-react';
import { useGovChatStore, CURRENT_USER_ID } from '@/store/govchat';

/* ─────────── types ─────────── */

export interface PollData {
  question: string;
  options: string[];
  pollId: string;
  createdBy: string;
}

export interface PollVote {
  pollId: string;
  selectedOptions: number[];
  voterId: string;
}

interface PollCardProps {
  poll: PollData;
  roomId: string;
  isOwn: boolean;
}

/* ─────────── PollCard ─────────── */

export function PollCard({ poll, roomId, isOwn }: PollCardProps) {
  const currentUser = useGovChatStore(s => s.currentUser);
  const messages = useGovChatStore(s => s.messages);
  const votePoll = useGovChatStore(s => s.votePoll);
  const currentUserId = currentUser?.userId ?? CURRENT_USER_ID;

  const [votingIndex, setVotingIndex] = useState<number | null>(null);

  // Gather votes from all poll response messages in this room
  const { votes, userVote, totalVotes } = useMemo(() => {
    const roomMessages = messages[roomId] || [];
    const voteMap = new Map<number, string[]>(); // optionIndex -> voterIds
    let myVote: number | null = null;

    for (const msg of roomMessages) {
      // Check if this is a vote response for this poll
      if (
        msg.body.startsWith('[poll-vote]') &&
        msg.body.includes(poll.pollId)
      ) {
        // Parse vote data from body: [poll-vote]{pollId}:{optionIndex}
        const match = msg.body.match(/\[poll-vote\]\{([^}]+)\}:(\d+)/);
        if (match && match[1] === poll.pollId) {
          const optIdx = parseInt(match[2], 10);
          if (!voteMap.has(optIdx)) voteMap.set(optIdx, []);
          // Avoid double-counting same user
          const voters = voteMap.get(optIdx)!;
          if (!voters.includes(msg.senderId)) {
            voters.push(msg.senderId);
          }
          if (msg.senderId === currentUserId) {
            myVote = optIdx;
          }
        }
      }
    }

    let total = 0;
    voteMap.forEach(v => (total += v.length));

    return { votes: voteMap, userVote: myVote, totalVotes: total };
  }, [messages, roomId, poll.pollId, currentUserId]);

  const hasVoted = userVote !== null;

  const handleVote = useCallback(
    (optionIndex: number) => {
      if (hasVoted || votingIndex !== null) return;
      setVotingIndex(optionIndex);
      votePoll(roomId, poll.pollId, optionIndex);
    },
    [hasVoted, votingIndex, roomId, poll.pollId, votePoll],
  );

  return (
    <div
      className="mb-1.5 rounded-xl overflow-hidden"
      style={{
        background: isOwn ? 'rgba(255,255,255,0.08)' : 'var(--color-surface-1)',
        border: isOwn ? '1px solid rgba(255,255,255,0.12)' : '1px solid var(--color-border-1)',
        minWidth: 220,
        maxWidth: 280,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          borderBottom: isOwn
            ? '1px solid rgba(255,255,255,0.1)'
            : '1px solid var(--color-border-1)',
        }}
      >
        <BarChart2
          size={14}
          style={{ color: '#D4A017', flexShrink: 0 }}
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: '#D4A017' }}
        >
          Quick Poll
        </span>
      </div>

      {/* Question */}
      <div className="px-3 pt-2.5 pb-1.5">
        <p
          className="text-[12px] font-semibold leading-snug"
          style={{
            color: isOwn ? '#ffffff' : 'var(--color-text-primary)',
          }}
        >
          {poll.question}
        </p>
      </div>

      {/* Options */}
      <div className="px-3 pb-3 flex flex-col gap-1.5">
        {poll.options.map((option, idx) => {
          const optionVotes = votes.get(idx)?.length ?? 0;
          const pct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
          const isSelected = userVote === idx;

          if (hasVoted) {
            // Results view with progress bar
            return (
              <div key={idx} className="relative rounded-lg overflow-hidden" style={{ minHeight: 34 }}>
                {/* Progress bar background */}
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: isOwn
                      ? 'rgba(255,255,255,0.06)'
                      : 'var(--color-surface-2)',
                  }}
                />
                {/* Filled progress */}
                <div
                  className="absolute left-0 top-0 bottom-0 rounded-lg transition-all duration-500 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: isSelected
                      ? 'linear-gradient(90deg, rgba(212,160,23,0.35), rgba(212,160,23,0.15))'
                      : isOwn
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,107,63,0.08)',
                  }}
                />
                {/* Content overlay */}
                <div className="relative flex items-center justify-between px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isSelected && (
                      <Check
                        size={12}
                        style={{ color: '#D4A017', flexShrink: 0 }}
                      />
                    )}
                    <span
                      className="text-[11px] truncate"
                      style={{
                        color: isOwn ? 'rgba(255,255,255,0.9)' : 'var(--color-text-primary)',
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {option}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-medium ml-2 shrink-0"
                    style={{
                      color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)',
                    }}
                  >
                    {pct}% ({optionVotes})
                  </span>
                </div>
              </div>
            );
          }

          // Votable button view
          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={votingIndex !== null}
              className="w-full text-left rounded-lg px-2.5 py-2 transition-all duration-150"
              style={{
                background: isOwn
                  ? 'rgba(255,255,255,0.06)'
                  : 'var(--color-surface-2)',
                border: isOwn
                  ? '1px solid rgba(255,255,255,0.12)'
                  : '1px solid var(--color-border-1)',
                cursor: votingIndex !== null ? 'default' : 'pointer',
                opacity: votingIndex !== null && votingIndex !== idx ? 0.5 : 1,
              }}
              onMouseEnter={e => {
                if (votingIndex === null) {
                  (e.currentTarget as HTMLElement).style.borderColor = '#D4A017';
                  (e.currentTarget as HTMLElement).style.background = isOwn
                    ? 'rgba(212,160,23,0.12)'
                    : 'rgba(212,160,23,0.06)';
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = isOwn
                  ? 'rgba(255,255,255,0.12)'
                  : 'var(--color-border-1)';
                (e.currentTarget as HTMLElement).style.background = isOwn
                  ? 'rgba(255,255,255,0.06)'
                  : 'var(--color-surface-2)';
              }}
            >
              <span
                className="text-[11px]"
                style={{
                  color: isOwn ? 'rgba(255,255,255,0.9)' : 'var(--color-text-primary)',
                }}
              >
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer: vote count */}
      <div
        className="px-3 py-1.5"
        style={{
          borderTop: isOwn
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid var(--color-border-1)',
        }}
      >
        <span
          className="text-[9.5px]"
          style={{
            color: isOwn ? 'rgba(255,255,255,0.45)' : 'var(--color-text-muted)',
          }}
        >
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          {!hasVoted && ' \u2022 Tap to vote'}
        </span>
      </div>
    </div>
  );
}

/* ─────────── helper: detect poll in message ─────────── */

export function parsePollFromMessage(message: { body: string; type: string }): PollData | null {
  // Poll messages are prefixed with [poll] marker in the body
  if (!message.body.startsWith('[poll]')) return null;
  try {
    const jsonStr = message.body.slice('[poll]'.length);
    const data = JSON.parse(jsonStr);
    if (data.question && Array.isArray(data.options) && data.pollId) {
      return data as PollData;
    }
  } catch {
    // Not a valid poll
  }
  return null;
}

/** Check if a message is a poll vote (should be hidden from chat) */
export function isPollVoteMessage(body: string): boolean {
  return body.startsWith('[poll-vote]');
}
