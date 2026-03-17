// ── Oware (Abapa) Game Engine ──────────────────────────────────────────────
// Complete implementation of the Abapa variation of Oware/Awari.
// Board layout:
//   Pits 11  10   9   8   7   6   ← Player 1 (top / computer)
//   Pits  0   1   2   3   4   5   ← Player 0 (bottom / human)

// ── Types ────────────────────────────────────────────────────────────────────

export interface OwareState {
  /** 12 pits: indices 0-5 = player 0 (bottom), 6-11 = player 1 (top) */
  pits: number[];
  scores: [number, number];
  currentPlayer: 0 | 1;
  gameOver: boolean;
  /** null = draw */
  winner: 0 | 1 | null;
}

export interface MoveResult {
  newState: OwareState;
  captured: number;
  /** Ordered list of pit indices visited during sowing */
  sowPath: number[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const PITS_PER_PLAYER = 6;
const TOTAL_PITS = 12;
const INITIAL_SEEDS = 4;
const TOTAL_SEEDS = TOTAL_PITS * INITIAL_SEEDS; // 48
const WIN_THRESHOLD = 25;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Pit indices belonging to a player */
function playerPits(player: 0 | 1): number[] {
  const start = player * PITS_PER_PLAYER;
  return Array.from({ length: PITS_PER_PLAYER }, (_, i) => start + i);
}

/** Sum of seeds on a player's side */
function sideTotal(pits: number[], player: 0 | 1): number {
  return playerPits(player).reduce((sum, i) => sum + pits[i], 0);
}

/** Which player owns a given pit index */
function pitOwner(pit: number): 0 | 1 {
  return pit < PITS_PER_PLAYER ? 0 : 1;
}

/** Opponent of a player */
function opponent(player: 0 | 1): 0 | 1 {
  return player === 0 ? 1 : 0;
}

/** Deep clone an OwareState */
function cloneState(state: OwareState): OwareState {
  return {
    pits: [...state.pits],
    scores: [state.scores[0], state.scores[1]],
    currentPlayer: state.currentPlayer,
    gameOver: state.gameOver,
    winner: state.winner,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Create a fresh starting position: 4 seeds in each of 12 pits */
export function createInitialState(): OwareState {
  return {
    pits: Array(TOTAL_PITS).fill(INITIAL_SEEDS),
    scores: [0, 0],
    currentPlayer: 0,
    gameOver: false,
    winner: null,
  };
}

/**
 * Return the list of valid pit indices the current player may choose.
 *
 * A move is valid if:
 * 1. The pit belongs to the current player and is non-empty.
 * 2. If the opponent has zero seeds, the move must "feed" the opponent
 *    (i.e., at least one seed must land on the opponent's side).
 *    If NO move can feed the opponent, all non-empty own pits are valid.
 */
export function getValidMoves(state: OwareState): number[] {
  if (state.gameOver) return [];

  const player = state.currentPlayer;
  const opp = opponent(player);
  const ownIndices = playerPits(player);
  const nonEmpty = ownIndices.filter((i) => state.pits[i] > 0);

  if (nonEmpty.length === 0) return [];

  // If opponent has seeds, all non-empty pits are valid
  if (sideTotal(state.pits, opp) > 0) return nonEmpty;

  // Opponent has 0 seeds — must feed if possible
  const feeding = nonEmpty.filter((pit) => {
    // Simulate: does this move place at least one seed on the opponent's side?
    const seeds = state.pits[pit];
    // The sowing reaches pit indices (pit+1) through (pit+seeds), wrapping, skipping origin if >=12
    for (let s = 1; s <= seeds; s++) {
      let target = (pit + s) % TOTAL_PITS;
      // Skip origin pit if we lap the board
      if (seeds >= TOTAL_PITS && target === pit) continue;
      if (pitOwner(target) === opp) return true;
    }
    return false;
  });

  // If at least one move feeds the opponent, only those are valid
  return feeding.length > 0 ? feeding : nonEmpty;
}

/**
 * Execute a move. Returns the new state, the number of seeds captured,
 * and the sow path (ordered list of pits visited).
 *
 * Throws if the move is invalid.
 */
export function makeMove(state: OwareState, pit: number): MoveResult {
  const valid = getValidMoves(state);
  if (!valid.includes(pit)) {
    throw new Error(`Invalid move: pit ${pit} is not a valid choice.`);
  }

  const next = cloneState(state);
  const player = next.currentPlayer;
  const opp = opponent(player);

  let seeds = next.pits[pit];
  next.pits[pit] = 0;

  const sowPath: number[] = [];
  let current = pit;

  // Sow counterclockwise (increasing index with wrap)
  while (seeds > 0) {
    current = (current + 1) % TOTAL_PITS;
    // Skip the starting pit if we have >=12 seeds (grand slam / lap rule)
    if (current === pit) continue;
    next.pits[current]++;
    sowPath.push(current);
    seeds--;
  }

  // ── Capture phase ──────────────────────────────────────────────────
  let captured = 0;
  const lastPit = current;

  if (pitOwner(lastPit) === opp) {
    // Check consecutive capture backwards from lastPit
    let captureIdx = lastPit;
    const potentialCapture: number[] = [];

    while (pitOwner(captureIdx) === opp) {
      const count = next.pits[captureIdx];
      if (count === 2 || count === 3) {
        potentialCapture.push(captureIdx);
        // Move backwards on opponent's side
        captureIdx = captureIdx === opp * PITS_PER_PLAYER
          ? opp * PITS_PER_PLAYER + PITS_PER_PLAYER - 1
          : captureIdx - 1;
        // Also need to stay on opponent's side
        if (pitOwner(captureIdx) !== opp) break;
      } else {
        break;
      }
    }

    // Grand slam protection: if capturing would leave opponent with 0 seeds, no capture
    const opponentSeedsAfterCapture =
      sideTotal(next.pits, opp) -
      potentialCapture.reduce((sum, i) => sum + next.pits[i], 0);

    if (opponentSeedsAfterCapture > 0 || potentialCapture.length === 0) {
      // Execute the captures
      for (const idx of potentialCapture) {
        captured += next.pits[idx];
        next.scores[player] += next.pits[idx];
        next.pits[idx] = 0;
      }
    }
    // If capture would leave opponent empty (grand slam), no seeds are captured
  }

  // ── Switch player ──────────────────────────────────────────────────
  next.currentPlayer = opp;

  // ── Check game-over conditions ─────────────────────────────────────
  checkGameOver(next);

  return { newState: next, captured, sowPath };
}

/** Check and update game-over status on a state (mutates in place). */
function checkGameOver(state: OwareState): void {
  // Condition 1: A player has 25+ seeds
  if (state.scores[0] >= WIN_THRESHOLD || state.scores[1] >= WIN_THRESHOLD) {
    state.gameOver = true;
    if (state.scores[0] > state.scores[1]) state.winner = 0;
    else if (state.scores[1] > state.scores[0]) state.winner = 1;
    else state.winner = null;
    return;
  }

  // Condition 2: Both players have exactly 24 (draw)
  if (state.scores[0] === 24 && state.scores[1] === 24) {
    state.gameOver = true;
    state.winner = null;
    return;
  }

  // Condition 3: Current player has no legal moves
  if (getValidMoves(state).length === 0) {
    // Remaining seeds go to the player whose side they're on
    for (let p = 0; p < 2; p++) {
      const player = p as 0 | 1;
      for (const idx of playerPits(player)) {
        state.scores[player] += state.pits[idx];
        state.pits[idx] = 0;
      }
    }
    state.gameOver = true;
    if (state.scores[0] > state.scores[1]) state.winner = 0;
    else if (state.scores[1] > state.scores[0]) state.winner = 1;
    else state.winner = null;
    return;
  }

  // Condition 4: Too few seeds remain to ever end the game (stalemate breaker)
  // If total remaining seeds on board <= 2 and both scores < 24, likely infinite loop
  const totalOnBoard = state.pits.reduce((a, b) => a + b, 0);
  if (totalOnBoard <= 1 && state.scores[0] < WIN_THRESHOLD && state.scores[1] < WIN_THRESHOLD) {
    // Award remaining seeds to respective side owners
    for (let p = 0; p < 2; p++) {
      const player = p as 0 | 1;
      for (const idx of playerPits(player)) {
        state.scores[player] += state.pits[idx];
        state.pits[idx] = 0;
      }
    }
    state.gameOver = true;
    if (state.scores[0] > state.scores[1]) state.winner = 0;
    else if (state.scores[1] > state.scores[0]) state.winner = 1;
    else state.winner = null;
  }
}

/** Quick check: is the game over? */
export function isGameOver(state: OwareState): boolean {
  return state.gameOver;
}

/** Get a deep clone of a state (useful for undo history) */
export function cloneOwareState(state: OwareState): OwareState {
  return cloneState(state);
}

/** Total seeds on board (for display/debug) */
export function totalSeedsOnBoard(state: OwareState): number {
  return state.pits.reduce((a, b) => a + b, 0);
}

/** Pit indices for a player */
export { playerPits, sideTotal, opponent, PITS_PER_PLAYER, TOTAL_SEEDS };
