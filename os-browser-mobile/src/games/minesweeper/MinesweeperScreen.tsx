import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../store/settings';
import { useGameScoresStore } from '../../store/gameScores';
import { GameShell } from '../GameShell';
import {
  COLORS,
  KENTE,
  FONT_FAMILY,
  FONT_FAMILY_BOLD,
  FONT_SIZE,
  SPACING,
  RADIUS,
  rs,
} from '../../constants/theme';
import {
  type MSDifficulty,
  type MSBoard,
  MS_CONFIGS,
  initBoard,
  generateBoard,
  revealCell,
  toggleFlag,
  checkWin,
  countFlags,
} from './minesweeperLogic';

// ── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = SPACING.sm * 2;
const DIFFICULTIES: MSDifficulty[] = ['Easy', 'Medium', 'Hard'];

const NUMBER_COLORS: Record<number, string> = {
  1: '#3B82F6',
  2: '#22c55e',
  3: '#EF4444',
  4: '#8B5CF6',
  5: '#991b1b',
  6: '#14b8a6',
  7: '#000000',
  8: '#6b7280',
};

// ── Props ────────────────────────────────────────────────────────────────────

interface MinesweeperScreenProps {
  onBack: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MinesweeperScreen({ onBack }: MinesweeperScreenProps) {
  const theme = useSettingsStore((s) => s.theme);
  const c = COLORS[theme];
  const recordGame = useGameScoresStore((s) => s.recordGame);

  // ── State ────────────────────────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState<MSDifficulty>('Easy');
  const [board, setBoard] = useState<MSBoard>(() => initBoard(MS_CONFIGS['Easy']));
  const [boardGenerated, setBoardGenerated] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const [flagCount, setFlagCount] = useState(0);
  const [triggeredCell, setTriggeredCell] = useState<[number, number] | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = MS_CONFIGS[difficulty];

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (boardGenerated && !gameOver && !won) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [boardGenerated, gameOver, won]);

  // ── Cell sizing ──────────────────────────────────────────────────────────
  const cellSize =
    difficulty === 'Easy'
      ? Math.floor((SCREEN_WIDTH - GRID_PADDING) / 9)
      : rs(28);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleNewGame = useCallback(
    (diff?: MSDifficulty) => {
      const d = diff ?? difficulty;
      if (timerRef.current) clearInterval(timerRef.current);
      setDifficulty(d);
      setBoard(initBoard(MS_CONFIGS[d]));
      setBoardGenerated(false);
      setGameOver(false);
      setWon(false);
      setTimer(0);
      setFlagCount(0);
      setTriggeredCell(null);
    },
    [difficulty],
  );

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (gameOver || won) return;

      let currentBoard = board;

      // First tap — generate board with safe zone
      if (!boardGenerated) {
        currentBoard = generateBoard(config, row, col);
        setBoardGenerated(true);
      }

      const { board: newBoard, hitMine } = revealCell(currentBoard, row, col);
      setBoard(newBoard);
      setFlagCount(countFlags(newBoard));

