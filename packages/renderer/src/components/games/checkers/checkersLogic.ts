// ── GovPlay Checkers Engine ─────────────────────────────────────────────
// Standard 8x8 American checkers with mandatory captures, multi-jump
// chains, and king promotion.
// Pieces: 'r' = red, 'b' = black, 'R' = red king, 'B' = black king

export interface CheckersMove {
  from: [number, number];
  to: [number, number];
  jumps: [number, number][]; // intermediate positions for multi-jumps
  captured: [number, number][]; // positions of captured pieces
  crowned: boolean; // whether the piece becomes a king after this move
}

export interface CheckersState {
  board: (null | 'r' | 'b' | 'R' | 'B')[][];
  turn: 'r' | 'b';
  gameOver: boolean;
  winner: string | null; // 'r', 'b', or 'draw'
  moveHistory: CheckersMove[];
  mustCapture: boolean;
}

type Piece = 'r' | 'b' | 'R' | 'B';

// ── Helpers ─────────────────────────────────────────────────────────────

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function colorOf(piece: Piece): 'r' | 'b' {
  return piece === 'r' || piece === 'R' ? 'r' : 'b';
}

function isKing(piece: Piece): boolean {
  return piece === 'R' || piece === 'B';
}

function isEnemy(piece: Piece, turn: 'r' | 'b'): boolean {
  return colorOf(piece) !== turn;
}

function cloneBoard(board: (null | Piece)[][]): (null | Piece)[][] {
  return board.map(row => [...row]);
}

// ── Create initial state ────────────────────────────────────────────────

export function createInitialState(): CheckersState {
  const board: (null | Piece)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));

  // Black pieces on top (rows 0-2), on dark squares
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        board[r][c] = 'b';
      }
    }
  }

  // Red pieces on bottom (rows 5-7), on dark squares
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        board[r][c] = 'r';
      }
    }
  }

  return {
    board,
    turn: 'r', // Red moves first
    gameOver: false,
    winner: null,
    moveHistory: [],
    mustCapture: false,
  };
}

// ── Get movement directions for a piece ─────────────────────────────────

function getDirections(piece: Piece): [number, number][] {
  if (isKing(piece)) {
    return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  }
  // Red moves up (decreasing row), black moves down (increasing row)
  if (colorOf(piece) === 'r') {
    return [[-1, -1], [-1, 1]];
  }
  return [[1, -1], [1, 1]];
}

// ── Find all jump sequences from a position ────────────────────────────

function findJumps(
  board: (null | Piece)[][],
  row: number,
  col: number,
  piece: Piece,
  captured: [number, number][],
  path: [number, number][],
): CheckersMove[] {
  const dirs = getDirections(piece);
  const results: CheckersMove[] = [];
  let foundJump = false;

  for (const [dr, dc] of dirs) {
    const midR = row + dr;
    const midC = col + dc;
    const landR = row + dr * 2;
    const landC = col + dc * 2;

    if (!inBounds(landR, landC)) continue;

    const midPiece = board[midR][midC];
    if (!midPiece || !isEnemy(midPiece, colorOf(piece))) continue;
    if (board[landR][landC] !== null) continue;

    // Check if already captured this piece (no double-jumping same piece)
    if (captured.some(([cr, cc]) => cr === midR && cc === midC)) continue;

    foundJump = true;

    const newCaptured = [...captured, [midR, midC] as [number, number]];
    const newPath = [...path, [landR, landC] as [number, number]];

    // Temporarily update board for recursive search
    const newBoard = cloneBoard(board);
    newBoard[row][col] = null;
    newBoard[midR][midC] = null;
    newBoard[landR][landC] = piece;

    // Check for crowning mid-chain — in American checkers, the piece stops
    const crownRow = colorOf(piece) === 'r' ? 0 : 7;
    const willCrown = !isKing(piece) && landR === crownRow;

    if (willCrown) {
      // Piece crowns and the turn ends
      results.push({
        from: [path.length > 0 ? path[0][0] : row, path.length > 0 ? path[0][1] : col],
        to: [landR, landC],
        jumps: newPath,
        captured: newCaptured,
        crowned: true,
      });
    } else {
      // Try to continue jumping
      const continuations = findJumps(newBoard, landR, landC, piece, newCaptured, newPath);
      if (continuations.length > 0) {
        results.push(...continuations);
      } else {
        results.push({
          from: [path.length > 0 ? path[0][0] : row, path.length > 0 ? path[0][1] : col],
          to: [landR, landC],
          jumps: newPath,
          captured: newCaptured,
          crowned: false,
        });
      }
    }
  }

  return results;
}

// ── Get valid moves for a piece ─────────────────────────────────────────

