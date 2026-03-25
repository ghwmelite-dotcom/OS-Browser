import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../store/settings';
import { useGameScoresStore } from '../../store/gameScores';
import { GameShell } from '../GameShell';
import {
  COLORS,
  KENTE,
  FONT_FAMILY_BOLD,
  FONT_SIZE,
  SPACING,
  RADIUS,
  rs,
} from '../../constants/theme';
import {
  createInitialState,
  enqueueDirection,
  tick as snakeTick,
  GRID,
  type SnakeState,
  type Direction,
  type Coord,
} from './snakeLogic';

// ── Types ────────────────────────────────────────────────────────────────────

interface SnakeScreenProps {
  onBack: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SNAKE_GREEN = '#22c55e';
const SNAKE_HEAD = '#16a34a';
const FOOD_RED = '#EF4444';
const DPAD_SIZE = rs(56);

// ── Memoized Cell ────────────────────────────────────────────────────────────

interface CellProps {
  cellSize: number;
  type: 'empty' | 'head' | 'body' | 'food';
  emptyColor: string;
}

const Cell = React.memo(function Cell({ cellSize, type, emptyColor }: CellProps) {
  let backgroundColor: string;
  let borderRadius = rs(2);

  switch (type) {
    case 'head':
      backgroundColor = SNAKE_HEAD;
      borderRadius = rs(4);
      break;
    case 'body':
      backgroundColor = SNAKE_GREEN;
      borderRadius = rs(3);
      break;
    case 'food':
      backgroundColor = FOOD_RED;
      borderRadius = cellSize / 2; // circle
      break;
    default:
      backgroundColor = emptyColor;
      break;
  }

  return (
    <View
      style={{
        width: cellSize,
        height: cellSize,
        backgroundColor,
        borderRadius,
      }}
    />
  );
});

// ── Main Screen ──────────────────────────────────────────────────────────────

export function SnakeScreen({ onBack }: SnakeScreenProps) {
  const theme = useSettingsStore((s) => s.theme);
  const c = COLORS[theme];
  const recordGame = useGameScoresStore((s) => s.recordGame);

  // ── Game state in ref for performance, renderTick to trigger re-renders ───
  const stateRef = useRef<SnakeState>(createInitialState());
  const [renderTick, setRenderTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef(stateRef.current.speed);

  // Derived values for render
  const state = stateRef.current;
  const score = state.score;
  const gameOver = state.gameOver;
  const started = state.started;

  // ── Grid sizing ─────────────────────────────────────────────────────────────
  const screenWidth = Dimensions.get('window').width;
  const gridPadding = SPACING.md * 2;
  const gridSize = screenWidth - gridPadding;
  const cellSize = gridSize / GRID;

  // ── Build cell lookup for O(1) access ───────────────────────────────────────
  const cellMap = useRef(new Map<string, 'head' | 'body' | 'food'>());

  // Rebuild cell map on each render tick
  cellMap.current.clear();
  if (state.snake.length > 0) {
    cellMap.current.set(`${state.snake[0].x},${state.snake[0].y}`, 'head');
    for (let i = 1; i < state.snake.length; i++) {
      cellMap.current.set(`${state.snake[i].x},${state.snake[i].y}`, 'body');
    }
  }
  cellMap.current.set(`${state.food.x},${state.food.y}`, 'food');

  // ── Tick function ───────────────────────────────────────────────────────────
  const doTick = useCallback(() => {
    const result = snakeTick(stateRef.current);
    stateRef.current = result.state;

    // Update speed if changed
    if (result.state.speed !== speedRef.current) {
      speedRef.current = result.state.speed;
      // Restart interval with new speed
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => doTick(), speedRef.current);
      }
    }

    if (result.died) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      recordGame('snake', result.state.score);
    }

    setRenderTick((t) => t + 1);
  }, [recordGame]);

  // ── Start game loop when started ────────────────────────────────────────────
  const startLoop = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => doTick(), speedRef.current);
  }, [doTick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // ── Direction input handler ─────────────────────────────────────────────────
  const handleDirection = useCallback(
    (dir: Direction) => {
      stateRef.current = enqueueDirection(stateRef.current, dir);
      if (!started && stateRef.current.started) {
        startLoop();
        setRenderTick((t) => t + 1);
      }
    },
    [started, startLoop],
  );

  // ── Swipe gesture (same pattern as 2048) ────────────────────────────────────
  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: () => {},
    }),
  );

  useEffect(() => {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        const threshold = 20;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx < threshold && absDy < threshold) return;

        let direction: Direction;
        if (absDx > absDy) {
          direction = dx < 0 ? 'LEFT' : 'RIGHT';
        } else {
          direction = dy < 0 ? 'UP' : 'DOWN';
        }

        handleDirection(direction);
      },
    });
    setRenderTick((t) => t + 1); // force re-render to pick up new panHandlers
  }, [handleDirection]);

  // ── New game ────────────────────────────────────────────────────────────────
  const handleNewGame = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stateRef.current = createInitialState();
    speedRef.current = stateRef.current.speed;
    setRenderTick((t) => t + 1);
  }, []);

  // ── Render grid rows ────────────────────────────────────────────────────────
  const rows = [];
  for (let y = 0; y < GRID; y++) {
    const cells = [];
    for (let x = 0; x < GRID; x++) {
      const type = cellMap.current.get(`${x},${y}`) ?? 'empty';
      cells.push(
        <Cell
          key={`${x}-${y}`}
          cellSize={cellSize}
          type={type}
          emptyColor={c.surface2}
        />,
      );
    }
    rows.push(
      <View key={`row-${y}`} style={styles.gridRow}>
        {cells}
      </View>,
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <GameShell
      title="Snake"
      emoji="🐍"
      gameId="snake"
      score={score}
      accentColor="#84cc16"
      onBack={onBack}
      onNewGame={handleNewGame}
    >
      <View style={[styles.gameArea, { backgroundColor: c.bg }]}>
        {/* ── Grid ───────────────────────────────────────────────────────── */}
        <View
          {...panResponderRef.current.panHandlers}
          style={[
            styles.gridContainer,
            {
              width: gridSize,
              height: gridSize,
              backgroundColor: c.surface1,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              borderColor: c.border,
            },
          ]}
        >
          {rows}
        </View>

        {/* ── Start hint ─────────────────────────────────────────────────── */}
        {!started && !gameOver && (
          <Text style={[styles.hintText, { color: c.textMuted }]}>
            Swipe or use D-pad to start
          </Text>
        )}

        {/* ── D-Pad Controls ─────────────────────────────────────────────── */}
        <View style={styles.dpadContainer}>
          {/* Up */}
          <View style={styles.dpadRow}>
            <TouchableOpacity
              onPress={() => handleDirection('UP')}
              style={[styles.dpadButton, { backgroundColor: c.accent }]}
              activeOpacity={0.7}
              accessibilityLabel="Move up"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-up" size={rs(28)} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Left + Right */}
          <View style={styles.dpadRow}>
            <TouchableOpacity
              onPress={() => handleDirection('LEFT')}
              style={[styles.dpadButton, { backgroundColor: c.accent }]}
              activeOpacity={0.7}
              accessibilityLabel="Move left"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={rs(28)} color="#fff" />
            </TouchableOpacity>

            <View style={{ width: DPAD_SIZE }} />

            <TouchableOpacity
              onPress={() => handleDirection('RIGHT')}
              style={[styles.dpadButton, { backgroundColor: c.accent }]}
              activeOpacity={0.7}
              accessibilityLabel="Move right"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-forward" size={rs(28)} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Down */}
          <View style={styles.dpadRow}>
            <TouchableOpacity
              onPress={() => handleDirection('DOWN')}
              style={[styles.dpadButton, { backgroundColor: c.accent }]}
              activeOpacity={0.7}
              accessibilityLabel="Move down"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-down" size={rs(28)} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Game Over Overlay ───────────────────────────────────────────── */}
        {gameOver && (
          <View style={styles.overlay}>
            <View
              style={[
                styles.overlayCard,
                { backgroundColor: c.surface1, borderColor: c.border, borderWidth: 1 },
              ]}
            >
              <Text style={[styles.overlayTitle, { color: c.text }]}>
                Game Over!
              </Text>

              <Text style={[styles.overlayScore, { color: KENTE.gold }]}>
                Score: {score}
              </Text>

              <TouchableOpacity
                onPress={handleNewGame}
                style={[styles.overlayButton, { backgroundColor: '#84cc16' }]}
                accessibilityLabel="Play Again"
                accessibilityRole="button"
              >
                <Text style={styles.overlayButtonText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </GameShell>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gameArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  gridContainer: {
    overflow: 'hidden',
    padding: 0,
  },
  gridRow: {
    flexDirection: 'row',
  },
  hintText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  // ── D-Pad ──────────────────────────────────────────────────────────────────
  dpadContainer: {
    marginTop: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadButton: {
    width: DPAD_SIZE,
    height: DPAD_SIZE,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Overlay ────────────────────────────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  overlayCard: {
    width: '80%',
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  overlayTitle: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  overlayScore: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  overlayButton: {
    width: '100%',
    height: rs(48),
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  overlayButtonText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#fff',
  },
});

export default SnakeScreen;
