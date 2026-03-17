import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameShell } from '../GameShell';
import { gameSounds } from '../GameSoundEngine';
import {
  type MSDifficulty,
  type MSBoard,
  type MSConfig,
  MS_CONFIGS,
  initBoard,
  generateBoard,
  revealCell,
  toggleFlag,
  checkWin,
  countFlags,
  revealAll,
} from './minesweeperLogic';

// ── Constants ───────────────────────────────────────────────────────
const DIFFICULTIES: MSDifficulty[] = ['Easy', 'Medium', 'Hard'];

const NUMBER_COLORS: Record<number, string> = {
  1: '#3B82F6', // blue
  2: '#22C55E', // green
  3: '#EF4444', // red
  4: '#7C3AED', // purple
  5: '#DC2626', // dark red
  6: '#0EA5E9', // teal
  7: '#1A1D27', // black (will show on revealed bg)
  8: '#6B7280', // gray
};

type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

// ── Component ───────────────────────────────────────────────────────
export const MinesweeperGame: React.FC = () => {
  const [difficulty, setDifficulty] = useState<MSDifficulty>('Easy');
  const [config, setConfig] = useState<MSConfig>(MS_CONFIGS.Easy);
  const [board, setBoard] = useState<MSBoard>([]);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [timer, setTimer] = useState(0);
  const [firstClick, setFirstClick] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Init ────────────────────────────────────────────────────────
  const startNewGame = useCallback((diff?: MSDifficulty) => {
    const d = diff ?? difficulty;
    const cfg = MS_CONFIGS[d];
    setConfig(cfg);
    setBoard(initBoard(cfg));
    setStatus('idle');
    setTimer(0);
    setFirstClick(true);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [difficulty]);

  useEffect(() => {
    startNewGame();
  }, []);

  // Timer
  useEffect(() => {
    if (status === 'playing') {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // ── Reveal ──────────────────────────────────────────────────────
  const handleReveal = useCallback(
    (row: number, col: number) => {
      if (status === 'won' || status === 'lost') return;

      let currentBoard = board;

      // First click — generate mines avoiding this cell
      if (firstClick) {
        currentBoard = generateBoard(config, row, col);
        setFirstClick(false);
        setStatus('playing');
      }

      if (currentBoard[row][col].flagged || currentBoard[row][col].revealed) return;

      const { board: newBoard, hitMine } = revealCell(currentBoard, row, col);
      setBoard(newBoard);

      if (hitMine) {
        setStatus('lost');
        setBoard(revealAll(newBoard));
        gameSounds.lose();
        return;
      }

      gameSounds.move();

      if (checkWin(newBoard)) {
        setStatus('won');
        gameSounds.win();
      }
    },
    [board, status, firstClick, config],
  );

  // ── Flag ────────────────────────────────────────────────────────
  const handleFlag = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      e.preventDefault();
      if (status === 'won' || status === 'lost') return;
      if (board[row][col].revealed) return;

      const newBoard = toggleFlag(board, row, col);
      setBoard(newBoard);
      gameSounds.tick();
    },
    [board, status],
  );

  // ── Difficulty ──────────────────────────────────────────────────
  const handleDifficultyChange = useCallback(
    (d: string) => {
      const diff = d as MSDifficulty;
      setDifficulty(diff);
      startNewGame(diff);
    },
    [startNewGame],
  );

  // ── Smiley ──────────────────────────────────────────────────────
  const smiley = status === 'won' ? '\uD83D\uDE0E' : status === 'lost' ? '\uD83D\uDC80' : '\uD83D\uDE0A';

  // ── LED Display ─────────────────────────────────────────────────
  const ledStyle: React.CSSProperties = {
    fontFamily: '"Courier New", monospace',
    fontSize: 'clamp(16px, 3.5vw, 24px)',
    fontWeight: 700,
    color: '#CE1126',
    background: '#1A0A0A',
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px inset rgba(206,17,38,0.3)',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 'clamp(40px, 8vw, 60px)',
    textAlign: 'center' as const,
  };

  const minesRemaining = config.mines - countFlags(board);

  // ── Cell sizing ─────────────────────────────────────────────────
  const cellSize = `clamp(18px, min(calc((90vw - ${config.cols + 1} * 2px) / ${config.cols}), calc((70vh - 180px) / ${config.rows})), 32px)`;

  return (
    <GameShell
      gameId="minesweeper"
      gameName="Minesweeper"
      score={0}
      onNewGame={() => startNewGame()}
      hasDifficulty
      difficulty={difficulty}
      onDifficultyChange={handleDifficultyChange}
      difficulties={DIFFICULTIES}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '0 4px',
      }}>
        {/* Header: mine count, smiley, timer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: `calc(${cellSize} * ${config.cols} + ${config.cols + 1} * 2px)`,
          maxWidth: '100%',
          padding: '4px 0',
        }}>
          <div style={ledStyle}>
            {String(Math.max(0, minesRemaining)).padStart(3, '0')}
          </div>
          <button
            onClick={() => startNewGame()}
            style={{
              fontSize: 'clamp(20px, 4vw, 28px)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            {smiley}
          </button>
          <div style={ledStyle}>
            {String(Math.min(timer, 999)).padStart(3, '0')}
          </div>
        </div>

        {/* Board */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${config.cols}, ${cellSize})`,
            gridTemplateRows: `repeat(${config.rows}, ${cellSize})`,
            gap: 1,
            background: '#555',
            border: '2px solid #777',
            borderRadius: 4,
            overflow: 'auto',
            maxWidth: '100%',
            maxHeight: 'calc(80vh - 180px)',
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {board.flatMap((row, r) =>
            row.map((cell, c) => {
              const unrevealed = !cell.revealed;
              const isFlag = cell.flagged;

              // Unrevealed cell: raised button look
              const cellStyle: React.CSSProperties = unrevealed
                ? {
                    width: cellSize,
                    height: cellSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#C0C0C0',
                    borderTop: '2px solid #FFF',
                    borderLeft: '2px solid #FFF',
                    borderBottom: '2px solid #808080',
                    borderRight: '2px solid #808080',
                    cursor: 'pointer',
                    fontSize: 'clamp(10px, 2vw, 16px)',
                    userSelect: 'none',
                  }
                : {
                    width: cellSize,
                    height: cellSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: cell.mine ? '#FF6B6B' : '#D0D0D0',
                    border: '1px solid #B0B0B0',
                    fontSize: 'clamp(10px, 2vw, 16px)',
                    fontWeight: 700,
                    color: NUMBER_COLORS[cell.adjacentMines] ?? '#1A1D27',
                    userSelect: 'none',
                  };

              // Mine CSS shape
              const mineContent = cell.mine && cell.revealed ? (
                <div style={{
                  width: '60%',
                  height: '60%',
                  borderRadius: '50%',
                  background: '#1A1D27',
                  position: 'relative',
                  boxShadow: `
                    0 -45% 0 0 #1A1D27,
                    0 45% 0 0 #1A1D27,
                    -45% 0 0 0 #1A1D27,
                    45% 0 0 0 #1A1D27
                  `.replace(/%/g, '% 0'),
                }}>
                  {/* Cross spikes */}
                  <div style={{
                    position: 'absolute',
                    inset: '35%',
                    background: '#1A1D27',
                    transform: 'rotate(45deg) scale(2.5, 0.3)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    inset: '35%',
                    background: '#1A1D27',
                    transform: 'rotate(-45deg) scale(2.5, 0.3)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    inset: '35%',
                    background: '#1A1D27',
                    transform: 'scale(2.5, 0.3)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    inset: '35%',
                    background: '#1A1D27',
                    transform: 'scale(0.3, 2.5)',
                  }} />
                  {/* Highlight */}
                  <div style={{
                    position: 'absolute',
                    width: '25%',
                    height: '25%',
                    borderRadius: '50%',
                    background: 'white',
                    top: '20%',
                    left: '20%',
                  }} />
                </div>
              ) : null;

              return (
                <div
                  key={`${r}-${c}`}
                  style={cellStyle}
                  onClick={() => handleReveal(r, c)}
                  onContextMenu={(e) => handleFlag(e, r, c)}
                >
                  {unrevealed && isFlag && '\uD83D\uDEA9'}
                  {cell.revealed && cell.mine && mineContent}
                  {cell.revealed && !cell.mine && cell.adjacentMines > 0 && cell.adjacentMines}
                </div>
              );
            }),
          )}
        </div>

        {/* Status text */}
        <div style={{
          fontSize: 'clamp(10px, 2vw, 13px)',
          color: 'rgba(250,246,238,0.4)',
          textAlign: 'center',
        }}>
          Left-click to reveal. Right-click to flag.
        </div>

        {/* Win/Lose Overlay */}
        {(status === 'won' || status === 'lost') && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.65)',
              zIndex: 100,
            }}
          >
            <div
              style={{
                background: '#2C2318',
                border: `2px solid ${status === 'won' ? '#FCD116' : '#CE1126'}`,
                borderRadius: 16,
                padding: '32px 40px',
                textAlign: 'center',
                color: '#FAF6EE',
              }}
            >
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: status === 'won' ? '#FCD116' : '#CE1126',
                marginBottom: 8,
              }}>
                {status === 'won' ? 'You Win!' : 'Game Over'}
              </div>
              <div style={{ fontSize: 16, marginBottom: 16 }}>
                Time: {timer}s | {difficulty}
              </div>
              <button
                onClick={() => startNewGame()}
                style={{
                  padding: '10px 28px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#FCD116',
                  color: '#1A1D27',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
};

export default MinesweeperGame;
