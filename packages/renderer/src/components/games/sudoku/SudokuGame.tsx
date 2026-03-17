import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameShell } from '../GameShell';
import { gameSounds } from '../GameSoundEngine';
import {
  type Difficulty,
  type Board,
  generatePuzzle,
  createBoard,
  cloneBoard,
  findConflicts,
  isBoardComplete,
  getHint,
} from './sudokuLogic';

// ── Constants ───────────────────────────────────────────────────────
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

// ── Component ───────────────────────────────────────────────────────
export const SudokuGame: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [board, setBoard] = useState<Board>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── New Game ────────────────────────────────────────────────────
  const startNewGame = useCallback((diff: Difficulty) => {
    const { puzzle, solution: sol } = generatePuzzle(diff);
    setBoard(createBoard(puzzle));
    setSolution(sol);
    setSelected(null);
    setNotesMode(false);
    setMistakes(0);
    setHintsUsed(0);
    setTimer(0);
    setGameWon(false);
    setShowErrors(false);
  }, []);

  useEffect(() => {
    startNewGame(difficulty);
  }, []);

  // Timer
  useEffect(() => {
    if (gameWon) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameWon]);

  // ── Cell Input ──────────────────────────────────────────────────
  const handleCellInput = useCallback(
    (num: number) => {
      if (!selected || gameWon) return;
      const [r, c] = selected;
      if (board[r][c].given) {
        gameSounds.error();
        return;
      }

      const newBoard = cloneBoard(board);

      if (notesMode) {
        if (num === 0) {
          newBoard[r][c].notes.clear();
        } else {
          const notes = newBoard[r][c].notes;
          if (notes.has(num)) notes.delete(num);
          else notes.add(num);
        }
        newBoard[r][c].value = 0;
        gameSounds.type();
      } else {
        if (num === 0) {
          newBoard[r][c].value = 0;
          newBoard[r][c].notes.clear();
        } else {
          newBoard[r][c].value = num;
          newBoard[r][c].notes.clear();

          // Check against solution
          if (num !== solution[r][c]) {
            setMistakes((m) => m + 1);
            gameSounds.error();
          } else {
            gameSounds.move();
          }
        }
      }

      const checked = findConflicts(newBoard);
      setBoard(checked);

      if (isBoardComplete(checked)) {
        setGameWon(true);
        gameSounds.win();
      }
    },
    [selected, board, notesMode, solution, gameWon],
  );

  // ── Keyboard ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return; // handled by GameShell

      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleCellInput(parseInt(e.key, 10));
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleCellInput(0);
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        setNotesMode((n) => !n);
        return;
      }

      // Arrow navigation
      if (selected) {
        const [r, c] = selected;
        let nr = r;
        let nc = c;
        switch (e.key) {
          case 'ArrowUp': nr = Math.max(0, r - 1); break;
          case 'ArrowDown': nr = Math.min(8, r + 1); break;
          case 'ArrowLeft': nc = Math.max(0, c - 1); break;
          case 'ArrowRight': nc = Math.min(8, c + 1); break;
          default: return;
        }
        e.preventDefault();
        setSelected([nr, nc]);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, handleCellInput]);

  // ── Hint ────────────────────────────────────────────────────────
  const handleHint = useCallback(() => {
    if (hintsUsed >= 3 || gameWon) return;
    const hint = getHint(board, solution);
    if (!hint) return;
    const [r, c, val] = hint;
    const newBoard = cloneBoard(board);
    newBoard[r][c].value = val;
    newBoard[r][c].notes.clear();
    setBoard(findConflicts(newBoard));
    setHintsUsed((h) => h + 1);
    setSelected([r, c]);
    gameSounds.score();

    if (isBoardComplete(findConflicts(newBoard))) {
      setGameWon(true);
      gameSounds.win();
    }
  }, [board, solution, hintsUsed, gameWon]);

  // ── Check Errors ────────────────────────────────────────────────
  const handleCheck = useCallback(() => {
    setShowErrors(true);
    const checked = findConflicts(cloneBoard(board));

    // Also highlight cells that differ from solution
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!checked[r][c].given && checked[r][c].value !== 0 && checked[r][c].value !== solution[r][c]) {
          checked[r][c].conflict = true;
        }
      }
    }
    setBoard(checked);
    gameSounds.tick();
    setTimeout(() => setShowErrors(false), 3000);
  }, [board, solution]);

  // ── Format Timer ────────────────────────────────────────────────
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Difficulty Change ───────────────────────────────────────────
  const handleDifficultyChange = useCallback(
    (d: string) => {
      const diff = d as Difficulty;
      setDifficulty(diff);
      startNewGame(diff);
    },
    [startNewGame],
  );

  // ── Render ──────────────────────────────────────────────────────
  if (board.length === 0) return null;

  const boardStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 1fr)',
    gridTemplateRows: 'repeat(9, 1fr)',
    width: 'min(100%, min(90vh - 200px, 560px))',
    minWidth: 280,
    maxWidth: 560,
    aspectRatio: '1',
    border: '3px solid #FCD116',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#2C2318',
    userSelect: 'none',
  };

  return (
    <GameShell
      gameId="sudoku"
      gameName="Sudoku"
      score={0}
      onNewGame={() => startNewGame(difficulty)}
      hasDifficulty
      difficulty={difficulty}
      onDifficultyChange={handleDifficultyChange}
      difficulties={DIFFICULTIES}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', padding: '0 8px' }}>
        {/* Status Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: 'min(100%, 560px)',
          fontSize: 'clamp(11px, 2.5vw, 14px)',
          color: '#FAF6EE',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <span>Time: {formatTime(timer)}</span>
          <span>Mistakes: {mistakes}</span>
          <span>Hints: {3 - hintsUsed} left</span>
        </div>

        {/* Board */}
        <div style={boardStyle}>
          {board.flatMap((row, r) =>
            row.map((cell, c) => {
              const isSelected = selected && selected[0] === r && selected[1] === c;
              const isSameRow = selected && selected[0] === r;
              const isSameCol = selected && selected[1] === c;
              const isSameBox =
                selected &&
                Math.floor(selected[0] / 3) === Math.floor(r / 3) &&
                Math.floor(selected[1] / 3) === Math.floor(c / 3);
              const isSameValue =
                selected &&
                cell.value !== 0 &&
                board[selected[0]][selected[1]].value === cell.value;

              let bg = '#1A1D27';
              if (isSameRow || isSameCol || isSameBox) bg = 'rgba(252,209,22,0.06)';
              if (isSameValue) bg = 'rgba(252,209,22,0.12)';
              if (isSelected) bg = 'rgba(252,209,22,0.25)';
              if (cell.conflict && showErrors) bg = 'rgba(206,17,38,0.25)';

              // Subgrid borders
              const borderRight = (c + 1) % 3 === 0 && c < 8 ? '2px solid #FCD116' : '1px solid rgba(250,246,238,0.12)';
              const borderBottom = (r + 1) % 3 === 0 && r < 8 ? '2px solid #FCD116' : '1px solid rgba(250,246,238,0.12)';

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => setSelected([r, c])}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: bg,
                    borderRight,
                    borderBottom,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.15s ease',
                    aspectRatio: '1',
                  }}
                >
                  {cell.value !== 0 ? (
                    <span
                      style={{
                        fontSize: 'clamp(14px, 3.5vw, 24px)',
                        fontWeight: cell.given ? 600 : 400,
                        color: cell.conflict && showErrors
                          ? '#CE1126'
                          : cell.given
                            ? '#FAF6EE'
                            : '#5B9BD5',
                        lineHeight: 1,
                      }}
                    >
                      {cell.value}
                    </span>
                  ) : cell.notes.size > 0 ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gridTemplateRows: 'repeat(3, 1fr)',
                        width: '85%',
                        height: '85%',
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span
                          key={n}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'clamp(6px, 1.2vw, 9px)',
                            color: cell.notes.has(n) ? 'rgba(250,246,238,0.65)' : 'transparent',
                            lineHeight: 1,
                          }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }),
          )}
        </div>

        {/* Number Pad */}
        <div style={{
          display: 'flex',
          gap: 'clamp(3px, 0.8vw, 6px)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handleCellInput(n)}
              style={{
                width: 'clamp(32px, 7vw, 44px)',
                height: 'clamp(32px, 7vw, 44px)',
                borderRadius: 8,
                border: '1px solid rgba(252,209,22,0.3)',
                background: 'rgba(252,209,22,0.08)',
                color: '#FCD116',
                fontSize: 'clamp(14px, 3vw, 20px)',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {([
            { label: notesMode ? 'Notes ON' : 'Notes OFF', action: () => setNotesMode(!notesMode) },
            { label: 'Erase', action: () => handleCellInput(0) },
            { label: `Hint (${3 - hintsUsed})`, action: handleHint },
            { label: 'Check', action: handleCheck },
          ] as const).map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid rgba(252,209,22,0.3)',
                background: label.startsWith('Notes ON')
                  ? 'rgba(252,209,22,0.2)'
                  : 'rgba(252,209,22,0.08)',
                color: '#FCD116',
                fontSize: 'clamp(10px, 2vw, 13px)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Win Overlay */}
        {gameWon && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.7)',
              zIndex: 100,
            }}
          >
            <div
              style={{
                background: '#2C2318',
                border: '2px solid #FCD116',
                borderRadius: 16,
                padding: '32px 40px',
                textAlign: 'center',
                color: '#FAF6EE',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: '#FCD116', marginBottom: 8 }}>
                Puzzle Complete!
              </div>
              <div style={{ fontSize: 16, marginBottom: 4 }}>
                Time: {formatTime(timer)}
              </div>
              <div style={{ fontSize: 14, color: 'rgba(250,246,238,0.6)', marginBottom: 16 }}>
                Mistakes: {mistakes} | Hints used: {hintsUsed}
              </div>
              <button
                onClick={() => startNewGame(difficulty)}
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

export default SudokuGame;
