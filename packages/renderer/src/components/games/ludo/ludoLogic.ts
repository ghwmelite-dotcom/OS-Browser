// ── Ludo Game Engine ────────────────────────────────────────────────
// Complete Ludo logic for 2-4 players with AI support.

// ── Types ───────────────────────────────────────────────────────────

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export interface LudoPlayer {
  color: PlayerColor;
  tokens: number[]; // 4 tokens: -1=home, 0-51=main track, 52-57=home stretch, 58=finished
  isAI: boolean;
}

export interface LudoState {
  players: LudoPlayer[];
  currentPlayer: number;
  diceValue: number | null;
  diceRolled: boolean;
  gameOver: boolean;
  winner: number | null;
  mustRollAgain: boolean;
  consecutiveSixes: number;
  message: string;
}

export interface ValidMove {
  tokenIndex: number;
  newPosition: number;
  isCapture: boolean;
}

// ── Constants ───────────────────────────────────────────────────────

const TRACK_LENGTH = 52;
const HOME_STRETCH_START = 52;
const HOME_STRETCH_END = 57;
const FINISHED = 58;
const HOME = -1;
const TOKENS_PER_PLAYER = 4;
const MAX_CONSECUTIVE_SIXES = 3;

/** Each player's start square on the shared 0-51 track (relative to player 0). */
const PLAYER_START_OFFSETS: readonly number[] = [0, 13, 26, 39];

/** Safe squares on the shared track (colored entry points). */
const SAFE_SQUARES: readonly number[] = [0, 8, 13, 21, 26, 34, 39, 47];

const PLAYER_COLORS: readonly PlayerColor[] = ['red', 'blue', 'green', 'yellow'];

// ── Board coordinate mapping ────────────────────────────────────────
// The board is a 15x15 grid. We map each track position + home stretch
// to a grid cell for rendering.

/** Shared track positions 0-51 as (col, row) on a 15x15 grid. */
const TRACK_COORDS: readonly [number, number][] = (() => {
  // Build the 52-cell track clockwise starting from red's start.
  // The Ludo board path goes around the cross shape.
  const coords: [number, number][] = [];

  // Segment 1: Red's column going up (bottom-center to top)
  // Start at (6, 13), move up to (6, 9)
  coords.push([6, 13]); // 0 - Red start / safe
  coords.push([6, 12]); // 1
  coords.push([6, 11]); // 2
  coords.push([6, 10]); // 3
  coords.push([6, 9]);  // 4

  // Turn left across top of bottom-left quadrant
  coords.push([5, 8]);  // 5
  coords.push([4, 8]);  // 6
  coords.push([3, 8]);  // 7
  coords.push([2, 8]);  // 8 - safe
  coords.push([1, 8]);  // 9
  coords.push([0, 8]);  // 10

  // Up into left arm
  coords.push([0, 7]);  // 11
  coords.push([0, 6]);  // 12

  // Right across top of board (Blue's territory)
  coords.push([1, 6]);  // 13 - Blue start / safe
  coords.push([2, 6]);  // 14
  coords.push([3, 6]);  // 15
  coords.push([4, 6]);  // 16
  coords.push([5, 6]);  // 17

  // Turn down then right
  coords.push([6, 5]);  // 18
  coords.push([6, 4]);  // 19
  coords.push([6, 3]);  // 20
  coords.push([6, 2]);  // 21 - safe
  coords.push([6, 1]);  // 22
  coords.push([6, 0]);  // 23

  // Right into top arm
  coords.push([7, 0]);  // 24
  coords.push([8, 0]);  // 25

  // Down right side (Green's territory)
  coords.push([8, 1]);  // 26 - Green start / safe
  coords.push([8, 2]);  // 27
  coords.push([8, 3]);  // 28
  coords.push([8, 4]);  // 29
  coords.push([8, 5]);  // 30

  // Turn right then down
  coords.push([9, 6]);  // 31
  coords.push([10, 6]); // 32
  coords.push([11, 6]); // 33
  coords.push([12, 6]); // 34 - safe
  coords.push([13, 6]); // 35
  coords.push([14, 6]); // 36

  // Down into right arm
  coords.push([14, 7]); // 37
  coords.push([14, 8]); // 38

  // Left across bottom of board (Yellow's territory)
  coords.push([13, 8]); // 39 - Yellow start / safe
  coords.push([12, 8]); // 40
  coords.push([11, 8]); // 41
  coords.push([10, 8]); // 42
  coords.push([9, 8]);  // 43

  // Turn up then left
  coords.push([8, 9]);  // 44
  coords.push([8, 10]); // 45
  coords.push([8, 11]); // 46
  coords.push([8, 12]); // 47 - safe
  coords.push([8, 13]); // 48
  coords.push([8, 14]); // 49

  // Left into bottom arm
  coords.push([7, 14]); // 50
  coords.push([6, 14]); // 51 - loops back to 0

  return coords;
})();

