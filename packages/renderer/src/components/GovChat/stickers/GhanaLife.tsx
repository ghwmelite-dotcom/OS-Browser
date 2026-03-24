import React from 'react';

/* ─────────── Ghana Life Sticker Renderer ─────────── */
/* 15 stickers with simple CSS/SVG illustrations */

const GH_RED = '#CE1126';
const GH_GOLD = '#D4A017';
const GH_GREEN = '#006B3F';
const GH_BLACK = '#1a1a1a';

interface GhanaLifeConfig {
  id: string;
  label: string;
  render: (size: number) => React.ReactNode;
}

/** Helper: simple text sticker with icon */
function textIconSticker(
  text: string,
  icon: string,
  bg: string,
  textColor: string,
  size: number,
) {
  const scale = size / 160;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 16 * scale,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4 * scale,
        boxShadow: `0 3px 10px ${bg}33`,
      }}
    >
      <span style={{ fontSize: 36 * scale, lineHeight: 1 }}>{icon}</span>
      <span
        style={{
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontSize: 13 * scale,
          fontWeight: 800,
          color: textColor,
          textAlign: 'center',
          lineHeight: 1.15,
          padding: `0 ${8 * scale}px`,
        }}
      >
        {text}
      </span>
    </div>
  );
}

/** Jollof rice — bowl with rice and tomato sauce */
function jollofRice(size: number) {
  const s = size / 160;
  return (
    <div style={{ width: size, height: size, borderRadius: 16 * s, background: '#FFF3E0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 * s, boxShadow: '0 3px 10px rgba(206,17,38,0.15)' }}>
      <svg width={80 * s} height={60 * s} viewBox="0 0 80 60">
        {/* Bowl */}
        <ellipse cx="40" cy="38" rx="34" ry="16" fill="#8B4513" />
        <ellipse cx="40" cy="34" rx="34" ry="16" fill="#A0522D" />
        {/* Rice pile */}
        <ellipse cx="40" cy="30" rx="28" ry="14" fill="#E8632B" />
        <ellipse cx="40" cy="26" rx="24" ry="10" fill="#FF7043" />
        {/* Rice grains */}
        {[25, 32, 40, 48, 55].map((x, i) => (
          <ellipse key={i} cx={x} cy={24 + (i % 2) * 3} rx="3" ry="1.5" fill="#FFFDE7" opacity={0.8} />
        ))}
        {/* Steam */}
        <path d="M30 14c0-4 2-6 2-10" stroke="#aaa" strokeWidth="1.5" fill="none" opacity={0.4} />
        <path d="M40 12c0-4 2-6 2-10" stroke="#aaa" strokeWidth="1.5" fill="none" opacity={0.4} />
        <path d="M50 14c0-4 2-6 2-10" stroke="#aaa" strokeWidth="1.5" fill="none" opacity={0.4} />
      </svg>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 * s, fontWeight: 800, color: GH_RED }}>Jollof Rice</span>
    </div>
  );
}

/** Trotro minibus */
function trotro(size: number) {
  const s = size / 160;
  return (
    <div style={{ width: size, height: size, borderRadius: 16 * s, background: '#E3F2FD', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 * s }}>
      <svg width={90 * s} height={50 * s} viewBox="0 0 90 50">
        {/* Bus body */}
        <rect x="10" y="12" width="70" height="28" rx="6" fill={GH_GOLD} />
        <rect x="10" y="12" width="70" height="8" rx="3" fill={GH_RED} />
        {/* Windows */}
        {[20, 34, 48, 62].map((x, i) => (
          <rect key={i} x={x} y="16" width="8" height="8" rx="1.5" fill="#B3E5FC" />
        ))}
        {/* Wheels */}
        <circle cx="24" cy="42" r="5" fill="#333" />
        <circle cx="24" cy="42" r="2" fill="#666" />
        <circle cx="66" cy="42" r="5" fill="#333" />
        <circle cx="66" cy="42" r="2" fill="#666" />
        {/* Stripe */}
        <rect x="10" y="30" width="70" height="3" fill={GH_GREEN} />
      </svg>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 * s, fontWeight: 800, color: '#1565C0' }}>Trotro</span>
    </div>
  );
}