export function getValidMoves(state: CheckersState, row: number, col: number): CheckersMove[] {
  if (state.gameOver) return [];

  const piece = state.board[row][col];
  if (!piece || colorOf(piece) !== state.turn) return [];

  // First check for jumps (mandatory)
  const jumps = findJumps(state.board, row, col, piece, [], []);

  // If there are any captures available for ANY piece, only captures are allowed
  const allCaptures = getAllCaptures(state);

  if (allCaptures.length > 0) {
    // Only return jumps for this piece
    // Fix the from coordinates
    return jumps.map(j => ({ ...j, from: [row, col] as [number, number] }));
  }

  // No captures available — return simple moves
  if (jumps.length > 0) {
    return jumps.map(j => ({ ...j, from: [row, col] as [number, number] }));
  }

  const dirs = getDirections(piece);
  const simpleMoves: CheckersMove[] = [];

  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc)) continue;
    if (state.board[nr][nc] !== null) continue;

    const crownRow = colorOf(piece) === 'r' ? 0 : 7;
    simpleMoves.push({
      from: [row, col],
      to: [nr, nc],
      jumps: [[nr, nc]],
      captured: [],
      crowned: !isKing(piece) && nr === crownRow,
    });
  }

  return simpleMoves;
}

// ── Get all captures for the current player ─────────────────────────────

function getAllCaptures(state: CheckersState): CheckersMove[] {
  const captures: CheckersMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece || colorOf(piece) !== state.turn) continue;
      const jumps = findJumps(state.board, r, c, piece, [], []);
      for (const j of jumps) {
        captures.push({ ...j, from: [r, c] });
      }
    }
  }
  return captures;
}

// ── Get all legal moves for the current player ──────────────────────────

export function getAllLegalMoves(state: CheckersState): CheckersMove[] {
  if (state.gameOver) return [];

  const captures = getAllCaptures(state);
  if (captures.length > 0) return captures;

  const moves: CheckersMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      moves.push(...getValidMoves(state, r, c));
    }
  }
  return moves;
}

// ── Make a move ─────────────────────────────────────────────────────────

export function makeMove(state: CheckersState, move: CheckersMove): CheckersState {
  const newBoard = cloneBoard(state.board);
  const piece = newBoard[move.from[0]][move.from[1]];
  if (!piece) return state;

  // Remove piece from origin
  newBoard[move.from[0]][move.from[1]] = null;

  // Remove captured pieces
  for (const [cr, cc] of move.captured) {
    newBoard[cr][cc] = null;
  }

  // Place piece at destination
  let finalPiece: Piece = piece;
  if (move.crowned) {
    finalPiece = colorOf(piece) === 'r' ? 'R' : 'B';
  }
  newBoard[move.to[0]][move.to[1]] = finalPiece;

  const nextTurn = state.turn === 'r' ? 'b' : 'r';

  const newState: CheckersState = {
    board: newBoard,
    turn: nextTurn,
    gameOver: false,
    winner: null,
    moveHistory: [...state.moveHistory, move],
    mustCapture: false,
  };

  // Check for game over
  const nextMoves = getAllLegalMoves(newState);
  if (nextMoves.length === 0) {
    newState.gameOver = true;
    newState.winner = state.turn; // Current player wins (opponent has no moves)
  }

  // Check if a side has no pieces
  let redCount = 0;
  let blackCount = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = newBoard[r][c];
      if (!p) continue;
      if (colorOf(p) === 'r') redCount++;
      else blackCount++;
    }
  }

  if (redCount === 0) {
    newState.gameOver = true;
    newState.winner = 'b';
  } else if (blackCount === 0) {
    newState.gameOver = true;
    newState.winner = 'r';
  }

  // Mark if captures are mandatory for next player
  const nextCaptures = getAllCapturesForState(newState);
  newState.mustCapture = nextCaptures.length > 0;

  return newState;
}

function getAllCapturesForState(state: CheckersState): CheckersMove[] {
  const captures: CheckersMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece || colorOf(piece) !== state.turn) continue;
      const jumps = findJumps(state.board, r, c, piece, [], []);
      for (const j of jumps) {
        captures.push({ ...j, from: [r, c] });
      }
    }
  }
  return captures;
}

// ── Count pieces ────────────────────────────────────────────────────────

export function countPieces(state: CheckersState): { r: number; rKings: number; b: number; bKings: number } {
  let r = 0, rKings = 0, b = 0, bKings = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = state.board[row][col];
      if (!p) continue;
      switch (p) {
        case 'r': r++; break;
        case 'R': rKings++; break;
        case 'b': b++; break;
        case 'B': bKings++; break;
      }
    }
  }
  return { r, rKings, b, bKings };
}
