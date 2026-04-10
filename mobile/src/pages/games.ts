import { h, render } from '../utils/dom';
import { showToast } from '../components/toast';

/* ─── Types ─── */
interface GameScores {
  snake: number;
  game2048: number;
  wordScramble: number;
  oware: number;
  chess: number;
  checkers: number;
  ludo: number;
  sudoku: number;
  minesweeper: number;
  solitaire: number;
  ghanaTrivia: number;
  typingSpeed: number;
}

interface GameDef {
  id: keyof GameScores;
  icon: string;
  name: string;
  desc: string;
  gradient: string;
  launch: (overlay: HTMLElement) => (() => void);
}

/* ─── Score persistence ─── */
const SCORE_KEY = 'os_mobile_game_scores';
function loadScores(): GameScores {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { snake: 0, game2048: 0, wordScramble: 0, oware: 0, chess: 0, checkers: 0, ludo: 0, sudoku: 0, minesweeper: 0, solitaire: 0, ghanaTrivia: 0, typingSpeed: 0 };
}
function saveScore(id: keyof GameScores, score: number): boolean {
  const scores = loadScores();
  if (score > scores[id]) {
    scores[id] = score;
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
    return true;
  }
  return false;
}

/* ─── Swipe detection ─── */
type Dir = 'up' | 'down' | 'left' | 'right';
function attachSwipe(el: HTMLElement, cb: (d: Dir) => void, threshold = 30): void {
  let sx = 0, sy = 0;
  el.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) cb(dx > 0 ? 'right' : 'left');
    else cb(dy > 0 ? 'down' : 'up');
  }, { passive: true });
}

/* ─── Game overlay scaffold ─── */
function createOverlay(
  container: HTMLElement,
  title: string,
  onBack: () => void,
  scoreEl?: HTMLElement,
): { overlay: HTMLElement; body: HTMLElement } {
  const header = h('div', {
    style: {
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px', background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'relative', zIndex: '2',
    },
  },
    h('button', {
      onClick: onBack,
      style: {
        background: 'none', border: 'none', color: '#fff',
        fontSize: '24px', cursor: 'pointer', padding: '8px',
        minWidth: '44px', minHeight: '44px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
    }, '\u2190'),
    h('span', {
      style: { flex: '1', fontSize: 'clamp(16px, 4.2vw, 20px)', fontWeight: '700', fontFamily: 'var(--font-display)' },
    }, title),
    ...(scoreEl ? [scoreEl] : []),
  );

  const body = h('div', {
    style: { flex: '1', overflow: 'auto', position: 'relative' },
  });

  const overlay = h('div', {
    style: {
      position: 'fixed', inset: '0', zIndex: '1000',
      background: '#000', display: 'flex', flexDirection: 'column',
    },
  }, header, body);

  document.body.appendChild(overlay);
  return { overlay, body };
}

/* ═══════════════════════════════════════════
   GAME 1 — SNAKE 🐍
   ═══════════════════════════════════════════ */
function launchSnake(container: HTMLElement): () => void {
  let running = true;
  let animId = 0;
  let gameLoop: ReturnType<typeof setInterval> | null = null;

  const scoreSpan = h('span', {
    style: { color: '#D4A017', fontWeight: '700', fontSize: '16px', marginRight: '4px' },
  }, 'Score: 0');

  const cleanup = () => {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    if (gameLoop) clearInterval(gameLoop);
    overlay.remove();
  };

  const { overlay, body } = createOverlay(container, '🐍 Snake', cleanup, scoreSpan);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;margin:0 auto;background:#0a0a0a;touch-action:none;';
  body.appendChild(canvas);

  // D-pad
  const dpadBtn = (label: string, dir: Dir, gridArea: string) =>
    h('button', {
      onClick: () => { nextDir = dir; },
      style: {
        gridArea, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px', color: '#fff', fontSize: '22px',
        minWidth: '56px', minHeight: '56px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
    }, label);

  const dpad = h('div', {
    style: {
      display: 'grid', gridTemplateAreas: `". u ." "l . r" ". d ."`,
      gridTemplateColumns: '56px 56px 56px', gridTemplateRows: '56px 56px 56px',
      gap: '4px', justifyContent: 'center', padding: '12px 0',
    },
  },
    dpadBtn('▲', 'up', 'u'),
    dpadBtn('◄', 'left', 'l'),
    dpadBtn('►', 'right', 'r'),
    dpadBtn('▼', 'down', 'd'),
  );
  body.appendChild(dpad);

  // Sizing
  const w = Math.min(window.innerWidth, 400);
  const cellSize = Math.floor(w / 20);
  const cols = 20;
  const rows = 20;
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
  const ctx = canvas.getContext('2d')!;

  // State
  let snake: { x: number; y: number }[] = [{ x: 10, y: 10 }];
  let dir: Dir = 'right';
  let nextDir: Dir = 'right';
  let food = spawnFood();
  let score = 0;
  let speed = 150;
  let gameOver = false;

  function spawnFood(): { x: number; y: number } {
    let f: { x: number; y: number };
    do {
      f = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (snake.some(s => s.x === f.x && s.y === f.y));
    return f;
  }

  const opposite: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

  function tick() {
    if (!running || gameOver) return;
    // Prevent reversing
    if (opposite[nextDir] !== dir) dir = nextDir;

    const head = { ...snake[0] };
    if (dir === 'up') head.y--;
    else if (dir === 'down') head.y++;
    else if (dir === 'left') head.x--;
    else head.x++;

    // Wall collision
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) { endGame(); return; }
    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) { endGame(); return; }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreSpan.textContent = `Score: ${score}`;
      food = spawnFood();
      // Speed up
      if (speed > 60) { speed -= 3; restartLoop(); }
    } else {
      snake.pop();
    }
    drawSnake();
  }

  function drawSnake() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= cols; i++) { ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, rows * cellSize); ctx.stroke(); }
    for (let j = 0; j <= rows; j++) { ctx.beginPath(); ctx.moveTo(0, j * cellSize); ctx.lineTo(cols * cellSize, j * cellSize); ctx.stroke(); }

    // Food
    ctx.fillStyle = '#CE1126';
    ctx.beginPath();
    ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, cellSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Snake
    snake.forEach((s, i) => {
      const g = ctx.createLinearGradient(s.x * cellSize, s.y * cellSize, (s.x + 1) * cellSize, (s.y + 1) * cellSize);
      if (i === 0) { g.addColorStop(0, '#D4A017'); g.addColorStop(1, '#f0c040'); }
      else { g.addColorStop(0, '#006B3F'); g.addColorStop(1, '#00a85f'); }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(s.x * cellSize + 1, s.y * cellSize + 1, cellSize - 2, cellSize - 2, 4);
      ctx.fill();
    });
  }

  function endGame() {
    gameOver = true;
    if (gameLoop) clearInterval(gameLoop);
    const isRecord = saveScore('snake', score);
    if (isRecord) showToast('🎉 New Record!', 'success');

    const gameOverEl = h('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)',
        zIndex: '5',
      },
    },
      h('div', { style: { fontSize: '32px', fontWeight: '800', color: '#CE1126', fontFamily: 'var(--font-display)', marginBottom: '8px' } }, 'Game Over'),
      h('div', { style: { fontSize: '20px', color: '#D4A017', marginBottom: '24px' } }, `Score: ${score}`),
      h('button', {
        onClick: () => { gameOverEl.remove(); restart(); },
        style: {
          background: 'linear-gradient(135deg, #006B3F, #00a85f)', border: 'none',
          color: '#fff', padding: '14px 36px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '700', cursor: 'pointer', minHeight: '48px',
        },
      }, 'Play Again'),
    );
    body.appendChild(gameOverEl);
  }

  function restart() {
    snake = [{ x: 10, y: 10 }];
    dir = 'right'; nextDir = 'right';
    food = spawnFood();
    score = 0; speed = 150; gameOver = false;
    scoreSpan.textContent = 'Score: 0';
    restartLoop();
    drawSnake();
  }

  function restartLoop() {
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(tick, speed);
  }

  attachSwipe(canvas, (d) => { nextDir = d; });
  restartLoop();
  drawSnake();

  return cleanup;
}

/* ═══════════════════════════════════════════
   GAME 2 — 2048 🔢
   ═══════════════════════════════════════════ */
