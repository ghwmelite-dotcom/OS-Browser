// ── GovPlay Chess ───────────────────────────────────────────────────────
// Canvas-rendered chess game with vector piece rendering, AI opponent,
// and full rules support (castling, en passant, promotion, etc.)

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ChessState,
  createInitialState,
  getValidMoves,
  makeMove,
  needsPromotion,
  isCheck,
  getCapturedPieces,
} from './chessLogic';
import { getAIMove, AIDifficulty } from './chessAI';
import { gameSounds } from '../GameSoundEngine';

interface Props {
  containerWidth: number;
  containerHeight: number;
}

// ── Colors ──────────────────────────────────────────────────────────────

const LIGHT_SQ = '#F0E6C0';
const DARK_SQ = '#8B6F47';
const SELECTED_SQ = 'rgba(255, 215, 0, 0.5)';
const LAST_MOVE_SQ = 'rgba(100, 149, 237, 0.35)';
const CHECK_SQ = 'rgba(255, 0, 0, 0.5)';
const VALID_DOT = 'rgba(0, 0, 0, 0.25)';
const CAPTURE_CORNER = 'rgba(220, 50, 50, 0.6)';
const WHITE_FILL = '#FEFCE8';
const WHITE_STROKE = '#3D2E1C';
const BLACK_FILL = '#2D2D2D';
const BLACK_STROKE = '#D4A017';
const BG_COLOR = '#1A1A2E';
const PANEL_BG = '#16213E';
const TEXT_COLOR = '#E0E0E0';
const ACCENT = '#D4A017';

// ── Piece drawing functions (Path2D vector shapes) ──────────────────────

function drawPawn(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, isWhite: boolean) {
  const s = size * 0.38;
  ctx.fillStyle = isWhite ? WHITE_FILL : BLACK_FILL;
  ctx.strokeStyle = isWhite ? WHITE_STROKE : BLACK_STROKE;
  ctx.lineWidth = size * 0.035;

  ctx.beginPath();
  // Base
  ctx.ellipse(cx, cy + s * 0.7, s * 0.55, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  // Body (tapered)
  ctx.moveTo(cx - s * 0.35, cy + s * 0.55);
  ctx.quadraticCurveTo(cx - s * 0.15, cy - s * 0.1, cx - s * 0.18, cy - s * 0.35);
  ctx.quadraticCurveTo(cx, cy - s * 0.5, cx + s * 0.18, cy - s * 0.35);
  ctx.quadraticCurveTo(cx + s * 0.15, cy - s * 0.1, cx + s * 0.35, cy + s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head (circle)
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.55, s * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawRook(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, isWhite: boolean) {
  const s = size * 0.38;
  ctx.fillStyle = isWhite ? WHITE_FILL : BLACK_FILL;
  ctx.strokeStyle = isWhite ? WHITE_STROKE : BLACK_STROKE;
  ctx.lineWidth = size * 0.035;

  ctx.beginPath();
  // Base
  ctx.rect(cx - s * 0.55, cy + s * 0.5, s * 1.1, s * 0.22);
  ctx.fill(); ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.42, cy + s * 0.5);
  ctx.lineTo(cx - s * 0.35, cy - s * 0.25);
  ctx.lineTo(cx + s * 0.35, cy - s * 0.25);
  ctx.lineTo(cx + s * 0.42, cy + s * 0.5);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Crenellations
  ctx.beginPath();
  const crens = [
    [-0.42, -0.25, -0.42, -0.65],
    [-0.42, -0.65, -0.25, -0.65],
    [-0.25, -0.65, -0.25, -0.45],
    [-0.25, -0.45, -0.08, -0.45],
    [-0.08, -0.45, -0.08, -0.65],
    [-0.08, -0.65, 0.08, -0.65],
    [0.08, -0.65, 0.08, -0.45],
    [0.08, -0.45, 0.25, -0.45],
    [0.25, -0.45, 0.25, -0.65],
    [0.25, -0.65, 0.42, -0.65],
    [0.42, -0.65, 0.42, -0.25],
  ];
  ctx.moveTo(cx + crens[0][0] * s, cy + crens[0][1] * s);
  for (const [, , x2, y2] of crens) {
    ctx.lineTo(cx + x2 * s, cy + y2 * s);
  }
  ctx.closePath();
  ctx.fill(); ctx.stroke();
}

function drawKnight(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, isWhite: boolean) {
  const s = size * 0.38;
  ctx.fillStyle = isWhite ? WHITE_FILL : BLACK_FILL;
  ctx.strokeStyle = isWhite ? WHITE_STROKE : BLACK_STROKE;
  ctx.lineWidth = size * 0.035;

  // Base
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.65, s * 0.5, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Horse head silhouette
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.5);
  ctx.quadraticCurveTo(cx - s * 0.45, cy + s * 0.1, cx - s * 0.35, cy - s * 0.15);
  ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.3, cx - s * 0.35, cy - s * 0.5);
  // Ear
  ctx.quadraticCurveTo(cx - s * 0.25, cy - s * 0.75, cx - s * 0.1, cy - s * 0.7);
  // Top of head
  ctx.quadraticCurveTo(cx + s * 0.05, cy - s * 0.75, cx + s * 0.15, cy - s * 0.55);
  // Nose/muzzle
  ctx.quadraticCurveTo(cx + s * 0.35, cy - s * 0.5, cx + s * 0.4, cy - s * 0.3);
  ctx.quadraticCurveTo(cx + s * 0.45, cy - s * 0.15, cx + s * 0.25, cy - s * 0.1);
  // Chin/neck
  ctx.quadraticCurveTo(cx + s * 0.4, cy + s * 0.15, cx + s * 0.35, cy + s * 0.5);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Eye
  const eyeR = s * 0.06;
  ctx.fillStyle = isWhite ? WHITE_STROKE : BLACK_STROKE;
  ctx.beginPath();
  ctx.arc(cx - s * 0.05, cy - s * 0.4, eyeR, 0, Math.PI * 2);
  ctx.fill();
}

