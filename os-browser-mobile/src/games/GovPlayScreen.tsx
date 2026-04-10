// ── GovPlay — Game Launcher / Catalog ───────────────────────────────────────
// Displays all 12 games in a 2-column grid with category filters, best-score
// badges, and locked/coming-soon overlays for unreleased titles.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_FAMILY, FONT_FAMILY_BOLD, FONT_SIZE, KENTE, MIN_TOUCH_TARGET, RADIUS, rs, SPACING } from '../constants/theme';
import { useGameScoresStore } from '../store/gameScores';

// ── Types ───────────────────────────────────────────────────────────────────

interface GovPlayScreenProps {
  isDark: boolean;
  onSelectGame: (gameId: string) => void;
  onBack: () => void;
}

interface GameDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  color: string;
  category: string;
  locked?: boolean;
}

// ── Game catalog ────────────────────────────────────────────────────────────

const GAMES: GameDef[] = [
  { id: '2048', name: '2048', emoji: '🧮', desc: 'Merge tiles to 2048', color: '#F97316', category: 'Puzzles' },
  { id: 'snake', name: 'Snake', emoji: '🐍', desc: 'Grow the snake', color: '#84cc16', category: 'Arcade' },
  { id: 'minesweeper', name: 'Minesweeper', emoji: '💣', desc: 'Clear the minefield', color: '#64748b', category: 'Puzzles' },
  { id: 'trivia', name: 'Ghana Trivia', emoji: '🇬🇭', desc: 'Test your knowledge', color: '#006B3F', category: 'Quiz' },
  // Batch 2
  { id: 'sudoku', name: 'Sudoku', emoji: '🔢', desc: 'Number logic puzzle', color: '#10B981', category: 'Puzzles' },
  { id: 'solitaire', name: 'Solitaire', emoji: '🃏', desc: 'Classic card patience', color: '#22c55e', category: 'Cards' },
  { id: 'word-scramble', name: 'Words', emoji: '🔤', desc: 'Unscramble letters', color: '#a855f7', category: 'Quiz' },
  { id: 'typing', name: 'Typing Speed', emoji: '⌨️', desc: 'How fast can you type?', color: '#0ea5e9', category: 'Quiz' },
  // Batch 3
  { id: 'oware', name: 'Oware', emoji: '🏺', desc: 'Akan strategy game', color: '#D4A017', category: 'Strategy' },
  { id: 'chess', name: 'Chess', emoji: '♟️', desc: 'Classic strategy', color: '#6366f1', category: 'Strategy' },
  { id: 'checkers', name: 'Checkers', emoji: '🔴', desc: 'Jump and capture', color: '#EF4444', category: 'Strategy' },
  { id: 'ludo', name: 'Ludo', emoji: '🎲', desc: 'Roll dice, race home', color: '#3B82F6', category: 'Strategy' },
];

const CATEGORIES = ['All', 'Puzzles', 'Arcade', 'Quiz', 'Strategy', 'Cards'] as const;

// ── Animated game card ──────────────────────────────────────────────────────

