// ── GovPlay Chess Engine ────────────────────────────────────────────────
// Complete chess logic: move generation, validation, check/checkmate/stalemate,
// castling, en passant, pawn promotion, 50-move rule, threefold repetition.

export interface ChessMove {
  from: [number, number];
  to: [number, number];
  piece: string;
  captured?: string | null;
  promotion?: string;
  castle?: 'K' | 'Q';
  enPassant?: boolean;
}

export interface ChessState {
  board: (string | null)[][];
  turn: 'w' | 'b';
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassant: [number, number] | null;
  halfMoveClock: number;
  moveHistory: ChessMove[];
  positionHistory: string[];
  gameOver: boolean;
  result: string | null; // '1-0', '0-1', '1/2-1/2', null
  resultReason: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function isWhite(piece: string): boolean {
  return piece === piece.toUpperCase();
}

function isBlack(piece: string): boolean {
  return piece === piece.toLowerCase();
}

function colorOf(piece: string): 'w' | 'b' {
  return isWhite(piece) ? 'w' : 'b';
}

function isEnemy(piece: string, color: 'w' | 'b'): boolean {
  return color === 'w' ? isBlack(piece) : isWhite(piece);
}

function isAlly(piece: string, color: 'w' | 'b'): boolean {
  return color === 'w' ? isWhite(piece) : isBlack(piece);
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(board: (string | null)[][]): (string | null)[][] {
  return board.map(row => [...row]);
}

// ── FEN-like position key for repetition detection ──────────────────────

function positionKey(state: ChessState): string {
  const boardStr = state.board.map(row => row.map(p => p || '.').join('')).join('/');
  const castleStr = `${state.castling.wK ? 'K' : ''}${state.castling.wQ ? 'Q' : ''}${state.castling.bK ? 'k' : ''}${state.castling.bQ ? 'q' : ''}` || '-';
  const epStr = state.enPassant ? `${state.enPassant[0]},${state.enPassant[1]}` : '-';
  return `${boardStr} ${state.turn} ${castleStr} ${epStr}`;
}

// ── Initial board ───────────────────────────────────────────────────────

export function createInitialState(): ChessState {
  const board: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));

  // Black pieces (top)
  board[0] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  board[1] = Array(8).fill('p');

  // White pieces (bottom)
  board[6] = Array(8).fill('P');
  board[7] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];

  const state: ChessState = {
    board,
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfMoveClock: 0,
    moveHistory: [],
    positionHistory: [],
    gameOver: false,
    result: null,
    resultReason: null,
  };
  state.positionHistory.push(positionKey(state));
  return state;
}

// ── Find king position ──────────────────────────────────────────────────

function findKing(board: (string | null)[][], color: 'w' | 'b'): [number, number] {
  const king = color === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) return [r, c];
    }
  }
  return [-1, -1]; // should never happen
}

// ── Square attacked check ───────────────────────────────────────────────

function isSquareAttackedBy(board: (string | null)[][], row: number, col: number, byColor: 'w' | 'b'): boolean {
  // Pawn attacks
  const pawnDir = byColor === 'w' ? 1 : -1; // white pawns attack upward (lower row numbers)
  for (const dc of [-1, 1]) {
    const pr = row + pawnDir;
    const pc = col + dc;
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && colorOf(p) === byColor && p.toLowerCase() === 'p') return true;
    }
  }

  // Knight attacks
  const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (const [dr, dc] of knightMoves) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && colorOf(p) === byColor && p.toLowerCase() === 'n') return true;
    }
  }

  // King attacks (for adjacency)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p && colorOf(p) === byColor && p.toLowerCase() === 'k') return true;
      }
    }
  }

  // Sliding pieces: rook/queen (straight), bishop/queen (diagonal)
  const straightDirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of straightDirs) {
    for (let i = 1; i < 8; i++) {
      const nr = row + dr * i;
      const nc = col + dc * i;
      if (!inBounds(nr, nc)) break;
      const p = board[nr][nc];
      if (p) {
        if (colorOf(p) === byColor && (p.toLowerCase() === 'r' || p.toLowerCase() === 'q')) return true;
        break;
      }
    }
  }

  const diagDirs: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagDirs) {
    for (let i = 1; i < 8; i++) {
      const nr = row + dr * i;
      const nc = col + dc * i;
      if (!inBounds(nr, nc)) break;
      const p = board[nr][nc];
      if (p) {
        if (colorOf(p) === byColor && (p.toLowerCase() === 'b' || p.toLowerCase() === 'q')) return true;
        break;
      }
    }
  }

  return false;
}

// ── Check detection ─────────────────────────────────────────────────────

