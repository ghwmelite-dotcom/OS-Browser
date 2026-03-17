import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gameSounds } from '../GameSoundEngine';

/** Polyfill for ctx.roundRect — safe for older Chromium versions */
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
import {
  createGame,
  rollDice,
  applyDiceRoll,
  getValidMoves,
  makeMove,
  getAIMove,
  getTokenBoardPosition,
  getLandingBoardPosition,
  getSafeSquareCoords,
  getPlayerGlobalIndex,
  TRACK_COORDS,
  HOME_STRETCH_COORDS,
  SAFE_SQUARES,
  type LudoState,
  type ValidMove,
  type PlayerColor,
} from './ludoLogic';

// ── Constants ───────────────────────────────────────────────────────

interface Props {
  containerWidth: number;
  containerHeight: number;
}

const GRID = 15;

const COLOR_MAP: Record<PlayerColor, string> = {
  red: '#CE1126',
  blue: '#1565C0',
  green: '#006B3F',
  yellow: '#FCD116',
};

const COLOR_LIGHT: Record<PlayerColor, string> = {
  red: '#FF6B6B',
  blue: '#64B5F6',
  green: '#66BB6A',
  yellow: '#FFF176',
};

const COLOR_DARK: Record<PlayerColor, string> = {
  red: '#8B0000',
  blue: '#0D47A1',
  green: '#004D25',
  yellow: '#C9A800',
};

// ── Setup Screen ────────────────────────────────────────────────────

interface SetupProps {
  onStart: (playerCount: 2 | 3 | 4, aiPlayers: boolean[]) => void;
}

