import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameShell } from '../GameShell';
import { gameSounds } from '../GameSoundEngine';
import { type Direction, type Grid, type TileData, initGame, move } from './game2048Logic';

// ── Tile Colors ─────────────────────────────────────────────────────
const TILE_COLORS: Record<number, { bg: string; fg: string; glow?: string }> = {
  2:    { bg: '#F5F0E3', fg: '#776E65' },
  4:    { bg: '#EDE0C8', fg: '#776E65' },
  8:    { bg: '#F2B179', fg: '#FFFFFF' },
  16:   { bg: '#F59563', fg: '#FFFFFF' },
  32:   { bg: '#F67C5F', fg: '#FFFFFF' },
  64:   { bg: '#F65E3B', fg: '#FFFFFF' },
  128:  { bg: '#EDCF72', fg: '#FFFFFF', glow: '0 0 12px rgba(237,207,114,0.4)' },
  256:  { bg: '#EDCC61', fg: '#FFFFFF', glow: '0 0 16px rgba(237,204,97,0.5)' },
  512:  { bg: '#EDC850', fg: '#FFFFFF', glow: '0 0 20px rgba(237,200,80,0.5)' },
  1024: { bg: '#EDC53F', fg: '#FFFFFF', glow: '0 0 24px rgba(237,197,63,0.6)' },
  2048: { bg: '#EDC22E', fg: '#FFFFFF', glow: '0 0 30px rgba(237,194,46,0.7)' },
};

function getTileStyle(value: number): { bg: string; fg: string; glow?: string } {
  if (TILE_COLORS[value]) return TILE_COLORS[value];
  if (value > 2048) return { bg: '#3C3A32', fg: '#F9D44C', glow: '0 0 30px rgba(249,212,76,0.6)' };
  return { bg: '#CDC1B4', fg: '#776E65' };
}

