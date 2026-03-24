import React from 'react';

/* ─────────── Ghana Expressions Sticker Renderer ─────────── */
/* 20 stickers: bold Ghanaian expressions on vibrant circular backgrounds
   with a small emoji face. Uses Ghana flag colors. */

const GH_RED = '#CE1126';
const GH_GOLD = '#D4A017';
const GH_GREEN = '#006B3F';
const GH_BLACK = '#1A1A2E';

interface ExpressionConfig {
  id: string;
  text: string;
  bg: string;
  textColor: string;
  face: string;
  fontSize?: number;
}

const EXPRESSIONS: ExpressionConfig[] = [
  { id: 'charley', text: 'Charley!', bg: GH_GOLD, textColor: GH_BLACK, face: '\uD83D\uDE04' },
  { id: 'eiii', text: 'Eiii!', bg: GH_RED, textColor: '#fff', face: '\uD83D\uDE32' },
  { id: 'as-for-you', text: 'As for\nyou!', bg: GH_GREEN, textColor: '#fff', face: '\uD83D\uDE24', fontSize: 16 },
  { id: 'chale-relax', text: 'Chale,\nrelax', bg: '#2E86AB', textColor: '#fff', face: '\uD83D\uDE0C', fontSize: 16 },
  { id: 'herh', text: 'Herh!', bg: GH_RED, textColor: '#fff', face: '\uD83D\uDE28' },
  { id: 'wey-dey', text: 'Wey\ndey!', bg: GH_GREEN, textColor: GH_GOLD, face: '\u270C\uFE0F', fontSize: 18 },
  { id: 'i-beg', text: 'I beg', bg: GH_GOLD, textColor: GH_BLACK, face: '\uD83D\uDE4F' },
  { id: 'yoo-i-hear', text: 'Yoo,\nI hear', bg: '#3A506B', textColor: '#fff', face: '\uD83D\uDC4D', fontSize: 16 },
  { id: 'no-wahala', text: 'No\nwahala', bg: GH_GREEN, textColor: '#fff', face: '\u2728', fontSize: 18 },
  { id: 'the-thing-is', text: 'The thing\nis...', bg: '#5C2D91', textColor: '#fff', face: '\uD83E\uDD14', fontSize: 14 },
  { id: 'me-im-coming', text: "Me I'm\ncoming", bg: GH_GOLD, textColor: GH_BLACK, face: '\uD83C\uDFC3', fontSize: 14 },
  { id: 'abi', text: 'Abi?', bg: GH_RED, textColor: '#fff', face: '\uD83E\uDEE4' },
  { id: 'make-i-tell-you', text: 'Make I\ntell you...', bg: '#1B4332', textColor: GH_GOLD, face: '\u261D\uFE0F', fontSize: 13 },
  { id: 'keke', text: 'K\u025Bk\u025B!', bg: GH_GOLD, textColor: GH_BLACK, face: '\uD83D\uDCAF' },
  { id: 'paper-dey', text: 'Paper\ndey!', bg: GH_GREEN, textColor: GH_GOLD, face: '\uD83D\uDCB5', fontSize: 16 },
  { id: 'aye-fine', text: 'Ay\u025B\nfine!', bg: GH_GREEN, textColor: '#fff', face: '\u2728', fontSize: 18 },
  { id: 'i-shock', text: 'I shock!', bg: GH_RED, textColor: '#fff', face: '\u26A1', fontSize: 16 },
  { id: 'heavy', text: 'Heavy!', bg: GH_BLACK, textColor: GH_GOLD, face: '\uD83D\uDCAA' },
  { id: 'die-be-die', text: 'Die be\ndie', bg: GH_RED, textColor: '#fff', face: '\uD83D\uDD25', fontSize: 16 },
  { id: 'we-move', text: 'Chale,\nwe move', bg: GH_GOLD, textColor: GH_BLACK, face: '\uD83D\uDE80', fontSize: 14 },
];

const expressionMap = new Map(EXPRESSIONS.map(e => [e.id, e]));

interface Props {
  stickerId: string;
  size?: number;
}

export function GhanaExpressionSticker({ stickerId, size = 160 }: Props) {
  const config = expressionMap.get(stickerId);
  if (!config) return null;

  const scale = size / 160;
  const fontSize = (config.fontSize ?? 20) * scale;
  const faceSize = 28 * scale;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: config.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: `0 4px 12px ${config.bg}44`,
        overflow: 'hidden',
      }}
    >
      {/* Decorative ring */}
      <div
        style={{
          position: 'absolute',
          inset: 4 * scale,
          borderRadius: '50%',
          border: `2px solid rgba(255,255,255,0.2)`,
          pointerEvents: 'none',
        }}
      />

      {/* Bold expression text */}
      <span
        style={{
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontSize,
          fontWeight: 900,
          color: config.textColor,
          textAlign: 'center',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          whiteSpace: 'pre-line',
          textShadow: config.textColor === '#fff'
            ? '0 1px 2px rgba(0,0,0,0.3)'
            : 'none',
          zIndex: 1,
        }}
      >
        {config.text}
      </span>

      {/* Small emoji face at bottom */}
      <span
        style={{
          fontSize: faceSize,
          marginTop: 4 * scale,
          lineHeight: 1,
          zIndex: 1,
        }}
      >
        {config.face}
      </span>
    </div>
  );
}

/** Check if this pack can render a given stickerId */
export function canRenderExpression(stickerId: string): boolean {
  return expressionMap.has(stickerId);
}

/** Get all expression sticker IDs */
export function getExpressionIds(): string[] {
  return EXPRESSIONS.map(e => e.id);
}
