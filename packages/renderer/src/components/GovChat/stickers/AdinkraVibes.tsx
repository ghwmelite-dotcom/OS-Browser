import React from 'react';

/* ─────────── Adinkra Vibes Sticker Renderer ─────────── */
/* 12 Adinkra symbols rendered as gold SVG paths on dark circles
   with the symbol name below */

const GOLD = '#D4A017';
const DARK_BG = '#1A1A2E';

interface AdinkraConfig {
  id: string;
  label: string;
  /** SVG path data for the symbol, drawn in a 40x40 viewBox */
  path: string;
}

const ADINKRA_SYMBOLS: AdinkraConfig[] = [
  {
    id: 'gye-nyame',
    label: 'Gye Nyame',
    // Stylized "except God" — curved horn shapes
    path: 'M20 4C12 4 6 10 6 18c0 5 3 9 8 12 2-1 4-3 4-6-2-1-4-3-4-6 0-4 3-7 6-7s6 3 6 7c0 3-2 5-4 6 0 3 2 5 4 6 5-3 8-7 8-12C34 10 28 4 20 4z',
  },
  {
    id: 'sankofa',
    label: 'Sankofa',
    // Bird looking backward — simplified
    path: 'M28 10c-4-3-9-2-12 1l-2 3c-1 2 0 4 2 4h3l-5 6c-1 1-1 3 1 3l8-4c3-1 5-4 5-7v-2c2-1 2-3 0-4zM16 28c-2 0-3-1-3-3s1-3 3-3 3 1 3 3-1 3-3 3z',
  },
  {
    id: 'dwennimmen',
    label: 'Dwennimmen',
    // Ram horns — two spiraling curves
    path: 'M20 8v24M8 20h24M12 12c0 4 3 8 8 8M28 12c0 4-3 8-8 8M12 28c0-4 3-8 8-8M28 28c0-4-3-8-8-8',
  },
  {
    id: 'aya',
    label: 'Aya',
    // Fern — diamond with internal divisions
    path: 'M20 6l8 14-8 14-8-14zM20 6v28M12 20h16',
  },
  {
    id: 'akoma',
    label: 'Akoma',
    // Heart shape — patience
    path: 'M20 34c-1-1-14-9-14-18 0-5 4-9 8-9 3 0 5 2 6 4 1-2 3-4 6-4 4 0 8 4 8 9 0 9-13 17-14 18z',
  },
  {
    id: 'nkyinkyim',
    label: 'Nkyinkyim',
    // Zigzag / twisting path
    path: 'M10 8l5 6-5 6 5 6-5 6M30 8l-5 6 5 6-5 6 5 6M16 8h8M16 20h8M16 32h8',
  },
  {
    id: 'fawohodie',
    label: 'Fawohodie',
    // Two clasped hands breaking free — simplified as cross with wings
    path: 'M20 8v24M14 14l-6-4M26 14l6-4M14 26l-6 4M26 26l6 4M16 18h8v4h-8z',
  },
  {
    id: 'ese-ne-tekrema',
    label: 'Ese Ne Tekrema',
    // Teeth and tongue — friendship
    path: 'M10 16h20v2H10zM10 22h20v2H10zM14 16v8M20 16v8M26 16v8M16 12c0-2 2-4 4-4s4 2 4 4M16 28c0 2 2 4 4 4s4-2 4-4',
  },
  {
    id: 'mate-masie',
    label: 'Mate Masie',
    // Ear / knowledge — two overlapping ovals
    path: 'M16 14a6 8 0 1 1 0 12 6 8 0 1 1 0-12zM24 14a6 8 0 1 1 0 12 6 8 0 1 1 0-12z',
  },
  {
    id: 'bese-saka',
    label: 'Bese Saka',
    // Cola nut cluster — grid of circles
    path: 'M14 14a3 3 0 1 0 0 .1M20 14a3 3 0 1 0 0 .1M26 14a3 3 0 1 0 0 .1M14 22a3 3 0 1 0 0 .1M20 22a3 3 0 1 0 0 .1M26 22a3 3 0 1 0 0 .1M14 30a3 3 0 1 0 0 .1M20 30a3 3 0 1 0 0 .1M26 30a3 3 0 1 0 0 .1',
  },
  {
    id: 'denkyem',
    label: 'Denkyem',
    // Crocodile — simplified curved body
    path: 'M8 20c4-8 10-10 16-8 2 0 4 2 4 4s-2 4-4 4c-6 2-12 0-16 8M12 16l-2-4M12 24l-2 4M30 18a2 2 0 1 0 0 .1',
  },
  {
    id: 'woforo-dua-pa-a',
    label: 'Woforo Dua Pa A',
    // Tree with support — trunk and branches
    path: 'M20 34v-20M20 14c-6-4-10-6-10-10M20 14c6-4 10-6 10-10M14 20c-4-2-6-4-6-6M26 20c4-2 6-4 6-6M16 34h8',
  },
];

const adinkraMap = new Map(ADINKRA_SYMBOLS.map(s => [s.id, s]));

interface Props {
  stickerId: string;
  size?: number;
}

export function AdinkraVibeSticker({ stickerId, size = 160 }: Props) {
  const config = adinkraMap.get(stickerId);
  if (!config) return null;

  const scale = size / 160;

  // Determine if path uses fill or stroke
  const useStroke = config.path.includes('M') && !config.path.includes('c0') && !config.path.includes('C');

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6 * scale,
      }}
    >
      {/* Dark circle with gold symbol */}
      <div
        style={{
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: '50%',
          background: DARK_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 16px rgba(26,26,46,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
          border: `2px solid ${GOLD}33`,
          position: 'relative',
        }}
      >
        {/* Subtle gold ring */}
        <div
          style={{
            position: 'absolute',
            inset: 4 * scale,
            borderRadius: '50%',
            border: `1px solid ${GOLD}22`,
            pointerEvents: 'none',
          }}
        />

        <svg
          width={size * 0.44}
          height={size * 0.44}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d={config.path}
            stroke={GOLD}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={useStroke ? 'none' : `${GOLD}22`}
          />
        </svg>
      </div>

      {/* Label */}
      <span
        style={{
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontSize: Math.max(9, 11 * scale),
          fontWeight: 700,
          color: GOLD,
          textAlign: 'center',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          lineHeight: 1.1,
          maxWidth: size * 0.9,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {config.label}
      </span>
    </div>
  );
}

export function canRenderAdinkra(stickerId: string): boolean {
  return adinkraMap.has(stickerId);
}

export function getAdinkraIds(): string[] {
  return ADINKRA_SYMBOLS.map(s => s.id);
}