// ── CSS Keyframes (injected once) ───────────────────────────────────
const STYLE_ID = 'game2048-animations';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes tile2048-pop {
      0% { transform: scale(0); }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    @keyframes tile2048-merge {
      0% { transform: scale(1); }
      40% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// ── Component ───────────────────────────────────────────────────────
export const Game2048: React.FC = () => {
  const [grid, setGrid] = useState<Grid>([]);
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [wonAcknowledged, setWonAcknowledged] = useState(false);
  const [prevState, setPrevState] = useState<{ grid: Grid; score: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    injectStyles();
    startNewGame();
  }, []);

  const startNewGame = useCallback(() => {
    const state = initGame();
    setGrid(state.grid);
    setTiles(state.tiles);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setWonAcknowledged(false);
    setPrevState(null);
  }, []);

  const handleMove = useCallback(
    (dir: Direction) => {
      if (animatingRef.current || gameOver) return;
      if (won && !wonAcknowledged) return;

      setPrevState({ grid: grid.map((r) => [...r]), score });
      animatingRef.current = true;

      const result = move(grid, dir, score);

      if (!result.moved) {
        animatingRef.current = false;
        return;
      }

      setGrid(result.grid);
      setTiles(result.tiles);
      setScore(result.score);

      if (result.score > score) gameSounds.score();
      else gameSounds.move();

      if (result.won && !won) {
        setWon(true);
        gameSounds.win();
      }
      if (result.gameOver) {
        setGameOver(true);
        gameSounds.lose();
      }

      // Allow next move after animation
      setTimeout(() => {
        animatingRef.current = false;
      }, 160);
    },
    [grid, score, gameOver, won, wonAcknowledged],
  );

  const handleUndo = useCallback(() => {
    if (!prevState) return;
    setGrid(prevState.grid);
    setScore(prevState.score);
    setGameOver(false);
    // Rebuild tiles from grid
    const newTiles: TileData[] = [];
    let id = 9000;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (prevState.grid[r][c] !== 0) {
          newTiles.push({
            id: id++,
            value: prevState.grid[r][c],
            row: r,
            col: c,
            prevRow: r,
            prevCol: c,
            merged: false,
            isNew: false,
          });
        }
      }
    }
    setTiles(newTiles);
    setPrevState(null);
  }, [prevState]);

  // ── Keyboard Controls ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return;
      const dirMap: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', W: 'up', s: 'down', S: 'down',
        a: 'left', A: 'left', d: 'right', D: 'right',
      };
      const dir = dirMap[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMove]);

  // ── Touch/Swipe Controls ────────────────────────────────────────
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 30) return;

      if (absDx > absDy) {
        handleMove(dx > 0 ? 'right' : 'left');
      } else {
        handleMove(dy > 0 ? 'down' : 'up');
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleMove]);

  // ── Board Render ────────────────────────────────────────────────
  const gap = 'clamp(4px, 1.2vw, 10px)';

  const boardStyle: React.CSSProperties = {
    position: 'relative',
    width: 'min(100%, min(80vh - 200px, 480px))',
    minWidth: 240,
    maxWidth: 480,
    aspectRatio: '1',
    background: '#BBADA0',
    borderRadius: 'clamp(8px, 1.5vw, 12px)',
    padding: gap,
    display: 'grid',
    gridTemplateColumns: `repeat(4, 1fr)`,
    gridTemplateRows: `repeat(4, 1fr)`,
    gap,
    touchAction: 'none',
  };

  const cellBg: React.CSSProperties = {
    background: 'rgba(238,228,218,0.35)',
    borderRadius: 'clamp(4px, 1vw, 8px)',
  };

  return (
    <GameShell
      gameId="2048"
      gameName="2048"
      score={score}
      onNewGame={startNewGame}
      hasUndo={!!prevState}
      onUndo={handleUndo}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', padding: '0 8px' }}>
        {/* Board */}
        <div ref={boardRef} style={boardStyle}>
          {/* Background cells */}
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={`bg-${i}`} style={cellBg} />
          ))}

          {/* Tiles layer (absolute positioned over the grid) */}
          {tiles.map((tile) => {
            const { bg, fg, glow } = getTileStyle(tile.value);
            const fontSize = tile.value >= 1000 ? 'clamp(16px, 4vw, 30px)'
              : tile.value >= 100 ? 'clamp(20px, 4.5vw, 36px)'
              : 'clamp(24px, 5.5vw, 44px)';

            return (
              <div
                key={tile.id}
                style={{
                  position: 'absolute',
                  // Calculate position: each cell is ~25% of board minus gaps
                  left: `calc(${tile.col} * (25% - ${gap} * 0.25) + ${gap} * ${tile.col + 1} / ${4})`,
                  top: `calc(${tile.row} * (25% - ${gap} * 0.25) + ${gap} * ${tile.row + 1} / ${4})`,
                  width: `calc(25% - ${gap} * 1.25)`,
                  height: `calc(25% - ${gap} * 1.25)`,
                  background: bg,
                  color: fg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'clamp(4px, 1vw, 8px)',
                  fontSize,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  boxShadow: glow ?? 'none',
                  transition: tile.isNew ? 'none' : 'left 150ms ease-out, top 150ms ease-out',
                  animation: tile.isNew
                    ? 'tile2048-pop 200ms ease-out'
                    : tile.merged
                      ? 'tile2048-merge 200ms ease-out'
                      : 'none',
                  zIndex: tile.merged ? 2 : 1,
                }}
              >
                {tile.value}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 'clamp(10px, 2vw, 13px)', color: 'rgba(250,246,238,0.4)', textAlign: 'center' }}>
          Arrow keys or WASD to move. Swipe on touch.
        </div>

        {/* Win Overlay */}
        {won && !wonAcknowledged && (
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
                You reached 2048!
              </div>
              <div style={{ fontSize: 16, marginBottom: 16, color: 'rgba(250,246,238,0.6)' }}>
                Score: {score.toLocaleString()}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => setWonAcknowledged(true)}
                  style={{
                    padding: '10px 24px',
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
                  Keep Playing
                </button>
                <button
                  onClick={startNewGame}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    border: '1px solid rgba(252,209,22,0.3)',
                    background: 'transparent',
                    color: '#FCD116',
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
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
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
                border: '2px solid #CE1126',
                borderRadius: 16,
                padding: '32px 40px',
                textAlign: 'center',
                color: '#FAF6EE',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: '#CE1126', marginBottom: 8 }}>
                Game Over
              </div>
              <div style={{ fontSize: 16, marginBottom: 16 }}>
                Final Score: {score.toLocaleString()}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                {prevState && (
                  <button
                    onClick={handleUndo}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 8,
                      border: '1px solid rgba(252,209,22,0.3)',
                      background: 'transparent',
                      color: '#FCD116',
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Undo
                  </button>
                )}
                <button
                  onClick={startNewGame}
                  style={{
                    padding: '10px 24px',
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
          </div>
        )}
      </div>
    </GameShell>
  );
};

export default Game2048;