function drawBishop(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, isWhite: boolean) {
  const s = size * 0.38;
  ctx.fillStyle = isWhite ? WHITE_FILL : BLACK_FILL;
  ctx.strokeStyle = isWhite ? WHITE_STROKE : BLACK_STROKE;
  ctx.lineWidth = size * 0.035;

  // Base
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.7, s * 0.5, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy + s * 0.55);
  ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.1, cx - s * 0.22, cy - s * 0.15);
  ctx.quadraticCurveTo(cx - s * 0.2, cy - s * 0.4, cx, cy - s * 0.55);
  ctx.quadraticCurveTo(cx + s * 0.2, cy - s * 0.4, cx + s * 0.22, cy - s * 0.15);
  ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.1, cx + s * 0.35, cy + s * 0.55);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Mitre slit
  ctx.strokeStyle = isWhite ? WHITE_STROKE : BLACK_STROKE;
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.12, cy - s * 0.05);
  ctx.lineTo(cx + s * 0.12, cy - s * 0.3);
  ctx.stroke();

  // Top ball
  ctx.fillStyle = isWhite ? WHITE_FILL : BLACK_FILL;
  ctx.strokeStyle = isWhite ? WHITE_STROKE : BLACK_STROKE;
  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.65, s * 0.1, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
}

function drawQueen(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, isWhite: boolean) {
  const s = size * 0.40;
  ctx.fillStyle = isWhite ? WHITE_FILL : BLACK_FILL;
  ctx.strokeStyle = isWhite ? WHITE_STROKE : BLACK_STROKE;
  ctx.lineWidth = size * 0.035;

  // Base
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.65, s * 0.55, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Body (bell shape)
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.45, cy + s * 0.5);
  ctx.quadraticCurveTo(cx - s * 0.35, cy, cx - s * 0.25, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.25, cy - s * 0.2);
  ctx.quadraticCurveTo(cx + s * 0.35, cy, cx + s * 0.45, cy + s * 0.5);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Crown with 5 points
  ctx.beginPath();
  const crownBase = cy - s * 0.2;
  const crownTop = cy - s * 0.7;
  const points = 5;
  ctx.moveTo(cx - s * 0.35, crownBase);
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const px = cx + (t - 0.5) * s * 0.7;
    const valleyX = cx + ((i + 0.5) / (points - 1) - 0.5) * s * 0.7;
    ctx.lineTo(px, crownTop + Math.abs(t - 0.5) * s * 0.1);
    if (i < points - 1) {
      ctx.lineTo(valleyX, crownBase - s * 0.15);
    }
  }
  ctx.lineTo(cx + s * 0.35, crownBase);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Balls on crown points
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const px = cx + (t - 0.5) * s * 0.7;
    const py = crownTop + Math.abs(t - 0.5) * s * 0.1;
    ctx.beginPath();
    ctx.arc(px, py, s * 0.06, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
}

