import React, { useCallback } from 'react';
import { X, RefreshCw, Loader2 } from 'lucide-react';
import { useFootballScores } from './useFootballScores';
import type { FootballMatch } from './FootballScoreCard';

/* ─────────── Types ─────────── */

interface FootballPanelProps {
  onClose: () => void;
  onShareMatch: (match: FootballMatch) => void;
}

/* ─────────── Sub-components ─────────── */

function MatchRow({
  match,
  onTap,
}: {
  match: FootballMatch;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className="w-full text-left transition-colors hover:brightness-110"
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Home side */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{match.homeFlag}</span>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: '#FFFFFF',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {match.homeTeam}
        </span>
      </div>

      {/* Score / Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0,
          minWidth: 60,
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
          {match.homeScore}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>-</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
          {match.awayScore}
        </span>
      </div>

      {/* Away side */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', minWidth: 0 }}>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: '#FFFFFF',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'right',
          }}
        >
          {match.awayTeam}
        </span>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{match.awayFlag}</span>
      </div>

      {/* Status indicator */}
      <div style={{ flexShrink: 0, minWidth: 42, textAlign: 'right' }}>
        {match.status === 'live' ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#CE1126',
                animation: 'footballPulse 1.5s ease-in-out infinite',
              }}
            />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#CE1126' }}>
              {match.minute}&apos;
            </span>
          </span>
        ) : (
          <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
            FT
          </span>
        )}
      </div>
    </button>
  );
}

function LeagueSection({
  league,
  matches,
  onShareMatch,
}: {
  league: string;
  matches: FootballMatch[];
  onShareMatch: (match: FootballMatch) => void;
}) {
  if (matches.length === 0) return null;

  return (
    <div>
      <div
        style={{
          padding: '8px 16px 4px',
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          color: '#D4A017',
        }}
      >
        {league}
      </div>
      {matches.map((match, i) => (
        <MatchRow
          key={`${match.homeTeam}-${match.awayTeam}-${i}`}
          match={match}
          onTap={() => onShareMatch(match)}
        />
      ))}
    </div>
  );
}

/* ─────────── Helper: group matches by league ─────────── */

const LEAGUE_ORDER = [
  'Ghana Premier League',
  'AFCON 2026 Qualifier',
  'Premier League',
  'Champions League',
  'La Liga',
];

function groupByLeague(matches: FootballMatch[]): Array<{ league: string; matches: FootballMatch[] }> {
  const grouped = new Map<string, FootballMatch[]>();
  for (const m of matches) {
    const existing = grouped.get(m.competition) || [];
    existing.push(m);
    grouped.set(m.competition, existing);
  }

  // Sort by predefined order, then alphabetically for unknown leagues
  const result: Array<{ league: string; matches: FootballMatch[] }> = [];
  for (const league of LEAGUE_ORDER) {
    const ms = grouped.get(league);
    if (ms) {
      result.push({ league, matches: ms });
      grouped.delete(league);
    }
  }
  // Remaining leagues
  for (const [league, ms] of grouped) {
    result.push({ league, matches: ms });
  }
  return result;
}

/* ─────────── Main Panel ─────────── */

export function FootballPanel({ onClose, onShareMatch }: FootballPanelProps) {
  const { liveMatches, recentResults, isLoading, error, refetch } = useFootballScores();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const liveGroups = groupByLeague(liveMatches);
  const recentGroups = groupByLeague(recentResults);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        maxHeight: 420,
        background: '#1A1F2B',
        borderRadius: '14px 14px 0 0',
        border: '1px solid var(--color-border-1)',
        borderBottom: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 60,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{'\u26BD'}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
            Football Scores
          </span>
          {error && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
              {error}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            style={{
              padding: 4,
              borderRadius: 6,
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              cursor: isLoading ? 'default' : 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Refresh scores"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: 4,
              borderRadius: 6,
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Hint */}
      <div
        style={{
          padding: '6px 16px',
          fontSize: 9.5,
          color: 'rgba(255,255,255,0.35)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}
      >
        Tap a match to share as a score card in chat
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {isLoading && liveMatches.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12,
            }}
          >
            <Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} />
            Loading scores...
          </div>
        ) : (
          <>
            {/* Live matches */}
            {liveMatches.length > 0 && (
              <div>
                <div
                  style={{
                    padding: '10px 16px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#CE1126',
                      animation: 'footballPulse 1.5s ease-in-out infinite',
                    }}
                  />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#CE1126', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Live Now
                  </span>
                </div>
                {liveGroups.map(({ league, matches }) => (
                  <LeagueSection
                    key={`live-${league}`}
                    league={league}
                    matches={matches}
                    onShareMatch={onShareMatch}
                  />
                ))}
              </div>
            )}

            {/* Recent results */}
            {recentResults.length > 0 && (
              <div style={{ marginTop: liveMatches.length > 0 ? 8 : 0 }}>
                <div
                  style={{
                    padding: '10px 16px 4px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Recent Results
                </div>
                {recentGroups.map(({ league, matches }) => (
                  <LeagueSection
                    key={`recent-${league}`}
                    league={league}
                    matches={matches}
                    onShareMatch={onShareMatch}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes footballPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
