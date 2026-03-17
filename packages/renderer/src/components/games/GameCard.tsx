import React, { useState } from 'react';

// ── Props ────────────────────────────────────────────────────────────
export interface GameCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  bestScore?: number;
  locked?: boolean;
  onPlay: () => void;
}

// ── Component ────────────────────────────────────────────────────────
export const GameCard: React.FC<GameCardProps> = ({
  name,
  description,
  category,
  icon,
  bestScore,
  locked = false,
  onPlay,
}) => {
  const [hovered, setHovered] = useState(false);

  const card: React.CSSProperties = {
    width: 200,
    height: 240,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 14,
    background: '#FAF6EE',
    border: '1px solid rgba(212,167,23,0.25)',
    boxShadow: hovered
      ? '0 8px 24px rgba(0,0,0,0.18), 0 0 0 1px rgba(252,209,22,0.2)'
      : '0 2px 8px rgba(0,0,0,0.08)',
    transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
    transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
    overflow: 'hidden',
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  const iconArea: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(145deg, #2C2318 0%, #1A1D27 100%)',
    fontSize: 40,
    lineHeight: 1,
    userSelect: 'none',
  };

  const body: React.CSSProperties = {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };

  const categoryBadge: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 10,
    background: 'rgba(0,107,63,0.1)',
    color: '#006B3F',
    fontSize: 10,
    fontWeight: 600,
    alignSelf: 'flex-start',
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={locked ? undefined : onPlay}
      role="button"
      tabIndex={locked ? -1 : 0}
      onKeyDown={locked ? undefined : (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay();
        }
      }}
      style={{ ...card, cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.85 : 1 }}
    >
      <div style={{ ...iconArea, position: 'relative' }}>
        <span>{icon}</span>
        {locked && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#FCD116',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '3px 10px',
              borderRadius: 6,
              background: 'rgba(252,209,22,0.15)',
              border: '1px solid rgba(252,209,22,0.3)',
            }}>Coming Soon</span>
          </div>
        )}
      </div>

      <div style={body}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2C2318' }}>{name}</span>
          <span style={categoryBadge}>{category}</span>
        </div>
        <div style={{ fontSize: 11, color: '#6B4E2E', lineHeight: 1.3, minHeight: 28 }}>
          {description}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          {bestScore != null && bestScore > 0 ? (
            <span style={{ fontSize: 10, color: '#A0845C' }}>Best: {bestScore.toLocaleString()}</span>
          ) : (
            <span style={{ fontSize: 10, color: '#A0845C' }}>Not played</span>
          )}
          <button
            onClick={locked ? undefined : (e) => {
              e.stopPropagation();
              onPlay();
            }}
            disabled={locked}
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              border: 'none',
              background: locked
                ? 'rgba(156,163,175,0.3)'
                : 'linear-gradient(135deg, #FCD116 0%, #D4A017 100%)',
              color: locked ? '#9CA3AF' : '#2C2318',
              fontSize: 11,
              fontWeight: 700,
              cursor: locked ? 'default' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {locked ? 'Soon' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
};