function drawKing(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, isWhite: boolean) {
  const s = size * 0.40;
  ctx.fillStyle = isWhite ? WHITE_FILL : BLACK_FILL;
  ctx.strokeStyle = isWhite ? WHITE_STROKE : BLACK_STROKE;
  ctx.lineWidth = size * 0.035;

  // Base
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.65, s * 0.55, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Body (tapered column)
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy + s * 0.5);
  ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.1, cx - s * 0.2, cy - s * 0.15);
  ctx.lineTo(cx + s * 0.2, cy - s * 0.15);
  ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.1, cx + s * 0.4, cy + s * 0.5);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Dome
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.15, s * 0.22, Math.PI, 0);
  ctx.fill(); ctx.stroke();

  // Cross on top
  const crossW = s * 0.07;
  const crossBase = cy - s * 0.35;
  ctx.beginPath();
  // Vertical
  ctx.rect(cx - crossW, crossBase - s * 0.35, crossW * 2, s * 0.35);
  ctx.fill(); ctx.stroke();
  // Horizontal
  ctx.beginPath();
  ctx.rect(cx - s * 0.13, crossBase - s * 0.25, s * 0.26, crossW * 2);
  ctx.fill(); ctx.stroke();
}

const PIECE_DRAWERS: Record<string, (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, isWhite: boolean) => void> = {
  p: drawPawn, r: drawRook, n: drawKnight, b: drawBishop, q: drawQueen, k: drawKing,
};

// ── Main component ──────────────────────────────────────────────────────

