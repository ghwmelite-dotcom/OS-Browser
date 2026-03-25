// ── Minesweeper Logic Engine ────────────────────────────────────────

export type MSDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface MSCell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
}

export type MSBoard = MSCell[][];

export interface MSConfig {
  rows: number;
  cols: number;
  mines: number;
}

export const MS_CONFIGS: Record<MSDifficulty, MSConfig> = {
  Easy: { rows: 9, cols: 9, mines: 10 },
  Medium: { rows: 16, cols: 16, mines: 40 },
  Hard: { rows: 16, cols: 30, mines: 99 },
};

// ── Board Creation ──────────────────────────────────────────────────

function createEmptyBoard(rows: number, cols: number): MSBoard {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacentMines: 0,
    })),
  );
}

function placeMines(board: MSBoard, mineCount: number, safeRow: number, safeCol: number): void {
  const rows = board.length;
  const cols = board[0].length;

  // Collect all valid positions (exclude safe cell and its neighbors)
  const candidates: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
      candidates.push([r, c]);
    }
  }

  // Shuffle and pick first N
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const placed = Math.min(mineCount, candidates.length);
  for (let i = 0; i < placed; i++) {
    const [r, c] = candidates[i];
    board[r][c].mine = true;
  }
}

function computeAdjacent(board: MSBoard): void {
  const rows = board.length;
  const cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      forEachNeighbor(rows, cols, r, c, (nr, nc) => {
        if (board[nr][nc].mine) count++;
      });
      board[r][c].adjacentMines = count;
    }
  }
}

function forEachNeighbor(
  rows: number,
  cols: number,
  r: number,
  c: number,
  fn: (nr: number, nc: number) => void,
): void {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) fn(nr, nc);
    }
  }
}

// ── Public API ──────────────────────────────────────────────────────

export function initBoard(config: MSConfig): MSBoard {
  return createEmptyBoard(config.rows, config.cols);
}

export function generateBoard(config: MSConfig, safeRow: number, safeCol: number): MSBoard {
  const board = createEmptyBoard(config.rows, config.cols);
  placeMines(board, config.mines, safeRow, safeCol);
  computeAdjacent(board);
  return board;
}

export function cloneBoard(board: MSBoard): MSBoard {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

/** Reveal a cell. Returns { board, hitMine }. Flood-fills for 0-cells. */
export function revealCell(
  board: MSBoard,
  row: number,
  col: number,
): { board: MSBoard; hitMine: boolean } {
  const result = cloneBoard(board);
  const cell = result[row][col];

  if (cell.revealed || cell.flagged) return { board: result, hitMine: false };

  if (cell.mine) {
    // Reveal all mines
    for (const r of result) {
      for (const c of r) {
        if (c.mine) c.revealed = true;
      }
    }
    return { board: result, hitMine: true };
  }

  // Flood fill
  const stack: [number, number][] = [[row, col]];
  const rows = result.length;
  const cols = result[0].length;

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    if (result[r][c].revealed || result[r][c].flagged) continue;
    result[r][c].revealed = true;

    if (result[r][c].adjacentMines === 0) {
      forEachNeighbor(rows, cols, r, c, (nr, nc) => {
        if (!result[nr][nc].revealed && !result[nr][nc].flagged && !result[nr][nc].mine) {
          stack.push([nr, nc]);
        }
      });
    }
  }

  return { board: result, hitMine: false };
}

export function toggleFlag(board: MSBoard, row: number, col: number): MSBoard {
  if (board[row][col].revealed) return board;
  const result = cloneBoard(board);
  result[row][col].flagged = !result[row][col].flagged;
  return result;
}

export function checkWin(board: MSBoard): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.mine && !cell.revealed) return false;
    }
  }
  return true;
}

export function countFlags(board: MSBoard): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.flagged) count++;
    }
  }
  return count;
}

export function revealAll(board: MSBoard): MSBoard {
  const result = cloneBoard(board);
  for (const row of result) {
    for (const cell of row) {
      cell.revealed = true;
    }
  }
  return result;
}
