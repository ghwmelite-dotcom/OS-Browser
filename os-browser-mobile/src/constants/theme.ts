// ── Kente Design Tokens ─────────────────────────────────────────────────────
// Ghana's national kente cloth colors as a design system foundation.

import { Dimensions, PixelRatio, Platform } from 'react-native';

export const KENTE = {
  gold: '#D4A017',
  green: '#006B3F',
  red: '#CE1126',
  // Note: React Native doesn't support CSS gradients — use LinearGradient component
  crownColors: ['#D4A017', '#006B3F', '#CE1126', '#006B3F', '#D4A017'] as const,
  crownStops: [0, 0.25, 0.5, 0.75, 1] as const,
};

export const COLORS = {
  dark: {
    bg: '#0f1117',
    surface1: '#1a1d27',
    surface2: '#252836',
    border: '#2d3044',
    text: '#e8e6e3',
    textMuted: '#8b8d98',
    accent: '#D4A017',
  },
  light: {
    bg: '#faf6f0',
    surface1: '#ffffff',
    surface2: '#f5f0e8',
    border: '#e5ddd0',
    text: '#1a1a1a',
    textMuted: '#6b6b6b',
    accent: '#D4A017',
  },
} as const;

export type ThemeMode = 'dark' | 'light';
export type ThemeColors = {
  bg: string;
  surface1: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
};

/** Get the active color palette for the given theme mode. */
export function getColors(mode: ThemeMode): ThemeColors {
  return COLORS[mode];
}

// ── Responsive scaling ──────────────────────────────────────────────────────
// Scale font sizes based on screen width so text is readable on all devices.
// Base design: 375pt (iPhone SE/8). Tablets (600pt+) get proportionally larger text.

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375;
const scale = SCREEN_WIDTH / BASE_WIDTH;

/** Scale a size value proportionally to screen width, clamped to avoid extremes */
export function rs(size: number): number {
  // Cap scale at 1.15 so tablets don't get oversized text
  const cappedScale = Math.min(Math.max(scale, 1), 1.15);
  const scaled = size * cappedScale;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
}

// ── Font family ─────────────────────────────────────────────────────────────
// Bookman Old Style — Android maps 'serif' to Noto Serif (similar feel).
// On iOS, we use the system serif which is close to Bookman.
export const FONT_FAMILY = Platform.select({
  android: 'serif',
  ios: 'Georgia', // Closest system match to Bookman Old Style on iOS
  default: 'serif',
});

export const FONT_FAMILY_BOLD = Platform.select({
  android: 'serif',
  ios: 'Georgia',
  default: 'serif',
});

// ── Spacing (base-8 grid, responsive) ───────────────────────────────────────
export const SPACING = {
  xs: rs(4),
  sm: rs(8),
  md: rs(16),
  lg: rs(24),
  xl: rs(32),
  xxl: rs(48),
} as const;

// ── Typography (responsive, bumped up for readability) ──────────────────────
// All sizes increased ~20-30% from original for better readability
export const FONT_SIZE = {
  xs: rs(13),    // was 11
  sm: rs(15),    // was 13
  md: rs(17),    // was 15
  lg: rs(19),    // was 17
  xl: rs(23),    // was 20
  xxl: rs(32),   // was 28
  hero: rs(40),  // was 36
} as const;

// ── Touch targets — 48pt minimum for better accessibility ───────────────────
export const MIN_TOUCH_TARGET = rs(48); // was 44

// ── Border radius ───────────────────────────────────────────────────────────
export const RADIUS = {
  sm: rs(8),
  md: rs(12),
  lg: rs(16),
  pill: 9999,
} as const;