export default function ChessGame({ containerWidth, containerHeight }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<ChessState>(createInitialState);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [validMoves, setValidMovesList] = useState<[number, number][]>([]);
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [aiThinking, setAiThinking] = useState(false);
  const [promotionPending, setPromotionPending] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [checkFlash, setCheckFlash] = useState(false);
  const animFrameRef = useRef<number>(0);

  // Board layout calculations
  const padding = 16;
  const panelWidth = Math.min(160, containerWidth * 0.18);
  const availableW = containerWidth - panelWidth - padding * 3;
  const availableH = containerHeight - padding * 2 - 80; // 80 for header/controls
  const boardSize = Math.max(200, Math.min(availableW, availableH));
  const sqSize = boardSize / 8;

  // Canvas total size
  const canvasW = boardSize + panelWidth + padding;
  const canvasH = boardSize + 80;

  const boardX = panelWidth + padding;
  const boardY = 60;

  // ── Check flash animation ────────────────────────────────────────────

  useEffect(() => {
    if (isCheck(state, state.turn) && !state.gameOver) {
      setCheckFlash(true);
      const timer = setTimeout(() => setCheckFlash(false), 600);
      return () => clearTimeout(timer);
    }
    setCheckFlash(false);
  }, [state]);

  // ── AI turn ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (state.gameOver || state.turn === playerColor || aiThinking) return;

    setAiThinking(true);
    const timer = setTimeout(() => {
      const move = getAIMove(state, difficulty);
      if (move) {
        const newState = makeMove(state, move.from, move.to, move.promotion);
        setLastMove({ from: move.from, to: move.to });
        setState(newState);

        if (move.captured) {
          gameSounds.capture();
        } else {
          gameSounds.move();
        }

        if (newState.gameOver) {
          if (newState.result === '1/2-1/2') {
            gameSounds.lose();
          } else {
            gameSounds.lose();
          }
        }
      }
      setAiThinking(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [state, playerColor, difficulty, aiThinking]);

  // ── Handle click ─────────────────────────────────────────────────────

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.gameOver || state.turn !== playerColor || aiThinking || promotionPending) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const mx = (e.clientX - rect.left) * (canvas.width / dpr / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / dpr / rect.height);

    // Check if click is on the board
    const bx = mx - boardX;
    const by = my - boardY;
    if (bx < 0 || bx >= boardSize || by < 0 || by >= boardSize) return;

    const col = Math.floor(bx / sqSize);
    const row = Math.floor(by / sqSize);

    if (selected) {
      // Try to make a move
      const isValid = validMoves.some(([r, c]) => r === row && c === col);
      if (isValid) {
        // Check for promotion
        if (needsPromotion(state, selected, [row, col])) {
          setPromotionPending({ from: selected, to: [row, col] });
          return;
        }

        const newState = makeMove(state, selected, [row, col]);
        const piece = state.board[selected[0]][selected[1]];
        const captured = state.board[row][col];

        setLastMove({ from: selected, to: [row, col] });
        setState(newState);
        setSelected(null);
        setValidMovesList([]);

        if (captured) {
          gameSounds.capture();
        } else {
          gameSounds.move();
        }

        if (newState.gameOver) {
          if (newState.result === '1/2-1/2') {
            gameSounds.lose();
          } else if (
            (playerColor === 'w' && newState.result === '1-0') ||
            (playerColor === 'b' && newState.result === '0-1')
          ) {
            gameSounds.win();
          } else {
            gameSounds.lose();
          }
        }
        return;
      }

      // Deselect or select different piece
      setSelected(null);
      setValidMovesList([]);
    }

    // Select a piece
    const piece = state.board[row][col];
    if (piece) {
      const pieceColor = piece === piece.toUpperCase() ? 'w' : 'b';
      if (pieceColor === playerColor) {
        const moves = getValidMoves(state, row, col);
        if (moves.length > 0) {
          setSelected([row, col]);
          setValidMovesList(moves);
          gameSounds.tick();
        }
      }
    }
  }, [state, selected, validMoves, playerColor, aiThinking, promotionPending, boardX, boardY, boardSize, sqSize]);

  // ── Handle promotion choice ──────────────────────────────────────────

  const handlePromotion = useCallback((pieceType: string) => {
    if (!promotionPending) return;
    const promotion = playerColor === 'w' ? pieceType.toUpperCase() : pieceType.toLowerCase();
    const newState = makeMove(state, promotionPending.from, promotionPending.to, promotion);
    setLastMove({ from: promotionPending.from, to: promotionPending.to });
    setState(newState);
    setSelected(null);
    setValidMovesList([]);
    setPromotionPending(null);
    gameSounds.score();
  }, [promotionPending, state, playerColor]);

  // ── New game ─────────────────────────────────────────────────────────

  const newGame = useCallback(() => {
    setState(createInitialState());
    setSelected(null);
    setValidMovesList([]);
    setLastMove(null);
    setPromotionPending(null);
    setAiThinking(false);
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
    ctx.fillText('GovPlay Chess', canvasW / 2, 25);

    // Turn / status
    ctx.font = `${Math.max(11, sqSize * 0.25)}px 'Segoe UI', system-ui, sans-serif`;
    let statusText = '';
    if (state.gameOver) {
      if (state.result === '1-0') statusText = 'White wins — ' + state.resultReason;
      else if (state.result === '0-1') statusText = 'Black wins — ' + state.resultReason;
      else statusText = 'Draw — ' + state.resultReason;
    } else if (aiThinking) {
      statusText = 'AI thinking...';
    } else {
      statusText = state.turn === 'w' ? "White's turn" : "Black's turn";
      if (isCheck(state, state.turn)) statusText += ' (Check!)';
    }
    ctx.fillStyle = state.gameOver ? ACCENT : TEXT_COLOR;
    ctx.fillText(statusText, canvasW / 2, 48);

    // ── Board ──────────────────────────────────────────────────────────
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = boardX + c * sqSize;
        const y = boardY + r * sqSize;

        // Square color
        const isLight = (r + c) % 2 === 0;
        ctx.fillStyle = isLight ? LIGHT_SQ : DARK_SQ;
        ctx.fillRect(x, y, sqSize, sqSize);

        // Last move highlight
        if (lastMove) {
          if ((r === lastMove.from[0] && c === lastMove.from[1]) ||
              (r === lastMove.to[0] && c === lastMove.to[1])) {
            ctx.fillStyle = LAST_MOVE_SQ;
            ctx.fillRect(x, y, sqSize, sqSize);
          }
        }

        // Selected square
        if (selected && selected[0] === r && selected[1] === c) {
          ctx.fillStyle = SELECTED_SQ;
          ctx.fillRect(x, y, sqSize, sqSize);
        }

        // Check highlight
        if (checkFlash && !state.gameOver) {
          const piece = state.board[r][c];
          if (piece) {
            const isKing = piece.toLowerCase() === 'k';
            const pieceColor = piece === piece.toUpperCase() ? 'w' : 'b';
            if (isKing && pieceColor === state.turn) {
              ctx.fillStyle = CHECK_SQ;
              ctx.fillRect(x, y, sqSize, sqSize);
            }
          }
        }
      }
    }

    // ── Valid move indicators ──────────────────────────────────────────
    for (const [mr, mc] of validMoves) {
      const x = boardX + mc * sqSize;
      const y = boardY + mr * sqSize;
      const target = state.board[mr][mc];

      if (target) {
        // Capture: red corner triangles
        ctx.fillStyle = CAPTURE_CORNER;
        const cs = sqSize * 0.22;
        // Top-left
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cs, y); ctx.lineTo(x, y + cs); ctx.closePath(); ctx.fill();
        // Top-right
        ctx.beginPath(); ctx.moveTo(x + sqSize, y); ctx.lineTo(x + sqSize - cs, y); ctx.lineTo(x + sqSize, y + cs); ctx.closePath(); ctx.fill();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(x, y + sqSize); ctx.lineTo(x + cs, y + sqSize); ctx.lineTo(x, y + sqSize - cs); ctx.closePath(); ctx.fill();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(x + sqSize, y + sqSize); ctx.lineTo(x + sqSize - cs, y + sqSize); ctx.lineTo(x + sqSize, y + sqSize - cs); ctx.closePath(); ctx.fill();
      } else {
        // Empty: dot
        ctx.fillStyle = VALID_DOT;
        ctx.beginPath();
        ctx.arc(x + sqSize / 2, y + sqSize / 2, sqSize * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Pieces ─────────────────────────────────────────────────────────
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = state.board[r][c];
        if (!piece) continue;
        const x = boardX + c * sqSize + sqSize / 2;
        const y = boardY + r * sqSize + sqSize / 2;
        const isW = piece === piece.toUpperCase();
        const type = piece.toLowerCase();
        const drawer = PIECE_DRAWERS[type];
        if (drawer) {
          ctx.save();
          drawer(ctx, x, y, sqSize, isW);
          ctx.restore();
        }
      }
    }

    // ── Rank/file labels ──────────────────────────────────────────────
    ctx.font = `${Math.max(9, sqSize * 0.2)}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) {
      // File labels (a-h)
      ctx.fillStyle = i % 2 === 0 ? DARK_SQ : LIGHT_SQ;
      ctx.fillText(String.fromCharCode(97 + i), boardX + i * sqSize + sqSize - 6, boardY + boardSize - 6);
      // Rank labels (1-8)
      ctx.fillStyle = i % 2 === 0 ? LIGHT_SQ : DARK_SQ;
      ctx.fillText(String(8 - i), boardX + 6, boardY + i * sqSize + 8);
    }

    // ── Captured pieces panel ─────────────────────────────────────────
    const captured = getCapturedPieces(state);
    const capSize = Math.max(14, sqSize * 0.4);

    ctx.fillStyle = PANEL_BG;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    const panelX = 4;
    const panelY = boardY;
    const panelH = boardSize;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth - 8, panelH, 8);
    ctx.fill(); ctx.stroke();

    // Captured by player (black pieces taken)
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `bold ${Math.max(10, capSize * 0.6)}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('Captured', panelX + 8, panelY + 18);

    // Black pieces captured (by white)
    let capY = panelY + 32;
    ctx.fillStyle = '#AAA';
    ctx.font = `${Math.max(9, capSize * 0.5)}px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillText('By White:', panelX + 8, capY);
    capY += 6;

    let capX = panelX + 8;
    const maxCapPerRow = Math.floor((panelWidth - 24) / (capSize * 0.7));
    for (let i = 0; i < captured.black.length; i++) {
      if (i > 0 && i % maxCapPerRow === 0) {
        capX = panelX + 8;
        capY += capSize + 2;
      }
      const p = captured.black[i];
      const drawer = PIECE_DRAWERS[p.toLowerCase()];
      if (drawer) {
        ctx.save();
        drawer(ctx, capX + capSize * 0.35, capY + capSize * 0.5, capSize * 0.7, false);
        ctx.restore();
      }
      capX += capSize * 0.7;
    }

    capY += capSize + 20;
    ctx.fillStyle = '#AAA';
    ctx.font = `${Math.max(9, capSize * 0.5)}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('By Black:', panelX + 8, capY);
    capY += 6;

    capX = panelX + 8;
    for (let i = 0; i < captured.white.length; i++) {
      if (i > 0 && i % maxCapPerRow === 0) {
        capX = panelX + 8;
        capY += capSize + 2;
      }
      const p = captured.white[i];
      const drawer = PIECE_DRAWERS[p.toLowerCase()];
      if (drawer) {
        ctx.save();
        drawer(ctx, capX + capSize * 0.35, capY + capSize * 0.5, capSize * 0.7, true);
        ctx.restore();
      }
      capX += capSize * 0.7;
    }

    // ── Promotion dialog ──────────────────────────────────────────────
    if (promotionPending) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvasW, canvasH);

      const dlgW = sqSize * 4.5;
      const dlgH = sqSize * 1.8;
      const dlgX = (canvasW - dlgW) / 2;
      const dlgY = (canvasH - dlgH) / 2;

      ctx.fillStyle = PANEL_BG;
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(dlgX, dlgY, dlgW, dlgH, 12);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `bold ${Math.max(12, sqSize * 0.28)}px 'Segoe UI', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Promote pawn to:', dlgX + dlgW / 2, dlgY + sqSize * 0.35);

      const pieces = ['q', 'r', 'b', 'n'];
      const isW = playerColor === 'w';
      const pieceY = dlgY + sqSize * 1.05;
      for (let i = 0; i < 4; i++) {
        const px = dlgX + (i + 0.5) * (dlgW / 4);
        const drawer = PIECE_DRAWERS[pieces[i]];
        if (drawer) {
          ctx.save();
          drawer(ctx, px, pieceY, sqSize * 0.9, isW);
          ctx.restore();
        }
      }
    }
  }, [state, selected, validMoves, lastMove, checkFlash, aiThinking, promotionPending, boardX, boardY, boardSize, sqSize, canvasW, canvasH, playerColor, panelWidth]);

  // ── Handle promotion click ───────────────────────────────────────────

  const handlePromotionClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!promotionPending) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const mx = (e.clientX - rect.left) * (canvas.width / dpr / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / dpr / rect.height);

    const dlgW = sqSize * 4.5;
    const dlgH = sqSize * 1.8;
    const dlgX = (canvasW - dlgW) / 2;
    const dlgY = (canvasH - dlgH) / 2;

    // Check if click is within promotion dialog
    if (mx >= dlgX && mx <= dlgX + dlgW && my >= dlgY && my <= dlgY + dlgH) {
      const pieces = ['q', 'r', 'b', 'n'];
      const slotW = dlgW / 4;
      const idx = Math.floor((mx - dlgX) / slotW);
      if (idx >= 0 && idx < 4) {
        handlePromotion(pieces[idx]);
      }
    }
  }, [promotionPending, sqSize, canvasW, canvasH, handlePromotion]);

  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (promotionPending) {
      handlePromotionClick(e);
    } else {
      handleClick(e);
    }
  }, [promotionPending, handlePromotionClick, handleClick]);

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
        onClick={onCanvasClick}
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
          onChange={e => { setPlayerColor(e.target.value as 'w' | 'b'); newGame(); }}
          style={{
            background: PANEL_BG, color: TEXT_COLOR, border: `1px solid ${ACCENT}`,
            borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer',
          }}
        >
          <option value="w">Play White</option>
          <option value="b">Play Black</option>
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
