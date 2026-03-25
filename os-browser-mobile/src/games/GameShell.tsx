import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../store/settings';
import { useGameScoresStore } from '../store/gameScores';
import {
  COLORS,
  FONT_FAMILY,
  FONT_FAMILY_BOLD,
  FONT_SIZE,
  SPACING,
  RADIUS,
  MIN_TOUCH_TARGET,
  KENTE,
  rs,
} from '../constants/theme';

// ── Types ───────────────────────────────────────────────────────────────────

interface GameShellProps {
  title: string;
  emoji: string;
  gameId: string;
  score: number;
  accentColor: string;
  onBack: () => void;
  onNewGame: () => void;
  children: React.ReactNode;
  showUndo?: boolean;
  onUndo?: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function GameShell({
  title,
  emoji,
  gameId,
  score,
  accentColor,
  onBack,
  onNewGame,
  children,
  showUndo = false,
  onUndo,
}: GameShellProps) {
  const insets = useSafeAreaInsets();
  const theme = useSettingsStore((s) => s.theme);
  const c = COLORS[theme];
  const bestScore = useGameScoresStore((s) => s.getStats(gameId).bestScore);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* ── Accent top border ──────────────────────────────────────────── */}
      <View
        style={[
          styles.accentBorder,
          {
            backgroundColor: accentColor,
            paddingTop: insets.top > 0 ? insets.top : (StatusBar.currentHeight ?? rs(24)),
          },
        ]}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: c.surface1, borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={rs(24)} color={c.text} />
        </TouchableOpacity>

        <Text style={[styles.emoji, { fontSize: rs(24) }]}>{emoji}</Text>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: KENTE.gold }]}>{score}</Text>
          {bestScore > 0 && (
            <Text style={[styles.bestScore, { color: c.textMuted }]}>
              Best: {bestScore}
            </Text>
          )}
        </View>
      </View>

      {/* ── Game content ───────────────────────────────────────────────── */}
      <View style={styles.content}>{children}</View>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: c.surface1,
            borderTopColor: c.border,
            paddingBottom: Math.max(insets.bottom, SPACING.sm),
          },
        ]}
      >
        <TouchableOpacity
          onPress={onNewGame}
          style={[styles.footerButton, { backgroundColor: accentColor }]}
          accessibilityLabel="New Game"
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={rs(18)} color="#fff" style={{ marginRight: SPACING.xs }} />
          <Text style={styles.footerButtonText}>New Game</Text>
        </TouchableOpacity>

        {showUndo && onUndo && (
          <TouchableOpacity
            onPress={onUndo}
            style={[styles.footerButton, styles.undoButton, { borderColor: c.border }]}
            accessibilityLabel="Undo"
            accessibilityRole="button"
          >
            <Ionicons
              name="arrow-undo"
              size={rs(18)}
              color={c.text}
              style={{ marginRight: SPACING.xs }}
            />
            <Text style={[styles.footerButtonText, { color: c.text }]}>Undo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  accentBorder: {
    height: rs(3),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    gap: SPACING.sm,
  },
  backButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    lineHeight: rs(30),
  },
  title: {
    flex: 1,
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  scoreContainer: {
    alignItems: 'flex-end',
    minWidth: rs(56),
  },
  scoreValue: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  bestScore: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE.xs,
    marginTop: rs(-2),
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: MIN_TOUCH_TARGET,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    flex: 1,
  },
  footerButtonText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: '#fff',
  },
  undoButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    flex: 0.6,
  },
});

export default GameShell;