      if (hitMine) {
        setGameOver(true);
        setTriggeredCell([row, col]);
        Vibration.vibrate(200);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      if (checkWin(newBoard)) {
        setWon(true);
        if (timerRef.current) clearInterval(timerRef.current);
        // Record score (negative seconds so higher = better in store)
        recordGame('minesweeper', Math.max(1, 9999 - timer));
      }
    },
    [board, boardGenerated, config, gameOver, won, timer, recordGame],
  );

  const handleCellLongPress = useCallback(
    (row: number, col: number) => {
      if (gameOver || won) return;
      if (board[row][col].revealed) return;

      Vibration.vibrate(50);
      const newBoard = toggleFlag(board, row, col);
      setBoard(newBoard);
      setFlagCount(countFlags(newBoard));
    },
    [board, gameOver, won],
  );

  // ── Format time ──────────────────────────────────────────────────────────
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ── Render cell ──────────────────────────────────────────────────────────
  const renderCell = (row: number, col: number) => {
    const cell = board[row]?.[col];
    if (!cell) return null;

    const isTriggered =
      triggeredCell && triggeredCell[0] === row && triggeredCell[1] === col;

    let bgColor = c.surface2;
    let borderStyle: 'raised' | 'flat' = 'raised';
    let content: React.ReactNode = null;

    if (cell.revealed) {
      borderStyle = 'flat';
      if (cell.mine) {
        bgColor = isTriggered ? '#dc2626' : '#991b1b';
        content = (
          <Ionicons name="skull" size={cellSize * 0.55} color="#fff" />
        );
      } else if (cell.adjacentMines > 0) {
        bgColor = c.surface1;
        const numColor =
          theme === 'light'
            ? NUMBER_COLORS[cell.adjacentMines] ?? c.text
            : NUMBER_COLORS[cell.adjacentMines] ?? c.text;
        content = (
          <Text
            style={[
              styles.cellNumber,
              {
                color: numColor,
                fontSize: cellSize * 0.5,
              },
            ]}
          >
            {cell.adjacentMines}
          </Text>
        );
      } else {
        bgColor = c.surface1;
      }
    } else if (cell.flagged) {
      content = (
        <Ionicons name="flag" size={cellSize * 0.5} color={KENTE.gold} />
      );
    }

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        onPress={() => handleCellPress(row, col)}
        onLongPress={() => handleCellLongPress(row, col)}
        delayLongPress={500}
        activeOpacity={0.7}
        style={[
          styles.cell,
          {
            width: cellSize,
            height: cellSize,
            backgroundColor: bgColor,
            borderColor:
              borderStyle === 'raised' ? c.border : 'transparent',
            borderWidth: borderStyle === 'raised' ? 1.5 : 0.5,
            borderTopColor:
              borderStyle === 'raised'
                ? theme === 'dark'
                  ? '#3d4058'
                  : '#d4cfc5'
                : c.border,
            borderLeftColor:
              borderStyle === 'raised'
                ? theme === 'dark'
                  ? '#3d4058'
                  : '#d4cfc5'
                : c.border,
            borderBottomColor:
              borderStyle === 'raised'
                ? theme === 'dark'
                  ? '#1a1d27'
                  : '#b8b0a0'
                : c.border,
            borderRightColor:
              borderStyle === 'raised'
                ? theme === 'dark'
                  ? '#1a1d27'
                  : '#b8b0a0'
                : c.border,
          },
        ]}
      >
        {content}
      </TouchableOpacity>
    );
  };

  // ── Grid needs scroll? ───────────────────────────────────────────────────
  const needsScroll = difficulty !== 'Easy';
  const gridWidth = config.cols * cellSize;
  const gridHeight = config.rows * cellSize;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <GameShell
      title="Minesweeper"
      emoji={'\uD83D\uDCA3'}
      gameId="minesweeper"
      score={flagCount}
      accentColor="#64748b"
      onBack={onBack}
      onNewGame={() => handleNewGame()}
    >
      {/* ── Info bar ──────────────────────────────────────────────────────── */}
      <View style={[styles.infoBar, { backgroundColor: c.surface1, borderBottomColor: c.border }]}>
        <View style={styles.infoItem}>
          <Ionicons name="flag" size={rs(16)} color={KENTE.gold} />
          <Text style={[styles.infoText, { color: c.text }]}>
            {flagCount}/{config.mines}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={rs(16)} color={c.textMuted} />
          <Text style={[styles.infoText, { color: c.text }]}>
            {formatTime(timer)}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: c.textMuted }]}>
            {difficulty}
          </Text>
        </View>
      </View>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <View style={styles.gridContainer}>
        {needsScroll ? (
          <ScrollView
            horizontal
            contentContainerStyle={{ minWidth: gridWidth }}
          >
            <ScrollView
              contentContainerStyle={{
                minHeight: gridHeight,
                paddingBottom: SPACING.md,
              }}
            >
              <View style={[styles.grid, { alignSelf: 'center' }]}>
                {board.map((row, rIdx) => (
                  <View key={rIdx} style={styles.row}>
                    {row.map((_, cIdx) => renderCell(rIdx, cIdx))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        ) : (
          <View style={[styles.grid, { alignSelf: 'center' }]}>
            {board.map((row, rIdx) => (
              <View key={rIdx} style={styles.row}>
                {row.map((_, cIdx) => renderCell(rIdx, cIdx))}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Difficulty selector ───────────────────────────────────────────── */}
      <View
        style={[
          styles.difficultyBar,
          { backgroundColor: c.surface1, borderTopColor: c.border },
        ]}
      >
        {DIFFICULTIES.map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => handleNewGame(d)}
            style={[
              styles.difficultyButton,
              {
                backgroundColor:
                  d === difficulty ? '#64748b' : 'transparent',
                borderColor: d === difficulty ? '#64748b' : c.border,
              },
            ]}
          >
            <Text
              style={[
                styles.difficultyText,
                {
                  color: d === difficulty ? '#fff' : c.textMuted,
                },
              ]}
            >
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Game Over / Win Overlay ───────────────────────────────────────── */}
      {(gameOver || won) && (
        <View style={styles.overlay}>
          <View
            style={[
              styles.overlayCard,
              {
                backgroundColor: c.surface1,
                borderColor: won ? KENTE.green : KENTE.red,
              },
            ]}
          >
            <Text style={[styles.overlayEmoji]}>
              {won ? '\uD83C\uDF89' : '\uD83D\uDCA5'}
            </Text>
            <Text
              style={[
                styles.overlayTitle,
                { color: won ? KENTE.green : KENTE.red },
              ]}
            >
              {won ? 'You Won!' : 'Game Over'}
            </Text>
            <Text style={[styles.overlayInfo, { color: c.textMuted }]}>
              Time: {formatTime(timer)}
            </Text>
            <Text style={[styles.overlayInfo, { color: c.textMuted }]}>
              Flags used: {flagCount}
            </Text>
            <Text style={[styles.overlayInfo, { color: c.textMuted }]}>
              Difficulty: {difficulty}
            </Text>
            <TouchableOpacity
              onPress={() => handleNewGame()}
              style={[
                styles.overlayButton,
                { backgroundColor: won ? KENTE.green : '#64748b' },
              ]}
            >
              <Ionicons
                name="refresh"
                size={rs(18)}
                color="#fff"
                style={{ marginRight: SPACING.xs }}
              />
              <Text style={styles.overlayButtonText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </GameShell>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  infoLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE.sm,
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  grid: {
    // rows are children
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellNumber: {
    fontFamily: FONT_FAMILY_BOLD,
    fontWeight: '700',
    textAlign: 'center',
  },
  difficultyBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  difficultyButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    minWidth: rs(80),
    alignItems: 'center',
  },
  difficultyText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayCard: {
    width: rs(280),
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  overlayEmoji: {
    fontSize: rs(48),
  },
  overlayTitle: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
  },
  overlayInfo: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE.md,
  },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  overlayButtonText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: '#fff',
  },
});