/** Star beer bottle */
function starBeer(size: number) {
  const s = size / 160;
  return (
    <div style={{ width: size, height: size, borderRadius: 16 * s, background: '#FFFDE7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 * s }}>
      <svg width={40 * s} height={80 * s} viewBox="0 0 40 80">
        {/* Bottle neck */}
        <rect x="15" y="4" width="10" height="16" rx="3" fill="#2E7D32" />
        {/* Cap */}
        <rect x="14" y="2" width="12" height="5" rx="2" fill={GH_GOLD} />
        {/* Bottle body */}
        <path d="M15 20Q8 24 8 34v30a6 6 0 006 6h12a6 6 0 006-6V34Q32 24 25 20z" fill="#2E7D32" />
        {/* Label */}
        <rect x="10" y="36" width="20" height="18" rx="2" fill="#FFFDE7" />
        {/* Star on label */}
        <polygon points="20,38 22,44 28,44 23,48 25,54 20,50 15,54 17,48 12,44 18,44" fill={GH_GOLD} />
      </svg>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11 * s, fontWeight: 800, color: '#2E7D32' }}>Star Beer</span>
    </div>
  );
}

/** Kente pattern */
function kentePattern(size: number) {
  const s = size / 160;
  return (
    <div style={{ width: size, height: size, borderRadius: 16 * s, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
      {/* Woven kente pattern */}
      <svg width={size} height={size} viewBox="0 0 160 160">
        {/* Background weave */}
        {Array.from({ length: 8 }).map((_, i) => (
          <React.Fragment key={`h${i}`}>
            <rect x="0" y={i * 20} width="160" height="10" fill={i % 2 === 0 ? GH_GOLD : GH_GREEN} />
            <rect x="0" y={i * 20 + 10} width="160" height="10" fill={i % 2 === 0 ? GH_RED : GH_GOLD} />
          </React.Fragment>
        ))}
        {/* Vertical overlays */}
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={`v${i}`} x={i * 20 + 5} y="0" width="10" height="160" fill={i % 3 === 0 ? GH_GREEN : i % 3 === 1 ? '#1A1A2E' : GH_RED} opacity={0.45} />
        ))}
        {/* Center accent squares */}
        {[40, 80, 120].map((x) =>
          [40, 80, 120].map((y) => (
            <rect key={`${x}-${y}`} x={x - 5} y={y - 5} width="10" height="10" fill={GH_GOLD} opacity={0.7} />
          )),
        )}
      </svg>
      {/* Label overlay */}
      <div style={{ position: 'absolute', bottom: 6 * s, background: 'rgba(0,0,0,0.6)', borderRadius: 8 * s, padding: `${2 * s}px ${10 * s}px` }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11 * s, fontWeight: 800, color: GH_GOLD }}>Kente</span>
      </div>
    </div>
  );
}