const SetupScreen: React.FC<SetupProps> = ({ onStart }) => {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [aiFlags, setAiFlags] = useState<boolean[]>([false, true, true, true]);

  const handleCountChange = (count: 2 | 3 | 4) => {
    setPlayerCount(count);
    const flags = Array.from({ length: count }, (_, i) =>
      i === 0 ? false : true,
    );
    setAiFlags(flags);
  };

  const toggleAI = (index: number) => {
    const next = [...aiFlags];
    next[index] = !next[index];
    // At least one must be human
    if (next.every((f) => f)) next[0] = false;
    setAiFlags(next);
  };

  const colors: PlayerColor[] =
    playerCount === 2
      ? ['red', 'green']
      : playerCount === 3
        ? ['red', 'blue', 'green']
        : ['red', 'blue', 'green', 'yellow'];

  const container: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 32,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#FAF6EE',
    height: '100%',
    overflowY: 'auto',
  };

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(252,209,22,0.2)',
    borderRadius: 16,
    padding: 32,
    maxWidth: 400,
    width: '100%',
  };

  const btnBase: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  };

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={{ margin: '0 0 24px', fontSize: 22, textAlign: 'center', color: '#FCD116' }}>
          Ludo - New Game
        </h2>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: 'rgba(250,246,238,0.6)', marginBottom: 8 }}>
            Players
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => handleCountChange(n)}
                style={{
                  ...btnBase,
                  flex: 1,
                  background: playerCount === n ? '#FCD116' : 'rgba(255,255,255,0.08)',
                  color: playerCount === n ? '#1A1D27' : '#FAF6EE',
                  border: `1px solid ${playerCount === n ? '#FCD116' : 'rgba(255,255,255,0.15)'}`,
                }}
              >
                {n} Players
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: 'rgba(250,246,238,0.6)', marginBottom: 8 }}>
            Human / AI
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {colors.map((color, i) => (
              <div
                key={color}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${COLOR_MAP[color]}40`,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: COLOR_MAP[color],
                    boxShadow: `0 2px 6px ${COLOR_MAP[color]}60`,
                  }}
                />
                <span style={{ flex: 1, fontSize: 14, textTransform: 'capitalize' }}>{color}</span>
                <button
                  onClick={() => toggleAI(i)}
                  style={{
                    ...btnBase,
                    padding: '4px 14px',
                    fontSize: 12,
                    background: aiFlags[i] ? 'rgba(255,255,255,0.08)' : COLOR_MAP[color] + '30',
                    color: aiFlags[i] ? 'rgba(250,246,238,0.7)' : COLOR_LIGHT[color],
                    border: `1px solid ${aiFlags[i] ? 'rgba(255,255,255,0.15)' : COLOR_MAP[color]}`,
                  }}
                >
                  {aiFlags[i] ? 'AI' : 'Human'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart(playerCount, aiFlags)}
          style={{
            ...btnBase,
            width: '100%',
            padding: '12px 24px',
            fontSize: 16,
            background: 'linear-gradient(135deg, #FCD116, #E6B800)',
            color: '#1A1D27',
            boxShadow: '0 4px 12px rgba(252,209,22,0.3)',
          }}
        >
          Start Game
        </button>
      </div>
    </div>
  );
};

// ── Main Game Component ─────────────────────────────────────────────

export const LudoGame: React.FC<Props> = ({ containerWidth, containerHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<LudoState | null>(null);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [diceAnimating, setDiceAnimating] = useState(false);
  const [diceAnimFrame, setDiceAnimFrame] = useState(0);
  const [hoveredToken, setHoveredToken] = useState<number | null>(null);
  const [turnStatus, setTurnStatus] = useState<string>('');
  const [turnStatusColor, setTurnStatusColor] = useState<string>('#FAF6EE');
  const [aiPhase, setAiPhase] = useState<'idle' | 'thinking' | 'rolled' | 'moving'>('idle');
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiTimeoutRef2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiTimeoutRef3 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Board sizing: square, centered, DPI-aware
  const boardSize = Math.max(200, Math.min(containerWidth, containerHeight) - 16);
  const cellSize = boardSize / GRID;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // ── Start game ──────────────────────────────────────────────────
  const handleStart = useCallback((playerCount: 2 | 3 | 4, aiPlayers: boolean[]) => {
    setGameState(createGame(playerCount, aiPlayers));
    setSelectedToken(null);
    setHoveredToken(null);
  }, []);

  const handleNewGame = useCallback(() => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    if (aiTimeoutRef2.current) clearTimeout(aiTimeoutRef2.current);
    if (aiTimeoutRef3.current) clearTimeout(aiTimeoutRef3.current);
    setGameState(null);
    setSelectedToken(null);
    setHoveredToken(null);
    setTurnStatus('');
    setAiPhase('idle');
  }, []);

  // ── Dice roll ───────────────────────────────────────────────────
  const handleRollDice = useCallback(() => {
    if (!gameState || gameState.diceRolled || gameState.gameOver || diceAnimating) return;
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.isAI) return;

    gameSounds.dice();
    setDiceAnimating(true);
    setDiceAnimFrame(0);
    setTurnStatus('Rolling...');

    const value = rollDice();
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      setDiceAnimFrame(frame);
      if (frame >= 10) {
        clearInterval(interval);
        setDiceAnimating(false);
        setTurnStatus(`You rolled a ${value}!`);
        setTurnStatusColor(COLOR_MAP[currentPlayer.color]);
        // Show dice result for 500ms before applying
        setTimeout(() => {
          setGameState((prev) => {
            if (!prev) return prev;
            const newState = applyDiceRoll(prev, value);
            const moves = getValidMoves(newState);
            if (moves.length > 0) {
              setTurnStatus('Choose a token to move');
            } else {
              setTurnStatus(`No valid moves`);
            }
            return newState;
          });
        }, 500);
      }
    }, 50);
  }, [gameState, diceAnimating]);

  // ── Token click ─────────────────────────────────────────────────
  const handleTokenClick = useCallback(
    (tokenIndex: number) => {
      if (!gameState || !gameState.diceRolled || gameState.gameOver) return;
      const currentPlayer = gameState.players[gameState.currentPlayer];
      if (currentPlayer.isAI) return;

      const moves = getValidMoves(gameState);
      const move = moves.find((m) => m.tokenIndex === tokenIndex);
      if (!move) {
        gameSounds.error();
        return;
      }

      if (move.isCapture) {
        gameSounds.capture();
        setTurnStatus('You captured a token!');
      } else if (move.newPosition === 58) {
        gameSounds.score();
        setTurnStatus('Token home!');
      } else {
        gameSounds.move();
        setTurnStatus('Moved');
      }

      const newState = makeMove(gameState, tokenIndex);
      setSelectedToken(null);
      setHoveredToken(null);

      if (newState.gameOver) {
        gameSounds.win();
        setTurnStatus('You win!');
      }

      setGameState(newState);
    },
    [gameState],
  );

  // ── AI turns ────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameState || gameState.gameOver) return;
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (!currentPlayer.isAI) {
      // Human turn - show prompt if dice not rolled yet
      if (!gameState.diceRolled && !diceAnimating) {
        setTurnStatus('Your turn! Click the dice to roll');
        setTurnStatusColor(COLOR_MAP[currentPlayer.color]);
      }
      setAiPhase('idle');
      return;
    }

    if (!gameState.diceRolled) {
      // Phase 1: Show "thinking" for 800ms
      const colorName = currentPlayer.color.charAt(0).toUpperCase() + currentPlayer.color.slice(1);
      setTurnStatus(`${colorName} is thinking...`);
      setTurnStatusColor(COLOR_MAP[currentPlayer.color]);
      setAiPhase('thinking');

      aiTimeoutRef.current = setTimeout(() => {
        // Phase 2: AI rolls dice
        gameSounds.dice();
        setDiceAnimating(true);
        setDiceAnimFrame(0);
        setTurnStatus(`${colorName} is rolling...`);

        const value = rollDice();
        let frame = 0;
        const interval = setInterval(() => {
          frame++;
          setDiceAnimFrame(frame);
          if (frame >= 10) {
            clearInterval(interval);
            setDiceAnimating(false);
            setAiPhase('rolled');
            setTurnStatus(`${colorName} rolled a ${value}`);
            // Show dice result for 500ms before applying
            aiTimeoutRef2.current = setTimeout(() => {
              setGameState((prev) => (prev ? applyDiceRoll(prev, value) : prev));
            }, 500);
          }
        }, 50);
      }, 800);
    } else {
      // Phase 3: AI makes a move after 400ms delay
      const colorName = currentPlayer.color.charAt(0).toUpperCase() + currentPlayer.color.slice(1);
      setAiPhase('moving');

      aiTimeoutRef.current = setTimeout(() => {
        const tokenIdx = getAIMove(gameState);
        if (tokenIdx !== null) {
          const moves = getValidMoves(gameState);
          const move = moves.find((m) => m.tokenIndex === tokenIdx);
          if (move?.isCapture) {
            gameSounds.capture();
            setTurnStatus(`${colorName} captured a token!`);
          } else if (move?.newPosition === 58) {
            gameSounds.score();
            setTurnStatus(`${colorName} got a token home!`);
          } else {
            gameSounds.move();
            setTurnStatus(`${colorName} moved`);
          }

          const newState = makeMove(gameState, tokenIdx);
          if (newState.gameOver) gameSounds.win();
          setGameState(newState);
        } else {
          setTurnStatus(`${colorName} has no valid moves`);
          // No valid moves - advance turn
          aiTimeoutRef3.current = setTimeout(() => {
            setGameState((prev) => prev);
          }, 400);
        }
      }, 400);
    }

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      if (aiTimeoutRef2.current) clearTimeout(aiTimeoutRef2.current);
      if (aiTimeoutRef3.current) clearTimeout(aiTimeoutRef3.current);
    };
  }, [gameState, diceAnimating]);

  // ── Canvas click handler ────────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!gameState || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (rect.width / GRID);
      const y = (e.clientY - rect.top) / (rect.height / GRID);

      // Check if clicking the dice area (center of board)
      if (Math.abs(x - 7.5) < 1.5 && Math.abs(y - 7.5) < 1.5) {
        if (!gameState.diceRolled && !diceAnimating) {
          handleRollDice();
          return;
        }
      }

      // Check if clicking a token of current player
      if (gameState.diceRolled && !gameState.players[gameState.currentPlayer].isAI) {
        const moves = getValidMoves(gameState);
        const movableTokens = new Set(moves.map((m) => m.tokenIndex));

        for (let t = 0; t < 4; t++) {
          if (!movableTokens.has(t)) continue;
          const [tx, ty] = getTokenBoardPosition(gameState, gameState.currentPlayer, t);
          const dist = Math.sqrt((x - (tx + 0.5)) ** 2 + (y - (ty + 0.5)) ** 2);
          if (dist < 0.6) {
            handleTokenClick(t);
            return;
          }
        }
      }
    },
    [gameState, diceAnimating, handleRollDice, handleTokenClick],
  );

  // ── Canvas mouse move (hover) ───────────────────────────────────
  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!gameState || !canvasRef.current || !gameState.diceRolled) {
        setHoveredToken(null);
        return;
      }
      if (gameState.players[gameState.currentPlayer].isAI) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (rect.width / GRID);
      const y = (e.clientY - rect.top) / (rect.height / GRID);

      const moves = getValidMoves(gameState);
      const movableTokens = new Set(moves.map((m) => m.tokenIndex));

      for (let t = 0; t < 4; t++) {
        if (!movableTokens.has(t)) continue;
        const [tx, ty] = getTokenBoardPosition(gameState, gameState.currentPlayer, t);
        const dist = Math.sqrt((x - (tx + 0.5)) ** 2 + (y - (ty + 0.5)) ** 2);
        if (dist < 0.6) {
          setHoveredToken(t);
          return;
        }
      }
      setHoveredToken(null);
    },
    [gameState],
  );

  // ── Canvas rendering ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = boardSize * dpr;
    const h = boardSize * dpr;
    canvas.width = w;
    canvas.height = h;
    ctx.scale(dpr, dpr);

    const cs = cellSize;

    // Helper: cell to pixel
    const cx = (col: number) => col * cs;
    const cy = (row: number) => row * cs;

    // ── Background ────────────────────────────────────────────
    ctx.fillStyle = '#F5F0E1'; // cream board
    ctx.fillRect(0, 0, boardSize, boardSize);

    // ── Draw quadrant home bases ──────────────────────────────
    const drawHomeBase = (
      col: number,
      row: number,
      w: number,
      h: number,
      color: string,
      lightColor: string,
      darkColor: string,
      playerGlobalIndex: number,
    ) => {
      // Filled quadrant background
      ctx.fillStyle = color;
      ctx.fillRect(cx(col), cy(row), w * cs, h * cs);

      // Inner white area with token slots
      const inset = cs * 0.8;
      const innerW = w * cs - inset * 2;
      const innerH = h * cs - inset * 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = darkColor;
      ctx.lineWidth = 2;
      drawRoundRect(ctx, cx(col) + inset, cy(row) + inset, innerW, innerH, 8);
      ctx.fill();
      ctx.stroke();

      // Draw empty token slots
      const slotPositions = [
        [cx(col) + inset + innerW * 0.3, cy(row) + inset + innerH * 0.3],
        [cx(col) + inset + innerW * 0.7, cy(row) + inset + innerH * 0.3],
        [cx(col) + inset + innerW * 0.3, cy(row) + inset + innerH * 0.7],
        [cx(col) + inset + innerW * 0.7, cy(row) + inset + innerH * 0.7],
      ];

      slotPositions.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, cs * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = lightColor + '60';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    };

    // Check which players are in the game
    const activeGlobals = new Set(
      gameState.players.map((_, i) => getPlayerGlobalIndex(gameState, i)),
    );

    // Red (bottom-left)
    if (activeGlobals.has(0)) {
      drawHomeBase(0, 9, 6, 6, COLOR_MAP.red, COLOR_LIGHT.red, COLOR_DARK.red, 0);
    } else {
      ctx.fillStyle = '#D0C8B8';
      ctx.fillRect(cx(0), cy(9), 6 * cs, 6 * cs);
    }

    // Blue (top-left)
    if (activeGlobals.has(1)) {
      drawHomeBase(0, 0, 6, 6, COLOR_MAP.blue, COLOR_LIGHT.blue, COLOR_DARK.blue, 1);
    } else {
      ctx.fillStyle = '#D0C8B8';
      ctx.fillRect(cx(0), cy(0), 6 * cs, 6 * cs);
    }

    // Green (top-right)
    if (activeGlobals.has(2)) {
      drawHomeBase(9, 0, 6, 6, COLOR_MAP.green, COLOR_LIGHT.green, COLOR_DARK.green, 2);
    } else {
      ctx.fillStyle = '#D0C8B8';
      ctx.fillRect(cx(9), cy(0), 6 * cs, 6 * cs);
    }

    // Yellow (bottom-right)
    if (activeGlobals.has(3)) {
      drawHomeBase(9, 9, 6, 6, COLOR_MAP.yellow, COLOR_LIGHT.yellow, COLOR_DARK.yellow, 3);
    } else {
      ctx.fillStyle = '#D0C8B8';
      ctx.fillRect(cx(9), cy(9), 6 * cs, 6 * cs);
    }

    // ── Draw track squares ────────────────────────────────────
    const trackColorForSquare = (absIdx: number): string | null => {
      // Colored start/entry squares
      if (absIdx === 0) return COLOR_MAP.red;
      if (absIdx === 13) return COLOR_MAP.blue;
      if (absIdx === 26) return COLOR_MAP.green;
      if (absIdx === 39) return COLOR_MAP.yellow;
      return null;
    };

    TRACK_COORDS.forEach(([col, row], i) => {
      const px = cx(col);
      const py = cy(row);

      const special = trackColorForSquare(i);
      ctx.fillStyle = special || '#FFFFFF';
      ctx.strokeStyle = '#C0B8A8';
      ctx.lineWidth = 0.5;
      ctx.fillRect(px, py, cs, cs);
      ctx.strokeRect(px, py, cs, cs);

      // Safe square star
      if (SAFE_SQUARES.includes(i)) {
        const starColor = special || '#888';
        drawStar(ctx, px + cs / 2, py + cs / 2, cs * 0.25, cs * 0.12, 5, starColor);
      }
    });

    // ── Draw home stretch lanes ───────────────────────────────
    const stretchColors: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];
    stretchColors.forEach((color, pi) => {
      if (!activeGlobals.has(pi)) return;
      HOME_STRETCH_COORDS[pi].forEach(([col, row]) => {
        ctx.fillStyle = COLOR_MAP[color] + '50';
        ctx.strokeStyle = COLOR_MAP[color];
        ctx.lineWidth = 0.5;
        ctx.fillRect(cx(col), cy(row), cs, cs);
        ctx.strokeRect(cx(col), cy(row), cs, cs);

        // Arrow/triangle pointing toward center
        ctx.fillStyle = COLOR_MAP[color] + '30';
        ctx.beginPath();
        const ccx = cx(col) + cs / 2;
        const ccy = cy(row) + cs / 2;
        const s = cs * 0.2;
        ctx.moveTo(ccx, ccy - s);
        ctx.lineTo(ccx + s, ccy + s);
        ctx.lineTo(ccx - s, ccy + s);
        ctx.closePath();
        ctx.fill();
      });
    });

    // ── Draw center (home/finish area) ────────────────────────
    const centerX = cx(6);
    const centerY = cx(6);
    const centerSize = 3 * cs;

    // Four triangles pointing inward
    const triangles: [PlayerColor, [number, number], [number, number], [number, number]][] = [
      ['red', [centerX, centerY + centerSize], [centerX + centerSize / 2, centerY + centerSize / 2], [centerX + centerSize, centerY + centerSize]],
      ['blue', [centerX, centerY], [centerX + centerSize / 2, centerY + centerSize / 2], [centerX, centerY + centerSize]],
      ['green', [centerX, centerY], [centerX + centerSize / 2, centerY + centerSize / 2], [centerX + centerSize, centerY]],
      ['yellow', [centerX + centerSize, centerY], [centerX + centerSize / 2, centerY + centerSize / 2], [centerX + centerSize, centerY + centerSize]],
    ];

    triangles.forEach(([color, p1, p2, p3]) => {
      if (!activeGlobals.has(stretchColors.indexOf(color))) return;
      ctx.fillStyle = COLOR_MAP[color];
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.lineTo(p3[0], p3[1]);
      ctx.closePath();
      ctx.fill();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX + centerSize / 2, centerY + centerSize / 2, cs * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#F5F0E1';
    ctx.fill();
    ctx.strokeStyle = '#C0B8A8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Draw current player glow ──────────────────────────────
    if (!gameState.gameOver) {
      const currentGlobal = getPlayerGlobalIndex(gameState, gameState.currentPlayer);
      const glowQuadrants: [number, number, number, number][] = [
        [0, 9, 6, 6], // red
        [0, 0, 6, 6], // blue
        [9, 0, 6, 6], // green
        [9, 9, 6, 6], // yellow
      ];
      const q = glowQuadrants[currentGlobal];
      const color = gameState.players[gameState.currentPlayer].color;
      ctx.strokeStyle = COLOR_MAP[color];
      ctx.lineWidth = 3;
      ctx.shadowColor = COLOR_MAP[color];
      ctx.shadowBlur = 12;
      ctx.strokeRect(cx(q[0]) + 2, cy(q[1]) + 2, q[2] * cs - 4, q[3] * cs - 4);
      ctx.shadowBlur = 0;
    }

    // ── Draw path highlighting (hovered token projection) ─────
    if (hoveredToken !== null && gameState.diceRolled) {
      const moves = getValidMoves(gameState);
      const move = moves.find((m) => m.tokenIndex === hoveredToken);
      if (move) {
        const landing = getLandingBoardPosition(
          gameState,
          gameState.currentPlayer,
          move.newPosition,
        );
        if (landing) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.strokeStyle = COLOR_MAP[gameState.players[gameState.currentPlayer].color];
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          drawRoundRect(ctx, cx(landing[0]) + 2, cy(landing[1]) + 2, cs - 4, cs - 4, 4);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // ── Draw tokens ───────────────────────────────────────────
    // Draw non-current players first, then current player on top
    const drawOrder: number[] = [];
    for (let p = 0; p < gameState.players.length; p++) {
      if (p !== gameState.currentPlayer) drawOrder.push(p);
    }
    drawOrder.push(gameState.currentPlayer);

    const moves = gameState.diceRolled ? getValidMoves(gameState) : [];
    const movableTokens = new Set(moves.map((m) => m.tokenIndex));

    drawOrder.forEach((playerIdx) => {
      const player = gameState.players[playerIdx];
      for (let t = 0; t < 4; t++) {
        if (player.tokens[t] === 58) continue; // finished tokens shown differently
        const [bx, by] = getTokenBoardPosition(gameState, playerIdx, t);
        const px = cx(bx) + cs / 2;
        const py = cy(by) + cs / 2;
        const r = cs * 0.35;

        const isMovable =
          playerIdx === gameState.currentPlayer &&
          movableTokens.has(t) &&
          !gameState.players[gameState.currentPlayer].isAI;
        const isHovered = playerIdx === gameState.currentPlayer && hoveredToken === t;

        // Shadow
        ctx.beginPath();
        ctx.arc(px + 1, py + 2, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fill();

        // Token body
        const grad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.1, px, py, r);
        grad.addColorStop(0, COLOR_LIGHT[player.color]);
        grad.addColorStop(1, COLOR_MAP[player.color]);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Border
        ctx.strokeStyle = COLOR_DARK[player.color];
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Highlight ring if movable
        if (isMovable) {
          ctx.beginPath();
          ctx.arc(px, py, r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Extra glow on hover
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(px, py, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = COLOR_LIGHT[player.color];
          ctx.lineWidth = 2;
          ctx.shadowColor = COLOR_LIGHT[player.color];
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Token number
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.round(cs * 0.28)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${t + 1}`, px, py + 1);
      }

      // Draw finished tokens in center
      for (let t = 0; t < 4; t++) {
        if (player.tokens[t] !== 58) continue;
        const offsets: [number, number][] = [
          [-0.3, -0.3],
          [0.3, -0.3],
          [-0.3, 0.3],
          [0.3, 0.3],
        ];
        const fpx = cx(7 + offsets[t][0]) + cs / 2;
        const fpy = cy(7 + offsets[t][1]) + cs / 2;
        const fr = cs * 0.22;

        ctx.beginPath();
        ctx.arc(fpx, fpy, fr, 0, Math.PI * 2);
        ctx.fillStyle = COLOR_MAP[player.color];
        ctx.fill();
        ctx.strokeStyle = COLOR_DARK[player.color];
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.round(cs * 0.2)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${t + 1}`, fpx, fpy + 1);
      }
    });

    // ── Draw dice ─────────────────────────────────────────────
    const diceSize = cs * 1.6;
    const diceX = centerX + centerSize / 2 - diceSize / 2;
    const diceY = centerY - diceSize - cs * 0.6;

    const displayValue = diceAnimating
      ? Math.floor(Math.random() * 6) + 1
      : gameState.diceValue ?? 0;

    if (displayValue > 0 || diceAnimating) {
      const rotation = diceAnimating ? ((diceAnimFrame * 25) * Math.PI) / 180 : 0;
      const bounce = diceAnimating ? Math.sin(diceAnimFrame * 0.8) * 4 : 0;

      ctx.save();
      ctx.translate(diceX + diceSize / 2, diceY + diceSize / 2 + bounce);
      ctx.rotate(rotation);

      // Die body
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      drawRoundRect(ctx, -diceSize / 2, -diceSize / 2, diceSize, diceSize, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Dice pips
      if (!diceAnimating) {
        drawDicePips(ctx, 0, 0, diceSize * 0.7, displayValue);
      } else {
        drawDicePips(ctx, 0, 0, diceSize * 0.7, displayValue);
      }

      ctx.restore();
    } else {
      // No dice rolled yet - show "Roll" prompt
      if (!gameState.players[gameState.currentPlayer].isAI && !gameState.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        drawRoundRect(ctx, diceX - cs * 0.2, diceY - cs * 0.2, diceSize + cs * 0.4, diceSize + cs * 0.4, 8);
        ctx.fill();

        ctx.fillStyle = '#FCD116';
        ctx.font = `bold ${Math.round(cs * 0.36)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ROLL', diceX + diceSize / 2, diceY + diceSize / 2);
      }
    }

    // ── Draw board border ─────────────────────────────────────
    ctx.strokeStyle = '#3E362E';
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, boardSize - 2, boardSize - 2);
  }, [gameState, boardSize, cellSize, dpr, diceAnimating, diceAnimFrame, hoveredToken]);

  // ── Render ──────────────────────────────────────────────────────

  if (!gameState) {
    return <SetupScreen onStart={handleStart} />;
  }

  const canvasStyle: React.CSSProperties = {
    width: boardSize,
    height: boardSize,
    cursor:
      !gameState.diceRolled && !diceAnimating && !gameState.players[gameState.currentPlayer].isAI
        ? 'pointer'
        : hoveredToken !== null
          ? 'pointer'
          : 'default',
  };

  const infoBar: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: boardSize,
    padding: '6px 12px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px 8px 0 0',
    fontSize: 13,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#FAF6EE',
    boxSizing: 'border-box',
  };

  const bottomBar: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: boardSize,
    padding: '6px 12px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '0 0 8px 8px',
    boxSizing: 'border-box',
  };

  const currentColor = gameState.players[gameState.currentPlayer].color;
  const isAI = gameState.players[gameState.currentPlayer].isAI;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}
    >
      <div style={infoBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: COLOR_MAP[currentColor],
              boxShadow: `0 0 8px ${COLOR_MAP[currentColor]}`,
              animation: !isAI && !gameState.diceRolled && !diceAnimating ? 'ludoPulse 1.2s ease-in-out infinite' : 'none',
            }}
          />
          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
            {currentColor}
            {isAI ? ' (AI)' : ' (You)'}
          </span>
          <span style={{ color: 'rgba(250,246,238,0.5)', fontSize: 11, marginLeft: 4 }}>
            {isAI
              ? (aiPhase === 'thinking' ? 'Thinking...' : aiPhase === 'rolled' ? 'Rolled' : aiPhase === 'moving' ? 'Moving...' : 'Waiting...')
              : (!gameState.diceRolled && !diceAnimating ? 'Roll dice' : gameState.diceRolled ? 'Choose a token' : 'Rolling...')}
          </span>
        </div>
        <span style={{ color: turnStatusColor, fontSize: 12, fontWeight: 600, transition: 'color 0.3s' }}>
          {turnStatus || gameState.message}
        </span>
      </div>

      {/* Human turn banner - prominent prompt */}
      {!isAI && !gameState.diceRolled && !diceAnimating && !gameState.gameOver && (
        <div
          style={{
            width: boardSize,
            padding: '8px 16px',
            background: `linear-gradient(90deg, ${COLOR_MAP[currentColor]}20, ${COLOR_MAP[currentColor]}40, ${COLOR_MAP[currentColor]}20)`,
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: COLOR_LIGHT[currentColor],
            letterSpacing: 0.5,
            boxSizing: 'border-box',
            animation: 'ludoBannerPulse 2s ease-in-out infinite',
          }}
        >
          Tap the dice to roll!
        </div>
      )}

      {/* AI turn banner */}
      {isAI && !gameState.gameOver && (
        <div
          style={{
            width: boardSize,
            padding: '8px 16px',
            background: `linear-gradient(90deg, ${COLOR_MAP[currentColor]}15, ${COLOR_MAP[currentColor]}30, ${COLOR_MAP[currentColor]}15)`,
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: COLOR_LIGHT[currentColor],
            boxSizing: 'border-box',
          }}
        >
          {turnStatus}
        </div>
      )}

      <style>{`
        @keyframes ludoPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.7; }
        }
        @keyframes ludoBannerPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={canvasStyle}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
      />

      <div style={bottomBar}>
        {/* Player token counts */}
        {gameState.players.map((p, i) => {
          const finished = p.tokens.filter((t) => t === 58).length;
          return (
            <div
              key={p.color}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 6,
                background:
                  i === gameState.currentPlayer
                    ? COLOR_MAP[p.color] + '30'
                    : 'transparent',
                border: `1px solid ${COLOR_MAP[p.color]}40`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: COLOR_MAP[p.color],
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: COLOR_LIGHT[p.color],
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {finished}/4
              </span>
            </div>
          );
        })}

        <div style={{ flex: 1 }} />

        <button
          onClick={handleNewGame}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            border: '1px solid rgba(252,209,22,0.3)',
            background: 'rgba(252,209,22,0.08)',
            color: '#FCD116',
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          New Game
        </button>
      </div>

      {gameState.gameOver && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: '#2C2318',
              border: `2px solid ${COLOR_MAP[gameState.players[gameState.winner!].color]}`,
              borderRadius: 16,
              padding: '32px 48px',
              textAlign: 'center',
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: `0 0 40px ${COLOR_MAP[gameState.players[gameState.winner!].color]}40`,
            }}
          >
            <div
              style={{
                fontSize: 40,
                marginBottom: 8,
              }}
            >
              {'\u2605'}
            </div>
            <h2
              style={{
                color: COLOR_MAP[gameState.players[gameState.winner!].color],
                fontSize: 24,
                margin: '0 0 8px',
                textTransform: 'capitalize',
              }}
            >
              {gameState.players[gameState.winner!].color} Wins!
            </h2>
            <p style={{ color: 'rgba(250,246,238,0.7)', margin: '0 0 24px', fontSize: 14 }}>
              {gameState.players[gameState.winner!].isAI ? 'AI' : 'Player'} got all tokens home
            </p>
            <button
              onClick={handleNewGame}
              style={{
                padding: '10px 32px',
                borderRadius: 8,
                border: 'none',
                background: COLOR_MAP[gameState.players[gameState.winner!].color],
                color: '#1A1D27',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Drawing helpers ─────────────────────────────────────────────────

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawDicePips(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  value: number,
) {
  const pipR = size * 0.09;
  const off = size * 0.28;
  ctx.fillStyle = '#1A1D27';

  const pipPositions: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [
      [-off, -off],
      [off, off],
    ],
    3: [
      [-off, -off],
      [0, 0],
      [off, off],
    ],
    4: [
      [-off, -off],
      [off, -off],
      [-off, off],
      [off, off],
    ],
    5: [
      [-off, -off],
      [off, -off],
      [0, 0],
      [-off, off],
      [off, off],
    ],
    6: [
      [-off, -off],
      [off, -off],
      [-off, 0],
      [off, 0],
      [-off, off],
      [off, off],
    ],
  };

  const pips = pipPositions[value] || [];
  pips.forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(cx + px, cy + py, pipR, 0, Math.PI * 2);
    ctx.fill();
  });
}

export default LudoGame;