/** Home stretch coords for each player (6 cells leading to center). */
const HOME_STRETCH_COORDS: readonly [number, number][][] = [
  // Red: enters from bottom, goes up column 7 rows 13->8
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  // Blue: enters from left, goes right row 7 cols 1->6
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  // Green: enters from top, goes down column 7 rows 1->6
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  // Yellow: enters from right, goes left row 7 cols 13->8
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
];

/** Home base token positions for each player (4 slots in their quadrant). */
const HOME_BASE_COORDS: readonly [number, number][][] = [
  // Red (bottom-left quadrant)
  [[1.5, 11.5], [3.5, 11.5], [1.5, 13.5], [3.5, 13.5]],
  // Blue (top-left quadrant)
  [[1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5]],
  // Green (top-right quadrant)
  [[11.5, 1.5], [13.5, 1.5], [11.5, 3.5], [13.5, 3.5]],
  // Yellow (bottom-right quadrant)
  [[11.5, 11.5], [13.5, 11.5], [11.5, 13.5], [13.5, 13.5]],
];

// ── Utility helpers ─────────────────────────────────────────────────

/** Convert a player-relative track position (0-51) to the absolute shared track position. */
function toAbsoluteTrack(playerIndex: number, relativePos: number): number {
  return (relativePos + PLAYER_START_OFFSETS[playerIndex]) % TRACK_LENGTH;
}

/** Convert a shared absolute track position back to player-relative. */
function toRelativeTrack(playerIndex: number, absolutePos: number): number {
  return (absolutePos - PLAYER_START_OFFSETS[playerIndex] + TRACK_LENGTH) % TRACK_LENGTH;
}

/** Check if a shared track square is safe. */
function isSafeSquare(absolutePos: number): boolean {
  return SAFE_SQUARES.includes(absolutePos);
}

// ── Public API ──────────────────────────────────────────────────────