export function isCheck(state: ChessState, color: 'w' | 'b'): boolean {
  const [kr, kc] = findKing(state.board, color);
  const enemy = color === 'w' ? 'b' : 'w';
  return isSquareAttackedBy(state.board, kr, kc, enemy);
}

// ── Pseudo-legal move generation (before filtering for check) ───────────

function getPseudoMoves(state: ChessState, row: number, col: number): ChessMove[] {
  const piece = state.board[row][col];
  if (!piece) return [];
  const color = colorOf(piece);
  if (color !== state.turn) return [];

  const moves: ChessMove[] = [];
  const type = piece.toLowerCase();

  const addMove = (tr: number, tc: number, extra?: Partial<ChessMove>) => {
    const captured = state.board[tr][tc];
    moves.push({ from: [row, col], to: [tr, tc], piece, captured, ...extra });
  };

  const addSliding = (directions: [number, number][]) => {
    for (const [dr, dc] of directions) {
      for (let i = 1; i < 8; i++) {
        const nr = row + dr * i;
        const nc = col + dc * i;
        if (!inBounds(nr, nc)) break;
        const target = state.board[nr][nc];
        if (target) {
          if (isEnemy(target, color)) addMove(nr, nc);
          break;
        }
        addMove(nr, nc);
      }
    }
  };

  switch (type) {
    case 'p': {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      const promoRow = color === 'w' ? 0 : 7;

      // Forward one
      const f1r = row + dir;
      if (inBounds(f1r, col) && !state.board[f1r][col]) {
        if (f1r === promoRow) {
          const promos = color === 'w' ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];
          for (const promo of promos) addMove(f1r, col, { promotion: promo });
        } else {
          addMove(f1r, col);
        }

        // Forward two from start
        if (row === startRow) {
          const f2r = row + dir * 2;
          if (!state.board[f2r][col]) {
            addMove(f2r, col);
          }
        }
      }

      // Captures
      for (const dc of [-1, 1]) {
        const tr = row + dir;
        const tc = col + dc;
        if (!inBounds(tr, tc)) continue;

        // Normal capture
        if (state.board[tr][tc] && isEnemy(state.board[tr][tc]!, color)) {
          if (tr === promoRow) {
            const promos = color === 'w' ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];
            for (const promo of promos) addMove(tr, tc, { promotion: promo });
          } else {
            addMove(tr, tc);
          }
        }

        // En passant
        if (state.enPassant && state.enPassant[0] === tr && state.enPassant[1] === tc) {
          addMove(tr, tc, { enPassant: true, captured: color === 'w' ? 'p' : 'P' });
        }
      }
      break;
    }

    case 'n': {
      const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      for (const [dr, dc] of offsets) {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBounds(nr, nc)) continue;
        const target = state.board[nr][nc];
        if (!target || isEnemy(target, color)) addMove(nr, nc);
      }
      break;
    }

    case 'b':
      addSliding([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
      break;

    case 'r':
      addSliding([[-1, 0], [1, 0], [0, -1], [0, 1]]);
      break;

    case 'q':
      addSliding([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
      break;

    case 'k': {
      // Normal king moves
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (!inBounds(nr, nc)) continue;
          const target = state.board[nr][nc];
          if (!target || isEnemy(target, color)) addMove(nr, nc);
        }
      }

      // Castling
      const enemy = color === 'w' ? 'b' : 'w';
      const baseRow = color === 'w' ? 7 : 0;
      if (row === baseRow && col === 4) {
        // Kingside
        const canKingside = color === 'w' ? state.castling.wK : state.castling.bK;
        if (canKingside
          && !state.board[baseRow][5] && !state.board[baseRow][6]
          && state.board[baseRow][7]?.toLowerCase() === 'r'
          && !isSquareAttackedBy(state.board, baseRow, 4, enemy)
          && !isSquareAttackedBy(state.board, baseRow, 5, enemy)
          && !isSquareAttackedBy(state.board, baseRow, 6, enemy)
        ) {
          addMove(baseRow, 6, { castle: 'K' });
        }

        // Queenside
        const canQueenside = color === 'w' ? state.castling.wQ : state.castling.bQ;
        if (canQueenside
          && !state.board[baseRow][1] && !state.board[baseRow][2] && !state.board[baseRow][3]
          && state.board[baseRow][0]?.toLowerCase() === 'r'
          && !isSquareAttackedBy(state.board, baseRow, 4, enemy)
          && !isSquareAttackedBy(state.board, baseRow, 3, enemy)
          && !isSquareAttackedBy(state.board, baseRow, 2, enemy)
        ) {
          addMove(baseRow, 2, { castle: 'Q' });
        }
      }
      break;
    }
  }

  return moves;
}

// ── Apply move on a board (for simulation) ──────────────────────────────

