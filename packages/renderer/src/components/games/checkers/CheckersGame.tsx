// ── GovPlay Checkers ────────────────────────────────────────────────────
// Canvas-rendered American checkers with AI opponent, mandatory captures,
// multi-jump chains, and king promotion.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  CheckersState,
  CheckersMove,
  createInitialState,
  getValidMoves,
  getAllLegalMoves,
  makeMove,
  countPieces,
} from './checkersLogic';
import { gameSounds } from '../GameSoundEngine';

interface Props {
  containerWidth: number;
  containerHeight: number;
}

// ── Colors ──────────────────────────────────────────────────────────────

const LIGHT_SQ = '#F5F0DC';
const DARK_SQ = '#1A5C32';
const SELECTED_SQ = 'rgba(255, 215, 0, 0.5)';
const VALID_DOT = 'rgba(255, 255, 255, 0.35)';
const CAPTURE_PULSE = 'rgba(255, 80, 80, 0.6)';
const GREEN_PIECE = '#006B3F';
const GREEN_PIECE_DARK = '#004D2B';
const GOLD_PIECE = '#D4A017';
const GOLD_PIECE_DARK = '#A07812';
const BG_COLOR = '#0F1923';
const PANEL_BG = '#162A3A';
const TEXT_COLOR = '#E0E0E0';
const ACCENT = '#D4A017';
const CROWN_COLOR = '#FFD700';

type AIDifficulty = 'easy' | 'medium' | 'hard';

// ── AI (minimax with alpha-beta) ────────────────────────────────────────

function evaluateState(state: CheckersState, aiColor: 'r' | 'b'): number {
  const counts = countPieces(state);
  const aiPieces = aiColor === 'r'
    ? counts.r + counts.rKings * 1.5
    : counts.b + counts.bKings * 1.5;
  const opPieces = aiColor === 'r'
    ? counts.b + counts.bKings * 1.5
    : counts.r + counts.rKings * 1.5;

  let score = (aiPieces - opPieces) * 100;

  // Advancement bonus (non-kings closer to promotion)
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const isAI = (aiColor === 'r' && (p === 'r' || p === 'R')) || (aiColor === 'b' && (p === 'b' || p === 'B'));
      if (!isAI) continue;
      if (p === 'r') score += (7 - r) * 3; // Red moves up
      else if (p === 'b') score += r * 3; // Black moves down
      // Center control bonus
      if (c >= 2 && c <= 5 && r >= 2 && r <= 5) score += 2;
    }
  }

  if (state.gameOver) {
    if (state.winner === aiColor) return 99999;
    if (state.winner) return -99999;
    return 0; // draw
  }

  return score;
}