const GHANA_LIFE_STICKERS: GhanaLifeConfig[] = [
  { id: 'jollof-rice', label: 'Jollof Rice', render: jollofRice },
  { id: 'trotro', label: 'Trotro', render: trotro },
  { id: 'star-beer', label: 'Star Beer', render: starBeer },
  {
    id: 'fufu',
    label: 'Fufu',
    render: (size) => textIconSticker('Fufu', '\uD83C\uDF5C', '#FFF8E1', '#5D4037', size),
  },
  {
    id: 'waakye',
    label: 'Waakye',
    render: (size) => textIconSticker('Waakye', '\uD83C\uDF5B', '#F3E5F5', GH_RED, size),
  },
  {
    id: 'black-stars-jersey',
    label: 'Black Stars Jersey',
    render: (size) => {
      const s = size / 160;
      return (
        <div style={{ width: size, height: size, borderRadius: 16 * s, background: '#FFFDE7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 * s }}>
          <svg width={70 * s} height={64 * s} viewBox="0 0 70 64">
            {/* Jersey */}
            <path d="M15 8L5 18v16h12v22h36V34h12V18L55 8z" fill="#FFFDE7" stroke={GH_BLACK} strokeWidth="2" />
            {/* Collar */}
            <path d="M25 8c0 4 5 7 10 7s10-3 10-7" fill="none" stroke={GH_RED} strokeWidth="2" />
            {/* Star */}
            <polygon points="35,18 37,26 45,26 39,30 41,38 35,34 29,38 31,30 25,26 33,26" fill={GH_BLACK} />
            {/* Stripe */}
            <rect x="17" y="42" width="36" height="3" fill={GH_GREEN} />
          </svg>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10 * s, fontWeight: 800, color: GH_BLACK }}>Black Stars</span>
        </div>
      );
    },
  },
  {
    id: 'cedi-notes',
    label: 'GH\u20B5 Notes',
    render: (size) => {
      const s = size / 160;
      return (
        <div style={{ width: size, height: size, borderRadius: 16 * s, background: '#E8F5E9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 * s }}>
          <div style={{ position: 'relative', width: 70 * s, height: 50 * s }}>
            {/* Stacked notes */}
            <div style={{ position: 'absolute', top: 6 * s, left: 6 * s, width: 60 * s, height: 36 * s, borderRadius: 4 * s, background: GH_GREEN, opacity: 0.4, transform: 'rotate(5deg)' }} />
            <div style={{ position: 'absolute', top: 3 * s, left: 3 * s, width: 60 * s, height: 36 * s, borderRadius: 4 * s, background: GH_GREEN, opacity: 0.6, transform: 'rotate(-3deg)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: 60 * s, height: 36 * s, borderRadius: 4 * s, background: GH_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18 * s, fontWeight: 900, color: '#fff' }}>GH\u20B5</span>
            </div>
          </div>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11 * s, fontWeight: 800, color: GH_GREEN }}>GH\u20B5 Notes</span>
        </div>
      );
    },
  },
  { id: 'kente-pattern', label: 'Kente Pattern', render: kentePattern },
  {
    id: 'akwaaba',
    label: 'Akwaaba',
    render: (size) => {
      const s = size / 160;
      return (
        <div style={{ width: size, height: size, borderRadius: 16 * s, background: GH_GREEN, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 * s }}>
          <span style={{ fontSize: 28 * s, lineHeight: 1 }}>\uD83D\uDC4B</span>
          <div style={{ background: GH_GOLD, borderRadius: 8 * s, padding: `${4 * s}px ${14 * s}px` }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16 * s, fontWeight: 900, color: GH_BLACK, letterSpacing: '0.05em' }}>AKWAABA</span>
          </div>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10 * s, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Welcome!</span>
        </div>
      );
    },
  },
  {
    id: 'highlife-guitar',
    label: 'Highlife Guitar',
    render: (size) => textIconSticker('Highlife\nVibes', '\uD83C\uDFB8', GH_GOLD, GH_BLACK, size),
  },
  {
    id: 'cedi-loading',
    label: 'GH\u20B5 Loading...',
    render: (size) => {
      const s = size / 160;
      return (
        <div style={{ width: size, height: size, borderRadius: 16 * s, background: '#FFF3E0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 * s }}>
          <span style={{ fontSize: 30 * s, lineHeight: 1 }}>\uD83D\uDCB8</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 * s, fontWeight: 800, color: GH_RED }}>GH\u20B5 Loading...</span>
          {/* Progress bar */}
          <div style={{ width: size * 0.55, height: 6 * s, borderRadius: 3 * s, background: '#ddd', overflow: 'hidden' }}>
            <div style={{ width: '40%', height: '100%', borderRadius: 3 * s, background: GH_GREEN }} />
          </div>
        </div>
      );
    },
  },
  {
    id: 'chop-bar-open',
    label: 'Chop bar open',
    render: (size) => {
      const s = size / 160;
      return (
        <div style={{ width: size, height: size, borderRadius: 16 * s, background: '#4E342E', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 * s }}>
          <span style={{ fontSize: 26 * s, lineHeight: 1 }}>\uD83C\uDF7D\uFE0F</span>
          <div style={{ background: GH_GOLD, borderRadius: 6 * s, padding: `${3 * s}px ${10 * s}px` }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 * s, fontWeight: 900, color: GH_BLACK }}>CHOP BAR</span>
          </div>
          <div style={{ background: GH_GREEN, borderRadius: 4 * s, padding: `${2 * s}px ${8 * s}px` }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10 * s, fontWeight: 700, color: '#fff' }}>OPEN</span>
          </div>
        </div>
      );
    },
  },
  {
    id: 'black-stars',
    label: 'Black Stars \u2B50',
    render: (size) => textIconSticker('Black\nStars', '\u2B50', GH_BLACK, GH_GOLD, size),
  },
  {
    id: 'dumsor-candle',
    label: 'Dumsor candle',
    render: (size) => {
      const s = size / 160;
      return (
        <div style={{ width: size, height: size, borderRadius: 16 * s, background: '#263238', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 * s }}>
          <svg width={40 * s} height={60 * s} viewBox="0 0 40 60">
            {/* Flame glow */}
            <ellipse cx="20" cy="14" rx="10" ry="12" fill="#FFD54F" opacity={0.2} />
            {/* Flame */}
            <path d="M20 4c-3 4-6 8-6 12 0 4 3 6 6 6s6-2 6-6c0-4-3-8-6-12z" fill="#FF9800" />
            <path d="M20 8c-2 3-3 5-3 8 0 2 1.5 3 3 3s3-1 3-3c0-3-1-5-3-8z" fill="#FFD54F" />
            {/* Candle body */}
            <rect x="16" y="22" width="8" height="30" rx="2" fill="#ECEFF1" />
            {/* Melted wax drip */}
            <ellipse cx="20" cy="22" rx="6" ry="2" fill="#F5F5F5" />
          </svg>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11 * s, fontWeight: 800, color: '#FFD54F' }}>Dumsor</span>
        </div>
      );
    },
  },
  {
    id: 'friday-wear',
    label: 'Friday wear',
    render: (size) => {
      const s = size / 160;
      return (
        <div style={{ width: size, height: size, borderRadius: 16 * s, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* African print background */}
          <svg width={size} height={size} viewBox="0 0 160 160" style={{ position: 'absolute', inset: 0 }}>
            {Array.from({ length: 8 }).map((_, row) =>
              Array.from({ length: 8 }).map((_, col) => (
                <circle
                  key={`${row}-${col}`}
                  cx={col * 20 + 10}
                  cy={row * 20 + 10}
                  r={(row + col) % 3 === 0 ? 8 : 5}
                  fill={(row + col) % 4 === 0 ? GH_RED : (row + col) % 4 === 1 ? GH_GOLD : (row + col) % 4 === 2 ? GH_GREEN : '#1A1A2E'}
                  opacity={0.35}
                />
              )),
            )}
            <rect x="0" y="0" width="160" height="160" fill="rgba(212,160,23,0.15)" />
          </svg>
          <div style={{ zIndex: 1, background: 'rgba(0,0,0,0.55)', borderRadius: 10 * s, padding: `${6 * s}px ${14 * s}px`, textAlign: 'center' }}>
            <div style={{ fontSize: 24 * s, lineHeight: 1 }}>\uD83D\uDC54</div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 * s, fontWeight: 800, color: GH_GOLD }}>Friday Wear</span>
          </div>
        </div>
      );
    },
  },
];

const ghanaLifeMap = new Map(GHANA_LIFE_STICKERS.map(s => [s.id, s]));

interface Props {
  stickerId: string;
  size?: number;
}

export function GhanaLifeSticker({ stickerId, size = 160 }: Props) {
  const config = ghanaLifeMap.get(stickerId);
  if (!config) return null;
  return <>{config.render(size)}</>;
}

export function canRenderGhanaLife(stickerId: string): boolean {
  return ghanaLifeMap.has(stickerId);
}

export function getGhanaLifeIds(): string[] {
  return GHANA_LIFE_STICKERS.map(s => s.id);
}