function applyMoveToBoard(board: (string | null)[][], move: ChessMove): (string | null)[][] {
  const b = cloneBoard(board);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;

  b[tr][tc] = move.promotion || b[fr][fc];
  b[fr][fc] = null;

  // En passant capture
  if (move.enPassant) {
    const capturedRow = move.piece === move.piece.toUpperCase() ? tr + 1 : tr - 1;
    b[capturedRow][tc] = null;
  }

  // Castling — move the rook
  if (move.castle) {
    const row = fr;
    if (move.castle === 'K') {
      b[row][5] = b[row][7];
      b[row][7] = null;
    } else {
      b[row][3] = b[row][0];
      b[row][0] = null;
    }
  }

  return b;
}

// ── Filter legal moves (exclude those leaving king in check) ────────────

function filterLegalMoves(state: ChessState, pseudoMoves: ChessMove[]): ChessMove[] {
  const color = state.turn;
  return pseudoMoves.filter(move => {
    const newBoard = applyMoveToBoard(state.board, move);
    const [kr, kc] = findKing(newBoard, color);
    const enemy = color === 'w' ? 'b' : 'w';
    return !isSquareAttackedBy(newBoard, kr, kc, enemy);
  });
}

// ── Public: get valid moves for a piece ─────────────────────────────────

