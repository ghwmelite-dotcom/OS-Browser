import React from 'react';

/* ─────────── Types ─────────── */

export interface FootballMatchEvent {
  type: 'goal' | 'red' | 'yellow';
  team: 'home' | 'away';
  player: string;
  minute: number;
}

export interface FootballMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: 'live' | 'ft' | 'upcoming';
  competition: string;
  homeFlag: string;
  awayFlag: string;
  events: FootballMatchEvent[];
}

export interface FootballScoreContent {
  msgtype: 'm.football.score';
  body: string;
  match: FootballMatch;
}

interface FootballScoreCardProps {
  match: FootballMatch;
  senderName?: string;
  timestamp?: number;
  isOwn?: boolean;
}

/* ─────────── Helpers ─────────── */

function formatTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function eventIcon(type: FootballMatchEvent['type']): string {
  switch (type) {
    case 'goal': return '\u26BD';
    case 'red': return '\uD83D\uDFE5';
    case 'yellow': return '\uD83D\uDFE8';
    default: return '';
  }
}

/* ─────────── Component ─────────── */

export function FootballScoreCard({ match, senderName, timestamp, isOwn }: FootballScoreCardProps) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--color-border-1)',
        background: '#1A1F2B',
        overflow: 'hidden',
        minWidth: 260,
        maxWidth: 320,
      }}
    >
      {/* ── Competition header ── */}
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: '#D4A017',
          }}
        >
          {match.competition}
        </span>

        {/* Status badge */}
        {match.status === 'live' ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#CE1126',
                display: 'inline-block',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#CE1126' }}>
              LIVE {match.minute}&apos;
            </span>
          </span>
        ) : match.status === 'ft' ? (
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
            Full Time
          </span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
            Upcoming
          </span>
        )}
      </div>

      {/* ── Team rows ── */}
      <div style={{ padding: '10px 14px' }}>
        {/* Home team */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{match.homeFlag}</span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#FFFFFF',
              }}
            >
              {match.homeTeam}
            </span>
          </div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#FFFFFF',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 20,
              textAlign: 'center',
            }}
          >
            {match.homeScore}
          </span>
        </div>

        {/* Away team */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{match.awayFlag}</span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#FFFFFF',
              }}
            >
              {match.awayTeam}
            </span>
          </div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#FFFFFF',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 20,
              textAlign: 'center',
            }}
          >
            {match.awayScore}
          </span>
        </div>
      </div>

      {/* ── Events list ── */}
      {match.events.length > 0 && (
        <div
          style={{
            padding: '6px 14px 8px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {match.events.map((evt, i) => (
            <div
              key={`${evt.player}-${evt.minute}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                paddingTop: i > 0 ? 3 : 0,
              }}
            >
              <span style={{ fontSize: 10 }}>{eventIcon(evt.type)}</span>
              <span
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.5)',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 22,
                }}
              >
                {evt.minute}&apos;
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                {evt.player}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      {(senderName || timestamp) && (
        <div
          style={{
            padding: '6px 14px 8px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            {senderName && `Shared by ${senderName}`}
            {senderName && timestamp && ' \u00B7 '}
            {timestamp && formatTime(timestamp)}
          </span>
        </div>
      )}

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
