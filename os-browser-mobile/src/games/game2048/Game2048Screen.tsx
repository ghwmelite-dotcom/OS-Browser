import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  TouchableOpacity,
} from 'react-native';
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
  initGame,
  move,
  type Grid,
  type Direction,
  type TileData,
} from './game2048Logic';

// ── Types ────────────────────────────────────────────────────────────────────

interface Game2048ScreenProps {
  onBack: () => void;
}

// ── Tile Colors ──────────────────────────────────────────────────────────────

const TILE_COLORS: Record<number, string> = {
  0: 'transparent',
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#D4A017',
};

function getTileColor(value: number): string {
  return TILE_COLORS[value] ?? '#3c3a32';
}

function getTileTextColor(value: number): string {
  return value <= 4 ? '#776e65' : '#ffffff';
}

function getTileFontSize(value: number): number {
  if (value >= 1024) return rs(22);
  if (value >= 128) return rs(26);
  return rs(30);
}

// ── Animated Tile ────────────────────────────────────────────────────────────

interface AnimatedTileProps {
  tile: TileData;
  cellSize: number;
  gap: number;
}

function AnimatedTile({ tile, cellSize, gap }: AnimatedTileProps) {
  const scaleAnim = useRef(new Animated.Value(tile.isNew ? 0 : 1)).current;

  useEffect(() => {
    if (tile.isNew) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else if (tile.merged) {
      // Pop effect for merged tiles
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [tile.isNew, tile.merged, scaleAnim]);

  const left = tile.col * (cellSize + gap);
  const top = tile.row * (cellSize + gap);

  return (
    <Animated.View
      style={[
        styles.tile,
        {
          width: cellSize,
          height: cellSize,
          borderRadius: RADIUS.sm,
          backgroundColor: getTileColor(tile.value),
          left,
          top,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text
        style={[
          styles.tileText,
          {
            color: getTileTextColor(tile.value),
            fontSize: getTileFontSize(tile.value),
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {tile.value}
      </Text>
    </Animated.View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export function Game2048Screen({ onBack }: Game2048ScreenProps) {
  const theme = useSettingsStore((s) => s.theme);
  const c = COLORS[theme];
  const recordGame = useGameScoresStore((s) => s.recordGame);
  const bestScore = useGameScoresStore((s) => s.getStats('2048').bestScore);

  // ── State ──────────────────────────────────────────────────────────────────
  const [grid, setGrid] = useState<Grid>(() => initGame().grid);
  const [tiles, setTiles] = useState<TileData[]>(() => {
    const init = initGame();
    return init.tiles;
  });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // Undo state (single level)
  const [prevState, setPrevState] = useState<{
    grid: Grid;
    tiles: TileData[];
    score: number;
  } | null>(null);

  // Initialize properly on mount
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const init = initGame();
      setGrid(init.grid);
      setTiles(init.tiles);
      setScore(0);
      setGameOver(false);
      setWon(false);
      setKeepPlaying(false);
      setShowOverlay(false);
      setPrevState(null);
    }
  }, []);

  // ── Grid sizing ────────────────────────────────────────────────────────────
  const screenWidth = Dimensions.get('window').width;
  const gridPadding = SPACING.md * 2;
  const gap = rs(6);
  const totalGap = gap * 3; // 3 gaps between 4 cells
  const gridSize = screenWidth - gridPadding;
  const cellSize = (gridSize - totalGap) / 4;

  // ── Handle move ────────────────────────────────────────────────────────────
  const handleMove = useCallback(
    (direction: Direction) => {
      if (gameOver || (won && !keepPlaying)) return;

      // Save state for undo
      setPrevState({ grid, tiles, score });

      const result = move(grid, direction, score);
      if (!result.moved) return;

      setGrid(result.grid);
      setTiles(result.tiles);
      setScore(result.score);

      if (result.gameOver) {
        setGameOver(true);
        setShowOverlay(true);
        recordGame('2048', result.score);
      } else if (result.won && !keepPlaying) {
        setWon(true);
        setShowOverlay(true);
        recordGame('2048', result.score);
      }
    },
    [grid, tiles, score, gameOver, won, keepPlaying, recordGame],
  );

  // ── Swipe gesture ──────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        const threshold = 30;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx < threshold && absDy < threshold) return;

        let direction: Direction;
        if (absDx > absDy) {
          direction = dx < -threshold ? 'left' : 'right';
        } else {
          direction = dy < -threshold ? 'up' : 'down';
        }

        handleMove(direction);
      },
    }),
  ).current;

  // Recreate PanResponder when handleMove changes
  const panResponderRef = useRef(panResponder);
  useEffect(() => {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        const threshold = 30;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx < threshold && absDy < threshold) return;

        let direction: Direction;
        if (absDx > absDy) {
          direction = dx < -threshold ? 'left' : 'right';
        } else {
          direction = dy < -threshold ? 'up' : 'down';
        }

        handleMove(direction);
      },
    });
  }, [handleMove]);

  // ── New game ───────────────────────────────────────────────────────────────
  const handleNewGame = useCallback(() => {
    const init = initGame();
    setGrid(init.grid);
    setTiles(init.tiles);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
    setShowOverlay(false);
    setPrevState(null);
  }, []);

  // ── Undo ───────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (!prevState) return;
    setGrid(prevState.grid);
    setTiles(prevState.tiles);
    setScore(prevState.score);
    setGameOver(false);
    setWon(false);
    setShowOverlay(false);
    setPrevState(null);
  }, [prevState]);

  // ── Keep playing after win ─────────────────────────────────────────────────
  const handleKeepPlaying = useCallback(() => {
    setKeepPlaying(true);
    setShowOverlay(false);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <GameShell
      title="2048"
      emoji="🧮"
      gameId="2048"
      score={score}
      accentColor="#F97316"
      onBack={onBack}
      onNewGame={handleNewGame}
      showUndo={true}
      onUndo={handleUndo}
    >
      <View style={[styles.gameArea, { backgroundColor: c.bg }]}>
        {/* Grid */}
        <View
          {...panResponderRef.current.panHandlers}
          style={[
            styles.gridContainer,
            {
              width: gridSize,
              height: gridSize,
              backgroundColor: c.surface2,
              borderRadius: RADIUS.md,
              padding: 0,
            },
          ]}
        >
          {/* Empty cells (background grid) */}
          {Array.from({ length: 16 }).map((_, i) => {
            const row = Math.floor(i / 4);
            const col = i % 4;
            return (
              <View
                key={`empty-${row}-${col}`}
                style={[
                  styles.emptyCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    borderRadius: RADIUS.sm,
                    backgroundColor: theme === 'dark' ? '#2d3044' : '#cdc1b4',
                    borderWidth: 1,
                    borderColor: theme === 'dark' ? '#3a3d52' : '#bbada0',
                    left: col * (cellSize + gap),
                    top: row * (cellSize + gap),
                  },
                ]}
              />
            );
          })}

          {/* Tiles */}
          {tiles.map((tile) => (
            <AnimatedTile
              key={tile.id}
              tile={tile}
              cellSize={cellSize}
              gap={gap}
            />
          ))}
        </View>

        {/* Overlay */}
        {showOverlay && (
          <View style={styles.overlay}>
            <View
              style={[
                styles.overlayCard,
                {
                  backgroundColor: c.surface1,
                  borderColor: won && !gameOver ? KENTE.gold : c.border,
                  borderWidth: won && !gameOver ? 2 : 1,
                },
              ]}
            >
              {/* Title */}
              <Text
                style={[
                  styles.overlayTitle,
                  {
                    color: won && !gameOver ? KENTE.gold : c.text,
                  },
                ]}
              >
                {gameOver ? 'Game Over' : 'You reached 2048!'}
              </Text>

              {/* Score display */}
              <Text style={[styles.overlayScore, { color: c.text }]}>
                Score: {score}
              </Text>
              {bestScore > 0 && (
                <Text style={[styles.overlayBest, { color: c.textMuted }]}>
                  Best: {Math.max(bestScore, score)}
                </Text>
              )}

              {/* Buttons */}
              <View style={styles.overlayButtons}>
                <TouchableOpacity
                  onPress={handleNewGame}
                  style={[styles.overlayButton, { backgroundColor: '#F97316' }]}
                  accessibilityLabel="New Game"
                  accessibilityRole="button"
                >
                  <Text style={styles.overlayButtonText}>New Game</Text>
                </TouchableOpacity>

                {won && !gameOver && (
                  <TouchableOpacity
                    onPress={handleKeepPlaying}
                    style={[
                      styles.overlayButton,
                      {
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderColor: KENTE.gold,
                      },
                    ]}
                    accessibilityLabel="Keep Playing"
                    accessibilityRole="button"
                  >
                    <Text
                      style={[styles.overlayButtonText, { color: KENTE.gold }]}
                    >
                      Keep Playing
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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
  },
  gridContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  emptyCell: {
    position: 'absolute',
  },
  tile: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tileText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontWeight: '800',
    textAlign: 'center',
  },
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
  overlayBest: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
  overlayButtons: {
    width: '100%',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  overlayButton: {
    height: rs(48),
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayButtonText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#fff',
  },
});

export default Game2048Screen;