function launch2048(container: HTMLElement): () => void {
  const scoreSpan = h('span', { style: { color: '#D4A017', fontWeight: '700', fontSize: '16px' } }, 'Score: 0');

  const cleanup = () => { overlay.remove(); };
  const { overlay, body } = createOverlay(container, '🔢 2048', cleanup, scoreSpan);

  const TILE_COLORS: Record<number, string> = {
    0: 'rgba(255,255,255,0.04)', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179',
    16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72',
    256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
  };
  const DARK_TEXT = new Set([0, 2, 4]);

  let grid: number[][] = [];
  let score = 0;
  let won = false;
  let gameOver = false;

  const boardSize = Math.min(window.innerWidth - 32, 380);
  const gap = 8;
  const tileSize = (boardSize - gap * 5) / 4;

  const boardEl = h('div', {
    style: {
      width: `${boardSize}px`, height: `${boardSize}px`, margin: '24px auto',
      display: 'grid', gridTemplateColumns: `repeat(4, ${tileSize}px)`,
      gap: `${gap}px`, padding: `${gap}px`,
      background: 'rgba(255,255,255,0.06)', borderRadius: '12px',
      touchAction: 'none',
    },
  });

  const tileEls: HTMLElement[][] = [];
  for (let r = 0; r < 4; r++) {
    tileEls[r] = [];
    for (let c = 0; c < 4; c++) {
      const tile = h('div', {
        style: {
          width: `${tileSize}px`, height: `${tileSize}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '8px', fontWeight: '800',
          fontSize: tileSize > 70 ? '28px' : '22px',
          fontFamily: 'var(--font-display)',
          transition: 'background 0.15s ease, transform 0.15s ease',
        },
      });
      tileEls[r][c] = tile;
      boardEl.appendChild(tile);
    }
  }

  body.appendChild(boardEl);

  // Instructions
  body.appendChild(h('div', {
    style: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '8px 16px' },
  }, 'Swipe to slide tiles. Merge matching numbers to reach 2048!'));

  function init() {
    grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    score = 0; won = false; gameOver = false;
    addRandomTile();
    addRandomTile();
    updateBoard();
  }

  function addRandomTile() {
    const empty: [number, number][] = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (grid[r][c] === 0) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function updateBoard() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const v = grid[r][c];
        const tile = tileEls[r][c];
        tile.textContent = v ? String(v) : '';
        const bg = TILE_COLORS[v] || (v > 2048 ? '#3c3a32' : 'rgba(255,255,255,0.04)');
        tile.style.background = bg;
        tile.style.color = DARK_TEXT.has(v) ? '#776e65' : '#fff';
        const len = String(v).length;
        tile.style.fontSize = len >= 4 ? `${tileSize > 70 ? 20 : 16}px` : len === 3 ? `${tileSize > 70 ? 24 : 18}px` : `${tileSize > 70 ? 28 : 22}px`;
      }
    }
    scoreSpan.textContent = `Score: ${score}`;
  }

  function slide(row: number[]): { newRow: number[]; pts: number; moved: boolean } {
    let pts = 0;
    const filtered = row.filter(v => v !== 0);
    const merged: number[] = [];
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const val = filtered[i] * 2;
        merged.push(val);
        pts += val;
        if (val === 2048 && !won) { won = true; showToast('🎉 You reached 2048!', 'success'); }
        i += 2;
      } else {
        merged.push(filtered[i]);
        i++;
      }
    }
    while (merged.length < 4) merged.push(0);
    const moved = row.some((v, idx) => v !== merged[idx]);
    return { newRow: merged, pts, moved };
  }

  function move(dir: Dir) {
    if (gameOver) return;
    let moved = false;
    const newGrid = grid.map(r => [...r]);

    if (dir === 'left') {
      for (let r = 0; r < 4; r++) {
        const res = slide(grid[r]);
        newGrid[r] = res.newRow; score += res.pts; if (res.moved) moved = true;
      }
    } else if (dir === 'right') {
      for (let r = 0; r < 4; r++) {
        const res = slide([...grid[r]].reverse());
        newGrid[r] = res.newRow.reverse(); score += res.pts; if (res.moved) moved = true;
      }
    } else if (dir === 'up') {
      for (let c = 0; c < 4; c++) {
        const col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
        const res = slide(col);
        for (let r = 0; r < 4; r++) newGrid[r][c] = res.newRow[r];
        score += res.pts; if (res.moved) moved = true;
      }
    } else {
      for (let c = 0; c < 4; c++) {
        const col = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
        const res = slide(col);
        for (let r = 0; r < 4; r++) newGrid[3 - r][c] = res.newRow[r];
        score += res.pts; if (res.moved) moved = true;
      }
    }

    if (moved) {
      grid = newGrid;
      addRandomTile();
      updateBoard();
      if (checkGameOver()) {
        gameOver = true;
        const isRecord = saveScore('game2048', score);
        if (isRecord) showToast('🎉 New Record!', 'success');
        showGameOverOverlay();
      }
    }
  }

  function checkGameOver(): boolean {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return false;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return false;
    }
    return true;
  }

  function showGameOverOverlay() {
    const go = h('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: '5',
      },
    },
      h('div', { style: { fontSize: '28px', fontWeight: '800', color: '#CE1126', fontFamily: 'var(--font-display)', marginBottom: '8px' } }, 'No Moves Left!'),
      h('div', { style: { fontSize: '20px', color: '#D4A017', marginBottom: '24px' } }, `Score: ${score}`),
      h('button', {
        onClick: () => { go.remove(); init(); },
        style: {
          background: 'linear-gradient(135deg, #006B3F, #00a85f)', border: 'none',
          color: '#fff', padding: '14px 36px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '700', cursor: 'pointer', minHeight: '48px',
        },
      }, 'Play Again'),
    );
    body.appendChild(go);
  }

  attachSwipe(boardEl, move);
  init();

  return cleanup;
}

/* ═══════════════════════════════════════════
   GAME 3 — WORD SCRAMBLE 🔤
   ═══════════════════════════════════════════ */
interface WordEntry { word: string; category: string; }

const WORD_BANK: WordEntry[] = [
  { word: 'ACCRA', category: 'City' }, { word: 'KUMASI', category: 'City' },
  { word: 'TAMALE', category: 'City' }, { word: 'TAKORADI', category: 'City' },
  { word: 'SEKONDI', category: 'City' }, { word: 'SUNYANI', category: 'City' },
  { word: 'CAPE', category: 'City' }, { word: 'COAST', category: 'City' },
  { word: 'ELMINA', category: 'City' }, { word: 'KOKROBITE', category: 'City' },
  { word: 'LABADI', category: 'City' }, { word: 'ABURI', category: 'City' },
  { word: 'BUSUA', category: 'City' },
  { word: 'ASHANTI', category: 'Culture' }, { word: 'GHANA', category: 'Culture' },
  { word: 'KENTE', category: 'Culture' }, { word: 'ADINKRA', category: 'Culture' },
  { word: 'SANKOFA', category: 'Culture' }, { word: 'CHIEFS', category: 'Culture' },
  { word: 'DURBAR', category: 'Culture' }, { word: 'DASHIKI', category: 'Culture' },
  { word: 'HIGHLIFE', category: 'Culture' }, { word: 'AZONTO', category: 'Culture' },
  { word: 'OBRONI', category: 'Culture' }, { word: 'CHALE', category: 'Culture' },
  { word: 'TROTRO', category: 'Culture' },
  { word: 'VOLTA', category: 'Geography' }, { word: 'ANKASA', category: 'Geography' },
  { word: 'KAKUM', category: 'Geography' }, { word: 'MOLE', category: 'Geography' },
  { word: 'CASTLE', category: 'Geography' }, { word: 'AKOSOMBO', category: 'Geography' },
  { word: 'JOLLOF', category: 'Food' }, { word: 'FUFU', category: 'Food' },
  { word: 'BANKU', category: 'Food' }, { word: 'KENKEY', category: 'Food' },
  { word: 'WAAKYE', category: 'Food' }, { word: 'SHITO', category: 'Food' },
  { word: 'KELEWELE', category: 'Food' }, { word: 'BOFROT', category: 'Food' },
  { word: 'GROUNDNUT', category: 'Food' }, { word: 'PLANTAIN', category: 'Food' },
  { word: 'TILAPIA', category: 'Food' }, { word: 'OKRA', category: 'Food' },
  { word: 'KONTOMIRE', category: 'Food' },
  { word: 'COCOA', category: 'Economy' }, { word: 'GOLD', category: 'Economy' },
  { word: 'CEDI', category: 'Economy' }, { word: 'PESEWA', category: 'Economy' },
  { word: 'HARMATTAN', category: 'Nature' },
];

function launchWordScramble(container: HTMLElement): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = true;
  const WORDS_PER_ROUND = 10;
  const scoreSpan = h('span', { style: { color: '#D4A017', fontWeight: '700', fontSize: '16px' } }, 'Score: 0');

  const cleanup = () => {
    running = false;
    if (timer) clearInterval(timer);
    overlay.remove();
  };
  const { overlay, body } = createOverlay(container, '🔤 Word Scramble', cleanup, scoreSpan);

  let totalScore = 0;
  let currentWord = '';
  let scrambled = '';
  let hintsUsed = 0;
  let revealed: Set<number> = new Set();
  let timeLeft = 60;
  let usedWords: Set<string> = new Set();
  let wordsCompleted = 0;
  let wordsCorrect = 0;

  // DOM elements
  const timerEl = h('div', { style: { textAlign: 'center', fontSize: '18px', fontWeight: '700', color: '#CE1126', marginBottom: '8px' } }, '60s');
  const categoryEl = h('div', { style: { textAlign: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' } });
  const scrambledEl = h('div', {
    style: {
      textAlign: 'center', fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: '800',
      fontFamily: 'var(--font-display)', color: '#D4A017',
      letterSpacing: '8px', margin: '16px 0',
    },
  });
  const inputEl = document.createElement('input');
  Object.assign(inputEl.style, {
    width: '100%', maxWidth: '320px', margin: '0 auto', display: 'block',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px', padding: '14px 16px', color: '#fff', fontSize: '18px',
    fontWeight: '600', textAlign: 'center', textTransform: 'uppercase',
    outline: 'none', fontFamily: 'var(--font-body)',
  });
  inputEl.placeholder = 'Type your answer...';
  inputEl.autocomplete = 'off';
  inputEl.autocapitalize = 'characters';

  const hintEl = h('div', {
    style: {
      textAlign: 'center', fontSize: '16px', color: 'rgba(255,255,255,0.3)',
      letterSpacing: '6px', margin: '12px 0', fontFamily: 'monospace', fontWeight: '700',
    },
  });

  const submitBtn = h('button', {
    onClick: () => checkAnswer(),
    style: {
      display: 'block', margin: '16px auto 0', background: 'linear-gradient(135deg, #006B3F, #00a85f)',
      border: 'none', color: '#fff', padding: '14px 40px', borderRadius: '12px',
      fontSize: '16px', fontWeight: '700', cursor: 'pointer', minHeight: '48px',
    },
  }, 'Submit');

  const hintBtn = h('button', {
    onClick: () => revealHint(),
    style: {
      display: 'block', margin: '12px auto 0', background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.12)', color: '#D4A017',
      padding: '12px 32px', borderRadius: '12px', fontSize: '14px',
      fontWeight: '600', cursor: 'pointer', minHeight: '44px',
    },
  }, '💡 Hint');

  const roundEl = h('div', { style: { textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' } }, `Word 1 of ${WORDS_PER_ROUND}`);

  const skipBtn = h('button', {
    onClick: () => {
      if (!running) return;
      totalScore = Math.max(0, totalScore - 25);
      scoreSpan.textContent = `Score: ${totalScore}`;
      showToast(`Skipped! -25 pts. The word was ${currentWord}`, 'error');
      advanceWord();
    },
    style: {
      display: 'block', margin: '12px auto 0', background: 'none',
      border: 'none', color: 'rgba(255,255,255,0.4)',
      padding: '10px 24px', fontSize: '14px', cursor: 'pointer', minHeight: '44px',
    },
  }, 'Skip (-25pts) →');

  const wrapper = h('div', { style: { padding: '24px 16px' } },
    roundEl, timerEl, categoryEl, scrambledEl, hintEl,
    h('div', { style: { maxWidth: '320px', margin: '0 auto' } }, inputEl),
    submitBtn, hintBtn, skipBtn,
  );
  body.appendChild(wrapper);

  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAnswer(); });

  function scrambleWord(w: string): string {
    const arr = w.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const result = arr.join('');
    // Re-scramble if same as original
    return result === w ? scrambleWord(w) : result;
  }

  function advanceWord() {
    wordsCompleted++;
    if (wordsCompleted >= WORDS_PER_ROUND) {
      if (timer) clearInterval(timer);
      showFinalResults();
      return;
    }
    loadNextWord();
  }

  function loadNextWord() {
    if (!running) return;
    const available = WORD_BANK.filter(w => !usedWords.has(w.word));
    if (!available.length) usedWords.clear();
    const pool = WORD_BANK.filter(w => !usedWords.has(w.word));
    if (!pool.length) return;

    const entry = pool[Math.floor(Math.random() * pool.length)];
    usedWords.add(entry.word);
    currentWord = entry.word;
    scrambled = scrambleWord(currentWord);
    hintsUsed = 0;
    revealed = new Set();
    timeLeft = 60;

    roundEl.textContent = `Word ${wordsCompleted + 1} of ${WORDS_PER_ROUND}`;
    scrambledEl.textContent = scrambled;
    categoryEl.textContent = `Category: ${entry.category}`;
    inputEl.value = '';
    updateHint();
    inputEl.focus();

    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (!running) { if (timer) clearInterval(timer); return; }
      timeLeft--;
      timerEl.textContent = `${timeLeft}s`;
      timerEl.style.color = timeLeft <= 10 ? '#CE1126' : 'rgba(255,255,255,0.6)';
      if (timeLeft <= 0) {
        showToast(`Time's up! The word was ${currentWord}`, 'error');
        advanceWord();
      }
    }, 1000);
  }

  function updateHint() {
    let hint = '';
    for (let i = 0; i < currentWord.length; i++) {
      hint += revealed.has(i) ? currentWord[i] : '_';
      if (i < currentWord.length - 1) hint += ' ';
    }
    hintEl.textContent = hint;
  }

  function revealHint() {
    const unrevealed: number[] = [];
    for (let i = 0; i < currentWord.length; i++) if (!revealed.has(i)) unrevealed.push(i);
    if (!unrevealed.length) return;
    revealed.add(unrevealed[Math.floor(Math.random() * unrevealed.length)]);
    hintsUsed++;
    updateHint();
  }

  function checkAnswer() {
    const guess = inputEl.value.trim().toUpperCase();
    if (!guess) return;

    if (guess === currentWord) {
      const bonus = Math.max(0, timeLeft) * 2;
      const hintPenalty = hintsUsed * 15;
      const pts = Math.max(10, 100 + bonus - hintPenalty);
      totalScore += pts;
      wordsCorrect++;
      scoreSpan.textContent = `Score: ${totalScore}`;
      showToast(`Correct! +${pts} points`, 'success');
      advanceWord();
    } else {
      showToast('Try again!', 'error');
      inputEl.value = '';
      inputEl.focus();
    }
  }

  function showFinalResults() {
    if (timer) clearInterval(timer);
    const isRecord = saveScore('wordScramble', totalScore);
    if (isRecord) showToast('New Record!', 'success');

    const resultsEl = h('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', zIndex: '5',
        padding: '24px',
      },
    },
      h('div', { style: { fontSize: '36px', marginBottom: '8px' } }, '🔤'),
      h('div', { style: { fontSize: '24px', fontWeight: '800', color: '#D4A017', fontFamily: 'var(--font-display)', marginBottom: '8px' } }, 'Round Complete!'),
      h('div', { style: { fontSize: '18px', color: '#fff', marginBottom: '4px' } }, `Score: ${totalScore}`),
      h('div', { style: { fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' } }, `${wordsCorrect}/${WORDS_PER_ROUND} correct`),
      h('button', {
        onClick: () => {
          resultsEl.remove();
          totalScore = 0; wordsCompleted = 0; wordsCorrect = 0;
          usedWords.clear();
          scoreSpan.textContent = 'Score: 0';
          loadNextWord();
        },
        style: {
          background: 'linear-gradient(135deg, #006B3F, #00a85f)', border: 'none',
          color: '#fff', padding: '14px 36px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '700', cursor: 'pointer', minHeight: '48px',
        },
      }, 'Play Again'),
    );
    body.appendChild(resultsEl);
  }

  loadNextWord();
  return cleanup;
}

/* ═══════════════════════════════════════════
   GAME 4 — OWARE 🫘
   ═══════════════════════════════════════════ */
function launchOware(container: HTMLElement): () => void {
  const scoreSpan = h('span', { style: { color: '#D4A017', fontWeight: '700', fontSize: '16px' } }, '0 - 0');

  const cleanup = () => { overlay.remove(); };
  const { overlay, body } = createOverlay(container, '🫘 Oware', cleanup, scoreSpan);

  // Board: row 0 = AI (top, pits 0-5 left to right), row 1 = Player (bottom, pits 0-5 left to right)
  // Oware is played counterclockwise: Player row left->right, then AI row right->left
  let board = [[4, 4, 4, 4, 4, 4], [4, 4, 4, 4, 4, 4]];
  let captured = [0, 0]; // [AI, Player]
  let playerTurn = true;
  let gameOverFlag = false;

  const boardWidth = Math.min(window.innerWidth - 32, 400);
  const pitSize = Math.floor((boardWidth - 7 * 8) / 6); // 6 pits + 7 gaps

  // Status
  const statusEl = h('div', {
    style: {
      textAlign: 'center', padding: '12px', fontSize: '15px', fontWeight: '600',
      color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)',
    },
  }, 'Your turn — tap a pit to sow');

  // Create board UI
  function createPit(row: number, col: number, interactive: boolean): HTMLElement {
    const pit = h('div', {
      onClick: interactive ? () => playerMove(col) : undefined,
      style: {
        width: `${pitSize}px`, height: `${pitSize}px`,
        borderRadius: '50%',
        background: interactive
          ? 'radial-gradient(circle, #3a2a14, #2a1a0a)'
          : 'radial-gradient(circle, #2a2a2a, #1a1a1a)',
        border: `2px solid ${interactive ? '#6b4a2a' : '#444'}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.4)',
      },
    },
      h('span', {
        className: `pit-${row}-${col}`,
        style: { fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: '800', color: '#D4A017' },
      }, String(board[row][col])),
      h('span', {
        style: { fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' },
      }, renderSeeds(board[row][col])),
    );
    return pit;
  }

  function renderSeeds(n: number): string {
    if (n === 0) return '';
    if (n <= 6) return '●'.repeat(n);
    return `●×${n}`;
  }

  // AI row (top) - displayed right to left for counterclockwise visual
  const aiLabel = h('div', { style: { textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)', padding: '4px' } }, '← AI Side');
  const aiRow = h('div', {
    style: {
      display: 'flex', gap: '8px', justifyContent: 'center', padding: '8px',
    },
  });
  // Player row (bottom)
  const playerLabel = h('div', { style: { textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)', padding: '4px' } }, 'Your Side →');
  const playerRow = h('div', {
    style: {
      display: 'flex', gap: '8px', justifyContent: 'center', padding: '8px',
    },
  });

  // Score display
  const scoreBoard = h('div', {
    style: {
      display: 'flex', justifyContent: 'space-around', padding: '16px',
      margin: '8px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
    },
  },
    h('div', { style: { textAlign: 'center' } },
      h('div', { style: { fontSize: '13px', color: 'rgba(255,255,255,0.4)' } }, 'AI'),
      h('div', { className: 'oware-ai-score', style: { fontSize: '28px', fontWeight: '800', color: '#CE1126' } }, '0'),
    ),
    h('div', { style: { textAlign: 'center' } },
      h('div', { style: { fontSize: '13px', color: 'rgba(255,255,255,0.4)' } }, 'You'),
      h('div', { className: 'oware-player-score', style: { fontSize: '28px', fontWeight: '800', color: '#006B3F' } }, '0'),
    ),
  );

  const boardContainer = h('div', {
    style: {
      background: 'linear-gradient(180deg, #4a3520, #3a2510)',
      borderRadius: '16px', padding: '12px', margin: '16px',
      border: '3px solid #6b4a2a',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)',
    },
  }, aiLabel, aiRow, h('div', { style: { height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' } }), playerRow, playerLabel);

  body.appendChild(statusEl);
  body.appendChild(scoreBoard);
  body.appendChild(boardContainer);

  // Instructions
  body.appendChild(h('div', {
    style: { padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
  }, 'Pick seeds from your pit, sow counterclockwise. Capture from opponent pits ending with 2 or 3 seeds.'));

  function refreshBoard() {
    aiRow.innerHTML = '';
    playerRow.innerHTML = '';
    // AI row: display left to right
    for (let c = 0; c < 6; c++) aiRow.appendChild(createPit(0, c, false));
    // Player row
    for (let c = 0; c < 6; c++) playerRow.appendChild(createPit(1, c, true));

    const aiScoreEl = scoreBoard.querySelector('.oware-ai-score') as HTMLElement;
    const plScoreEl = scoreBoard.querySelector('.oware-player-score') as HTMLElement;
    if (aiScoreEl) aiScoreEl.textContent = String(captured[0]);
    if (plScoreEl) plScoreEl.textContent = String(captured[1]);
    scoreSpan.textContent = `${captured[0]} - ${captured[1]}`;
  }

  // Advance one pit counterclockwise
  function nextPit(r: number, c: number): [number, number] {
    if (r === 1) { c++; if (c >= 6) { r = 0; c = 5; } }
    else { c--; if (c < 0) { r = 1; c = 0; } }
    return [r, c];
  }

  // Sow seeds and return last pit [row, col]
  function sow(b: number[][], row: number, col: number): [number, number] {
    let seeds = b[row][col];
    b[row][col] = 0;

    let r = row, c = col;
    while (seeds > 0) {
      [r, c] = nextPit(r, c);
      // Skip origin pit when 12+ seeds wrap around
      if (r === row && c === col) { [r, c] = nextPit(r, c); }
      b[r][c]++;
      seeds--;
    }
    return [r, c];
  }

  // Capture from opponent's side — returns captured count
  function capture(b: number[][], cap: number[], sower: number, lastR: number, lastC: number): number {
    const opponent = sower === 1 ? 0 : 1;
    const scorer = sower === 1 ? 1 : 0;
    if (lastR !== opponent) return 0; // Last seed must land on opponent's side

    // Calculate what would be captured (backwards chain)
    const toCapture: [number, number][] = [];
    let r = lastR, c = lastC;
    while (true) {
      if (r !== opponent) break;
      if (b[r][c] !== 2 && b[r][c] !== 3) break;
      toCapture.push([r, c]);
      // Move backward (clockwise, opposite of sowing)
      if (r === 0) { c++; if (c >= 6) break; }
      else { c--; if (c < 0) break; }
    }

    if (toCapture.length === 0) return 0;

    // Grand Slam check: if capturing ALL opponent seeds, capture is void
    let totalCapture = 0;
    for (const [cr, cc] of toCapture) totalCapture += b[cr][cc];
    const opponentTotal = b[opponent].reduce((a, v) => a + v, 0);
    if (totalCapture === opponentTotal) return 0; // Grand slam — no capture

    // Execute capture
    for (const [cr, cc] of toCapture) {
      cap[scorer] += b[cr][cc];
      b[cr][cc] = 0;
    }
    return totalCapture;
  }

  // Check if a move from (row, col) feeds the opponent (delivers seeds to their side)
  function moveFeedsOpponent(row: number, col: number): boolean {
    const simB = board.map(r => [...r]);
    const seeds = simB[row][col];
    if (seeds === 0) return false;
    sow(simB, row, col);
    const opponent = row === 1 ? 0 : 1;
    return simB[opponent].some(v => v > 0);
  }

  // Get valid moves for a row, respecting feeding obligation
  function getValidMoves(row: number): number[] {
    const opponent = row === 1 ? 0 : 1;
    const opponentEmpty = board[opponent].every(v => v === 0);
    const nonEmpty: number[] = [];
    for (let c = 0; c < 6; c++) if (board[row][c] > 0) nonEmpty.push(c);

    if (!opponentEmpty) return nonEmpty; // No feeding obligation

    // Opponent is empty — must play a move that feeds them
    const feedingMoves = nonEmpty.filter(c => moveFeedsOpponent(row, c));
    return feedingMoves; // Empty array = no valid moves, game ends
  }

  function checkEnd(): boolean {
    if (captured[0] >= 25 || captured[1] >= 25) return true;

    const currentRow = playerTurn ? 1 : 0;
    const otherRow = playerTurn ? 0 : 1;
    const moves = getValidMoves(currentRow);

    if (moves.length === 0) {
      // Current player can't move — remaining seeds go to other player
      for (let c = 0; c < 6; c++) { captured[otherRow === 0 ? 0 : 1] += board[otherRow][c]; board[otherRow][c] = 0; }
      for (let c = 0; c < 6; c++) { captured[currentRow === 0 ? 0 : 1] += board[currentRow][c]; board[currentRow][c] = 0; }
      return true;
    }
    return false;
  }

  function endOware() {
    gameOverFlag = true;
    const winner = captured[1] > captured[0] ? 'You win!' : captured[0] > captured[1] ? 'AI wins!' : 'Draw!';
    const color = captured[1] > captured[0] ? '#006B3F' : '#CE1126';

    const isRecord = saveScore('oware', captured[1]);
    if (isRecord) showToast('🎉 New Record!', 'success');

    const go = h('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: '5',
      },
    },
      h('div', { style: { fontSize: '28px', fontWeight: '800', color, fontFamily: 'var(--font-display)', marginBottom: '8px' } }, winner),
      h('div', { style: { fontSize: '18px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' } }, `You: ${captured[1]}  |  AI: ${captured[0]}`),
      h('button', {
        onClick: () => { go.remove(); resetOware(); },
        style: {
          background: 'linear-gradient(135deg, #006B3F, #00a85f)', border: 'none',
          color: '#fff', padding: '14px 36px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '700', cursor: 'pointer', minHeight: '48px',
        },
      }, 'Play Again'),
    );
    body.appendChild(go);
  }

  function playerMove(col: number) {
    if (!playerTurn || gameOverFlag) return;
    const valid = getValidMoves(1);
    if (!valid.includes(col)) return;

    const [lr, lc] = sow(board, 1, col);
    capture(board, captured, 1, lr, lc);
    refreshBoard();

    if (checkEnd()) { endOware(); return; }

    playerTurn = false;
    statusEl.textContent = 'AI is thinking...';

    setTimeout(() => {
      aiMove();
      refreshBoard();
      if (checkEnd()) { endOware(); return; }
      playerTurn = true;
      statusEl.textContent = 'Your turn — tap a pit to sow';
    }, 600);
  }

  function aiMove() {
    const validMoves = getValidMoves(0);
    if (validMoves.length === 0) return;

    // Greedy: simulate each valid move on a clone, pick highest capture
    let bestCol = -1;
    let bestCapture = -1;

    for (const c of validMoves) {
      const simB = board.map(r => [...r]);
      const simCap = [...captured];
      const [lr, lc] = sow(simB, 0, c);
      const capCount = capture(simB, simCap, 0, lr, lc);

      if (capCount > bestCapture) {
        bestCapture = capCount;
        bestCol = c;
      }
    }

    // If no captures found, pick random valid move
    if (bestCol === -1 || bestCapture === 0) {
      bestCol = validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    const [lr, lc] = sow(board, 0, bestCol);
    capture(board, captured, 0, lr, lc);
  }

  function resetOware() {
    board = [[4, 4, 4, 4, 4, 4], [4, 4, 4, 4, 4, 4]];
    captured = [0, 0];
    playerTurn = true;
    gameOverFlag = false;
    statusEl.textContent = 'Your turn — tap a pit to sow';
    refreshBoard();
  }

  refreshBoard();
  return cleanup;
}

/* ═══════════════════════════════════════════
   GAME 5 — CHESS ♟️
   ═══════════════════════════════════════════ */
type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
type PieceColor = 'w' | 'b';
interface ChessPiece { type: PieceType; color: PieceColor; }
type ChessBoard = (ChessPiece | null)[][];

function launchChess(container: HTMLElement): () => void {
  const scoreSpan = h('span', { style: { color: '#D4A017', fontWeight: '700', fontSize: '14px' } }, '');
  const cleanup = () => { overlay.remove(); };
  const { overlay, body } = createOverlay(container, '♟️ Chess', cleanup, scoreSpan);

  const PIECE_ICONS: Record<string, string> = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
  };

  let board: ChessBoard;
  let turn: PieceColor = 'w';
  let selected: [number, number] | null = null;
  let validMoves: [number, number][] = [];
  let castleRights = { wK: true, wQ: true, bK: true, bQ: true };
  let enPassantTarget: [number, number] | null = null;
  let gameOverFlag = false;
  let moveCount = 0;
  let promotionCallback: ((t: PieceType) => void) | null = null;

  function initBoard(): ChessBoard {
    const b: ChessBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    const backRank: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    for (let c = 0; c < 8; c++) {
      b[0][c] = { type: backRank[c], color: 'b' };
      b[1][c] = { type: 'P', color: 'b' };
      b[6][c] = { type: 'P', color: 'w' };
      b[7][c] = { type: backRank[c], color: 'w' };
    }
    return b;
  }

  function cloneBoard(b: ChessBoard): ChessBoard {
    return b.map(row => row.map(cell => cell ? { ...cell } : null));
  }

  function inBounds(r: number, c: number): boolean { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  function findKing(b: ChessBoard, color: PieceColor): [number, number] {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (p && p.type === 'K' && p.color === color) return [r, c];
    }
    return [-1, -1];
  }

  function isAttacked(b: ChessBoard, tr: number, tc: number, byColor: PieceColor): boolean {
    // Check all pieces of byColor to see if they attack [tr,tc]
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || p.color !== byColor) continue;
      if (p.type === 'P') {
        const dir = p.color === 'w' ? -1 : 1;
        if (r + dir === tr && (c - 1 === tc || c + 1 === tc)) return true;
      } else if (p.type === 'N') {
        const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of jumps) if (r + dr === tr && c + dc === tc) return true;
      } else if (p.type === 'K') {
        if (Math.abs(r - tr) <= 1 && Math.abs(c - tc) <= 1 && !(r === tr && c === tc)) return true;
      } else {
        const dirs: [number, number][] = [];
        if (p.type === 'R' || p.type === 'Q') dirs.push([0,1],[0,-1],[1,0],[-1,0]);
        if (p.type === 'B' || p.type === 'Q') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (inBounds(nr, nc)) {
            if (nr === tr && nc === tc) return true;
            if (b[nr][nc]) break;
            nr += dr; nc += dc;
          }
        }
      }
    }
    return false;
  }

  function isInCheck(b: ChessBoard, color: PieceColor): boolean {
    const [kr, kc] = findKing(b, color);
    if (kr === -1) return false;
    return isAttacked(b, kr, kc, color === 'w' ? 'b' : 'w');
  }

  function getRawMoves(b: ChessBoard, r: number, c: number): [number, number][] {
    const p = b[r][c];
    if (!p) return [];
    const moves: [number, number][] = [];
    const color = p.color;
    const enemy = color === 'w' ? 'b' : 'w';

    if (p.type === 'P') {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      // Forward
      if (inBounds(r + dir, c) && !b[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && !b[r + 2 * dir][c]) moves.push([r + 2 * dir, c]);
      }
      // Captures
      for (const dc of [-1, 1]) {
        const nr = r + dir, nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        if (b[nr][nc] && b[nr][nc]!.color === enemy) moves.push([nr, nc]);
        // En passant
        if (enPassantTarget && enPassantTarget[0] === nr && enPassantTarget[1] === nc) moves.push([nr, nc]);
      }
    } else if (p.type === 'N') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && (!b[nr][nc] || b[nr][nc]!.color === enemy)) moves.push([nr, nc]);
      }
    } else if (p.type === 'K') {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && (!b[nr][nc] || b[nr][nc]!.color === enemy)) moves.push([nr, nc]);
      }
      // Castling
      if (!isInCheck(b, color)) {
        const row = color === 'w' ? 7 : 0;
        if (r === row && c === 4) {
          // Kingside
          const ksKey = color === 'w' ? 'wK' : 'bK';
          if (castleRights[ksKey] && !b[row][5] && !b[row][6] &&
              !isAttacked(b, row, 5, enemy) && !isAttacked(b, row, 6, enemy)) {
            moves.push([row, 6]);
          }
          // Queenside
          const qsKey = color === 'w' ? 'wQ' : 'bQ';
          if (castleRights[qsKey] && !b[row][3] && !b[row][2] && !b[row][1] &&
              !isAttacked(b, row, 3, enemy) && !isAttacked(b, row, 2, enemy)) {
            moves.push([row, 2]);
          }
        }
      }
    } else {
      const dirs: [number, number][] = [];
      if (p.type === 'R' || p.type === 'Q') dirs.push([0,1],[0,-1],[1,0],[-1,0]);
      if (p.type === 'B' || p.type === 'Q') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
          if (b[nr][nc]) {
            if (b[nr][nc]!.color === enemy) moves.push([nr, nc]);
            break;
          }
          moves.push([nr, nc]);
          nr += dr; nc += dc;
        }
      }
    }
    return moves;
  }

  function getLegalMoves(b: ChessBoard, r: number, c: number): [number, number][] {
    const p = b[r][c];
    if (!p) return [];
    const raw = getRawMoves(b, r, c);
    return raw.filter(([tr, tc]) => {
      const sim = cloneBoard(b);
      // Handle en passant capture
      if (p.type === 'P' && enPassantTarget && tr === enPassantTarget[0] && tc === enPassantTarget[1]) {
        const capturedRow = p.color === 'w' ? tr + 1 : tr - 1;
        sim[capturedRow][tc] = null;
      }
      // Handle castling rook move
      if (p.type === 'K' && Math.abs(tc - c) === 2) {
        const row = r;
        if (tc === 6) { sim[row][5] = sim[row][7]; sim[row][7] = null; }
        else if (tc === 2) { sim[row][3] = sim[row][0]; sim[row][0] = null; }
      }
      sim[tr][tc] = sim[r][c];
      sim[r][c] = null;
      return !isInCheck(sim, p.color);
    });
  }

  function hasAnyLegalMove(color: PieceColor): boolean {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && getLegalMoves(board, r, c).length > 0) return true;
    }
    return false;
  }

  function makeMove(fr: number, fc: number, tr: number, tc: number) {
    const p = board[fr][fc]!;
    // En passant capture
    if (p.type === 'P' && enPassantTarget && tr === enPassantTarget[0] && tc === enPassantTarget[1]) {
      const capturedRow = p.color === 'w' ? tr + 1 : tr - 1;
      board[capturedRow][tc] = null;
    }
    // Castling
    if (p.type === 'K' && Math.abs(tc - fc) === 2) {
      if (tc === 6) { board[fr][5] = board[fr][7]; board[fr][7] = null; }
      else if (tc === 2) { board[fr][3] = board[fr][0]; board[fr][0] = null; }
    }
    // Update en passant target
    enPassantTarget = null;
    if (p.type === 'P' && Math.abs(tr - fr) === 2) {
      enPassantTarget = [(fr + tr) / 2, fc];
    }
    // Update castling rights
    if (p.type === 'K') {
      if (p.color === 'w') { castleRights.wK = false; castleRights.wQ = false; }
      else { castleRights.bK = false; castleRights.bQ = false; }
    }
    if (p.type === 'R') {
      if (fr === 7 && fc === 0) castleRights.wQ = false;
      if (fr === 7 && fc === 7) castleRights.wK = false;
      if (fr === 0 && fc === 0) castleRights.bQ = false;
      if (fr === 0 && fc === 7) castleRights.bK = false;
    }
    // If a rook is captured
    if (tr === 0 && tc === 0) castleRights.bQ = false;
    if (tr === 0 && tc === 7) castleRights.bK = false;
    if (tr === 7 && tc === 0) castleRights.wQ = false;
    if (tr === 7 && tc === 7) castleRights.wK = false;

    board[tr][tc] = p;
    board[fr][fc] = null;
    moveCount++;

    // Promotion
    const promoRow = p.color === 'w' ? 0 : 7;
    if (p.type === 'P' && tr === promoRow) {
      if (p.color === 'b') {
        // AI auto-promotes to queen
        board[tr][tc] = { type: 'Q', color: 'b' };
      } else {
        showPromotionDialog(p.color, tr, tc);
        return;
      }
    }

    afterMove();
  }

  function showPromotionDialog(color: PieceColor, r: number, c: number) {
    const choices: PieceType[] = ['Q', 'R', 'B', 'N'];
    const dialog = h('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', zIndex: '10',
      },
    },
      h('div', { style: { fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '16px' } }, 'Promote pawn to:'),
      h('div', { style: { display: 'flex', gap: '12px' } },
        ...choices.map(t => h('button', {
          onClick: () => {
            board[r][c] = { type: t, color };
            dialog.remove();
            afterMove();
          },
          style: {
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px', padding: '12px 16px', fontSize: '32px', cursor: 'pointer',
            minWidth: '56px', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          },
        }, PIECE_ICONS[color + t])),
      ),
    );
    body.appendChild(dialog);
  }

  function isInsufficientMaterial(): boolean {
    const pieces: { type: PieceType; color: PieceColor }[] = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) pieces.push({ type: p.type, color: p.color });
    }
    // K vs K
    if (pieces.length === 2) return true;
    // K+B vs K or K+N vs K
    if (pieces.length === 3) {
      const nonKing = pieces.find(p => p.type !== 'K');
      if (nonKing && (nonKing.type === 'B' || nonKing.type === 'N')) return true;
    }
    return false;
  }

  function afterMove() {
    turn = turn === 'w' ? 'b' : 'w';
    selected = null;
    validMoves = [];

    // Check insufficient material draw
    if (isInsufficientMaterial()) {
      gameOverFlag = true;
      statusEl.textContent = 'Draw — Insufficient material!';
      statusEl.style.color = '#D4A017';
      showEndOverlay();
      refreshChessBoard();
      return;
    }

    const inCheck = isInCheck(board, turn);
    const hasMove = hasAnyLegalMove(turn);

    if (!hasMove) {
      gameOverFlag = true;
      if (inCheck) {
        const winner = turn === 'w' ? 'Black' : 'White';
        const playerWon = turn === 'b';
        if (playerWon) {
          const pts = Math.max(10, 200 - moveCount);
          saveScore('chess', pts);
          showToast('Checkmate! You win!', 'success');
        }
        statusEl.textContent = `Checkmate! ${winner} wins!`;
        statusEl.style.color = '#D4A017';
      } else {
        statusEl.textContent = 'Stalemate — Draw!';
        statusEl.style.color = '#D4A017';
      }
      showEndOverlay();
    } else if (inCheck) {
      statusEl.textContent = `${turn === 'w' ? 'White' : 'Black'} is in check!`;
      statusEl.style.color = '#CE1126';
      // AI move if black's turn
      if (turn === 'b') setTimeout(aiMoveChess, 400);
    } else {
      statusEl.textContent = turn === 'w' ? 'Your turn (White)' : 'AI thinking...';
      statusEl.style.color = 'rgba(255,255,255,0.7)';
      if (turn === 'b') setTimeout(aiMoveChess, 400);
    }
    refreshChessBoard();
  }

  function aiMoveChess() {
    if (gameOverFlag) return;
    // Collect all legal moves for black
    const allMoves: { fr: number; fc: number; tr: number; tc: number; score: number }[] = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== 'b') continue;
      const moves = getLegalMoves(board, r, c);
      for (const [tr, tc] of moves) {
        let sc = 0;
        const target = board[tr][tc];
        if (target) {
          const vals: Record<PieceType, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 };
          sc += vals[target.type] * 10;
        }
        // Center control bonus
        if ((tr === 3 || tr === 4) && (tc === 3 || tc === 4)) sc += 2;
        allMoves.push({ fr: r, fc: c, tr, tc, score: sc });
      }
    }
    if (!allMoves.length) return;
    // Sort by score, pick from top moves with some randomness
    allMoves.sort((a, b) => b.score - a.score);
    const topScore = allMoves[0].score;
    const topMoves = allMoves.filter(m => m.score >= topScore - 2);
    const pick = topMoves[Math.floor(Math.random() * topMoves.length)];
    makeMove(pick.fr, pick.fc, pick.tr, pick.tc);
  }

  function showEndOverlay() {
    const go = h('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: '5',
      },
    },
      h('div', { style: { fontSize: '24px', fontWeight: '800', color: '#D4A017', fontFamily: 'var(--font-display)', marginBottom: '24px' } }, statusEl.textContent || 'Game Over'),
      h('button', {
        onClick: () => { go.remove(); resetChess(); },
        style: {
          background: 'linear-gradient(135deg, #006B3F, #00a85f)', border: 'none',
          color: '#fff', padding: '14px 36px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '700', cursor: 'pointer', minHeight: '48px',
        },
      }, 'Play Again'),
    );
    body.appendChild(go);
  }

  const statusEl = h('div', {
    style: { textAlign: 'center', padding: '12px', fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  }, 'Your turn (White)');

  const cellSz = Math.floor(Math.min(window.innerWidth - 32, 400) / 8);
  const boardEl = h('div', {
    style: {
      display: 'grid', gridTemplateColumns: `repeat(8, ${cellSz}px)`,
      margin: '0 auto', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '4px',
      width: `${cellSz * 8}px`,
    },
  });

  function refreshChessBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const isLight = (r + c) % 2 === 0;
      const isSelected = selected && selected[0] === r && selected[1] === c;
      const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c);
      const piece = board[r][c];

      let bg = isLight ? '#b58863' : '#f0d9b5';
      if (isSelected) bg = '#7b61ff';
      else if (isValid && piece) bg = isLight ? '#cc4444' : '#ee6666'; // capture
      else if (isValid) bg = isLight ? '#6b9b6b' : '#8bc38b';

      // Check highlight
      if (piece && piece.type === 'K' && isInCheck(board, piece.color) && piece.color === turn) {
        bg = '#ff4444';
      }

      const cell = h('div', {
        onClick: () => handleCellClick(r, c),
        style: {
          width: `${cellSz}px`, height: `${cellSz}px`, background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: `${cellSz * 0.7}px`, cursor: 'pointer',
          position: 'relative',
        },
      },
        piece ? h('span', { style: { filter: piece.color === 'w' ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' : 'none' } }, PIECE_ICONS[piece.color + piece.type]) : '',
        isValid && !piece ? h('div', { style: {
          width: `${cellSz * 0.25}px`, height: `${cellSz * 0.25}px`, borderRadius: '50%',
          background: 'rgba(0,0,0,0.25)', position: 'absolute',
        } }) : '',
      );
      boardEl.appendChild(cell);
    }
  }

  function handleCellClick(r: number, c: number) {
    if (gameOverFlag || turn !== 'w') return;
    const piece = board[r][c];

    if (selected) {
      // Check if clicking a valid move
      if (validMoves.some(([vr, vc]) => vr === r && vc === c)) {
        makeMove(selected[0], selected[1], r, c);
        return;
      }
      // Click own piece to reselect
      if (piece && piece.color === 'w') {
        selected = [r, c];
        validMoves = getLegalMoves(board, r, c);
        refreshChessBoard();
        return;
      }
      // Deselect
      selected = null;
      validMoves = [];
      refreshChessBoard();
    } else {
      if (piece && piece.color === 'w') {
        selected = [r, c];
        validMoves = getLegalMoves(board, r, c);
        refreshChessBoard();
      }
    }
  }

  function resetChess() {
    board = initBoard();
    turn = 'w';
    selected = null;
    validMoves = [];
    castleRights = { wK: true, wQ: true, bK: true, bQ: true };
    enPassantTarget = null;
    gameOverFlag = false;
    moveCount = 0;
    statusEl.textContent = 'Your turn (White)';
    statusEl.style.color = 'rgba(255,255,255,0.7)';
    refreshChessBoard();
  }

  body.appendChild(statusEl);
  body.appendChild(boardEl);
  body.appendChild(h('div', { style: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', padding: '12px' } },
    'Tap a piece to select, tap a highlighted square to move'));

  board = initBoard();
  refreshChessBoard();
  return cleanup;
}

/* ═══════════════════════════════════════════
   GAME 6 — CHECKERS 🏁
   ═══════════════════════════════════════════ */
function launchCheckers(container: HTMLElement): () => void {
  const scoreSpan = h('span', { style: { color: '#D4A017', fontWeight: '700', fontSize: '14px' } }, '');
  const cleanup = () => { overlay.remove(); };
  const { overlay, body } = createOverlay(container, '🏁 Checkers', cleanup, scoreSpan);

  // Board: 0=empty, 1=player(red), 2=AI(black), 3=player king, 4=AI king
  // Player at bottom (rows 5-7), AI at top (rows 0-2)
  let board: number[][];
  let selectedPos: [number, number] | null = null;
  let validMovesMap: Map<string, [number, number][]> = new Map();
  let playerTurn = true;
  let gameOverFlag = false;
  let multiJumpFrom: [number, number] | null = null;

  function initCheckersBoard(): number[][] {
    const b = Array.from({ length: 8 }, () => Array(8).fill(0));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = 2;
    for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = 1;
    return b;
  }

  function isPlayer(v: number) { return v === 1 || v === 3; }
  function isAI(v: number) { return v === 2 || v === 4; }
  function isKing(v: number) { return v === 3 || v === 4; }

  function getJumps(b: number[][], r: number, c: number, forPlayer: boolean): [number, number][] {
    const v = b[r][c];
    if (v === 0) return [];
    if (forPlayer && !isPlayer(v)) return [];
    if (!forPlayer && !isAI(v)) return [];
    const jumps: [number, number][] = [];
    const dirs: [number, number][] = [];
    if (forPlayer || isKing(v)) dirs.push([-1, -1], [-1, 1]); // forward for player = up
    if (!forPlayer || isKing(v)) dirs.push([1, -1], [1, 1]); // forward for AI = down
    for (const [dr, dc] of dirs) {
      const mr = r + dr, mc = c + dc; // middle
      const lr = r + 2 * dr, lc = c + 2 * dc; // landing
      if (!inBoundsCheck(lr, lc)) continue;
      const mid = b[mr][mc];
      if (mid === 0) continue;
      if (forPlayer && !isAI(mid)) continue;
      if (!forPlayer && !isPlayer(mid)) continue;
      if (b[lr][lc] !== 0) continue;
      jumps.push([lr, lc]);
    }
    return jumps;
  }

  function getSimpleMoves(b: number[][], r: number, c: number, forPlayer: boolean): [number, number][] {
    const v = b[r][c];
    if (v === 0) return [];
    if (forPlayer && !isPlayer(v)) return [];
    if (!forPlayer && !isAI(v)) return [];
    const moves: [number, number][] = [];
    const dirs: [number, number][] = [];
    if (forPlayer || isKing(v)) dirs.push([-1, -1], [-1, 1]);
    if (!forPlayer || isKing(v)) dirs.push([1, -1], [1, 1]);
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (inBoundsCheck(nr, nc) && b[nr][nc] === 0) moves.push([nr, nc]);
    }
    return moves;
  }

  function inBoundsCheck(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  function hasAnyJumps(b: number[][], forPlayer: boolean): boolean {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (getJumps(b, r, c, forPlayer).length > 0) return true;
    }
    return false;
  }

  function computeValidMoves(forPlayer: boolean, forcePiece?: [number, number]): Map<string, [number, number][]> {
    const map = new Map<string, [number, number][]>();
    const mustJump = hasAnyJumps(board, forPlayer);

    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (forcePiece && (r !== forcePiece[0] || c !== forcePiece[1])) continue;
      const v = board[r][c];
      if (forPlayer ? !isPlayer(v) : !isAI(v)) continue;
      const moves = mustJump ? getJumps(board, r, c, forPlayer) : getSimpleMoves(board, r, c, forPlayer);
      if (moves.length > 0) map.set(`${r},${c}`, moves);
    }
    return map;
  }

  const cellSz = Math.floor(Math.min(window.innerWidth - 32, 400) / 8);
  const statusEl = h('div', {
    style: { textAlign: 'center', padding: '12px', fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  }, 'Your turn (Red)');

  const boardEl = h('div', {
    style: {
      display: 'grid', gridTemplateColumns: `repeat(8, ${cellSz}px)`,
      margin: '0 auto', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '4px',
      width: `${cellSz * 8}px`,
    },
  });

  function refreshCheckersBoard() {
    boardEl.innerHTML = '';
    const selectedKey = selectedPos ? `${selectedPos[0]},${selectedPos[1]}` : '';
    const selectedMoves = selectedKey ? (validMovesMap.get(selectedKey) || []) : [];

    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const isDark = (r + c) % 2 === 1;
      const isSel = selectedPos && selectedPos[0] === r && selectedPos[1] === c;
      const isValidTarget = selectedMoves.some(([vr, vc]) => vr === r && vc === c);

      let bg = isDark ? '#5c8a3c' : '#e8d5a3';
      if (isSel) bg = '#7b61ff';
      else if (isValidTarget) bg = '#6b9b6b';

      const v = board[r][c];
      let pieceHtml = '';
      if (v === 1) pieceHtml = '🔴';
      else if (v === 2) pieceHtml = '⚫';
      else if (v === 3) pieceHtml = '👑';
      else if (v === 4) pieceHtml = '🖤';

      const cell = h('div', {
        onClick: () => handleCheckersClick(r, c),
        style: {
          width: `${cellSz}px`, height: `${cellSz}px`, background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: `${cellSz * 0.55}px`, cursor: isDark ? 'pointer' : 'default',
        },
      }, pieceHtml);
      boardEl.appendChild(cell);
    }
  }

  function handleCheckersClick(r: number, c: number) {
    if (!playerTurn || gameOverFlag) return;
    const v = board[r][c];

    if (selectedPos) {
      const key = `${selectedPos[0]},${selectedPos[1]}`;
      const moves = validMovesMap.get(key) || [];
      if (moves.some(([vr, vc]) => vr === r && vc === c)) {
        executeCheckersMove(selectedPos[0], selectedPos[1], r, c, true);
        return;
      }
      if (isPlayer(v) && !multiJumpFrom) {
        selectedPos = [r, c];
        refreshCheckersBoard();
        return;
      }
      selectedPos = null;
      refreshCheckersBoard();
    } else {
      if (isPlayer(v)) {
        selectedPos = [r, c];
        refreshCheckersBoard();
      }
    }
  }

  function executeCheckersMove(fr: number, fc: number, tr: number, tc: number, isPlayerMove: boolean) {
    const isJump = Math.abs(tr - fr) === 2;
    const jumped: [number, number][] = [];

    if (isJump) {
      const mr = (fr + tr) / 2, mc = (fc + tc) / 2;
      jumped.push([mr, mc]);
      board[mr][mc] = 0;
    }

    board[tr][tc] = board[fr][fc];
    board[fr][fc] = 0;

    // Promotion
    const promoRow = isPlayerMove ? 0 : 7;
    if (tr === promoRow && !isKing(board[tr][tc])) {
      board[tr][tc] = isPlayerMove ? 3 : 4;
      // Promotion ends turn even if more jumps available
      selectedPos = null;
      multiJumpFrom = null;
      validMovesMap = new Map();
      refreshCheckersBoard();
      if (isPlayerMove) finishPlayerTurn();
      return;
    }

    // Multi-jump check
    if (isJump) {
      const moreJumps = getJumps(board, tr, tc, isPlayerMove);
      if (moreJumps.length > 0) {
        if (isPlayerMove) {
          multiJumpFrom = [tr, tc];
          selectedPos = [tr, tc];
          validMovesMap = new Map();
          validMovesMap.set(`${tr},${tc}`, moreJumps);
          refreshCheckersBoard();
          return;
        } else {
          // AI continues jumping
          const pick = moreJumps[Math.floor(Math.random() * moreJumps.length)];
          executeCheckersMove(tr, tc, pick[0], pick[1], false);
          return;
        }
      }
    }

    selectedPos = null;
    multiJumpFrom = null;
    validMovesMap = new Map();
    refreshCheckersBoard();

    if (isPlayerMove) finishPlayerTurn();
  }

  function finishPlayerTurn() {
    if (checkCheckersEnd()) return;
    playerTurn = false;
    statusEl.textContent = 'AI thinking...';
    setTimeout(aiMoveCheckers, 500);
  }

  function aiMoveCheckers() {
    if (gameOverFlag) return;
    const aiMoves = computeValidMoves(false);
    if (aiMoves.size === 0) {
      endCheckers(true);
      return;
    }
    // Prefer jumps (mandatory), else random move
    const entries = Array.from(aiMoves.entries());
    const pick = entries[Math.floor(Math.random() * entries.length)];
    const [key, targets] = pick;
    const [fr, fc] = key.split(',').map(Number);
    const [tr, tc] = targets[Math.floor(Math.random() * targets.length)];
    executeCheckersMove(fr, fc, tr, tc, false);
    if (!gameOverFlag) {
      playerTurn = true;
      validMovesMap = computeValidMoves(true);
      if (validMovesMap.size === 0) {
        endCheckers(false);
        return;
      }
      statusEl.textContent = 'Your turn (Red)';
      statusEl.style.color = 'rgba(255,255,255,0.7)';
      refreshCheckersBoard();
    }
  }

  function checkCheckersEnd(): boolean {
    let playerPieces = 0, aiPieces = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (isPlayer(board[r][c])) playerPieces++;
      if (isAI(board[r][c])) aiPieces++;
    }
    if (playerPieces === 0) { endCheckers(false); return true; }
    if (aiPieces === 0) { endCheckers(true); return true; }
    return false;
  }

  function endCheckers(playerWon: boolean) {
    gameOverFlag = true;
    if (playerWon) {
      saveScore('checkers', 1);
      showToast('You won!', 'success');
    }
    const go = h('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: '5',
      },
    },
      h('div', { style: { fontSize: '28px', fontWeight: '800', color: playerWon ? '#006B3F' : '#CE1126', fontFamily: 'var(--font-display)', marginBottom: '24px' } }, playerWon ? 'You Win!' : 'AI Wins!'),
      h('button', {
        onClick: () => { go.remove(); resetCheckers(); },
        style: {
          background: 'linear-gradient(135deg, #006B3F, #00a85f)', border: 'none',
          color: '#fff', padding: '14px 36px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '700', cursor: 'pointer', minHeight: '48px',
        },
      }, 'Play Again'),
    );
    body.appendChild(go);
  }

  function resetCheckers() {
    board = initCheckersBoard();
    selectedPos = null;
    multiJumpFrom = null;
    playerTurn = true;
    gameOverFlag = false;
    validMovesMap = computeValidMoves(true);
    statusEl.textContent = 'Your turn (Red)';
    statusEl.style.color = 'rgba(255,255,255,0.7)';
    refreshCheckersBoard();
  }

  body.appendChild(statusEl);
  body.appendChild(boardEl);
  body.appendChild(h('div', { style: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', padding: '12px' } },
    'Tap a piece to select, tap a green square to move. Captures are mandatory.'));

  board = initCheckersBoard();
  validMovesMap = computeValidMoves(true);
  refreshCheckersBoard();
  return cleanup;
}

/* ═══════════════════════════════════════════
   GAME 7 — LUDO 🎲
   ═══════════════════════════════════════════ */
function launchLudo(container: HTMLElement): () => void {
  const scoreSpan = h('span', { style: { color: '#D4A017', fontWeight: '700', fontSize: '14px' } }, '');
  const cleanup = () => { overlay.remove(); };
  const { overlay, body } = createOverlay(container, '🎲 Ludo', cleanup, scoreSpan);

  // Simplified 2-player ludo: Player (yellow, bottom-left) vs AI (blue, top-right)
  // Each player has 4 tokens. Track global position on 52-square track.
  const TRACK_LEN = 52;
  const HOME_COL_LEN = 6;
  // Player starts at position 0 on track, AI starts at 26
  const PLAYER_START = 0;
  const AI_START = 26;
  // Safe squares (star positions in standard ludo)
  const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

  interface LudoToken {
    state: 'yard' | 'track' | 'home_col' | 'home';
    trackPos: number; // global position on track (0-51)
    homeColPos: number; // 0-5 in home column
  }

  let playerTokens: LudoToken[];
  let aiTokens: LudoToken[];
  let diceValue = 0;
  let rolled = false;
  let playerTurnFlag = true;
  let consecutiveSixes = 0;
  let gameOverFlag = false;
  let diceEl: HTMLElement;
  let msgEl: HTMLElement;

  function initLudo() {
    playerTokens = Array.from({ length: 4 }, () => ({ state: 'yard', trackPos: -1, homeColPos: -1 }) as LudoToken);
    aiTokens = Array.from({ length: 4 }, () => ({ state: 'yard', trackPos: -1, homeColPos: -1 }) as LudoToken);
    diceValue = 0;
    rolled = false;
    playerTurnFlag = true;
    consecutiveSixes = 0;
    gameOverFlag = false;
  }

  function stepsFromStart(token: LudoToken, startPos: number): number {
    if (token.state !== 'track') return -1;
    const diff = token.trackPos - startPos;
    return diff >= 0 ? diff : diff + TRACK_LEN;
  }

  function canEnterHomeCol(token: LudoToken, startPos: number): boolean {
    return stepsFromStart(token, startPos) >= 50; // Last 2 squares before home column entry
  }

  function getMovableTokens(tokens: LudoToken[], startPos: number, dice: number): number[] {
    const movable: number[] = [];
    for (let i = 0; i < 4; i++) {
      const t = tokens[i];
      if (t.state === 'home') continue;
      if (t.state === 'yard') {
        if (dice === 6) movable.push(i);
        continue;
      }
      if (t.state === 'home_col') {
        if (t.homeColPos + dice <= HOME_COL_LEN) movable.push(i); // exact or within
        continue;
      }
      if (t.state === 'track') {
        const steps = stepsFromStart(t, startPos);
        const newSteps = steps + dice;
        if (newSteps < 51) {
          movable.push(i); // Normal move
        } else if (newSteps >= 51 && newSteps <= 51 + HOME_COL_LEN) {
          movable.push(i); // Enter home column
        }
        // Otherwise can't move (overshoot)
      }
    }
    return movable;
  }

  function moveToken(tokens: LudoToken[], idx: number, startPos: number, dice: number, isPlayer: boolean): boolean {
    const t = tokens[idx];
    let captured = false;

    if (t.state === 'yard' && dice === 6) {
      t.state = 'track';
      t.trackPos = startPos;
      // Check capture on start square
      captured = checkCapture(t.trackPos, isPlayer);
    } else if (t.state === 'track') {
      const steps = stepsFromStart(t, startPos);
      const newSteps = steps + dice;
      if (newSteps === 51 + HOME_COL_LEN) {
        t.state = 'home';
      } else if (newSteps > 50) {
        t.state = 'home_col';
        t.homeColPos = newSteps - 51;
      } else {
        t.trackPos = (startPos + newSteps) % TRACK_LEN;
        captured = checkCapture(t.trackPos, isPlayer);
      }
    } else if (t.state === 'home_col') {
      const newPos = t.homeColPos + dice;
      if (newPos === HOME_COL_LEN) {
        t.state = 'home';
      } else if (newPos < HOME_COL_LEN) {
        t.homeColPos = newPos;
      }
    }
    return captured;
  }

  function checkCapture(pos: number, isPlayerCapturing: boolean): boolean {
    if (SAFE_SQUARES.has(pos)) return false;
    const enemyTokens = isPlayerCapturing ? aiTokens : playerTokens;
    for (const t of enemyTokens) {
      if (t.state === 'track' && t.trackPos === pos) {
        t.state = 'yard';
        t.trackPos = -1;
        return true;
      }
    }
    return false;
  }

  function checkWin(tokens: LudoToken[]): boolean {
    return tokens.every(t => t.state === 'home');
  }

  function rollDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  // Dice display
  const DICE_FACES = ['', '\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'];

  function renderLudo() {
    boardArea.innerHTML = '';

    // Simple visual: show tokens as colored circles in zones
    const canvas = document.createElement('canvas');
    const sz = Math.min(window.innerWidth - 32, 360);
    canvas.width = sz;
    canvas.height = sz;
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:12px;';
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, sz, sz);

    // Draw track (simplified as a circle of squares)
    const centerX = sz / 2, centerY = sz / 2;
    const radius = sz * 0.38;

    // Draw track squares
    for (let i = 0; i < TRACK_LEN; i++) {
      const angle = (i / TRACK_LEN) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const sqSz = sz * 0.04;

      ctx.fillStyle = SAFE_SQUARES.has(i) ? '#FFD700' :
                      i === PLAYER_START ? '#FFD700' :
                      i === AI_START ? '#4169E1' :
                      'rgba(255,255,255,0.1)';
      ctx.fillRect(x - sqSz, y - sqSz, sqSz * 2, sqSz * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.strokeRect(x - sqSz, y - sqSz, sqSz * 2, sqSz * 2);
    }

    // Home center
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, sz * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `${sz * 0.05}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HOME', centerX, centerY);

    // Draw home columns
    for (let i = 0; i < HOME_COL_LEN; i++) {
      const frac = (i + 1) / (HOME_COL_LEN + 1);
      // Player home column (from bottom toward center)
      const pyAngle = Math.PI / 2; // bottom
      const px = centerX + Math.cos(pyAngle) * radius * (1 - frac);
      const py = centerY + Math.sin(pyAngle) * radius * (1 - frac);
      ctx.fillStyle = 'rgba(255,215,0,0.2)';
      ctx.fillRect(px - 6, py - 6, 12, 12);

      // AI home column (from top toward center)
      const ayAngle = -Math.PI / 2;
      const ax = centerX + Math.cos(ayAngle) * radius * (1 - frac);
      const ay = centerY + Math.sin(ayAngle) * radius * (1 - frac);
      ctx.fillStyle = 'rgba(65,105,225,0.2)';
      ctx.fillRect(ax - 6, ay - 6, 12, 12);
    }

    // Draw tokens on track
    function drawToken(trackPos: number, color: string, offset: number) {
      const angle = (trackPos / TRACK_LEN) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius + offset * 4;
      const y = centerY + Math.sin(angle) * radius + offset * 4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, sz * 0.025, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    function drawHomeColToken(homeColPos: number, isPlayerToken: boolean, color: string, offset: number) {
      const frac = (homeColPos + 1) / (HOME_COL_LEN + 1);
      const angle = isPlayerToken ? Math.PI / 2 : -Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius * (1 - frac) + offset * 6;
      const y = centerY + Math.sin(angle) * radius * (1 - frac) + offset * 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, sz * 0.025, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw player yard
    const yardY = sz - 36;
    const yardAIY = 36;
    let pYardCount = 0, aYardCount = 0;
    let pHomeCount = 0, aHomeCount = 0;

    playerTokens.forEach((t, i) => {
      if (t.state === 'yard') {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(sz * 0.2 + pYardCount * 20, yardY, sz * 0.025, 0, Math.PI * 2);
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        pYardCount++;
      } else if (t.state === 'track') {
        drawToken(t.trackPos, '#FFD700', i % 2 === 0 ? -1 : 1);
      } else if (t.state === 'home_col') {
        drawHomeColToken(t.homeColPos, true, '#FFD700', i % 2 === 0 ? -1 : 1);
      } else if (t.state === 'home') {
        pHomeCount++;
      }
    });

    aiTokens.forEach((t, i) => {
      if (t.state === 'yard') {
        ctx.fillStyle = '#4169E1';
        ctx.beginPath();
        ctx.arc(sz * 0.6 + aYardCount * 20, yardAIY, sz * 0.025, 0, Math.PI * 2);
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        aYardCount++;
      } else if (t.state === 'track') {
        drawToken(t.trackPos, '#4169E1', i % 2 === 0 ? -1 : 1);
      } else if (t.state === 'home_col') {
        drawHomeColToken(t.homeColPos, false, '#4169E1', i % 2 === 0 ? -1 : 1);
      } else if (t.state === 'home') {
        aHomeCount++;
      }
    });

    // Yard labels
    ctx.font = `${sz * 0.03}px sans-serif`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`You: ${pHomeCount}/4 home`, sz * 0.25, yardY + 18);
    ctx.fillStyle = '#4169E1';
    ctx.fillText(`AI: ${aHomeCount}/4 home`, sz * 0.65, yardAIY - 18);

    boardArea.appendChild(canvas);
  }

  function handleRoll() {
    if (gameOverFlag || !playerTurnFlag || rolled) return;
    diceValue = rollDice();
    rolled = true;

    // Dice animation
    diceEl.textContent = DICE_FACES[diceValue];
    diceEl.style.transform = 'scale(1.3)';
    setTimeout(() => { diceEl.style.transform = 'scale(1)'; }, 200);

    if (diceValue === 6) {
      consecutiveSixes++;
      if (consecutiveSixes >= 3) {
        msgEl.textContent = 'Three 6s in a row! Turn cancelled.';
        consecutiveSixes = 0;
        rolled = false;
        endPlayerTurnLudo();
        return;
      }
    } else {
      consecutiveSixes = 0;
    }

    const movable = getMovableTokens(playerTokens, PLAYER_START, diceValue);
    if (movable.length === 0) {
      msgEl.textContent = `Rolled ${diceValue} — no moves available`;
      setTimeout(() => { rolled = false; endPlayerTurnLudo(); }, 800);
      return;
    }

    if (movable.length === 1) {
      // Auto-move
      const captured = moveToken(playerTokens, movable[0], PLAYER_START, diceValue, true);
      renderLudo();
      if (checkWin(playerTokens)) { endLudo(true); return; }
      if (diceValue === 6 || captured) {
        rolled = false;
        msgEl.textContent = `Bonus roll! (${diceValue === 6 ? 'rolled 6' : 'captured'})`;
      } else {
        rolled = false;
        endPlayerTurnLudo();
      }
      return;
    }

    // Show token choice buttons
    msgEl.textContent = `Rolled ${diceValue} — tap a token to move`;
    showTokenChoices(movable);
  }

  function showTokenChoices(movable: number[]) {
    tokenChoiceArea.innerHTML = '';
    movable.forEach(idx => {
      const t = playerTokens[idx];
      const label = t.state === 'yard' ? `Token ${idx + 1} (enter)` :
                    t.state === 'home_col' ? `Token ${idx + 1} (home col ${t.homeColPos + 1})` :
                    `Token ${idx + 1} (pos ${stepsFromStart(t, PLAYER_START)})`;
      tokenChoiceArea.appendChild(h('button', {
        onClick: () => {
          tokenChoiceArea.innerHTML = '';
          const captured = moveToken(playerTokens, idx, PLAYER_START, diceValue, true);
          renderLudo();
          if (checkWin(playerTokens)) { endLudo(true); return; }
          if (diceValue === 6 || captured) {
            rolled = false;
            msgEl.textContent = `Bonus roll! (${diceValue === 6 ? 'rolled 6' : 'captured'})`;
          } else {
            rolled = false;
            endPlayerTurnLudo();
          }
        },
        style: {
          background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.3)',
          color: '#FFD700', padding: '10px 16px', borderRadius: '10px', fontSize: '13px',
          fontWeight: '600', cursor: 'pointer', minHeight: '44px', margin: '4px',
        },
      }, label));
    });
  }

  function endPlayerTurnLudo() {
    if (gameOverFlag) return;
    playerTurnFlag = false;
    msgEl.textContent = 'AI rolling...';
    setTimeout(aiTurnLudo, 600);
  }

  function aiTurnLudo() {
    if (gameOverFlag) return;
    let aiConsecutive = 0;
    function aiRoll() {
      const dice = rollDice();
      diceEl.textContent = DICE_FACES[dice];

      if (dice === 6) {
        aiConsecutive++;
        if (aiConsecutive >= 3) {
          msgEl.textContent = 'AI rolled three 6s! Turn cancelled.';
          setTimeout(startPlayerTurn, 600);
          return;
        }
      } else {
        aiConsecutive = 0;
      }

      const movable = getMovableTokens(aiTokens, AI_START, dice);
      if (movable.length > 0) {
        // AI strategy: prefer entering, then capturing, then furthest token
        let bestIdx = movable[0];
        // Prefer entering from yard
        const yardIdx = movable.find(i => aiTokens[i].state === 'yard');
        if (yardIdx !== undefined && dice === 6) bestIdx = yardIdx;
        else {
          // Pick token furthest along
          let maxSteps = -1;
          for (const i of movable) {
            const t = aiTokens[i];
            const s = t.state === 'track' ? stepsFromStart(t, AI_START) : (t.state === 'home_col' ? 50 + t.homeColPos : 0);
            if (s > maxSteps) { maxSteps = s; bestIdx = i; }
          }
        }
        const captured = moveToken(aiTokens, bestIdx, AI_START, dice, false);
        renderLudo();
        if (checkWin(aiTokens)) { endLudo(false); return; }
        if (dice === 6 || captured) {
          msgEl.textContent = `AI rolled ${dice} — bonus roll!`;
          setTimeout(aiRoll, 600);
          return;
        }
      }
      msgEl.textContent = `AI rolled ${dice}`;
      renderLudo();
      setTimeout(startPlayerTurn, 600);
    }
    aiRoll();
  }

  function startPlayerTurn() {
    playerTurnFlag = true;
    rolled = false;
    msgEl.textContent = 'Your turn — tap Roll';
  }

  function endLudo(playerWon: boolean) {
    gameOverFlag = true;
    if (playerWon) {
      saveScore('ludo', 1);
      showToast('You won Ludo!', 'success');
    }
    const go = h('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: '5',
      },
    },
      h('div', { style: { fontSize: '28px', fontWeight: '800', color: playerWon ? '#FFD700' : '#4169E1', fontFamily: 'var(--font-display)', marginBottom: '24px' } }, playerWon ? 'You Win!' : 'AI Wins!'),
      h('button', {
        onClick: () => { go.remove(); initLudo(); renderLudo(); startPlayerTurn(); },
        style: {
          background: 'linear-gradient(135deg, #006B3F, #00a85f)', border: 'none',
          color: '#fff', padding: '14px 36px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '700', cursor: 'pointer', minHeight: '48px',
        },
      }, 'Play Again'),
    );
    body.appendChild(go);
  }

  // UI
  msgEl = h('div', {
    style: { textAlign: 'center', padding: '12px', fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  }, 'Your turn — tap Roll');

  diceEl = h('div', {
    style: { fontSize: '48px', textAlign: 'center', padding: '8px', transition: 'transform 0.2s ease' },
  }, '\u2680');

  const rollBtn = h('button', {
    onClick: handleRoll,
    style: {
      display: 'block', margin: '8px auto', background: 'linear-gradient(135deg, #D4A017, #f0c040)',
      border: 'none', color: '#000', padding: '14px 40px', borderRadius: '12px', fontSize: '16px',
      fontWeight: '700', cursor: 'pointer', minHeight: '48px',
    },
  }, 'Roll Dice');

  const tokenChoiceArea = h('div', {
    style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' },
  });

  const boardArea = h('div', {});

  body.appendChild(msgEl);
  body.appendChild(boardArea);
  body.appendChild(diceEl);
  body.appendChild(rollBtn);
  body.appendChild(tokenChoiceArea);

  initLudo();
  renderLudo();
  return cleanup;
}

/* ═══════════════════════════════════════════
   GAME 8 — SUDOKU 🔢
   ═══════════════════════════════════════════ */
function launchSudoku(container: HTMLElement): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  const scoreSpan = h('span', { style: { color: '#D4A017', fontWeight: '700', fontSize: '14px' } }, '0:00');

  const cleanup = () => { if (timer) clearInterval(timer); overlay.remove(); };
  const { overlay, body } = createOverlay(container, '🧩 Sudoku', cleanup, scoreSpan);

  let solution: number[][] = [];
  let puzzle: number[][] = [];
  let userGrid: number[][] = [];
  let given: boolean[][] = [];
  let selectedCell: [number, number] | null = null;
  let elapsed = 0;
  let gameWon = false;
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';

  function generateSolution(): number[][] {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    function isValid(g: number[][], r: number, c: number, num: number): boolean {
      for (let i = 0; i < 9; i++) {
        if (g[r][i] === num || g[i][c] === num) return false;
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
        if (g[br + dr][bc + dc] === num) return false;
      }
      return true;
    }
    function solve(g: number[][]): boolean {
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        if (g[r][c] !== 0) continue;
        const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
        for (const n of nums) {
          if (isValid(g, r, c, n)) {
            g[r][c] = n;
            if (solve(g)) return true;
            g[r][c] = 0;
          }
        }
        return false;
      }
      return true;
    }
    solve(grid);
    return grid;
  }

  function createPuzzle(sol: number[][], diff: 'easy' | 'medium' | 'hard'): number[][] {
    const p = sol.map(r => [...r]);
    const counts = { easy: 38, medium: 30, hard: 24 };
    const toRemove = 81 - counts[diff];
    const cells: [number, number][] = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r, c]);
    // Shuffle
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    let removed = 0;
    for (const [r, c] of cells) {
      if (removed >= toRemove) break;
      p[r][c] = 0;
      removed++;
    }
    return p;
  }

  function initSudoku() {
    solution = generateSolution();
    puzzle = createPuzzle(solution, difficulty);
    userGrid = puzzle.map(r => [...r]);
    given = puzzle.map(r => r.map(v => v !== 0));
    selectedCell = null;
    elapsed = 0;
    gameWon = false;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (gameWon) return;
      elapsed++;
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      scoreSpan.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
  }

  function hasConflict(r: number, c: number): boolean {
    const v = userGrid[r][c];
    if (v === 0) return false;
    // Row
    for (let i = 0; i < 9; i++) if (i !== c && userGrid[r][i] === v) return true;
    // Col
    for (let i = 0; i < 9; i++) if (i !== r && userGrid[i][c] === v) return true;
    // Box
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
      const nr = br + dr, nc = bc + dc;
      if (nr === r && nc === c) continue;
      if (userGrid[nr][nc] === v) return true;
    }
    return false;
  }

  function checkWin(): boolean {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (userGrid[r][c] === 0 || hasConflict(r, c)) return false;
    }
    return true;
  }

  const cellSz = Math.floor(Math.min(window.innerWidth - 40, 360) / 9);
  const gridEl = h('div', {
    style: {
      display: 'grid', gridTemplateColumns: `repeat(9, ${cellSz}px)`,
      margin: '12px auto', width: `${cellSz * 9}px`,
    },
  });

  function refreshSudokuGrid() {
    gridEl.innerHTML = '';
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const v = userGrid[r][c];
      const isGiven = given[r][c];
      const isSel = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
      const conflict = v !== 0 && hasConflict(r, c);

      const borderRight = (c + 1) % 3 === 0 && c < 8 ? '2px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)';
      const borderBottom = (r + 1) % 3 === 0 && r < 8 ? '2px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)';

      const cell = h('div', {
        onClick: () => {
          if (gameWon) return;
          selectedCell = [r, c];
          refreshSudokuGrid();
        },
        style: {
          width: `${cellSz}px`, height: `${cellSz}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: `${cellSz * 0.5}px`, fontWeight: isGiven ? '800' : '600',
          color: conflict ? '#CE1126' : isGiven ? '#fff' : '#D4A017',
          background: isSel ? 'rgba(123,97,255,0.3)' : 'rgba(255,255,255,0.03)',
          borderRight, borderBottom,
          borderTop: r === 0 ? '2px solid rgba(255,255,255,0.4)' : 'none',
          borderLeft: c === 0 ? '2px solid rgba(255,255,255,0.4)' : 'none',
          cursor: 'pointer',
        },
      }, v !== 0 ? String(v) : '');
      gridEl.appendChild(cell);
    }
  }

  // Number pad
  const padEl = h('div', {
    style: {
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '6px', maxWidth: '320px', margin: '12px auto', padding: '0 16px',
    },
  });

  function buildPad() {
    padEl.innerHTML = '';
    for (let n = 1; n <= 9; n++) {
      padEl.appendChild(h('button', {
        onClick: () => {
          if (!selectedCell || gameWon) return;
          const [r, c] = selectedCell;
          if (given[r][c]) { showToast('Cannot change given cells', 'error'); return; }
          userGrid[r][c] = n;
          refreshSudokuGrid();
          if (checkWin()) {
            gameWon = true;
            if (timer) clearInterval(timer);
            const pts = Math.max(10, 1000 - elapsed);
            saveScore('sudoku', pts);
            showToast('Puzzle solved!', 'success');
          }
        },
        style: {
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px', color: '#D4A017', fontSize: '20px', fontWeight: '700',
          padding: '12px', cursor: 'pointer', minHeight: '48px',
        },
      }, String(n)));
    }
    // Clear button
    padEl.appendChild(h('button', {
      onClick: () => {
        if (!selectedCell || gameWon) return;
        const [r, c] = selectedCell;
        if (given[r][c]) return;
        userGrid[r][c] = 0;
        refreshSudokuGrid();
      },
      style: {
        background: 'rgba(206,17,38,0.15)', border: '1px solid rgba(206,17,38,0.3)',
        borderRadius: '10px', color: '#CE1126', fontSize: '16px', fontWeight: '700',
        padding: '12px', cursor: 'pointer', minHeight: '48px',
      },
    }, 'Clear'));
  }

  // Difficulty selector
  const diffRow = h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' } });
  for (const d of ['easy', 'medium', 'hard'] as const) {
    diffRow.appendChild(h('button', {
      onClick: () => { difficulty = d; initSudoku(); refreshSudokuGrid(); },
      style: {
        background: difficulty === d ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${difficulty === d ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '8px', color: difficulty === d ? '#D4A017' : 'rgba(255,255,255,0.5)',
        padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', minHeight: '36px',
        textTransform: 'capitalize',
      },
    }, d));
  }

  // Hint button
  const hintBtn = h('button', {
    onClick: () => {
      if (gameWon) return;
      // Find an empty or wrong cell and reveal it
      const empties: [number, number][] = [];
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        if (!given[r][c] && userGrid[r][c] !== solution[r][c]) empties.push([r, c]);
      }
      if (!empties.length) return;
      const [r, c] = empties[Math.floor(Math.random() * empties.length)];
      userGrid[r][c] = solution[r][c];
      selectedCell = [r, c];
      refreshSudokuGrid();
      if (checkWin()) {
        gameWon = true;
        if (timer) clearInterval(timer);
        showToast('Puzzle solved!', 'success');
      }
    },
    style: {
      display: 'block', margin: '8px auto', background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)', color: '#D4A017',
      padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
      cursor: 'pointer', minHeight: '44px',
    },
  }, 'Hint');

  body.appendChild(diffRow);
  body.appendChild(gridEl);
  body.appendChild(padEl);
  body.appendChild(hintBtn);

  initSudoku();
  refreshSudokuGrid();
  buildPad();
  return cleanup;
}

/* ═══════════════════════════════════════════
   GAME 9 — MINESWEEPER 💣
   ═══════════════════════════════════════════ */
function launchMinesweeper(container: HTMLElement): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  const scoreSpan = h('span', { style: { color: '#D4A017', fontWeight: '700', fontSize: '14px' } }, '0:00');

  const cleanup = () => { if (timer) clearInterval(timer); overlay.remove(); };
  const { overlay, body } = createOverlay(container, '💣 Minesweeper', cleanup, scoreSpan);

  let rows = 9, cols = 9, mineCount = 10;
  let mines: boolean[][] = [];
  let revealed: boolean[][] = [];
  let flagged: boolean[][] = [];
  let adjacentCounts: number[][] = [];
  let firstClick = true;
  let gameOverFlag = false;
  let won = false;
  let elapsed = 0;
  let flagsPlaced = 0;

  function initMines() {
    mines = Array.from({ length: rows }, () => Array(cols).fill(false));
    revealed = Array.from({ length: rows }, () => Array(cols).fill(false));
    flagged = Array.from({ length: rows }, () => Array(cols).fill(false));
    adjacentCounts = Array.from({ length: rows }, () => Array(cols).fill(0));
    firstClick = true;
    gameOverFlag = false;
    won = false;
    elapsed = 0;
    flagsPlaced = 0;
    if (timer) clearInterval(timer);
    scoreSpan.textContent = '0:00';
    mineCountEl.textContent = `Mines: ${mineCount}`;
  }

  function placeMines(safeR: number, safeC: number) {
    let placed = 0;
    while (placed < mineCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (mines[r][c]) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue; // Safe zone
      mines[r][c] = true;
      placed++;
    }
    // Compute adjacency
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (mines[r][c]) { adjacentCounts[r][c] = -1; continue; }
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && mines[nr][nc]) count++;
      }
      adjacentCounts[r][c] = count;
    }
  }

  function reveal(r: number, c: number) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;

    if (mines[r][c]) {
      gameOverFlag = true;
      if (timer) clearInterval(timer);
      // Reveal all mines
      for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) {
        if (mines[rr][cc]) revealed[rr][cc] = true;
      }
      renderMineGrid();
      showMineEndOverlay(false);
      return;
    }

    // Flood fill if zero
    if (adjacentCounts[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        reveal(r + dr, c + dc);
      }
    }
  }

  function checkWinMine(): boolean {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!mines[r][c] && !revealed[r][c]) return false;
    }
    return true;
  }

  const cellSzMine = Math.floor(Math.min(window.innerWidth - 32, 360) / cols);
  const mineCountEl = h('div', {
    style: { textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#CE1126', padding: '8px' },
  }, `Mines: ${mineCount}`);

  const gridEl = h('div', {
    style: {
      display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSzMine}px)`,
      margin: '8px auto', width: `${cellSzMine * cols}px`,
      border: '2px solid rgba(255,255,255,0.2)', borderRadius: '4px',
    },
  });

  const NUM_COLORS = ['', '#3B82F6', '#22C55E', '#EF4444', '#7C3AED', '#A16207', '#06B6D4', '#000', '#888'];

  function renderMineGrid() {
    gridEl.innerHTML = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const isRevealed = revealed[r][c];
      const isFlagged = flagged[r][c];
      const isMine = mines[r][c];
      const adj = adjacentCounts[r][c];

      let content = '';
      let bg = 'rgba(255,255,255,0.08)';
      let color = '#fff';

      if (isRevealed) {
        bg = 'rgba(255,255,255,0.02)';
        if (isMine) { content = '💣'; bg = '#CE1126'; }
        else if (adj > 0) { content = String(adj); color = NUM_COLORS[adj]; }
      } else if (isFlagged) {
        content = '🚩';
      }

      let longPressTimer: ReturnType<typeof setTimeout> | null = null;
      const cell = h('div', {
        onClick: () => {
          if (gameOverFlag || won) return;
          if (isFlagged) return;
          if (firstClick) {
            firstClick = false;
            placeMines(r, c);
            timer = setInterval(() => {
              elapsed++;
              const m = Math.floor(elapsed / 60);
              const s = elapsed % 60;
              scoreSpan.textContent = `${m}:${s.toString().padStart(2, '0')}`;
            }, 1000);
          }
          reveal(r, c);
          renderMineGrid();
          if (!gameOverFlag && checkWinMine()) {
            won = true;
            if (timer) clearInterval(timer);
            const pts = Math.max(10, 500 - elapsed);
            saveScore('minesweeper', pts);
            showMineEndOverlay(true);
          }
        },
        onTouchstart: (e: Event) => {
          longPressTimer = setTimeout(() => {
            e.preventDefault();
            if (gameOverFlag || won || isRevealed) return;
            flagged[r][c] = !flagged[r][c];
            flagsPlaced += flagged[r][c] ? 1 : -1;
            mineCountEl.textContent = `Mines: ${mineCount - flagsPlaced}`;
            renderMineGrid();
          }, 500);
        },
        onTouchend: () => { if (longPressTimer) clearTimeout(longPressTimer); },
        onTouchmove: () => { if (longPressTimer) clearTimeout(longPressTimer); },
        style: {
          width: `${cellSzMine}px`, height: `${cellSzMine}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: `${cellSzMine * 0.5}px`, fontWeight: '700', color,
          background: bg, border: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer', userSelect: 'none', webkitUserSelect: 'none',
        },
      }, content);
      gridEl.appendChild(cell);
    }
  }

  function showMineEndOverlay(playerWon: boolean) {
    const go = h('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: '5',
      },
    },
      h('div', { style: { fontSize: '28px', fontWeight: '800', color: playerWon ? '#006B3F' : '#CE1126', fontFamily: 'var(--font-display)', marginBottom: '8px' } },
        playerWon ? 'You Win!' : 'BOOM!'),
      h('div', { style: { fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' } },
        `Time: ${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`),
      h('button', {
        onClick: () => { go.remove(); initMines(); renderMineGrid(); },
        style: {
          background: 'linear-gradient(135deg, #006B3F, #00a85f)', border: 'none',
          color: '#fff', padding: '14px 36px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '700', cursor: 'pointer', minHeight: '48px',
        },
      }, 'Play Again'),
    );
    body.appendChild(go);
  }

  body.appendChild(mineCountEl);
  body.appendChild(gridEl);
  body.appendChild(h('div', { style: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', padding: '8px' } },
    'Tap to reveal. Long-press to flag.'));

  initMines();
  renderMineGrid();
  return cleanup;
}

/* ═══════════════════════════════════════════
   GAME 10 — SOLITAIRE 🃏
   ═══════════════════════════════════════════ */
function launchSolitaire(container: HTMLElement): () => void {
  const scoreSpan = h('span', { style: { color: '#D4A017', fontWeight: '700', fontSize: '14px' } }, 'Moves: 0');
  const cleanup = () => { overlay.remove(); };
  const { overlay, body } = createOverlay(container, '🃏 Solitaire', cleanup, scoreSpan);

  const SUITS = ['♠', '♥', '♦', '♣'] as const;
  const SUIT_COLORS: Record<string, string> = { '♠': '#fff', '♥': '#CE1126', '♦': '#CE1126', '♣': '#fff' };
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  interface Card {
    suit: string;
    rank: number; // 1-13
    faceUp: boolean;
  }

  let tableau: Card[][] = [];
  let foundations: Card[][] = [[], [], [], []];
  let stock: Card[] = [];
  let waste: Card[] = [];
  let moves = 0;
  let selectedSource: { type: 'tableau' | 'waste' | 'foundation'; col?: number; cardIdx?: number } | null = null;
  let gameWon = false;
  let drawCount = 1; // 1 or 3

  function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (let r = 1; r <= 13; r++) {
        deck.push({ suit, rank: r, faceUp: false });
      }
    }
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function isRed(suit: string): boolean { return suit === '♥' || suit === '♦'; }

  function cardLabel(c: Card): string {
    return `${RANKS[c.rank - 1]}${c.suit}`;
  }

  function initSolitaire() {
    const deck = createDeck();
    tableau = [];
    foundations = [[], [], [], []];
    waste = [];
    moves = 0;
    gameWon = false;
    selectedSource = null;

    let idx = 0;
    for (let col = 0; col < 7; col++) {
      tableau[col] = [];
      for (let r = 0; r <= col; r++) {
        const card = deck[idx++];
        card.faceUp = r === col;
        tableau[col].push(card);
      }
    }
    stock = deck.slice(idx);
    stock.forEach(c => c.faceUp = false);
    scoreSpan.textContent = 'Moves: 0';
  }

  function canPlaceOnTableau(card: Card, targetCol: number): boolean {
    const col = tableau[targetCol];
    if (col.length === 0) return card.rank === 13; // Only kings on empty
    const top = col[col.length - 1];
    if (!top.faceUp) return false;
    return isRed(card.suit) !== isRed(top.suit) && card.rank === top.rank - 1;
  }

  function canPlaceOnFoundation(card: Card, foundIdx: number): boolean {
    const found = foundations[foundIdx];
    if (found.length === 0) return card.rank === 1;
    const top = found[found.length - 1];
    return card.suit === top.suit && card.rank === top.rank + 1;
  }

  function findFoundationForCard(card: Card): number {
    for (let i = 0; i < 4; i++) {
      if (canPlaceOnFoundation(card, i)) return i;
    }
    return -1;
  }

  function tryAutoComplete() {
    // Auto-complete if all tableau cards are face up
    const allFaceUp = tableau.every(col => col.every(c => c.faceUp));
    if (!allFaceUp || stock.length > 0 || waste.length > 0) return;

    let moved = true;
    while (moved) {
      moved = false;
      for (let col = 0; col < 7; col++) {
        if (tableau[col].length === 0) continue;
        const top = tableau[col][tableau[col].length - 1];
        const fi = findFoundationForCard(top);
        if (fi >= 0) {
          foundations[fi].push(tableau[col].pop()!);
          moved = true;
        }
      }
    }
    checkSolitaireWin();
  }

  function checkSolitaireWin(): boolean {
    if (foundations.every(f => f.length === 13)) {
      gameWon = true;
      saveScore('solitaire', Math.max(1, 500 - moves));
      showToast('You won Solitaire!', 'success');
      renderSolitaire();
      return true;
    }
    return false;
  }

  function handleStockClick() {
    if (gameWon) return;
    if (stock.length === 0) {
      // Recycle waste to stock
      stock = [...waste].reverse();
      stock.forEach(c => c.faceUp = false);
      waste = [];
    } else {
      // Draw 1 or 3
      const count = Math.min(drawCount, stock.length);
      for (let i = 0; i < count; i++) {
        const card = stock.pop()!;
        card.faceUp = true;
        waste.push(card);
      }
    }
    selectedSource = null;
    moves++;
    scoreSpan.textContent = `Moves: ${moves}`;
    renderSolitaire();
  }

  function handleCardClick(source: typeof selectedSource) {
    if (gameWon) return;

    if (!selectedSource) {
      // Select
      selectedSource = source;
      renderSolitaire();
      return;
    }

    // Try to place
    if (source?.type === 'tableau' && source.col !== undefined) {
      const targetCol = source.col;
      // Get source cards
      let cards: Card[] = [];
      if (selectedSource.type === 'waste') {
        if (waste.length === 0) { selectedSource = null; renderSolitaire(); return; }
        const card = waste[waste.length - 1];
        if (canPlaceOnTableau(card, targetCol)) {
          tableau[targetCol].push(waste.pop()!);
          moves++;
          scoreSpan.textContent = `Moves: ${moves}`;
        }
      } else if (selectedSource.type === 'tableau' && selectedSource.col !== undefined && selectedSource.cardIdx !== undefined) {
        const fromCol = selectedSource.col;
        const fromIdx = selectedSource.cardIdx;
        const stack = tableau[fromCol].slice(fromIdx);
        if (stack.length > 0 && canPlaceOnTableau(stack[0], targetCol)) {
          tableau[targetCol].push(...stack);
          tableau[fromCol].splice(fromIdx);
          // Flip exposed card
          if (tableau[fromCol].length > 0 && !tableau[fromCol][tableau[fromCol].length - 1].faceUp) {
            tableau[fromCol][tableau[fromCol].length - 1].faceUp = true;
          }
          moves++;
          scoreSpan.textContent = `Moves: ${moves}`;
        }
      } else if (selectedSource.type === 'foundation' && selectedSource.col !== undefined) {
        const fi = selectedSource.col;
        if (foundations[fi].length > 0) {
          const card = foundations[fi][foundations[fi].length - 1];
          if (canPlaceOnTableau(card, targetCol)) {
            tableau[targetCol].push(foundations[fi].pop()!);
            moves++;
            scoreSpan.textContent = `Moves: ${moves}`;
          }
        }
      }
      selectedSource = null;
      renderSolitaire();
      tryAutoComplete();
      checkSolitaireWin();
      return;
    }

    if (source?.type === 'foundation' && source.col !== undefined) {
      const fi = source.col;
      let card: Card | null = null;
      if (selectedSource.type === 'waste' && waste.length > 0) {
        card = waste[waste.length - 1];
        if (canPlaceOnFoundation(card, fi)) {
          foundations[fi].push(waste.pop()!);
          moves++;
          scoreSpan.textContent = `Moves: ${moves}`;
        }
      } else if (selectedSource.type === 'tableau' && selectedSource.col !== undefined) {
        const fromCol = selectedSource.col;
        if (tableau[fromCol].length > 0) {
          card = tableau[fromCol][tableau[fromCol].length - 1];
          if (canPlaceOnFoundation(card, fi)) {
            foundations[fi].push(tableau[fromCol].pop()!);
            if (tableau[fromCol].length > 0 && !tableau[fromCol][tableau[fromCol].length - 1].faceUp) {
              tableau[fromCol][tableau[fromCol].length - 1].faceUp = true;
            }
            moves++;
            scoreSpan.textContent = `Moves: ${moves}`;
          }
        }
      }
      selectedSource = null;
      renderSolitaire();
      tryAutoComplete();
      checkSolitaireWin();
      return;
    }

    selectedSource = source;
    renderSolitaire();
  }

  const cardW = Math.floor(Math.min(window.innerWidth - 24, 380) / 7.5);
  const cardH = Math.floor(cardW * 1.4);
  const smallCardH = Math.floor(cardH * 0.3);

  function renderCard(card: Card, isSelected: boolean, onClick: () => void): HTMLElement {
    if (!card.faceUp) {
      return h('div', {
        onClick,
        style: {
          width: `${cardW}px`, height: `${cardH}px`,
          background: 'linear-gradient(135deg, #006B3F, #004a2a)',
          borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)',
          cursor: 'pointer', flexShrink: '0',
        },
      });
    }
    return h('div', {
      onClick,
      style: {
        width: `${cardW}px`, height: `${cardH}px`,
        background: isSelected ? '#7b61ff' : '#f5f5f0',
        borderRadius: '6px', border: `2px solid ${isSelected ? '#7b61ff' : 'rgba(0,0,0,0.2)'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: '0', padding: '2px',
      },
    },
      h('span', { style: { fontSize: `${cardW * 0.3}px`, fontWeight: '800', color: SUIT_COLORS[card.suit], lineHeight: '1' } }, RANKS[card.rank - 1]),
      h('span', { style: { fontSize: `${cardW * 0.35}px`, color: SUIT_COLORS[card.suit], lineHeight: '1' } }, card.suit),
    );
  }

  function renderSolitaire() {
    boardArea.innerHTML = '';

    // Top row: Stock, Waste, spacer, 4 foundations
    const topRow = h('div', {
      style: { display: 'flex', gap: '4px', padding: '8px', justifyContent: 'center', flexWrap: 'wrap' },
    });

    // Stock
    const stockEl = h('div', {
      onClick: handleStockClick,
      style: {
        width: `${cardW}px`, height: `${cardH}px`,
        background: stock.length > 0 ? 'linear-gradient(135deg, #006B3F, #004a2a)' : 'rgba(255,255,255,0.05)',
        borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: '16px', color: 'rgba(255,255,255,0.3)',
      },
    }, stock.length > 0 ? `${stock.length}` : '↺');
    topRow.appendChild(stockEl);

    // Waste
    if (waste.length > 0) {
      const top = waste[waste.length - 1];
      const isSel = selectedSource?.type === 'waste';
      topRow.appendChild(renderCard(top, isSel, () => handleCardClick({ type: 'waste' })));
    } else {
      topRow.appendChild(h('div', { style: { width: `${cardW}px`, height: `${cardH}px`, borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.1)' } }));
    }

    // Spacer
    topRow.appendChild(h('div', { style: { width: '8px' } }));

    // Foundations
    for (let fi = 0; fi < 4; fi++) {
      const found = foundations[fi];
      if (found.length > 0) {
        const top = found[found.length - 1];
        const isSel = selectedSource?.type === 'foundation' && selectedSource.col === fi;
        topRow.appendChild(renderCard(top, isSel, () => handleCardClick({ type: 'foundation', col: fi })));
      } else {
        topRow.appendChild(h('div', {
          onClick: () => handleCardClick({ type: 'foundation', col: fi }),
          style: {
            width: `${cardW}px`, height: `${cardH}px`,
            borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: `${cardW * 0.35}px`, color: 'rgba(255,255,255,0.1)',
            cursor: 'pointer',
          },
        }, SUITS[fi]));
      }
    }
    boardArea.appendChild(topRow);

    // Tableau
    const tabRow = h('div', {
      style: { display: 'flex', gap: '3px', padding: '4px 8px', justifyContent: 'center', alignItems: 'flex-start' },
    });

    for (let col = 0; col < 7; col++) {
      const colEl = h('div', {
        onClick: (e: Event) => {
          // Click on empty column
          if (tableau[col].length === 0) {
            handleCardClick({ type: 'tableau', col, cardIdx: 0 });
            e.stopPropagation();
          }
        },
        style: {
          position: 'relative', width: `${cardW}px`,
          minHeight: `${cardH}px`,
          borderRadius: '6px', border: tableau[col].length === 0 ? '1px dashed rgba(255,255,255,0.1)' : 'none',
        },
      });

      tableau[col].forEach((card, idx) => {
        const isTopCard = idx === tableau[col].length - 1;
        const isFaceUpCard = card.faceUp;
        const isSelected = selectedSource?.type === 'tableau' && selectedSource.col === col &&
          selectedSource.cardIdx !== undefined && idx >= selectedSource.cardIdx;

        const cardEl = isFaceUpCard
          ? renderCard(card, isSelected, () => {
              if (card.faceUp) handleCardClick({ type: 'tableau', col, cardIdx: idx });
            })
          : h('div', {
              style: {
                width: `${cardW}px`, height: `${smallCardH}px`,
                background: 'linear-gradient(135deg, #006B3F, #004a2a)',
                borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)',
              },
            });

        cardEl.style.position = idx > 0 ? 'relative' : 'relative';
        cardEl.style.marginTop = idx > 0 ? `-${card.faceUp ? cardH - smallCardH : cardH - smallCardH + 5}px` : '0';
        colEl.appendChild(cardEl);
      });

      tabRow.appendChild(colEl);
    }
    boardArea.appendChild(tabRow);

    if (gameWon) {
      boardArea.appendChild(h('div', {
        style: { textAlign: 'center', padding: '24px', fontSize: '24px', fontWeight: '800', color: '#D4A017', fontFamily: 'var(--font-display)' },
      }, 'You Won!'));
    }
  }

  const boardArea = h('div', { style: { overflowX: 'auto', overflowY: 'auto' } });
  body.appendChild(boardArea);

  // Draw mode toggle + New game
  const drawToggle = h('button', {
    onClick: () => {
      drawCount = drawCount === 1 ? 3 : 1;
      drawToggle.textContent = `Draw: ${drawCount}`;
      initSolitaire(); renderSolitaire();
    },
    style: {
      display: 'inline-block', margin: '12px 6px 12px 0', background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.12)', color: '#D4A017',
      padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
      cursor: 'pointer', minHeight: '44px',
    },
  }, `Draw: ${drawCount}`);

  const btnRow = h('div', { style: { display: 'flex', justifyContent: 'center' } },
    drawToggle,
    h('button', {
      onClick: () => { initSolitaire(); renderSolitaire(); },
      style: {
        display: 'inline-block', margin: '12px 0 12px 6px', background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)', color: '#D4A017',
        padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
        cursor: 'pointer', minHeight: '44px',
      },
    }, 'New Game'),
  );
  body.appendChild(btnRow);

  initSolitaire();
  renderSolitaire();
  return cleanup;
}

/* ═══════════════════════════════════════════
   GAME 11 — GHANA TRIVIA 🇬🇭
   ═══════════════════════════════════════════ */
interface TriviaQuestion {
  q: string;
  options: string[];
  correct: number; // index
  category: string;
  funFact: string;
}

const TRIVIA_BANK: TriviaQuestion[] = [
  // History
  { q: 'In what year did Ghana gain independence from Britain?', options: ['1957', '1960', '1963', '1948'], correct: 0, category: 'History', funFact: 'Ghana was the first sub-Saharan African country to gain independence.' },
  { q: 'Who was the first President of Ghana?', options: ['J.B. Danquah', 'Kwame Nkrumah', 'Kofi Busia', 'Jerry Rawlings'], correct: 1, category: 'History', funFact: 'Nkrumah was also a key figure in the Pan-African movement.' },
  { q: 'What was the former colonial name of Ghana?', options: ['Ivory Coast', 'Gold Coast', 'Silver Coast', 'Grain Coast'], correct: 1, category: 'History', funFact: 'It was called the Gold Coast due to its abundant gold resources.' },
  { q: 'Which castle served as the seat of British colonial government?', options: ['Elmina Castle', 'Cape Coast Castle', 'Christiansborg Castle', 'Fort William'], correct: 2, category: 'History', funFact: 'Christiansborg Castle (Osu Castle) in Accra served as the seat of government until 2013.' },
  { q: 'The Ashanti Empire was founded in which century?', options: ['15th', '17th', '19th', '13th'], correct: 1, category: 'History', funFact: 'The Ashanti Empire was founded around 1670 by Osei Tutu I.' },
  { q: 'Who is known as the "Big Six" leader alongside Nkrumah?', options: ['Kofi Annan', 'J.B. Danquah', 'John Kufuor', 'Ignatius Acheampong'], correct: 1, category: 'History', funFact: 'The Big Six were imprisoned by the British in 1948 after the Accra riots.' },
  { q: 'What year was the Fourth Republic of Ghana established?', options: ['1988', '1992', '1996', '2000'], correct: 1, category: 'History', funFact: 'The 1992 constitution established the current democratic system.' },
  { q: 'Which Ghanaian led the United Nations as Secretary-General?', options: ['Kofi Annan', 'Kwame Nkrumah', 'John Mahama', 'Kofi Busia'], correct: 0, category: 'History', funFact: 'Kofi Annan served as UN Secretary-General from 1997 to 2006.' },
  { q: 'The Trans-Atlantic slave trade heavily involved which Ghanaian castles?', options: ['Elmina and Cape Coast', 'Osu and Ussher Fort', 'Fort Metal Cross and Dixcove', 'Fort Amsterdam and Kormantse'], correct: 0, category: 'History', funFact: 'Elmina Castle is the oldest European building in sub-Saharan Africa, built in 1482.' },
  { q: 'Ghana changed its name from Gold Coast upon independence in...', options: ['1955', '1957', '1960', '1963'], correct: 1, category: 'History', funFact: 'The name Ghana was taken from the ancient Ghana Empire, though geographically unrelated.' },
  // Geography
  { q: 'What is the capital city of Ghana?', options: ['Kumasi', 'Accra', 'Tamale', 'Takoradi'], correct: 1, category: 'Geography', funFact: 'Accra is located on the Gulf of Guinea coast.' },
  { q: 'Which is the largest lake in Ghana?', options: ['Lake Bosomtwe', 'Lake Volta', 'Lake Tadane', 'Lake Amansuri'], correct: 1, category: 'Geography', funFact: 'Lake Volta is one of the largest man-made lakes in the world by surface area.' },
  { q: 'How many regions does Ghana currently have?', options: ['10', '12', '14', '16'], correct: 3, category: 'Geography', funFact: 'Ghana increased from 10 to 16 regions in 2019 through a referendum.' },
  { q: 'Which river forms much of Ghana\'s eastern border?', options: ['Volta River', 'Pra River', 'Tano River', 'Ankobra River'], correct: 0, category: 'Geography', funFact: 'The Volta River system drains about 70% of Ghana\'s total land area.' },
  { q: 'The Akosombo Dam is on which river?', options: ['Pra', 'Volta', 'Oti', 'Black Volta'], correct: 1, category: 'Geography', funFact: 'The dam was completed in 1965 and generates most of Ghana\'s electricity.' },
  { q: 'Which national park is the largest in Ghana?', options: ['Kakum', 'Mole', 'Bui', 'Digya'], correct: 1, category: 'Geography', funFact: 'Mole National Park covers 4,840 sq km and is home to elephants, antelopes, and baboons.' },
  { q: 'Ghana is located on which continent?', options: ['Asia', 'South America', 'Africa', 'Europe'], correct: 2, category: 'Geography', funFact: 'Ghana is in West Africa, bordered by Ivory Coast, Burkina Faso, and Togo.' },
  { q: 'Which body of water borders Ghana to the south?', options: ['Red Sea', 'Atlantic Ocean', 'Indian Ocean', 'Gulf of Guinea'], correct: 3, category: 'Geography', funFact: 'The Gulf of Guinea is part of the Atlantic Ocean.' },
  { q: 'Mount Afadjato is the highest point in Ghana. Where is it?', options: ['Ashanti Region', 'Volta Region', 'Northern Region', 'Western Region'], correct: 1, category: 'Geography', funFact: 'Mount Afadjato is 885 meters above sea level.' },
  { q: 'The Greenwich Meridian (0 degrees longitude) passes through which Ghanaian city?', options: ['Kumasi', 'Accra', 'Tema', 'Tamale'], correct: 2, category: 'Geography', funFact: 'Tema is one of the few cities in the world directly on the Prime Meridian.' },
  // Culture
  { q: 'What is the traditional cloth of the Ashanti people?', options: ['Batik', 'Kente', 'Ankara', 'Adire'], correct: 1, category: 'Culture', funFact: 'Kente cloth originated in the Ashanti kingdom and each pattern has a specific meaning.' },
  { q: 'What are Adinkra symbols?', options: ['Musical notes', 'Visual symbols conveying concepts', 'Tribal tattoos', 'Dance moves'], correct: 1, category: 'Culture', funFact: 'There are over 80 Adinkra symbols, each representing a concept or proverb.' },
  { q: 'What does the Adinkra symbol "Sankofa" mean?', options: ['Strength', 'Go back and get it', 'Peace', 'Unity'], correct: 1, category: 'Culture', funFact: 'Sankofa teaches the importance of learning from the past.' },
  { q: 'Which music genre originated in Ghana?', options: ['Afrobeats', 'Highlife', 'Reggae', 'Soukous'], correct: 1, category: 'Culture', funFact: 'Highlife music developed in Ghana in the early 20th century, blending local melodies with Western instruments.' },
  { q: 'What is the name of the traditional Ghanaian funeral cloth?', options: ['Kente', 'Adinkra cloth', 'Batakari', 'Fugu'], correct: 1, category: 'Culture', funFact: 'Adinkra cloths are stamped with symbols and traditionally worn at funerals.' },
  { q: 'What is "Azonto"?', options: ['A food dish', 'A dance style', 'A river', 'A festival'], correct: 1, category: 'Culture', funFact: 'Azonto became a global dance phenomenon in the early 2010s.' },
  { q: 'What is the Golden Stool to the Ashanti people?', options: ['A decoration', 'The soul of the Ashanti nation', 'A musical instrument', 'A cooking pot'], correct: 1, category: 'Culture', funFact: 'Legend says the Golden Stool descended from the heavens and embodies the spirit of the Ashanti people.' },
  { q: 'Which festival is celebrated by the Gas of Accra?', options: ['Homowo', 'Aboakyir', 'Odwira', 'Akwasidae'], correct: 0, category: 'Culture', funFact: 'Homowo literally means "hooting at hunger" and celebrates an ancient victory over famine.' },
  { q: 'The "Batakari" (smock) is traditionally worn in which part of Ghana?', options: ['Southern Ghana', 'Western Ghana', 'Northern Ghana', 'Eastern Ghana'], correct: 2, category: 'Culture', funFact: 'The smock (fugu) is a hand-woven garment traditionally associated with Northern Ghana.' },
  { q: 'What is the traditional board game widely played in Ghana?', options: ['Chess', 'Oware', 'Go', 'Mancala'], correct: 1, category: 'Culture', funFact: 'Oware is a variant of Mancala and is sometimes called the "national game" of Ghana.' },
  // Politics
  { q: 'What type of government does Ghana have?', options: ['Monarchy', 'Presidential Republic', 'Parliamentary Republic', 'Military Junta'], correct: 1, category: 'Politics', funFact: 'Ghana is considered one of the most stable democracies in Africa.' },
  { q: 'How often are presidential elections held in Ghana?', options: ['3 years', '4 years', '5 years', '6 years'], correct: 1, category: 'Politics', funFact: 'Presidential and parliamentary elections are held simultaneously in Ghana.' },
  { q: 'What is the name of Ghana\'s parliament?', options: ['National Assembly', 'Parliament of Ghana', 'Senate', 'Congress'], correct: 1, category: 'Politics', funFact: 'Ghana has a unicameral parliament with 275 seats.' },
  { q: 'Which political parties are the two largest in Ghana?', options: ['NPP and NDC', 'CPP and PNC', 'PPP and GUM', 'APC and PDP'], correct: 0, category: 'Politics', funFact: 'NPP (New Patriotic Party) and NDC (National Democratic Congress) have alternated power since 1992.' },
  { q: 'Ghana\'s Supreme Court is located in which city?', options: ['Kumasi', 'Tamale', 'Cape Coast', 'Accra'], correct: 3, category: 'Politics', funFact: 'The Supreme Court of Ghana is the highest judicial body in the country.' },
  // Sports
  { q: 'What is the nickname of Ghana\'s national football team?', options: ['Super Eagles', 'Black Stars', 'Indomitable Lions', 'Bafana Bafana'], correct: 1, category: 'Sports', funFact: 'The Black Stars name comes from the black star on the Ghanaian flag.' },
  { q: 'Which Ghanaian footballer played for Chelsea and won the Champions League?', options: ['Asamoah Gyan', 'Michael Essien', 'Sulley Muntari', 'Andre Ayew'], correct: 1, category: 'Sports', funFact: 'Michael Essien won the Champions League with Chelsea in 2012.' },
  { q: 'Ghana reached the World Cup quarter-finals in which year?', options: ['2006', '2010', '2014', '2002'], correct: 1, category: 'Sports', funFact: 'Ghana was the third African nation to reach the World Cup quarter-finals, in South Africa 2010.' },
  { q: 'Which sport is considered the most popular in Ghana?', options: ['Boxing', 'Athletics', 'Football', 'Basketball'], correct: 2, category: 'Sports', funFact: 'Football is deeply embedded in Ghanaian culture and community life.' },
  { q: 'Azumah Nelson is a Ghanaian legend in which sport?', options: ['Football', 'Boxing', 'Athletics', 'Tennis'], correct: 1, category: 'Sports', funFact: 'Azumah Nelson was a three-time world boxing champion.' },
  // Food
  { q: 'What is Jollof rice?', options: ['A dessert', 'A spiced tomato rice dish', 'A soup', 'A bread'], correct: 1, category: 'Culture', funFact: 'Ghana and Nigeria have a famous friendly rivalry over who makes the best Jollof rice.' },
  { q: 'Fufu is traditionally made from...', options: ['Rice and beans', 'Cassava and plantain', 'Wheat flour', 'Corn and millet'], correct: 1, category: 'Culture', funFact: 'Fufu is pounded until smooth and eaten with soup by pulling off small pieces.' },
  { q: 'What is "Shito"?', options: ['A dance', 'A hot pepper sauce', 'A fabric', 'A greeting'], correct: 1, category: 'Culture', funFact: 'Shito is a beloved Ghanaian chili sauce made with dried fish, shrimp, and hot peppers.' },
  { q: 'Kelewele is made from which fruit?', options: ['Mango', 'Pineapple', 'Plantain', 'Banana'], correct: 2, category: 'Culture', funFact: 'Kelewele is spiced fried plantain cubes, a popular Ghanaian street food.' },
  { q: 'What is Banku typically served with?', options: ['Tilapia and pepper', 'Rice and stew', 'Bread and butter', 'Pasta'], correct: 0, category: 'Culture', funFact: 'Banku is made from fermented corn and cassava dough, cooked into a smooth ball.' },
  { q: 'What is Waakye?', options: ['A soup', 'Rice and beans dish', 'Fried yam', 'A drink'], correct: 1, category: 'Culture', funFact: 'Waakye gets its distinctive reddish-brown color from sorghum leaves used during cooking.' },
  { q: 'Ghana is the world\'s second-largest producer of which crop?', options: ['Coffee', 'Cocoa', 'Tea', 'Cotton'], correct: 1, category: 'Culture', funFact: 'Cocoa is one of Ghana\'s most important export commodities.' },
  { q: 'What is "Bofrot"?', options: ['A stew', 'Fried dough balls', 'Grilled meat', 'A beverage'], correct: 1, category: 'Culture', funFact: 'Bofrot (puff puff) is a popular snack sold at markets and by street vendors.' },
  { q: 'What currency does Ghana use?', options: ['Naira', 'Cedi', 'Shilling', 'Rand'], correct: 1, category: 'Culture', funFact: 'The word "cedi" comes from the Akan word for cowry shell, which was once used as currency.' },
  { q: 'What does "Akwaaba" mean in Twi?', options: ['Goodbye', 'Thank you', 'Welcome', 'Good morning'], correct: 2, category: 'Culture', funFact: 'Akwaaba is one of the most recognized Ghanaian words and reflects the country\'s hospitality.' },
];

function launchGhanaTrivia(container: HTMLElement): () => void {
  let qTimer: ReturnType<typeof setInterval> | null = null;
  const scoreSpan = h('span', { style: { color: '#D4A017', fontWeight: '700', fontSize: '14px' } }, 'Score: 0');

  const cleanup = () => { if (qTimer) clearInterval(qTimer); overlay.remove(); };
  const { overlay, body } = createOverlay(container, '🇬🇭 Ghana Trivia', cleanup, scoreSpan);

  let totalScore = 0;
  let questionIndex = 0;
  let timeLeft = 15;
  let answered = false;
  let usedIndices: Set<number> = new Set();
  const QUESTIONS_PER_ROUND = 10;
  let correctCount = 0;
  let currentQ: TriviaQuestion | null = null;

  // Shuffle and pick questions
  function pickQuestion(): TriviaQuestion | null {
    const available = TRIVIA_BANK.map((_, i) => i).filter(i => !usedIndices.has(i));
    if (available.length === 0) return null;
    const idx = available[Math.floor(Math.random() * available.length)];
    usedIndices.add(idx);
    return TRIVIA_BANK[idx];
  }

  const questionNumEl = h('div', { style: { textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' } });
  const categoryEl = h('div', { style: { textAlign: 'center', fontSize: '12px', color: '#D4A017', marginBottom: '8px', fontWeight: '600' } });
  const timerBarContainer = h('div', { style: { margin: '0 16px 12px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' } });
  const timerBar = h('div', { style: { height: '100%', background: '#D4A017', borderRadius: '2px', transition: 'width 1s linear', width: '100%' } });
  timerBarContainer.appendChild(timerBar);
  const questionEl = h('div', { style: { padding: '0 16px', fontSize: 'clamp(16px, 4.2vw, 20px)', fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: '16px', lineHeight: '1.4' } });
  const optionsEl = h('div', { style: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' } });
  const funFactEl = h('div', { style: { padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', display: 'none', fontStyle: 'italic' } });

  const wrapper = h('div', { style: { padding: '16px 0' } },
    questionNumEl, categoryEl, timerBarContainer, questionEl, optionsEl, funFactEl,
  );
  body.appendChild(wrapper);

  function showQuestion() {
    if (questionIndex >= QUESTIONS_PER_ROUND) {
      showResults();
      return;
    }
    currentQ = pickQuestion();
    if (!currentQ) { showResults(); return; }
    questionIndex++;
    answered = false;
    timeLeft = 15;

    questionNumEl.textContent = `Question ${questionIndex} of ${QUESTIONS_PER_ROUND}`;
    categoryEl.textContent = currentQ.category;
    questionEl.textContent = currentQ.q;
    funFactEl.style.display = 'none';
    timerBar.style.width = '100%';
    timerBar.style.background = '#D4A017';

    // Shuffle options
    const shuffledOpts = currentQ.options.map((opt, i) => ({ opt, isCorrect: i === currentQ!.correct }));
    for (let i = shuffledOpts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
    }

    optionsEl.innerHTML = '';
    shuffledOpts.forEach(({ opt, isCorrect }) => {
      const btn = h('button', {
        onClick: () => handleAnswer(btn, isCorrect, shuffledOpts),
        style: {
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '12px', color: '#fff', padding: '14px 16px', fontSize: '15px',
          fontWeight: '600', cursor: 'pointer', textAlign: 'left', minHeight: '48px',
          transition: 'background 0.2s ease, border-color 0.2s ease',
        },
      }, opt);
      optionsEl.appendChild(btn);
    });

    if (qTimer) clearInterval(qTimer);
    qTimer = setInterval(() => {
      timeLeft--;
      timerBar.style.width = `${(timeLeft / 15) * 100}%`;
      if (timeLeft <= 5) timerBar.style.background = '#CE1126';
      if (timeLeft <= 0) {
        if (qTimer) clearInterval(qTimer);
        if (!answered) {
          answered = true;
          // Highlight correct answer
          const btns = optionsEl.querySelectorAll('button');
          btns.forEach((btn, i) => {
            const so = shuffledOpts[i];
            if (so.isCorrect) {
              (btn as HTMLElement).style.background = 'rgba(0,107,63,0.3)';
              (btn as HTMLElement).style.borderColor = '#006B3F';
            }
            (btn as HTMLElement).style.pointerEvents = 'none';
          });
          funFactEl.textContent = `Time's up! ${currentQ!.funFact}`;
          funFactEl.style.display = 'block';
          setTimeout(showQuestion, 2500);
        }
      }
    }, 1000);
  }

  function handleAnswer(btn: HTMLElement, isCorrect: boolean, shuffledOpts: { opt: string; isCorrect: boolean }[]) {
    if (answered) return;
    answered = true;
    if (qTimer) clearInterval(qTimer);

    const btns = optionsEl.querySelectorAll('button');
    btns.forEach((b, i) => {
      const so = shuffledOpts[i];
      if (so.isCorrect) {
        (b as HTMLElement).style.background = 'rgba(0,107,63,0.3)';
        (b as HTMLElement).style.borderColor = '#006B3F';
      } else if (b === btn && !isCorrect) {
        (b as HTMLElement).style.background = 'rgba(206,17,38,0.3)';
        (b as HTMLElement).style.borderColor = '#CE1126';
      }
      (b as HTMLElement).style.pointerEvents = 'none';
    });

    if (isCorrect) {
      const speedBonus = Math.floor(timeLeft * 5);
      const pts = 100 + speedBonus;
      totalScore += pts;
      correctCount++;
      scoreSpan.textContent = `Score: ${totalScore}`;
      showToast(`Correct! +${pts}`, 'success');
    } else {
      const correctOpt = shuffledOpts.find(so => so.isCorrect);
      showToast(`Incorrect! Answer: ${correctOpt?.opt}`, 'error');
    }

    funFactEl.textContent = currentQ!.funFact;
    funFactEl.style.display = 'block';

    setTimeout(showQuestion, 2200);
  }

  function showResults() {
    if (qTimer) clearInterval(qTimer);
    const isRecord = saveScore('ghanaTrivia', totalScore);
    if (isRecord) showToast('New Record!', 'success');

    const resultsEl = h('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', zIndex: '5',
        padding: '24px',
      },
    },
      h('div', { style: { fontSize: '36px', marginBottom: '8px' } }, '🇬🇭'),
      h('div', { style: { fontSize: '24px', fontWeight: '800', color: '#D4A017', fontFamily: 'var(--font-display)', marginBottom: '8px' } }, 'Round Complete!'),
      h('div', { style: { fontSize: '18px', color: '#fff', marginBottom: '4px' } }, `Score: ${totalScore}`),
      h('div', { style: { fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' } }, `${correctCount}/${QUESTIONS_PER_ROUND} correct`),
      h('button', {
        onClick: () => {
          resultsEl.remove();
          totalScore = 0; questionIndex = 0; correctCount = 0;
          usedIndices.clear();
          scoreSpan.textContent = 'Score: 0';
          showQuestion();
        },
        style: {
          background: 'linear-gradient(135deg, #006B3F, #00a85f)', border: 'none',
          color: '#fff', padding: '14px 36px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '700', cursor: 'pointer', minHeight: '48px',
        },
      }, 'Play Again'),
    );
    body.appendChild(resultsEl);
  }

  showQuestion();
  return cleanup;
}

/* ═══════════════════════════════════════════
   GAME 12 — TYPING SPEED ⌨️
   ═══════════════════════════════════════════ */
const TYPING_PASSAGES = [
  'Ghana is a country in West Africa known for its rich history, vibrant culture, and warm hospitality. The nation gained independence from Britain in 1957, becoming the first sub-Saharan African country to do so.',
  'The Ashanti people are known for their Kente cloth, a colorful hand-woven fabric with intricate geometric patterns. Each pattern has its own name and meaning, representing proverbs and historical events.',
  'Lake Volta, located in Ghana, is one of the largest man-made lakes in the world by surface area. It was created by the construction of the Akosombo Dam on the Volta River in 1965.',
  'Jollof rice is a popular one-pot rice dish in West Africa. The recipe varies by country, but the Ghanaian version typically uses long-grain rice, tomatoes, onions, and a blend of spices.',
  'The Black Stars, Ghana\'s national football team, have a proud history in African and world football. They have won the Africa Cup of Nations four times and reached the World Cup quarter-finals in 2010.',
  'Accra, the capital city of Ghana, is a bustling metropolis that blends modern development with traditional culture. The city is home to markets, museums, beaches, and a thriving arts scene.',
  'Cocoa is one of Ghana\'s most important crops. The country is the second-largest producer of cocoa beans in the world, and cocoa farming provides livelihoods for millions of Ghanaian families.',
  'The Cape Coast Castle is a UNESCO World Heritage Site and one of about forty slave castles built on the Gold Coast of West Africa. It served as a holding point for enslaved people before they were shipped across the Atlantic.',
  'Fufu is a staple food in Ghana made by pounding boiled cassava and plantain together until smooth. It is typically served with a variety of soups including light soup, groundnut soup, and palm nut soup.',
  'Traditional Ghanaian music, particularly highlife, emerged in the early twentieth century. This genre blends traditional Akan music with Western instruments and has influenced many other African music styles.',
  'The Kakum National Park in the Central Region of Ghana is famous for its canopy walkway. The walkway is suspended forty meters above the rainforest floor and offers stunning views of the tropical forest ecosystem.',
  'Education in Ghana has made significant progress over the years. The country introduced free senior high school education in 2017, significantly increasing enrollment and access to secondary education.',
];

function launchTypingSpeed(container: HTMLElement): () => void {
  let gameTimer: ReturnType<typeof setInterval> | null = null;
  const scoreSpan = h('span', { style: { color: '#D4A017', fontWeight: '700', fontSize: '14px' } }, 'WPM: 0');

  const cleanup = () => { if (gameTimer) clearInterval(gameTimer); overlay.remove(); };
  const { overlay, body } = createOverlay(container, '⌨️ Typing Speed', cleanup, scoreSpan);

  let passage = '';
  let typed = '';
  let started = false;
  let finished = false;
  let startTime = 0;
  let elapsed = 0;
  let duration = 60; // seconds
  let usedPassages: Set<number> = new Set();

  // Duration selector
  const durRow = h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' } });
  for (const d of [30, 60, 120]) {
    durRow.appendChild(h('button', {
      onClick: () => { if (!started) { duration = d; updateDurBtns(); } },
      style: {
        background: duration === d ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${duration === d ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '8px', color: duration === d ? '#D4A017' : 'rgba(255,255,255,0.5)',
        padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', minHeight: '36px',
      },
      className: `dur-${d}`,
    }, `${d}s`));
  }

  function updateDurBtns() {
    for (const d of [30, 60, 120]) {
      const btn = durRow.querySelector(`.dur-${d}`) as HTMLElement;
      if (btn) {
        btn.style.background = duration === d ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.06)';
        btn.style.borderColor = duration === d ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.1)';
        btn.style.color = duration === d ? '#D4A017' : 'rgba(255,255,255,0.5)';
      }
    }
  }

  // Stats
  const statsRow = h('div', {
    style: { display: 'flex', justifyContent: 'space-around', padding: '8px 16px' },
  },
    h('div', { style: { textAlign: 'center' } },
      h('div', { style: { fontSize: '11px', color: 'rgba(255,255,255,0.4)' } }, 'WPM'),
      h('div', { className: 'typing-wpm', style: { fontSize: '24px', fontWeight: '800', color: '#D4A017' } }, '0'),
    ),
    h('div', { style: { textAlign: 'center' } },
      h('div', { style: { fontSize: '11px', color: 'rgba(255,255,255,0.4)' } }, 'Accuracy'),
      h('div', { className: 'typing-acc', style: { fontSize: '24px', fontWeight: '800', color: '#006B3F' } }, '100%'),
    ),
    h('div', { style: { textAlign: 'center' } },
      h('div', { style: { fontSize: '11px', color: 'rgba(255,255,255,0.4)' } }, 'Time'),
      h('div', { className: 'typing-time', style: { fontSize: '24px', fontWeight: '800', color: '#CE1126' } }, `${duration}`),
    ),
  );

  // Passage display
  const passageEl = h('div', {
    style: {
      padding: '16px', margin: '8px 16px', background: 'rgba(255,255,255,0.04)',
      borderRadius: '12px', fontSize: 'clamp(14px, 3.8vw, 18px)', lineHeight: '1.8',
      fontFamily: 'monospace', minHeight: '120px', overflowY: 'auto', maxHeight: '200px',
    },
  });

  // Input
  const inputEl = document.createElement('textarea');
  Object.assign(inputEl.style, {
    width: 'calc(100% - 32px)', margin: '0 16px', display: 'block',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px', padding: '14px 16px', color: '#fff', fontSize: '16px',
    fontFamily: 'monospace', outline: 'none', resize: 'none', height: '80px',
  });
  inputEl.placeholder = 'Start typing here...';
  inputEl.autocomplete = 'off';
  inputEl.autocapitalize = 'off';
  inputEl.spellcheck = false;

  function pickPassage(): string {
    if (usedPassages.size >= TYPING_PASSAGES.length) usedPassages.clear();
    let idx: number;
    do { idx = Math.floor(Math.random() * TYPING_PASSAGES.length); } while (usedPassages.has(idx));
    usedPassages.add(idx);
    return TYPING_PASSAGES[idx];
  }

  function initTyping() {
    passage = pickPassage();
    typed = '';
    started = false;
    finished = false;
    elapsed = 0;
    usedPassages.clear();
    inputEl.value = '';
    inputEl.disabled = false;
    renderPassage();
    updateStats(0, 100);
    const timeEl = body.querySelector('.typing-time') as HTMLElement;
    if (timeEl) timeEl.textContent = String(duration);
    if (gameTimer) clearInterval(gameTimer);
  }

  function renderPassage() {
    passageEl.innerHTML = '';
    for (let i = 0; i < passage.length; i++) {
      let color = 'rgba(255,255,255,0.4)';
      let bg = 'transparent';
      if (i < typed.length) {
        if (typed[i] === passage[i]) {
          color = '#22C55E';
        } else {
          color = '#fff';
          bg = '#CE1126';
        }
      } else if (i === typed.length) {
        bg = 'rgba(212,160,23,0.3)';
        color = '#fff';
      }
      const span = h('span', { style: { color, backgroundColor: bg, borderRadius: '2px' } },
        passage[i] === ' ' && bg !== 'transparent' ? '\u00B7' : passage[i]);
      passageEl.appendChild(span);
    }
  }

  function updateStats(wpm: number, accuracy: number) {
    const wpmEl = body.querySelector('.typing-wpm') as HTMLElement;
    const accEl = body.querySelector('.typing-acc') as HTMLElement;
    if (wpmEl) wpmEl.textContent = String(Math.round(wpm));
    if (accEl) accEl.textContent = `${Math.round(accuracy)}%`;
    scoreSpan.textContent = `WPM: ${Math.round(wpm)}`;
  }

  function endTyping() {
    finished = true;
    inputEl.disabled = true;
    if (gameTimer) clearInterval(gameTimer);

    const elapsedMin = elapsed / 60;
    let correct = 0;
    for (let i = 0; i < typed.length; i++) {
      if (i < passage.length && typed[i] === passage[i]) correct++;
    }
    const grossWPM = elapsedMin > 0 ? (typed.length / 5) / elapsedMin : 0;
    const errors = typed.length - correct;
    const netWPM = Math.max(0, elapsedMin > 0 ? grossWPM - (errors / elapsedMin) : 0);
    const accuracy = typed.length > 0 ? (correct / typed.length) * 100 : 100;

    updateStats(netWPM, accuracy);
    const pts = Math.round(netWPM);
    if (pts > 0) saveScore('typingSpeed', pts);

    const resultsEl = h('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', zIndex: '5',
        padding: '24px',
      },
    },
      h('div', { style: { fontSize: '24px', fontWeight: '800', color: '#D4A017', fontFamily: 'var(--font-display)', marginBottom: '16px' } }, 'Time\'s Up!'),
      h('div', { style: { fontSize: '48px', fontWeight: '800', color: '#D4A017', marginBottom: '4px' } }, String(Math.round(netWPM))),
      h('div', { style: { fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' } }, 'Words Per Minute'),
      h('div', { style: { fontSize: '16px', color: '#fff', marginBottom: '4px' } }, `Accuracy: ${Math.round(accuracy)}%`),
      h('div', { style: { fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' } }, `${correct} correct / ${typed.length} typed`),
      h('button', {
        onClick: () => { resultsEl.remove(); initTyping(); inputEl.focus(); },
        style: {
          background: 'linear-gradient(135deg, #006B3F, #00a85f)', border: 'none',
          color: '#fff', padding: '14px 36px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '700', cursor: 'pointer', minHeight: '48px',
        },
      }, 'Try Again'),
    );
    body.appendChild(resultsEl);
  }

  inputEl.addEventListener('input', () => {
    if (finished) return;
    typed = inputEl.value;

    if (!started && typed.length > 0) {
      started = true;
      startTime = Date.now();
      gameTimer = setInterval(() => {
        elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, duration - elapsed);
        const timeEl = body.querySelector('.typing-time') as HTMLElement;
        if (timeEl) timeEl.textContent = String(Math.ceil(remaining));

        // Live WPM — same formula as endTyping (grossWPM - errors/min)
        if (elapsed > 2) {
          const elapsedMin = elapsed / 60;
          let correct = 0;
          for (let i = 0; i < typed.length && i < passage.length; i++) {
            if (typed[i] === passage[i]) correct++;
          }
          const grossWPM = (typed.length / 5) / elapsedMin;
          const errors = typed.length - correct;
          const netWPM = Math.max(0, grossWPM - (errors / elapsedMin));
          const accuracy = typed.length > 0 ? (correct / typed.length) * 100 : 100;
          updateStats(netWPM, accuracy);
        }

        if (remaining <= 0) endTyping();
      }, 500);
    }

    renderPassage();

    // Chain next passage when current one is fully typed
    if (typed.length >= passage.length) {
      const nextPassage = pickPassage();
      passage = passage + ' ' + nextPassage;
      renderPassage();
    }
  });

  body.appendChild(durRow);
  body.appendChild(statsRow);
  body.appendChild(passageEl);
  body.appendChild(inputEl);
  body.appendChild(h('div', { style: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', padding: '8px' } },
    'Timer starts on first keystroke. Green = correct, Red = error.'));

  // Restart button
  body.appendChild(h('button', {
    onClick: () => { initTyping(); inputEl.focus(); },
    style: {
      display: 'block', margin: '12px auto', background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.12)', color: '#D4A017',
      padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
      cursor: 'pointer', minHeight: '44px',
    },
  }, 'New Passage'));

  initTyping();
  return cleanup;
}

/* ═══════════════════════════════════════════
   GAMES GRID (Main Page)
   ═══════════════════════════════════════════ */
const GAMES: GameDef[] = [
  {
    id: 'snake', icon: '🐍', name: 'Snake',
    desc: 'Classic snake — eat, grow, survive!',
    gradient: 'linear-gradient(135deg, #006B3F, #00a85f)',
    launch: launchSnake,
  },
  {
    id: 'game2048', icon: '🔢', name: '2048',
    desc: 'Slide & merge tiles to reach 2048',
    gradient: 'linear-gradient(135deg, #D4A017, #f0c040)',
    launch: launch2048,
  },
  {
    id: 'wordScramble', icon: '🔤', name: 'Word Scramble',
    desc: 'Unscramble Ghana-themed words',
    gradient: 'linear-gradient(135deg, #6B3FA0, #9B59B6)',
    launch: launchWordScramble,
  },
  {
    id: 'oware', icon: '🫘', name: 'Oware',
    desc: 'Traditional Ghanaian board game',
    gradient: 'linear-gradient(135deg, #8B4513, #A0522D)',
    launch: launchOware,
  },
  {
    id: 'chess', icon: '♟️', name: 'Chess',
    desc: 'Classic chess against AI',
    gradient: 'linear-gradient(135deg, #1a1a2e, #374151)',
    launch: launchChess,
  },
  {
    id: 'checkers', icon: '🏁', name: 'Checkers',
    desc: 'Jump and capture to win!',
    gradient: 'linear-gradient(135deg, #DC2626, #991B1B)',
    launch: launchCheckers,
  },
  {
    id: 'ludo', icon: '🎲', name: 'Ludo',
    desc: 'Roll dice, race to home!',
    gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    launch: launchLudo,
  },
  {
    id: 'sudoku', icon: '🧩', name: 'Sudoku',
    desc: 'Fill the grid — no repeats!',
    gradient: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
    launch: launchSudoku,
  },
  {
    id: 'minesweeper', icon: '💣', name: 'Minesweeper',
    desc: 'Clear the field, dodge the mines',
    gradient: 'linear-gradient(135deg, #4B5563, #1F2937)',
    launch: launchMinesweeper,
  },
  {
    id: 'solitaire', icon: '🃏', name: 'Solitaire',
    desc: 'Classic Klondike card game',
    gradient: 'linear-gradient(135deg, #065F46, #047857)',
    launch: launchSolitaire,
  },
  {
    id: 'ghanaTrivia', icon: '🇬🇭', name: 'Ghana Trivia',
    desc: 'Test your Ghana knowledge!',
    gradient: 'linear-gradient(135deg, #CE1126, #006B3F)',
    launch: launchGhanaTrivia,
  },
  {
    id: 'typingSpeed', icon: '⌨️', name: 'Typing Speed',
    desc: 'How fast can you type?',
    gradient: 'linear-gradient(135deg, #0891B2, #0E7490)',
    launch: launchTypingSpeed,
  },
];

export function renderGamesPage(container: HTMLElement): void {
  const scores = loadScores();

  const header = h('div', {
    style: { padding: '24px 16px 8px', textAlign: 'center' },
  },
    h('div', { style: { fontSize: '36px', marginBottom: '4px' } }, '🎮'),
    h('h1', {
      style: {
        fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: '800',
        fontFamily: 'var(--font-display)', color: '#fff', margin: '0 0 4px',
      },
    }, 'GovPlay'),
    h('p', {
      style: { fontSize: 'clamp(13px, 3.4vw, 15px)', color: 'rgba(255,255,255,0.5)', margin: '0' },
    }, 'Offline games for break time & dumsor'),
  );

  const grid = h('div', {
    style: {
      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px', padding: '16px',
    },
  });

  for (const game of GAMES) {
    const highScore = scores[game.id];
    let activeCleanup: (() => void) | null = null;

    const card = h('div', {
      onClick: () => {
        activeCleanup = game.launch(container);
      },
      style: {
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', overflow: 'hidden', cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      },
    },
      // Gradient header
      h('div', {
        style: {
          background: game.gradient, padding: '20px 12px', textAlign: 'center',
        },
      },
        h('div', { style: { fontSize: '40px', marginBottom: '4px' } }, game.icon),
      ),
      // Info
      h('div', { style: { padding: '12px' } },
        h('div', {
          style: { fontSize: 'clamp(15px, 4vw, 17px)', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-display)', marginBottom: '4px' },
        }, game.name),
        h('div', {
          style: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', lineHeight: '1.3' },
        }, game.desc),
        h('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        },
          h('span', {
            style: { fontSize: '11px', color: 'rgba(255,255,255,0.3)' },
          }, highScore ? `Best: ${highScore}` : 'No score yet'),
          h('span', {
            style: {
              fontSize: '12px', fontWeight: '700', color: '#006B3F',
              background: 'rgba(0,107,63,0.15)', padding: '4px 10px',
              borderRadius: '8px',
            },
          }, 'Play'),
        ),
      ),
    );

    grid.appendChild(card);
  }

  const spacer = h('div', { style: { height: '100px' } });

  render(container, header, grid, spacer);
}
