// ── Sudoku Logic Engine ─────────────────────────────────────────────
// Generates valid puzzles with unique solutions using backtracking.

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface SudokuCell {
  value: number; // 0 = empty
  given: boolean;
  notes: Set<number>;
  conflict: boolean;
}

export type Board = SudokuCell[][];

// ── Helpers ─────────────────────────────────────────────────────────

function createEmptyGrid(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidPlacement(grid: number[][], row: number, col: number, num: number): boolean {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

// ── Generate Complete Solution ──────────────────────────────────────

function fillGrid(grid: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValidPlacement(grid, r, c, num)) {
            grid[r][c] = num;
            if (fillGrid(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

export function generateSolution(): number[][] {
  const grid = createEmptyGrid();
  fillGrid(grid);
  return grid;
}

// ── Unique Solution Check ───────────────────────────────────────────

function countSolutions(grid: number[][], limit: number): number {
  let count = 0;

  function solve(): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValidPlacement(grid, r, c, num)) {
              grid[r][c] = num;
              if (solve()) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }

  solve();
  return count;
}

// ── Generate Puzzle ─────────────────────────────────────────────────

const GIVEN_RANGES: Record<Difficulty, [number, number]> = {
  Easy: [35, 40],
  Medium: [28, 34],
  Hard: [22, 27],
};

export function generatePuzzle(difficulty: Difficulty): { puzzle: number[][]; solution: number[][] } {
  const solution = generateSolution();
  const puzzle = solution.map((row) => [...row]);
  const [minGiven, maxGiven] = GIVEN_RANGES[difficulty];
  const targetGiven = minGiven + Math.floor(Math.random() * (maxGiven - minGiven + 1));
  const targetRemoved = 81 - targetGiven;

  // Build list of all cells and shuffle
  const cells: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cells.push([r, c]);
    }
  }
  const shuffled = shuffle(cells);

  let removed = 0;
  for (const [r, c] of shuffled) {
    if (removed >= targetRemoved) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    // Check unique solution
    const copy = puzzle.map((row) => [...row]);
    if (countSolutions(copy, 2) === 1) {
      removed++;
    } else {
      puzzle[r][c] = backup;
    }
  }

  return { puzzle, solution };
}

// ── Board Helpers ───────────────────────────────────────────────────

export function createBoard(puzzle: number[][]): Board {
  return puzzle.map((row) =>
    row.map((val) => ({
      value: val,
      given: val !== 0,
      notes: new Set<number>(),
      conflict: false,
    })),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      notes: new Set(cell.notes),
    })),
  );
}

export function findConflicts(board: Board): Board {
  const result = cloneBoard(board);
  // Clear all conflicts first
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      result[r][c].conflict = false;
    }
  }

  // Check each non-empty, non-given cell
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = result[r][c].value;
      if (val === 0) continue;

      // Check row
      for (let c2 = 0; c2 < 9; c2++) {
        if (c2 !== c && result[r][c2].value === val) {
          result[r][c].conflict = true;
          result[r][c2].conflict = true;
        }
      }
      // Check column
      for (let r2 = 0; r2 < 9; r2++) {
        if (r2 !== r && result[r2][c].value === val) {
          result[r][c].conflict = true;
          result[r2][c].conflict = true;
        }
      }
      // Check box
      const boxR = Math.floor(r / 3) * 3;
      const boxC = Math.floor(c / 3) * 3;
      for (let r2 = boxR; r2 < boxR + 3; r2++) {
        for (let c2 = boxC; c2 < boxC + 3; c2++) {
          if ((r2 !== r || c2 !== c) && result[r2][c2].value === val) {
            result[r][c].conflict = true;
            result[r2][c2].conflict = true;
          }
        }
      }
    }
  }
  return result;
}

export function isBoardComplete(board: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c].value === 0 || board[r][c].conflict) return false;
    }
  }
  return true;
}

export function getHint(board: Board, solution: number[][]): [number, number, number] | null {
  const emptyCells: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!board[r][c].given && board[r][c].value === 0) {
        emptyCells.push([r, c]);
      }
    }
  }
  if (emptyCells.length === 0) return null;
  const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  return [r, c, solution[r][c]];
}