export function createGame(
  playerCount: 2 | 3 | 4,
  aiPlayers: boolean[],
): LudoState {
  // For 2 players, use red + green (opposite corners).
  // For 3, use red + blue + green.
  const colorIndices =
    playerCount === 2 ? [0, 2] :
    playerCount === 3 ? [0, 1, 2] :
    [0, 1, 2, 3];

  const players: LudoPlayer[] = colorIndices.map((ci, i) => ({
    color: PLAYER_COLORS[ci],
    tokens: [HOME, HOME, HOME, HOME],
    isAI: aiPlayers[i] ?? false,
  }));

  return {
    players,
    currentPlayer: 0,
    diceValue: null,
    diceRolled: false,
    gameOver: false,
    winner: null,
    mustRollAgain: false,
    consecutiveSixes: 0,
    message: `${players[0].color.toUpperCase()}'s turn - roll the dice!`,
  };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function applyDiceRoll(state: LudoState, value: number): LudoState {
  const next = cloneState(state);
  next.diceValue = value;
  next.diceRolled = true;

  // Check for three consecutive sixes
  if (value === 6) {
    next.consecutiveSixes++;
    if (next.consecutiveSixes >= MAX_CONSECUTIVE_SIXES) {
      next.message = `${currentColor(next)} rolled three 6s in a row! Turn skipped.`;
      next.consecutiveSixes = 0;
      next.diceRolled = false;
      next.diceValue = null;
      next.mustRollAgain = false;
      advancePlayer(next);
      return next;
    }
    next.mustRollAgain = true;
  } else {
    next.mustRollAgain = false;
  }

  // Check if any valid moves exist
  const moves = getValidMoves(next);
  if (moves.length === 0) {
    next.message = `${currentColor(next)} has no valid moves.`;
    if (!next.mustRollAgain) {
      next.consecutiveSixes = 0;
      advancePlayer(next);
    } else {
      // Even with a 6 and extra turn, if no moves, must still roll again
      next.diceRolled = false;
      next.diceValue = null;
    }
    return next;
  }

  next.message = `${currentColor(next)} rolled ${value}. Choose a token to move.`;
  return next;
}

export function getValidMoves(state: LudoState): ValidMove[] {
  const player = state.players[state.currentPlayer];
  const dice = state.diceValue;
  if (dice === null) return [];

  const playerIndex = getPlayerGlobalIndex(state, state.currentPlayer);
  const moves: ValidMove[] = [];

  for (let t = 0; t < TOKENS_PER_PLAYER; t++) {
    const pos = player.tokens[t];

    if (pos === FINISHED) continue;

    if (pos === HOME) {
      // Can only leave home with a 6
      if (dice === 6) {
        const landingAbs = PLAYER_START_OFFSETS[playerIndex];
        const isCapture = checkCapture(state, state.currentPlayer, landingAbs, false);
        moves.push({ tokenIndex: t, newPosition: 0, isCapture });
      }
      continue;
    }

    // Token is on main track (0-51 relative)
    if (pos < HOME_STRETCH_START) {
      const newRelative = pos + dice;

      if (newRelative < TRACK_LENGTH) {
        // Still on main track
        const newAbs = toAbsoluteTrack(playerIndex, newRelative);
        const isCapture = checkCapture(state, state.currentPlayer, newAbs, false);
        moves.push({ tokenIndex: t, newPosition: newRelative, isCapture });
      } else {
        // Entering home stretch
        const overshoot = newRelative - TRACK_LENGTH;
        // Player enters home stretch at position 52 + overshoot
        // The entry to home stretch is at relative position 51 (just before looping)
        // Actually, relative position TRACK_LENGTH - 1 = 51 is the last main track square.
        // After 51, they enter home stretch: 52, 53, 54, 55, 56, 57, then 58 = finished.
        const homeStretchPos = HOME_STRETCH_START + overshoot;
        if (homeStretchPos <= FINISHED) {
          moves.push({ tokenIndex: t, newPosition: homeStretchPos, isCapture: false });
        }
        // If overshoots past 58, move is invalid (must exact roll)
      }
    } else if (pos >= HOME_STRETCH_START && pos <= HOME_STRETCH_END) {
      // Already in home stretch
      const newPos = pos + dice;
      if (newPos <= FINISHED) {
        moves.push({ tokenIndex: t, newPosition: newPos, isCapture: false });
      }
      // Must exact roll to finish
    }
  }

  return moves;
}

export function makeMove(state: LudoState, tokenIndex: number): LudoState {
  const moves = getValidMoves(state);
  const move = moves.find((m) => m.tokenIndex === tokenIndex);
  if (!move) return state;

  const next = cloneState(state);
  const player = next.players[next.currentPlayer];
  const playerIndex = getPlayerGlobalIndex(next, next.currentPlayer);

  const oldPos = player.tokens[tokenIndex];
  player.tokens[tokenIndex] = move.newPosition;

  let captureOccurred = false;

  // Handle captures on main track
  if (move.newPosition >= 0 && move.newPosition < HOME_STRETCH_START) {
    const absPos = toAbsoluteTrack(playerIndex, move.newPosition);
    if (!isSafeSquare(absPos)) {
      for (let p = 0; p < next.players.length; p++) {
        if (p === next.currentPlayer) continue;
        const otherPlayerIndex = getPlayerGlobalIndex(next, p);
        for (let t = 0; t < TOKENS_PER_PLAYER; t++) {
          const otherPos = next.players[p].tokens[t];
          if (otherPos >= 0 && otherPos < HOME_STRETCH_START) {
            const otherAbs = toAbsoluteTrack(otherPlayerIndex, otherPos);
            if (otherAbs === absPos) {
              next.players[p].tokens[t] = HOME;
              captureOccurred = true;
            }
          }
        }
      }
    }
  }

  // Check for win
  if (player.tokens.every((t) => t === FINISHED)) {
    next.gameOver = true;
    next.winner = next.currentPlayer;
    next.message = `${player.color.toUpperCase()} wins the game!`;
    next.diceRolled = false;
    next.diceValue = null;
    return next;
  }

  // Build status message
  if (move.newPosition === FINISHED) {
    next.message = `${currentColor(next)} got a token home!`;
  } else if (captureOccurred) {
    next.message = `${currentColor(next)} captured an opponent!`;
  } else {
    next.message = `${currentColor(next)} moved token ${tokenIndex + 1}.`;
  }

  // Determine next turn
  if (next.mustRollAgain) {
    next.diceRolled = false;
    next.diceValue = null;
    next.message += ` Rolled a 6 - roll again!`;
  } else {
    next.consecutiveSixes = 0;
    advancePlayer(next);
  }

  return next;
}

/** Get the (col, row) board coordinates for rendering a token. */
export function getTokenBoardPosition(
  state: LudoState,
  statePlayerIndex: number,
  tokenIndex: number,
): [number, number] {
  const player = state.players[statePlayerIndex];
  const pos = player.tokens[tokenIndex];
  const globalIndex = getPlayerGlobalIndex(state, statePlayerIndex);

  if (pos === HOME) {
    return HOME_BASE_COORDS[globalIndex][tokenIndex];
  }

  if (pos === FINISHED) {
    // Place at center - slight offset per token
    const offsets: [number, number][] = [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]];
    return [7 + offsets[tokenIndex][0], 7 + offsets[tokenIndex][1]];
  }

  if (pos >= HOME_STRETCH_START && pos <= HOME_STRETCH_END) {
    const stretchIndex = pos - HOME_STRETCH_START;
    return HOME_STRETCH_COORDS[globalIndex][stretchIndex];
  }

  // Main track
  const absPos = toAbsoluteTrack(globalIndex, pos);
  return TRACK_COORDS[absPos];
}