function GameCard({
  game,
  isDark,
  bestScore,
  onPress,
}: {
  game: GameDef;
  isDark: boolean;
  bestScore: number;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const c = COLORS[isDark ? 'dark' : 'light'];

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const locked = game.locked === true;

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={locked ? undefined : onPress}
        onPressIn={locked ? undefined : handlePressIn}
        onPressOut={locked ? undefined : handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: c.surface1,
            borderColor: locked ? c.border : game.color + '40',
            opacity: locked ? 0.55 : 1,
          },
        ]}
        accessibilityLabel={locked ? `${game.name} — coming soon` : `Play ${game.name}`}
        accessibilityRole="button"
        disabled={locked}
      >
        {/* Color accent strip at top */}
        <View
          style={[
            styles.cardAccent,
            { backgroundColor: locked ? c.textMuted : game.color },
          ]}
        />

        {/* Emoji */}
        <Text style={styles.cardEmoji}>{game.emoji}</Text>

        {/* Name */}
        <Text
          style={[
            styles.cardName,
            { color: c.text, fontFamily: FONT_FAMILY_BOLD },
          ]}
          numberOfLines={1}
        >
          {game.name}
        </Text>

        {/* Description */}
        <Text
          style={[styles.cardDesc, { color: c.textMuted }]}
          numberOfLines={1}
        >
          {game.desc}
        </Text>

        {/* Best score badge */}
        {!locked && bestScore > 0 && (
          <View style={[styles.scoreBadge, { backgroundColor: game.color + '20' }]}>
            <Ionicons name="trophy" size={rs(12)} color={game.color} />
            <Text style={[styles.scoreText, { color: game.color }]}>
              {bestScore.toLocaleString()}
            </Text>
          </View>
        )}

        {/* Locked overlay */}
        {locked && (
          <View style={styles.lockedOverlay}>
            <Ionicons name="lock-closed" size={rs(22)} color={c.textMuted} />
            <Text style={[styles.lockedText, { color: c.textMuted }]}>
              Coming Soon
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function GovPlayScreen({ isDark, onSelectGame, onBack }: GovPlayScreenProps) {
  const insets = useSafeAreaInsets();
  const c = COLORS[isDark ? 'dark' : 'light'];
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const getStats = useGameScoresStore((s) => s.getStats);

  const filteredGames = useMemo(
    () =>
      activeCategory === 'All'
        ? GAMES
        : GAMES.filter((g) => g.category === activeCategory),
    [activeCategory],
  );

  // Build row pairs for 2-column grid
  const rows = useMemo(() => {
    const result: [GameDef, GameDef | null][] = [];
    for (let i = 0; i < filteredGames.length; i += 2) {
      result.push([filteredGames[i], filteredGames[i + 1] ?? null]);
    }
    return result;
  }, [filteredGames]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        {/* Green gradient background layers */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: KENTE.green }]} />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#000',
              opacity: isDark ? 0.3 : 0.1,
            },
          ]}
        />

        <View style={styles.headerContent}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={rs(24)} color="#fff" />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={styles.titleRow}>
              <Ionicons name="game-controller" size={rs(22)} color={KENTE.gold} />
              <Text style={styles.headerTitle}>GovPlay</Text>
            </View>
            <Text style={styles.headerSubtitle}>12 games — all playable</Text>
          </View>

          {/* Spacer to balance back button */}
          <View style={{ width: MIN_TOUCH_TARGET }} />
        </View>
      </View>

      {/* ── Category filter pills ──────────────────────────────────────── */}
      <View style={[styles.pillsContainer, { borderBottomColor: c.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isActive ? KENTE.gold : c.surface2,
                    borderColor: isActive ? KENTE.gold : c.border,
                  },
                ]}
                accessibilityLabel={`Filter by ${cat}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: isActive ? '#fff' : c.textMuted,
                      fontFamily: isActive ? FONT_FAMILY_BOLD : FONT_FAMILY,
                    },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Game grid ──────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.grid}
        contentContainerStyle={[
          styles.gridContent,
          { paddingBottom: insets.bottom + SPACING.lg + rs(6) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {rows.map(([left, right], idx) => (
          <View key={idx} style={styles.gridRow}>
            <GameCard
              game={left}
              isDark={isDark}
              bestScore={getStats(left.id).bestScore}
              onPress={() => onSelectGame(left.id)}
            />
            {right ? (
              <GameCard
                game={right}
                isDark={isDark}
                bestScore={getStats(right.id).bestScore}
                onPress={() => onSelectGame(right.id)}
              />
            ) : (
              <View style={styles.cardWrapper} />
            )}
          </View>
        ))}
      </ScrollView>

      {/* ── Kente footer strip ─────────────────────────────────────────── */}
      <View style={[styles.kenteFooter, { paddingBottom: insets.bottom }]}>
        <View style={[styles.kenteStripe, { backgroundColor: KENTE.red }]} />
        <View style={[styles.kenteStripe, { backgroundColor: KENTE.gold }]} />
        <View style={[styles.kenteStripe, { backgroundColor: KENTE.green }]} />
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    overflow: 'hidden',
    paddingBottom: SPACING.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY_BOLD,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY,
    color: 'rgba(255,255,255,0.8)',
    marginTop: rs(2),
  },

  // Category pills
  pillsContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACING.sm,
  },
  pillsScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  pill: {
    paddingHorizontal: SPACING.md,
    height: rs(36),
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: MIN_TOUCH_TARGET,
  },
  pillText: {
    fontSize: FONT_SIZE.sm,
  },

  // Grid
  grid: {
    flex: 1,
  },
  gridContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },

  // Card
  cardWrapper: {
    flex: 1,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    alignItems: 'center',
    minHeight: rs(160),
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rs(3),
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  cardEmoji: {
    fontSize: rs(40),
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cardName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginTop: rs(2),
  },

  // Score badge
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: SPACING.sm,
    paddingVertical: rs(3),
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
  },
  scoreText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY_BOLD,
    fontWeight: '700',
  },

  // Locked overlay
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: RADIUS.lg,
    gap: rs(4),
  },
  lockedText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY_BOLD,
    fontWeight: '600',
  },

  // Kente footer
  kenteFooter: {
    flexDirection: 'row',
    height: rs(6),
  },
  kenteStripe: {
    flex: 1,
  },
});
