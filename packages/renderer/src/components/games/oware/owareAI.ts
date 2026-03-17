// ── Oware AI — Minimax with Alpha-Beta Pruning ────────────────────────────
// Provides a computer opponent for the Oware game at three difficulty levels.

import {
  type OwareState,
  getValidMoves,
  makeMove,
  cloneOwareState,
  sideTotal,
  opponent,
  PITS_PER_PLAYER,
} from './owareLogic';

// ── Evaluation ───────────────────────────────────────────────────────────────

/**
 * Evaluate a board position from the perspective of `player`.
 * Positive = good for player, negative = good for opponent.
 *
 * Factors:
 * - Score differential (strongest signal)
 * - Seeds on own side (potential for future captures)
 * - Seeds threatening opponent pits with 1 seed (near-capture)
 */
function evaluate(state: OwareState, player: 0 | 1): number {
  const opp = opponent(player);

  // Score differential is the dominant factor
  const scoreDiff = state.scores[player] - state.scores[opp];

  // Seeds on own side — more flexibility and defense
  const ownSeeds = sideTotal(state.pits, player);
  const oppSeeds = sideTotal(state.pits, opp);

  // Count opponent pits with exactly 1 seed (vulnerable to capture: landing makes it 2)
  const oppStart = opp * PITS_PER_PLAYER;
  let vulnerablePits = 0;
  for (let i = oppStart; i < oppStart + PITS_PER_PLAYER; i++) {
    if (state.pits[i] === 1 || state.pits[i] === 2) {
      vulnerablePits++;
    }
  }

  // Count own pits with 0 seeds (empty pits = less flexibility)
  const ownStart = player * PITS_PER_PLAYER;
  let emptyPits = 0;
  for (let i = ownStart; i < ownStart + PITS_PER_PLAYER; i++) {
    if (state.pits[i] === 0) emptyPits++;
  }

  // Game-over bonus
  if (state.gameOver) {
    if (state.winner === player) return 10000;
    if (state.winner === opp) return -10000;
    return 0; // draw
  }

  return (
    scoreDiff * 100 +
    (ownSeeds - oppSeeds) * 8 +
    vulnerablePits * 5 -
    emptyPits * 3
  );
}

// ── Minimax with Alpha-Beta ──────────────────────────────────────────────────

interface MinimaxResult {
  score: number;
  move: number;
}

function minimax(
  state: OwareState,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: 0 | 1,
  rootPlayer: 0 | 1,
): MinimaxResult {
  // Terminal conditions
  if (depth === 0 || state.gameOver) {
    return { score: evaluate(state, rootPlayer), move: -1 };
  }

  const moves = getValidMoves(state);
  if (moves.length === 0) {
    return { score: evaluate(state, rootPlayer), move: -1 };
  }

  let bestMove = moves[0];

  if (state.currentPlayer === maximizingPlayer) {
    // Maximizing
    let maxEval = -Infinity;
    for (const move of moves) {
      const { newState } = makeMove(state, move);
      const { score } = minimax(newState, depth - 1, alpha, beta, maximizingPlayer, rootPlayer);
      if (score > maxEval) {
        maxEval = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    // Minimizing
    let minEval = Infinity;
    for (const move of moves) {
      const { newState } = makeMove(state, move);
      const { score } = minimax(newState, depth - 1, alpha, beta, maximizingPlayer, rootPlayer);
      if (score < minEval) {
        minEval = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

// ── Iterative Deepening for Hard Mode ────────────────────────────────────────

function iterativeDeepening(
  state: OwareState,
  maxDepth: number,
  timeLimitMs: number,
): number {
  const start = performance.now();
  const moves = getValidMoves(state);
  if (moves.length <= 1) return moves[0];

  let bestMove = moves[0];

  for (let depth = 1; depth <= maxDepth; depth++) {
    const elapsed = performance.now() - start;
    if (elapsed > timeLimitMs) break;

    const result = minimax(
      state,
      depth,
      -Infinity,
      Infinity,
      state.currentPlayer,
      state.currentPlayer,
    );

    if (result.move >= 0) {
      bestMove = result.move;
    }

    // Early exit if we found a winning move
    if (result.score >= 9000) break;
  }

  return bestMove;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the best move for the current player at the given difficulty.
 *
 * - Easy:   30% best move (depth 2), 70% random valid move
 * - Medium: minimax depth 4
 * - Hard:   iterative deepening up to depth 10, max 500ms
 */
export function getBestMove(
  state: OwareState,
  difficulty: 'easy' | 'medium' | 'hard',
): number {
  const moves = getValidMoves(state);

  if (moves.length === 0) {
    throw new Error('No valid moves available');
  }

  if (moves.length === 1) return moves[0];

  switch (difficulty) {
    case 'easy': {
      // 30% chance of playing the best move (shallow search), 70% random
      if (Math.random() < 0.3) {
        const result = minimax(
          state,
          2,
          -Infinity,
          Infinity,
          state.currentPlayer,
          state.currentPlayer,
        );
        return result.move >= 0 ? result.move : moves[0];
      }
      return moves[Math.floor(Math.random() * moves.length)];
    }

    case 'medium': {
      const result = minimax(
        state,
        4,
        -Infinity,
        Infinity,
        state.currentPlayer,
        state.currentPlayer,
      );
      return result.move >= 0 ? result.move : moves[0];
    }

    case 'hard': {
      return iterativeDeepening(state, 10, 500);
    }

    default:
      return moves[0];
  }
}