export function getValidMoves(state: ChessState, row: number, col: number): [number, number][] {
  if (state.gameOver) return [];
  const pseudo = getPseudoMoves(state, row, col);
  const legal = filterLegalMoves(state, pseudo);
  // Deduplicate destinations (promotions create multiple moves to same square)
  const seen = new Set<string>();
  const result: [number, number][] = [];
  for (const m of legal) {
    const key = `${m.to[0]},${m.to[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(m.to);
    }
  }
  return result;
}

// ── Public: get full legal moves (with promotion variants) ──────────────

export function getLegalMoves(state: ChessState, row: number, col: number): ChessMove[] {
  if (state.gameOver) return [];
  const pseudo = getPseudoMoves(state, row, col);
  return filterLegalMoves(state, pseudo);
}

// ── Get all legal moves for a color ─────────────────────────────────────

export function getAllLegalMoves(state: ChessState): ChessMove[] {
  const moves: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && colorOf(p) === state.turn) {
        moves.push(...getLegalMoves(state, r, c));
      }
    }
  }
  return moves;
}

// ── Make a move ─────────────────────────────────────────────────────────

export function makeMove(
  state: ChessState,
  from: [number, number],
  to: [number, number],
  promotion?: string
): ChessState {
  const [fr, fc] = from;
  const piece = state.board[fr][fc];
  if (!piece) return state;

  // Find the matching legal move
  const legalMoves = getLegalMoves(state, fr, fc);
  let move = legalMoves.find(m =>
    m.to[0] === to[0] && m.to[1] === to[1] && (!promotion || m.promotion === promotion)
  );

  // If promotion target not specified, default to queen
  if (!move && piece.toLowerCase() === 'p') {
    const promoRow = state.turn === 'w' ? 0 : 7;
    if (to[0] === promoRow) {
      const defaultPromo = state.turn === 'w' ? 'Q' : 'q';
      move = legalMoves.find(m => m.to[0] === to[0] && m.to[1] === to[1] && m.promotion === defaultPromo);
    }
  }

  if (!move) return state; // illegal

  const newBoard = applyMoveToBoard(state.board, move);

  // Update castling rights
  const newCastling = { ...state.castling };
  if (piece === 'K') { newCastling.wK = false; newCastling.wQ = false; }
  if (piece === 'k') { newCastling.bK = false; newCastling.bQ = false; }
  if (piece === 'R' && fr === 7 && fc === 7) newCastling.wK = false;
  if (piece === 'R' && fr === 7 && fc === 0) newCastling.wQ = false;
  if (piece === 'r' && fr === 0 && fc === 7) newCastling.bK = false;
  if (piece === 'r' && fr === 0 && fc === 0) newCastling.bQ = false;
  // If rook captured
  if (to[0] === 7 && to[1] === 7) newCastling.wK = false;
  if (to[0] === 7 && to[1] === 0) newCastling.wQ = false;
  if (to[0] === 0 && to[1] === 7) newCastling.bK = false;
  if (to[0] === 0 && to[1] === 0) newCastling.bQ = false;

  // En passant target
  let newEnPassant: [number, number] | null = null;
  if (piece.toLowerCase() === 'p' && Math.abs(to[0] - from[0]) === 2) {
    newEnPassant = [(from[0] + to[0]) / 2, from[1]];
  }

  // Half-move clock
  const isCapture = move.captured || move.enPassant;
  const isPawnMove = piece.toLowerCase() === 'p';
  const newHalfMove = (isCapture || isPawnMove) ? 0 : state.halfMoveClock + 1;

  const newState: ChessState = {
    board: newBoard,
    turn: state.turn === 'w' ? 'b' : 'w',
    castling: newCastling,
    enPassant: newEnPassant,
    halfMoveClock: newHalfMove,
    moveHistory: [...state.moveHistory, move],
    positionHistory: [...state.positionHistory],
    gameOver: false,
    result: null,
    resultReason: null,
  };

  const pk = positionKey(newState);
  newState.positionHistory.push(pk);

  // Check for game-ending conditions
  const allMoves = getAllLegalMovesForState(newState);

  if (allMoves.length === 0) {
    if (isCheck(newState, newState.turn)) {
      // Checkmate
      newState.gameOver = true;
      newState.result = state.turn === 'w' ? '1-0' : '0-1';
      newState.resultReason = 'Checkmate';
    } else {
      // Stalemate
      newState.gameOver = true;
      newState.result = '1/2-1/2';
      newState.resultReason = 'Stalemate';
    }
  } else if (newHalfMove >= 100) {
    // 50-move rule
    newState.gameOver = true;
    newState.result = '1/2-1/2';
    newState.resultReason = '50-move rule';
  } else if (isThreefoldRepetition(newState)) {
    newState.gameOver = true;
    newState.result = '1/2-1/2';
    newState.resultReason = 'Threefold repetition';
  } else if (isInsufficientMaterial(newState.board)) {
    newState.gameOver = true;
    newState.result = '1/2-1/2';
    newState.resultReason = 'Insufficient material';
  }

  return newState;
}

// Helper to get all legal moves without the public state.gameOver guard
function getAllLegalMovesForState(state: ChessState): ChessMove[] {
  const moves: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && colorOf(p) === state.turn) {
        const pseudo = getPseudoMoves(state, r, c);
        moves.push(...filterLegalMoves(state, pseudo));
      }
    }
  }
  return moves;
}

// ── Threefold repetition ────────────────────────────────────────────────

function isThreefoldRepetition(state: ChessState): boolean {
  const current = state.positionHistory[state.positionHistory.length - 1];
  let count = 0;
  for (const pos of state.positionHistory) {
    if (pos === current) count++;
    if (count >= 3) return true;
  }
  return false;
}

// ── Insufficient material ───────────────────────────────────────────────

function isInsufficientMaterial(board: (string | null)[][]): boolean {
  const pieces: string[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]) pieces.push(board[r][c]!);
    }
  }

  // K vs K
  if (pieces.length === 2) return true;

  // K+B vs K or K+N vs K
  if (pieces.length === 3) {
    const nonKings = pieces.filter(p => p.toLowerCase() !== 'k');
    if (nonKings.length === 1 && (nonKings[0].toLowerCase() === 'b' || nonKings[0].toLowerCase() === 'n')) {
      return true;
    }
  }

  // K+B vs K+B (same color bishops)
  if (pieces.length === 4) {
    const bishops: { color: 'w' | 'b'; squareColor: number }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.toLowerCase() === 'b') {
          bishops.push({ color: colorOf(board[r][c]!), squareColor: (r + c) % 2 });
        }
      }
    }
    if (bishops.length === 2 && bishops[0].color !== bishops[1].color && bishops[0].squareColor === bishops[1].squareColor) {
      return true;
    }
  }

  return false;
}

// ── Checkmate / Stalemate ───────────────────────────────────────────────

export function isCheckmate(state: ChessState): boolean {
  if (!isCheck(state, state.turn)) return false;
  return getAllLegalMovesForState(state).length === 0;
}

export function isStalemate(state: ChessState): boolean {
  if (isCheck(state, state.turn)) return false;
  return getAllLegalMovesForState(state).length === 0;
}

// ── Captured pieces ─────────────────────────────────────────────────────

export function getCapturedPieces(state: ChessState): { white: string[]; black: string[] } {
  const white: string[] = [];
  const black: string[] = [];
  for (const move of state.moveHistory) {
    if (move.captured) {
      if (isWhite(move.captured)) {
        white.push(move.captured);
      } else {
        black.push(move.captured);
      }
    }
  }
  // Sort by value
  const order: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };
  const sortFn = (a: string, b: string) => (order[b.toLowerCase()] || 0) - (order[a.toLowerCase()] || 0);
  white.sort(sortFn);
  black.sort(sortFn);
  return { white, black };
}

// ── Needs promotion check ───────────────────────────────────────────────

export function needsPromotion(state: ChessState, from: [number, number], to: [number, number]): boolean {
  const piece = state.board[from[0]][from[1]];
  if (!piece || piece.toLowerCase() !== 'p') return false;
  const promoRow = state.turn === 'w' ? 0 : 7;
  return to[0] === promoRow;
}