/** Get the grid coordinate for a projected landing square (for path highlighting). */
export function getLandingBoardPosition(
  state: LudoState,
  statePlayerIndex: number,
  newRelativePos: number,
): [number, number] | null {
  if (newRelativePos === FINISHED) return [7, 7];

  const globalIndex = getPlayerGlobalIndex(state, statePlayerIndex);

  if (newRelativePos >= HOME_STRETCH_START && newRelativePos <= HOME_STRETCH_END) {
    return HOME_STRETCH_COORDS[globalIndex][newRelativePos - HOME_STRETCH_START];
  }

  if (newRelativePos >= 0 && newRelativePos < TRACK_LENGTH) {
    const absPos = toAbsoluteTrack(globalIndex, newRelativePos);
    return TRACK_COORDS[absPos];
  }

  return null;
}

// ── AI ──────────────────────────────────────────────────────────────

export function getAIMove(state: LudoState): number | null {
  const moves = getValidMoves(state);
  if (moves.length === 0) return null;

  // Priority: capture > leave home > advance furthest back > advance closest to finish
  // 1. Captures
  const captures = moves.filter((m) => m.isCapture);
  if (captures.length > 0) {
    return captures[0].tokenIndex;
  }

  // 2. Leave home (if rolled 6)
  const leaveHome = moves.filter((m) => {
    const player = state.players[state.currentPlayer];
    return player.tokens[m.tokenIndex] === HOME;
  });
  if (leaveHome.length > 0) {
    return leaveHome[0].tokenIndex;
  }

  // 3. Advance the furthest-back token on the main track
  const player = state.players[state.currentPlayer];
  const mainTrackMoves = moves.filter((m) => {
    const pos = player.tokens[m.tokenIndex];
    return pos >= 0 && pos < HOME_STRETCH_START;
  });

  if (mainTrackMoves.length > 0) {
    mainTrackMoves.sort((a, b) => {
      return player.tokens[a.tokenIndex] - player.tokens[b.tokenIndex];
    });
    return mainTrackMoves[0].tokenIndex;
  }

  // 4. Advance closest to finish (in home stretch)
  const homeStretchMoves = moves.filter((m) => {
    const pos = player.tokens[m.tokenIndex];
    return pos >= HOME_STRETCH_START;
  });

  if (homeStretchMoves.length > 0) {
    homeStretchMoves.sort((a, b) => {
      return player.tokens[b.tokenIndex] - player.tokens[a.tokenIndex];
    });
    return homeStretchMoves[0].tokenIndex;
  }

  return moves[0].tokenIndex;
}

// ── Exports for rendering ───────────────────────────────────────────

export { TRACK_COORDS, HOME_STRETCH_COORDS, HOME_BASE_COORDS, SAFE_SQUARES, PLAYER_COLORS };

export function getPlayerGlobalIndex(state: LudoState, stateIndex: number): number {
  const color = state.players[stateIndex].color;
  return PLAYER_COLORS.indexOf(color);
}

export function getSafeSquareCoords(): [number, number][] {
  return SAFE_SQUARES.map((sq) => TRACK_COORDS[sq]);
}

// ── Internal helpers ────────────────────────────────────────────────

function cloneState(state: LudoState): LudoState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      tokens: [...p.tokens],
    })),
  };
}

function currentColor(state: LudoState): string {
  return state.players[state.currentPlayer].color.toUpperCase();
}

function advancePlayer(state: LudoState): void {
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  state.diceRolled = false;
  state.diceValue = null;
  state.mustRollAgain = false;
  state.message = `${currentColor(state)}'s turn - roll the dice!`;
}

function checkCapture(
  state: LudoState,
  movingPlayerStateIndex: number,
  absoluteTrackPos: number,
  _onHomeStretch: boolean,
): boolean {
  if (isSafeSquare(absoluteTrackPos)) return false;

  for (let p = 0; p < state.players.length; p++) {
    if (p === movingPlayerStateIndex) continue;
    const otherGlobal = getPlayerGlobalIndex(state, p);
    for (let t = 0; t < TOKENS_PER_PLAYER; t++) {
      const otherPos = state.players[p].tokens[t];
      if (otherPos >= 0 && otherPos < HOME_STRETCH_START) {
        if (toAbsoluteTrack(otherGlobal, otherPos) === absoluteTrackPos) {
          return true;
        }
      }
    }
  }
  return false;
}
