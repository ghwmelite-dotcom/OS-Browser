import React, { useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { gameSounds } from './GameSoundEngine';

// ── Props ────────────────────────────────────────────────────────────
export interface GameShellProps {
  gameId: string;
  gameName: string;
  children: React.ReactNode;
  score?: number;
  hasUndo?: boolean;
  onUndo?: () => void;
  onNewGame?: () => void;
  onBack?: () => void;
  hasDifficulty?: boolean;
  difficulty?: string;
  onDifficultyChange?: (d: string) => void;
  difficulties?: string[];
}

// ── Component ────────────────────────────────────────────────────────
export const GameShell: React.FC<GameShellProps> = ({
  gameId,
  gameName,
  children,
  score = 0,
  hasUndo = false,
  onUndo,
  onNewGame,
  onBack,
  hasDifficulty = false,
  difficulty,
  onDifficultyChange,
  difficulties = [],
}) => {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const bestScore = useGameStore((s) => s.getStats(gameId).bestScore);
  const setLastPlayed = useGameStore((s) => s.setLastPlayed);

  useEffect(() => {
    setLastPlayed(gameId);
  }, [gameId, setLastPlayed]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      window.dispatchEvent(new CustomEvent('govplay:navigate', { detail: { view: 'catalog' } }));
    }
  }, [onBack]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleBack]);

  // ── Styles ──────────────────────────────────────────────────────
  const shell: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    background: '#1A1D27',
    color: '#FAF6EE',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  const header: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: 44,
    minHeight: 44,
    padding: '0 12px',
    gap: 12,
    background: '#2C2318',
    borderBottom: '1px solid rgba(252,209,22,0.15)',
  };

  const content: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
    padding: 8,
  };

  const footer: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: 44,
    minHeight: 44,
    padding: '0 12px',
    gap: 8,
    background: '#2C2318',
    borderTop: '1px solid rgba(252,209,22,0.15)',
  };

  const btn: React.CSSProperties = {
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid rgba(252,209,22,0.3)',
    background: 'rgba(252,209,22,0.08)',
    color: '#FCD116',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'rgba(250,246,238,0.5)',
  };

  const scoreStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: '#FCD116',
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div style={shell}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={header}>
        <button onClick={handleBack} style={{ ...btn, padding: '4px 8px' }} title="Back to GovPlay (Esc)">
          &#8592;
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{gameName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={labelStyle}>Score</div>
            <div style={scoreStyle}>{score.toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={labelStyle}>Best</div>
            <div style={{ ...scoreStyle, color: '#CE1126' }}>{bestScore.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div style={content}>{children}</div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div style={footer}>
        {onNewGame && (
          <button onClick={onNewGame} style={btn}>
            New Game
          </button>
        )}
        {hasUndo && onUndo && (
          <button onClick={onUndo} style={btn}>
            Undo
          </button>
        )}
        <button
          onClick={toggleSound}
          style={{ ...btn, minWidth: 32 }}
          title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        >
          {soundEnabled ? '\u266A' : '\u2716'}
        </button>
        {hasDifficulty && difficulties.length > 0 && (
          <select
            value={difficulty}
            onChange={(e) => onDifficultyChange?.(e.target.value)}
            style={{
              ...btn,
              appearance: 'none',
              paddingRight: 20,
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'5\'%3E%3Cpath d=\'M0 0l4 5 4-5z\' fill=\'%23FCD116\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 6px center',
            }}
          >
            {difficulties.map((d) => (
              <option key={d} value={d} style={{ background: '#2C2318', color: '#FAF6EE' }}>
                {d}
              </option>
            ))}
          </select>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: 'rgba(250,246,238,0.3)' }}>ESC to exit</span>
      </div>
    </div>
  );
};
