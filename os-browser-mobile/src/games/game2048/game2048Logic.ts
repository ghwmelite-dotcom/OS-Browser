// ── 2048 Game Logic ─────────────────────────────────────────────────

export type Grid = number[][];
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TileData {
  id: number;
  value: number;
  row: number;
  col: number;
  prevRow: number;
  prevCol: number;
  merged: boolean;
  isNew: boolean;
}

export interface GameState {
  grid: Grid;
  tiles: TileData[];
  score: number;
  gameOver: boolean;
  won: boolean;
}

let nextTileId = 1;

function createEmptyGrid(): Grid {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

function getEmptyCells(grid: Grid): [number, number][] {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  return empty;
}

function spawnTile(grid: Grid): { grid: Grid; row: number; col: number; value: number } | null {
  const empty = getEmptyCells(grid);
  if (empty.length === 0) return null;
  const [row, col] = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  const newGrid = cloneGrid(grid);
  newGrid[row][col] = value;
  return { grid: newGrid, row, col, value };
}

// ── Sliding Logic ───────────────────────────────────────────────────

interface SlideResult {
  line: number[];
  score: number;
  merged: boolean[];
  origins: number[]; // original index in the line for each output cell
}

function slideLine(line: number[]): SlideResult {
  const nonZero = line.filter((v) => v !== 0);
  const result: number[] = [];
  const merged: boolean[] = [];
  const origins: number[] = [];
  let score = 0;

  let i = 0;
  while (i < nonZero.length) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const mergedVal = nonZero[i] * 2;
      result.push(mergedVal);
      merged.push(true);
      // Track that this came from position i (first of the pair)
      const origIdx = findNthNonZeroIndex(line, i);
      origins.push(origIdx);
      score += mergedVal;
      i += 2;
    } else {
      result.push(nonZero[i]);
      merged.push(false);
      const origIdx = findNthNonZeroIndex(line, i);
      origins.push(origIdx);
      i++;
    }
  }

  while (result.length < 4) {
    result.push(0);
    merged.push(false);
    origins.push(-1);
  }

  return { line: result, score, merged, origins };
}

function findNthNonZeroIndex(line: number[], n: number): number {
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== 0) {
      if (count === n) return i;
      count++;
    }
  }
  return -1;
}

function getLine(grid: Grid, dir: Direction, idx: number): number[] {
  switch (dir) {
    case 'left':
      return [...grid[idx]];
    case 'right':
      return [...grid[idx]].reverse();
    case 'up':
      return [grid[0][idx], grid[1][idx], grid[2][idx], grid[3][idx]];
    case 'down':
      return [grid[3][idx], grid[2][idx], grid[1][idx], grid[0][idx]];
  }
}

function setLine(grid: Grid, dir: Direction, idx: number, line: number[]): void {
  switch (dir) {
    case 'left':
      grid[idx] = line;
      break;
    case 'right':
      grid[idx] = [...line].reverse();
      break;
    case 'up':
      for (let i = 0; i < 4; i++) grid[i][idx] = line[i];
      break;
    case 'down':
      for (let i = 0; i < 4; i++) grid[3 - i][idx] = line[i];
      break;
  }
}

// ── Move ────────────────────────────────────────────────────────────

export interface MoveResult {
  grid: Grid;
  score: number;
  moved: boolean;
  tiles: TileData[];
  gameOver: boolean;
  won: boolean;
}

export function move(grid: Grid, dir: Direction, currentScore: number): MoveResult {
  const newGrid = cloneGrid(grid);
  let moveScore = 0;
  let moved = false;
  const tiles: TileData[] = [];

  for (let idx = 0; idx < 4; idx++) {
    const line = getLine(grid, dir, idx);
    const result = slideLine(line);

    if (line.join(',') !== result.line.join(',')) {
      moved = true;
    }

    moveScore += result.score;
    setLine(newGrid, dir, idx, result.line);

    // Build tile data for animations
    for (let pos = 0; pos < 4; pos++) {
      if (result.line[pos] === 0) continue;

      const [row, col] = resolvePosition(dir, idx, pos);
      const origPos = result.origins[pos];
      const [prevRow, prevCol] = origPos >= 0 ? resolvePosition(dir, idx, origPos) : [row, col];

      tiles.push({
        id: nextTileId++,
        value: result.line[pos],
        row,
        col,
        prevRow,
        prevCol,
        merged: result.merged[pos],
        isNew: false,
      });
    }
  }

  if (!moved) {
    return {
      grid,
      score: currentScore,
      moved: false,
      tiles: gridToTiles(grid),
      gameOver: isGameOver(grid),
      won: hasWon(grid),
    };
  }

  // Spawn new tile
  const spawn = spawnTile(newGrid);
  if (spawn) {
    tiles.push({
      id: nextTileId++,
      value: spawn.value,
      row: spawn.row,
      col: spawn.col,
      prevRow: spawn.row,
      prevCol: spawn.col,
      merged: false,
      isNew: true,
    });
  }

  const finalGrid = spawn ? spawn.grid : newGrid;
  const totalScore = currentScore + moveScore;

  return {
    grid: finalGrid,
    score: totalScore,
    moved: true,
    tiles,
    gameOver: isGameOver(finalGrid),
    won: hasWon(finalGrid),
  };
}

function resolvePosition(dir: Direction, lineIdx: number, posInLine: number): [number, number] {
  switch (dir) {
    case 'left':
      return [lineIdx, posInLine];
    case 'right':
      return [lineIdx, 3 - posInLine];
    case 'up':
      return [posInLine, lineIdx];
    case 'down':
      return [3 - posInLine, lineIdx];
  }
}

// ── State Checks ────────────────────────────────────────────────────

function hasWon(grid: Grid): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] >= 2048) return true;
    }
  }
  return false;
}

function isGameOver(grid: Grid): boolean {
  if (getEmptyCells(grid).length > 0) return false;
  // Check adjacent merges
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = grid[r][c];
      if (c + 1 < 4 && grid[r][c + 1] === v) return false;
      if (r + 1 < 4 && grid[r + 1][c] === v) return false;
    }
  }
  return true;
}

function gridToTiles(grid: Grid): TileData[] {
  const tiles: TileData[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] !== 0) {
        tiles.push({
          id: nextTileId++,
          value: grid[r][c],
          row: r,
          col: c,
          prevRow: r,
          prevCol: c,
          merged: false,
          isNew: false,
        });
      }
    }
  }
  return tiles;
}

// ── Initialize ──────────────────────────────────────────────────────

export function initGame(): { grid: Grid; tiles: TileData[] } {
  nextTileId = 1;
  let grid = createEmptyGrid();

  const first = spawnTile(grid)!;
  grid = first.grid;
  const second = spawnTile(grid)!;
  grid = second.grid;

  const tiles: TileData[] = [
    {
      id: nextTileId++,
      value: first.value,
      row: first.row,
      col: first.col,
      prevRow: first.row,
      prevCol: first.col,
      merged: false,
      isNew: true,
    },
    {
      id: nextTileId++,
      value: second.value,
      row: second.row,
      col: second.col,
      prevRow: second.row,
      prevCol: second.col,
      merged: false,
      isNew: true,
    },
  ];

  return { grid, tiles };
}
