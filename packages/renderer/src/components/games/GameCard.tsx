import React, { useState } from 'react';

// ── Props ────────────────────────────────────────────────────────────
export interface GameCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  bestScore?: number;
  onPlay: () => void;
}

// ── Component ────────────────────────────────────────────────────────
export const GameCard: React.FC<GameCardProps> = ({
  name,
  description,
  category,
  icon,
  bestScore,
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
      style={card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay();
        }
      }}
    >
      <div style={iconArea}>
        <span>{icon}</span>
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
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'linear-gradient(135deg, #FCD116 0%, #D4A017 100%)',
              color: '#2C2318',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Play
          </button>
        </div>
      </div>
    </div>
  );
};
