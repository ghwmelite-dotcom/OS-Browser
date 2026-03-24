// ── Simple Line-by-Line Text Diff ─────────────────────────────────────
// No external dependencies — implements a basic LCS-based diff algorithm.

export interface DiffLine {
  type: 'add' | 'remove' | 'same';
  text: string;
}

export interface DiffResult {
  lines: DiffLine[];
  summary: { added: number; removed: number; unchanged: number };
}

/**
 * Compute a line-by-line diff between two texts.
 * Uses a simple LCS (Longest Common Subsequence) approach.
 */
export function computeDiff(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;

  // For very large files, fall back to a simpler approach
  if (m * n > 500_000) {
    return simpleDiff(oldLines, newLines);
  }

  // Standard LCS DP
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const lines: DiffLine[] = [];
  let i = m;
  let j = n;

  const stack: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: 'same', text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'add', text: newLines[j - 1] });
      j--;
    } else {
      stack.push({ type: 'remove', text: oldLines[i - 1] });
      i--;
    }
  }

  // Reverse since we built it backwards
  for (let k = stack.length - 1; k >= 0; k--) {
    lines.push(stack[k]);
  }

  const added = lines.filter(l => l.type === 'add').length;
  const removed = lines.filter(l => l.type === 'remove').length;
  const unchanged = lines.filter(l => l.type === 'same').length;

  return { lines, summary: { added, removed, unchanged } };
}

/**
 * Simple fallback diff for very large files — just marks removed then added.
 */
function simpleDiff(oldLines: string[], newLines: string[]): DiffResult {
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const lines: DiffLine[] = [];

  for (const line of oldLines) {
    if (newSet.has(line)) {
      lines.push({ type: 'same', text: line });
    } else {
      lines.push({ type: 'remove', text: line });
    }
  }

  for (const line of newLines) {
    if (!oldSet.has(line)) {
      lines.push({ type: 'add', text: line });
    }
  }

  const added = lines.filter(l => l.type === 'add').length;
  const removed = lines.filter(l => l.type === 'remove').length;
  const unchanged = lines.filter(l => l.type === 'same').length;

  return { lines, summary: { added, removed, unchanged } };
}
