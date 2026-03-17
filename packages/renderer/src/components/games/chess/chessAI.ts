// ── GovPlay Chess AI ────────────────────────────────────────────────────
// Minimax with alpha-beta pruning, piece-square tables, move ordering,
// and a small opening book for Hard mode.

import {
  ChessState,
  ChessMove,
  getAllLegalMoves,
  getLegalMoves,
  makeMove,
  isCheck,
} from './chessLogic';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

// ── Material values ─────────────────────────────────────────────────────

const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 0,
};

// ── Piece-square tables (from white's perspective, flip for black) ──────

const PST_PAWN = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0],
];

const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10, 10,  5, 10, 10,  5, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];

const PST_ROOK = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0],
];

const PST_QUEEN = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];

const PST_KING_MID = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20],
];

const PST_MAP: Record<string, number[][]> = {
  p: PST_PAWN, n: PST_KNIGHT, b: PST_BISHOP, r: PST_ROOK, q: PST_QUEEN, k: PST_KING_MID,
};

// ── Evaluation ──────────────────────────────────────────────────────────

function evaluate(state: ChessState): number {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;

      const type = piece.toLowerCase();
      const isWhite = piece === piece.toUpperCase();
      const materialValue = PIECE_VALUES[type] || 0;
      const pst = PST_MAP[type];
      // White pieces read PST normally (row 0 = top = rank 8)
      // Black pieces flip the row
      const pstRow = isWhite ? r : 7 - r;
      const positionalValue = pst ? pst[pstRow][c] : 0;

      const pieceScore = materialValue + positionalValue;
      score += isWhite ? pieceScore : -pieceScore;
    }
  }

  // Small bonus for mobility
  const currentMoves = getAllLegalMoves(state).length;
  const mobilityBonus = currentMoves * 2;
  score += state.turn === 'w' ? mobilityBonus : -mobilityBonus;

  return score;
}

// ── Move ordering ───────────────────────────────────────────────────────

function orderMoves(moves: ChessMove[], state: ChessState): ChessMove[] {
  return [...moves].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Captures first, ordered by MVV-LVA
    if (a.captured) scoreA += 1000 + (PIECE_VALUES[a.captured.toLowerCase()] || 0) - (PIECE_VALUES[a.piece.toLowerCase()] || 0) / 10;
    if (b.captured) scoreB += 1000 + (PIECE_VALUES[b.captured.toLowerCase()] || 0) - (PIECE_VALUES[b.piece.toLowerCase()] || 0) / 10;

    // Promotions
    if (a.promotion) scoreA += 800;
    if (b.promotion) scoreB += 800;

    // Checks (light heuristic — moves to center are often checks)
    // We don't fully simulate here for speed, but castling gets a small bump
    if (a.castle) scoreA += 50;
    if (b.castle) scoreB += 50;

    return scoreB - scoreA;
  });
}

// ── Minimax with alpha-beta ─────────────────────────────────────────────

