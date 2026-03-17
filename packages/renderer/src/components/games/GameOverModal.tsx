import React from 'react';

// ── Props ────────────────────────────────────────────────────────────
export interface GameOverModalProps {
  score: number;
  isNewHighScore: boolean;
  message: string;
  onPlayAgain: () => void;
  onBack: () => void;
}

// ── Aya Adinkra SVG (fern symbol — endurance, resourcefulness) ──────
const AyaAdinkra: React.FC<{ size?: number; color?: string }> = ({
  size = 48,
  color = '#FCD116',
}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Stylized fern / Aya pattern */}
    <circle cx="24" cy="24" r="22" stroke={color} strokeWidth="2" fill="none" />
    <path
      d="M24 8 C24 16, 16 20, 12 24 C16 28, 24 32, 24 40 M24 8 C24 16, 32 20, 36 24 C32 28, 24 32, 24 40"
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="24" cy="24" r="3" fill={color} />
  </svg>
);

// ── Component ────────────────────────────────────────────────────────
export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  isNewHighScore,
  message,
  onPlayAgain,
  onBack,
}) => {
  const overlay: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(26,29,39,0.85)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    animation: 'govplay-fade-in 0.2s ease-out',
  };

  const card: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: '32px 40px',
    borderRadius: 16,
    background: 'linear-gradient(145deg, #2C2318 0%, #1A1D27 100%)',
    border: '1px solid rgba(252,209,22,0.25)',
    boxShadow: '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(252,209,22,0.1)',
    minWidth: 280,
    textAlign: 'center',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  const btn = (primary: boolean): React.CSSProperties => ({
    padding: '10px 24px',
    borderRadius: 8,
    border: primary ? 'none' : '1px solid rgba(252,209,22,0.3)',
    background: primary
      ? 'linear-gradient(135deg, #FCD116 0%, #D4A017 100%)'
      : 'rgba(252,209,22,0.08)',
    color: primary ? '#1A1D27' : '#FCD116',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    minWidth: 120,
  });

  return (
    <div style={overlay}>
      <style>{`
        @keyframes govplay-fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div style={card}>
        <AyaAdinkra size={56} color={isNewHighScore ? '#FCD116' : 'rgba(250,246,238,0.4)'} />

        <div style={{ fontSize: 20, fontWeight: 700, color: '#FAF6EE' }}>{message}</div>

        <div style={{ fontSize: 36, fontWeight: 800, color: '#FCD116', fontVariantNumeric: 'tabular-nums' }}>
          {score.toLocaleString()}
        </div>

        {isNewHighScore && (
          <div
            style={{
              padding: '4px 16px',
              borderRadius: 20,
              background: 'rgba(206,17,38,0.15)',
              border: '1px solid rgba(206,17,38,0.4)',
              color: '#CE1126',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            New High Score!
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={onPlayAgain} style={btn(true)}>
            Play Again
          </button>
          <button onClick={onBack} style={btn(false)}>
            Back to GovPlay
          </button>
        </div>
      </div>
    </div>
  );
};