function minimaxCheckers(
  state: CheckersState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiColor: 'r' | 'b',
): number {
  if (depth === 0 || state.gameOver) {
    return evaluateState(state, aiColor);
  }

  const moves = getAllLegalMoves(state);
  if (moves.length === 0) {
    return evaluateState(state, aiColor);
  }

  // Order: captures first (more captured pieces = higher priority)
  const ordered = [...moves].sort((a, b) => b.captured.length - a.captured.length);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of ordered) {
      const newState = makeMove(state, move);
      const val = minimaxCheckers(newState, depth - 1, alpha, beta, false, aiColor);
      maxEval = Math.max(maxEval, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of ordered) {
      const newState = makeMove(state, move);
      const val = minimaxCheckers(newState, depth - 1, alpha, beta, true, aiColor);
      minEval = Math.min(minEval, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getCheckersAIMove(state: CheckersState, difficulty: AIDifficulty): CheckersMove | null {
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const depths: Record<AIDifficulty, number> = { easy: 3, medium: 5, hard: 6 };
  const depth = depths[difficulty];
  const aiColor = state.turn;

  // Easy: 25% random
  if (difficulty === 'easy' && Math.random() < 0.25) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const ordered = [...moves].sort((a, b) => b.captured.length - a.captured.length);
  let bestMove = ordered[0];
  let bestScore = -Infinity;

  for (const move of ordered) {
    const newState = makeMove(state, move);
    const score = minimaxCheckers(newState, depth - 1, -Infinity, Infinity, false, aiColor);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

// ── Main component ──────────────────────────────────────────────────────

export default function CheckersGame({ containerWidth, containerHeight }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<CheckersState>(createInitialState);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [validMoves, setValidMovesList] = useState<CheckersMove[]>([]);
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [playerColor, setPlayerColor] = useState<'r' | 'b'>('r');
  const [aiThinking, setAiThinking] = useState(false);
  const [lastMove, setLastMove] = useState<CheckersMove | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const pulseRef = useRef<number>(0);

  // Board layout
  const padding = 16;
  const infoHeight = 80;
  const controlsHeight = 44;
  const availableW = containerWidth - padding * 2;
  const availableH = containerHeight - padding * 2 - infoHeight - controlsHeight;
  const boardSize = Math.max(200, Math.min(availableW, availableH));
  const sqSize = boardSize / 8;

  const canvasW = boardSize;
  const canvasH = boardSize + infoHeight;
  const boardX = 0;
  const boardY = infoHeight;

  // ── Pulse animation for mandatory captures ────────────────────────────

  useEffect(() => {
    if (state.mustCapture && !state.gameOver && state.turn === playerColor && !aiThinking) {
      const animate = () => {
        setPulsePhase(p => (p + 0.06) % (Math.PI * 2));
        pulseRef.current = requestAnimationFrame(animate);
      };
      pulseRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(pulseRef.current);
    }
  }, [state.mustCapture, state.gameOver, state.turn, playerColor, aiThinking]);

  // ── AI turn ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (state.gameOver || state.turn === playerColor || aiThinking) return;

    setAiThinking(true);
    const timer = setTimeout(() => {
      const move = getCheckersAIMove(state, difficulty);
      if (move) {
        const newState = makeMove(state, move);
        setLastMove(move);
        setState(newState);

        if (move.captured.length > 0) {
          gameSounds.capture();
        } else {
          gameSounds.move();
        }

        if (newState.gameOver) {
          if (newState.winner === playerColor) {
            gameSounds.win();
          } else {
            gameSounds.lose();
          }
        }
      }
      setAiThinking(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [state, playerColor, difficulty, aiThinking]);

  // ── Handle click ─────────────────────────────────────────────────────

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.gameOver || state.turn !== playerColor || aiThinking) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const mx = (e.clientX - rect.left) * (canvas.width / dpr / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / dpr / rect.height);

    const bx = mx - boardX;
    const by = my - boardY;
    if (bx < 0 || bx >= boardSize || by < 0 || by >= boardSize) return;

    const col = Math.floor(bx / sqSize);
    const row = Math.floor(by / sqSize);

    if (selected) {
      // Try to make a move
      const move = validMoves.find(m => m.to[0] === row && m.to[1] === col);
      if (move) {
        const newState = makeMove(state, move);
        setLastMove(move);
        setState(newState);
        setSelected(null);
        setValidMovesList([]);

        if (move.captured.length > 0) {
          gameSounds.capture();
          if (move.captured.length > 1) gameSounds.score();
        } else {
          gameSounds.move();
        }

        if (newState.gameOver) {
          if (newState.winner === playerColor) {
            gameSounds.win();
          } else {
            gameSounds.lose();
          }
        }
        return;
      }

      // Deselect
      setSelected(null);
      setValidMovesList([]);
    }

    // Select a piece
    const piece = state.board[row][col];
    if (piece && ((playerColor === 'r' && (piece === 'r' || piece === 'R')) ||
                  (playerColor === 'b' && (piece === 'b' || piece === 'B')))) {
      const moves = getValidMoves(state, row, col);
      if (moves.length > 0) {
        setSelected([row, col]);
        setValidMovesList(moves);
        gameSounds.tick();
      }
    }
  }, [state, selected, validMoves, playerColor, aiThinking, boardX, boardY, boardSize, sqSize]);

  // ── New game ─────────────────────────────────────────────────────────

  const newGame = useCallback(() => {
    setState(createInitialState());
    setSelected(null);
    setValidMovesList([]);
    setLastMove(null);
    setAiThinking(false);
  }, []);

  // ── Draw piece ───────────────────────────────────────────────────────

  const drawPiece = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, radius: number,
    isGreen: boolean, isKing: boolean,
  ) => {
    const mainColor = isGreen ? GREEN_PIECE : GOLD_PIECE;
    const darkColor = isGreen ? GREEN_PIECE_DARK : GOLD_PIECE_DARK;

    // Shadow
    ctx.beginPath();
    ctx.arc(cx + 1, cy + 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // Rim (3D effect)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = darkColor;
    ctx.fill();

    // Top face
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.1, radius * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = mainColor;
    ctx.fill();

    // Highlight
    const grad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.3, 0, cx, cy, radius * 0.85);
    grad.addColorStop(0, 'rgba(255,255,255,0.3)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.1, radius * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Border ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = isGreen ? 'rgba(0,150,80,0.6)' : 'rgba(200,160,20,0.6)';
    ctx.lineWidth = radius * 0.08;
    ctx.stroke();

    // King crown
    if (isKing) {
      const crownSize = radius * 0.45;
      const crownY = cy - radius * 0.15;
      ctx.fillStyle = CROWN_COLOR;
      ctx.strokeStyle = isGreen ? '#004D2B' : '#8B6914';
      ctx.lineWidth = radius * 0.06;

      ctx.beginPath();
      // Crown base
      ctx.moveTo(cx - crownSize, crownY + crownSize * 0.3);
      // Left point
      ctx.lineTo(cx - crownSize, crownY - crownSize * 0.5);
      // Valley
      ctx.lineTo(cx - crownSize * 0.5, crownY);
      // Center point
      ctx.lineTo(cx, crownY - crownSize * 0.7);
      // Valley
      ctx.lineTo(cx + crownSize * 0.5, crownY);
      // Right point
      ctx.lineTo(cx + crownSize, crownY - crownSize * 0.5);
      // Right base
      ctx.lineTo(cx + crownSize, crownY + crownSize * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crown jewels (small circles on points)
      const jewels = [
        [cx - crownSize, crownY - crownSize * 0.5],
        [cx, crownY - crownSize * 0.7],
        [cx + crownSize, crownY - crownSize * 0.5],
      ];
      ctx.fillStyle = isGreen ? '#FF4444' : '#FF4444';
      for (const [jx, jy] of jewels) {
        ctx.beginPath();
        ctx.arc(jx, jy, radius * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  // ── Draw ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // ── Header ─────────────────────────────────────────────────────────
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `bold ${Math.max(14, sqSize * 0.35)}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('GovPlay Checkers', canvasW / 2, 22);

    // Piece counts
    const counts = countPieces(state);
    const greenTotal = playerColor === 'r' ? counts.r + counts.rKings : counts.b + counts.bKings;
    const goldTotal = playerColor === 'r' ? counts.b + counts.bKings : counts.r + counts.rKings;

    ctx.font = `${Math.max(11, sqSize * 0.22)}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'left';

    // Player pieces indicator
    const indY = 40;
    const indR = Math.max(6, sqSize * 0.12);
    drawPiece(ctx, 12, indY, indR, playerColor === 'r', false);
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(`You: ${greenTotal}`, 24, indY + 4);

    ctx.textAlign = 'right';
    drawPiece(ctx, canvasW - 12, indY, indR, playerColor !== 'r', false);
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(`AI: ${goldTotal}`, canvasW - 24, indY + 4);

    // Status
    ctx.textAlign = 'center';
    ctx.font = `${Math.max(11, sqSize * 0.23)}px 'Segoe UI', system-ui, sans-serif`;
    let statusText = '';
    if (state.gameOver) {
      if (state.winner === playerColor) statusText = 'You win!';
      else if (state.winner) statusText = 'AI wins!';
      else statusText = 'Draw!';
      ctx.fillStyle = ACCENT;
    } else if (aiThinking) {
      statusText = 'AI thinking...';
      ctx.fillStyle = TEXT_COLOR;
    } else {
      statusText = state.turn === playerColor ? 'Your turn' : "AI's turn";
      if (state.mustCapture && state.turn === playerColor) statusText += ' (must capture!)';
      ctx.fillStyle = state.mustCapture ? '#FF6B6B' : TEXT_COLOR;
    }
    ctx.fillText(statusText, canvasW / 2, 58);

    // ── Board ──────────────────────────────────────────────────────────
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = boardX + c * sqSize;
        const y = boardY + r * sqSize;

        // Square
        const isLight = (r + c) % 2 === 0;
        ctx.fillStyle = isLight ? LIGHT_SQ : DARK_SQ;
        ctx.fillRect(x, y, sqSize, sqSize);

        // Selected highlight
        if (selected && selected[0] === r && selected[1] === c) {
          ctx.fillStyle = SELECTED_SQ;
          ctx.fillRect(x, y, sqSize, sqSize);
        }

        // Last move highlight
        if (lastMove) {
          if ((r === lastMove.from[0] && c === lastMove.from[1]) ||
              (r === lastMove.to[0] && c === lastMove.to[1])) {
            ctx.fillStyle = 'rgba(100, 149, 237, 0.25)';
            ctx.fillRect(x, y, sqSize, sqSize);
          }
        }
      }
    }

    // ── Valid move indicators ──────────────────────────────────────────
    for (const move of validMoves) {
      const x = boardX + move.to[1] * sqSize;
      const y = boardY + move.to[0] * sqSize;

      if (move.captured.length > 0) {
        // Mandatory capture: pulsing indicator
        const pulseAlpha = 0.3 + Math.sin(pulsePhase) * 0.3;
        ctx.fillStyle = `rgba(255, 80, 80, ${pulseAlpha})`;
        ctx.fillRect(x, y, sqSize, sqSize);

        // X marker
        ctx.strokeStyle = `rgba(255, 100, 100, ${0.5 + pulseAlpha})`;
        ctx.lineWidth = 2;
        const inset = sqSize * 0.3;
        ctx.beginPath();
        ctx.moveTo(x + inset, y + inset);
        ctx.lineTo(x + sqSize - inset, y + sqSize - inset);
        ctx.moveTo(x + sqSize - inset, y + inset);
        ctx.lineTo(x + inset, y + sqSize - inset);
        ctx.stroke();
      } else {
        // Normal move: dot
        ctx.fillStyle = VALID_DOT;
        ctx.beginPath();
        ctx.arc(x + sqSize / 2, y + sqSize / 2, sqSize * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Pieces ─────────────────────────────────────────────────────────
    const pieceRadius = sqSize * 0.38;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = state.board[r][c];
        if (!piece) continue;

        const cx = boardX + c * sqSize + sqSize / 2;
        const cy = boardY + r * sqSize + sqSize / 2;
        const isGreen = (piece === 'r' || piece === 'R') ? (playerColor === 'r') : (playerColor !== 'r');
        const isK = piece === 'R' || piece === 'B';

        drawPiece(ctx, cx, cy, pieceRadius, isGreen, isK);
      }
    }

    // ── Board border ──────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(boardX, boardY, boardSize, boardSize);

  }, [state, selected, validMoves, lastMove, aiThinking, pulsePhase, boardX, boardY, boardSize, sqSize, canvasW, canvasH, playerColor, drawPiece]);

  // ── Controls ─────────────────────────────────────────────────────────

  return (
    <div style={{
      width: containerWidth,
      height: containerHeight,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: BG_COLOR,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ cursor: 'pointer', maxWidth: '100%' }}
      />
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '6px 12px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <select
          value={difficulty}
          onChange={e => { setDifficulty(e.target.value as AIDifficulty); newGame(); }}
          style={{
            background: PANEL_BG, color: TEXT_COLOR, border: `1px solid ${ACCENT}`,
            borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer',
          }}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select
          value={playerColor}
          onChange={e => { setPlayerColor(e.target.value as 'r' | 'b'); newGame(); }}
          style={{
            background: PANEL_BG, color: TEXT_COLOR, border: `1px solid ${ACCENT}`,
            borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer',
          }}
        >
          <option value="r">Play Green (first)</option>
          <option value="b">Play Gold (second)</option>
        </select>

        <button
          onClick={newGame}
          style={{
            background: ACCENT, color: '#000', border: 'none',
            borderRadius: 6, padding: '4px 14px', fontSize: 12,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          New Game
        </button>
      </div>
    </div>
  );
}