function minimax(
  state: ChessState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  if (depth === 0 || state.gameOver) {
    return evaluate(state);
  }

  const moves = getAllLegalMoves(state);
  if (moves.length === 0) {
    if (isCheck(state, state.turn)) {
      // Checkmate — favor faster mates
      return maximizing ? -99999 - depth : 99999 + depth;
    }
    return 0; // stalemate
  }

  const ordered = orderMoves(moves, state);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of ordered) {
      const newState = makeMove(state, move.from, move.to, move.promotion);
      const val = minimax(newState, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of ordered) {
      const newState = makeMove(state, move.from, move.to, move.promotion);
      const val = minimax(newState, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// ── Opening book (Hard mode) ────────────────────────────────────────────

interface BookEntry {
  moves: string; // e.g. "e2e4" concatenated history
  response: { from: [number, number]; to: [number, number] };
}

const OPENING_BOOK: BookEntry[] = [
  // Sicilian Defense response to e4
  { moves: '', response: { from: [6, 4], to: [4, 4] } }, // 1. e4
  // After 1. e4 e5, play Nf3
  { moves: 'e2e4e7e5', response: { from: [7, 6], to: [5, 5] } }, // 2. Nf3
  // After 1. e4 c5 (Sicilian), play Nf3
  { moves: 'e2e4c7c5', response: { from: [7, 6], to: [5, 5] } },
  // After 1. d4, play d5
  { moves: '', response: { from: [6, 3], to: [4, 3] } }, // 1. d4
  // Italian Game: after 1.e4 e5 2.Nf3 Nc6, play Bc4
  { moves: 'e2e4e7e5g1f3b8c6', response: { from: [7, 5], to: [4, 2] } },
  // Queen's Gambit: after 1.d4 d5, play c4
  { moves: 'd2d4d7d5', response: { from: [6, 2], to: [4, 2] } },
  // As black: respond to 1.e4 with e5
  { moves: 'e2e4', response: { from: [1, 4], to: [3, 4] } },
  // As black: respond to 1.d4 with d5
  { moves: 'd2d4', response: { from: [1, 3], to: [3, 3] } },
  // As black: respond to 1.e4 e5 2.Nf3 with Nc6
  { moves: 'e2e4e7e5g1f3', response: { from: [0, 1], to: [2, 2] } },
  // As black: respond to 1.d4 d5 2.c4 with e6 (QGD)
  { moves: 'd2d4d7d5c2c4', response: { from: [1, 4], to: [2, 4] } },
];

function moveToNotation(move: ChessMove): string {
  const colChar = (c: number) => String.fromCharCode(97 + c);
  const rowChar = (r: number) => String(8 - r);
  return `${colChar(move.from[1])}${rowChar(move.from[0])}${colChar(move.to[1])}${rowChar(move.to[0])}`;
}

function lookupOpeningBook(state: ChessState): { from: [number, number]; to: [number, number] } | null {
  if (state.moveHistory.length > 8) return null; // Only use book in early game

  const historyStr = state.moveHistory.map(m => moveToNotation(m)).join('');

  for (const entry of OPENING_BOOK) {
    if (entry.moves === historyStr) {
      // Verify the move is legal
      const legalMoves = getLegalMoves(state, entry.response.from[0], entry.response.from[1]);
      const match = legalMoves.find(m => m.to[0] === entry.response.to[0] && m.to[1] === entry.response.to[1]);
      if (match) return entry.response;
    }
  }

  return null;
}

// ── Main AI entry point ─────────────────────────────────────────────────

export function getAIMove(state: ChessState, difficulty: AIDifficulty): ChessMove | null {
  const allMoves = getAllLegalMoves(state);
  if (allMoves.length === 0) return null;

  const depths: Record<AIDifficulty, number> = { easy: 2, medium: 4, hard: 5 };
  const depth = depths[difficulty];
  const maximizing = state.turn === 'w';

  // Try opening book for hard mode
  if (difficulty === 'hard') {
    const bookMove = lookupOpeningBook(state);
    if (bookMove) {
      const move = allMoves.find(m =>
        m.from[0] === bookMove.from[0] && m.from[1] === bookMove.from[1]
        && m.to[0] === bookMove.to[0] && m.to[1] === bookMove.to[1]
      );
      if (move) return move;
    }
  }

  // Easy mode: add some randomness
  if (difficulty === 'easy') {
    // 30% chance of picking a random move
    if (Math.random() < 0.3) {
      return allMoves[Math.floor(Math.random() * allMoves.length)];
    }
  }

  const ordered = orderMoves(allMoves, state);
  let bestMove: ChessMove = ordered[0];
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const move of ordered) {
    const newState = makeMove(state, move.from, move.to, move.promotion);
    const score = minimax(newState, depth - 1, -Infinity, Infinity, !maximizing);

    if (maximizing) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  // Medium mode: small chance of second-best move
  if (difficulty === 'medium' && Math.random() < 0.1 && ordered.length > 1) {
    // Find second best
    let secondBest: ChessMove = ordered[0] === bestMove ? ordered[1] : ordered[0];
    let secondScore = maximizing ? -Infinity : Infinity;
    for (const move of ordered) {
      if (move === bestMove) continue;
      const newState = makeMove(state, move.from, move.to, move.promotion);
      const score = minimax(newState, depth - 1, -Infinity, Infinity, !maximizing);
      if (maximizing ? score > secondScore : score < secondScore) {
        secondScore = score;
        secondBest = move;
      }
    }
    return secondBest;
  }

  return bestMove;
}
