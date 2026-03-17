# Claude Code Prompt: OS Browser GovPlay — Responsive Design Addendum

## Copy everything below this line and paste AFTER the main GovPlay prompt:

---

**CRITICAL ADDENDUM — RESPONSIVE DESIGN FOR ALL GAMES**

Every game in GovPlay MUST be fully responsive across all desktop screen sizes and all sidebar configurations. Games will be played inside the OS Browser content area, which changes size dynamically based on:

1. **Window size** — users may have OS Browser maximized on a 1366×768 laptop, a 1920×1080 monitor, a 2560×1440 display, or anything in between
2. **Kente Sidebar state** — the sidebar can be hidden (0px), collapsed (44px icon rail), or expanded (280-400px panel), stealing horizontal space from the content area
3. **Status bar + chrome** — the title bar (32px), tab bar (36px), address bar (42px), and status bar (28px) consume ~138px of vertical space

This means the **actual game viewport** can range from:
- **Smallest**: ~880 × 530px (1366×768 window, sidebar expanded at 400px, minus chrome)
- **Typical**: ~1200 × 800px (1920×1080 window, sidebar collapsed at 44px, minus chrome)
- **Largest**: ~2400 × 1260px (2560×1440 window, sidebar hidden, minus chrome)

**Every game must look and play perfectly across this entire range.** No scrollbars. No cropping. No tiny unreadable elements. No wasted empty space.

---

## Responsive Architecture for ALL Games

### Canvas Games (Oware, Ludo, Chess, Checkers, Snake)

**DO NOT use hardcoded pixel dimensions for the canvas.** Instead:

```typescript
// WRONG — hardcoded, breaks on different screens
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;

// RIGHT — responsive, fills available space
function useGameDimensions(containerRef: React.RefObject<HTMLDivElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      // Available space minus padding
      const availableWidth = rect.width - 32;   // 16px padding each side
      const availableHeight = rect.height - 32;

      // Games that need a square board (Chess, Checkers, Oware, Snake):
      // Use the smaller dimension to maintain aspect ratio
      const squareSize = Math.min(availableWidth, availableHeight);

      // Games that have a custom aspect ratio (Ludo is roughly square,
      // Solitaire is wider than tall):
      // Calculate based on the game's natural ratio

      setDimensions({ width: squareSize, height: squareSize });
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [containerRef]);

  return dimensions;
}
```

**Canvas DPI scaling — prevent blurry rendering on high-DPI screens:**

```typescript
function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;

  // Set the canvas internal resolution to match the device pixel ratio
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // Set the CSS display size
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  return ctx;
}
```

**All Canvas drawing operations must use relative coordinates, not absolute pixels:**

```typescript
// WRONG — fixed pixel positions
ctx.fillRect(50, 50, 80, 80);  // This pit is always at (50,50) and always 80px

// RIGHT — relative to board dimensions
const pitSize = boardSize / 8;         // Scales with board
const pitX = col * pitSize + padding;
const pitY = row * pitSize + padding;
ctx.fillRect(pitX, pitY, pitSize, pitSize);
```

**Font sizes on Canvas must scale proportionally:**

```typescript
// WRONG
ctx.font = '14px sans-serif';

// RIGHT
const baseFontSize = Math.max(12, Math.round(boardSize / 30));
ctx.font = `${baseFontSize}px sans-serif`;

// For seed counts in Oware, piece labels, etc.:
const labelSize = Math.max(10, Math.round(pitSize / 3));
ctx.font = `bold ${labelSize}px sans-serif`;
```

### DOM/CSS Games (Solitaire, Minesweeper, Sudoku, 2048, Word Scramble, Trivia, Typing)

**Use relative units and CSS container queries, NOT fixed pixel sizes:**

```css
/* WRONG */
.sudoku-cell {
  width: 48px;
  height: 48px;
  font-size: 20px;
}

/* RIGHT */
.sudoku-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  aspect-ratio: 1;
  width: min(100%, 90vh - 200px);  /* Fit within container, leave room for controls */
  max-width: 560px;                /* Don't get absurdly large on big screens */
  min-width: 280px;                /* Don't get unreadably small */
  margin: 0 auto;
}

.sudoku-cell {
  aspect-ratio: 1;
  font-size: clamp(12px, 2.5cqi, 24px);  /* Scale font with container */
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Card sizes in Solitaire must scale:**

```css
.card {
  /* Base size relative to the game container, not the viewport */
  width: clamp(50px, 8%, 80px);
  aspect-ratio: 5 / 7;
  font-size: clamp(10px, 1.5vw, 16px);
  border-radius: clamp(3px, 0.5vw, 6px);
}

.tableau-column {
  /* Fan-out overlap scales with card size */
  --card-overlap: clamp(18px, 3vw, 28px);
}
```

**Minesweeper cell sizes must adapt to grid size AND screen size:**

```css
.minesweeper-grid {
  display: grid;
  gap: 1px;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
}

.minesweeper-cell {
  /* Size based on grid dimensions and available space */
  width: clamp(18px, calc((100vw - var(--sidebar-width) - 64px) / var(--cols)), 32px);
  aspect-ratio: 1;
  font-size: clamp(10px, calc(var(--cell-size) * 0.55), 18px);
}
```

---

## Game Container Layout

### `GameShell.tsx` — Responsive Wrapper

The GameShell must use a flex layout that gives the game maximum space:

```tsx
function GameShell({ game, children }: { game: GameMeta; children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="game-shell">
      {/* Header: fixed height, never grows */}
      <header className="game-header">
        <button onClick={goBack}>← Back</button>
        <span>{game.name}</span>
        <span>Score: {score} | Best: {best}</span>
      </header>

      {/* Game area: fills ALL remaining space */}
      <main ref={containerRef} className="game-container">
        {children}
      </main>

      {/* Footer: fixed height, never grows */}
      <footer className="game-footer">
        <button>New Game</button>
        {game.hasUndo && <button>Undo</button>}
        <button onClick={toggleSound}>🔊</button>
        {game.hasDifficulty && <DifficultySelector />}
      </footer>
    </div>
  );
}
```

```css
.game-shell {
  display: flex;
  flex-direction: column;
  height: 100%;              /* Fill the entire content area */
  overflow: hidden;          /* Never scroll the shell itself */
}

.game-header {
  flex-shrink: 0;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--os-border-subtle);
}

.game-container {
  flex: 1;                   /* Takes ALL remaining space */
  min-height: 0;             /* Critical: allows flex child to shrink below content size */
  display: flex;
  align-items: center;       /* Center game vertically in available space */
  justify-content: center;   /* Center game horizontally */
  padding: 16px;
  overflow: hidden;
}

.game-footer {
  flex-shrink: 0;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border-top: 1px solid var(--os-border-subtle);
}
```

**The `.game-container` is the key element.** Every game receives this container's dimensions via `useGameDimensions()` or CSS and must fill it responsively.

---

## Per-Game Responsive Rules

### Oware
- Board aspect ratio: roughly 3:1 (wide). Use `width = containerWidth` and `height = width / 3`.
- If container is taller than wide (very narrow sidebar scenario), flip to portrait layout: pits stack vertically.
- Pit size: `boardWidth / 8` (6 pits + 2 scoring houses).
- Seed dots: radius scales with pit size (`pitRadius / 8` per seed).
- Minimum playable width: 320px. Below this, show "Expand your window" message.

### Ludo
- Board is square. Side = `min(containerWidth, containerHeight)`.
- Token size: `boardSide / 20`.
- Dice: `boardSide / 10`, positioned beside the board or below it depending on available space.
- If horizontal space allows, place dice and player info beside the board. If tight, place below.

### Chess & Checkers
- Board is square. Side = `min(containerWidth, containerHeight)`.
- Cell size: `boardSide / 8`.
- Piece drawing scales entirely with cell size — every line, curve, and shape uses cell-relative coordinates.
- Captured pieces row: scaled to `cellSize * 0.5` each, shown above or beside the board depending on space.
- Minimum cell size: 32px. Below this, the board becomes unplayable.

### Solitaire
- Needs width more than height (7 tableau columns + stock/waste + 4 foundations).
- Calculate card width: `containerWidth / 9` (7 columns + margins).
- Card height: `cardWidth * 1.4` (standard card ratio).
- Fan-out overlap: `cardHeight * 0.25` per face-down card, `cardHeight * 0.35` per face-up card.
- If cards would be smaller than 40px wide, switch to a compact mode with tighter spacing.

### Minesweeper
- Grid dimensions (9×9, 16×16, or 30×16) are fixed, but CELL SIZE adapts.
- Cell size: `min(containerWidth / cols, containerHeight / (rows + 2))` — the +2 accounts for the header (mine count, smiley, timer).
- Maximum cell size: 32px (don't make them huge on large screens).
- Minimum cell size: 18px (below this, show a "Screen too small for this difficulty" warning and suggest Easy mode).

### Sudoku
- Board is square. Use same logic as Chess.
- Cell size: `boardSide / 9`.
- Pencil marks (notes): font size = `cellSize / 4`, arranged in a 3×3 micro-grid inside the cell.
- Number input area (if on-screen buttons): `cellSize * 1.2` per button, in a row of 9 below the board. Scale down on tight screens.

### 2048
- Board is square. 4×4 grid with gaps.
- Tile size: `(boardSide - 5 * gap) / 4` where gap = `boardSide * 0.02`.
- Tile font size: scales with tile size. Small numbers (2-64): `tileSize * 0.45`. Large numbers (128-2048): `tileSize * 0.3`. Huge numbers (4096+): `tileSize * 0.22`.
- Tile border-radius: `tileSize * 0.08`.

### Snake
- Grid is square. 20×20 cells.
- Cell size: `min(containerWidth, containerHeight) / 22` (20 cells + 1 cell border padding each side).
- Snake segments: rounded rect filling `cellSize * 0.85`, centered in each cell.
- Food: circle with radius `cellSize * 0.35`.

### Word Scramble
- Letter tiles: `clamp(36px, 8vw, 56px)` width, square, in a `flex-wrap: wrap` row centered horizontally.
- Maximum 12 tiles per row. If the word is longer, tiles shrink to fit.
- Answer slots: same size as letter tiles, in a row below.
- On narrow screens (< 500px available width), reduce tile size and font proportionally.

### Trivia Quiz
- Question card: `max-width: 600px`, centered, with padding.
- Option buttons: 2×2 grid on wide screens (`grid-template-columns: 1fr 1fr`), stack to 1 column on narrow screens (< 450px width).
- Timer bar: full width of the question card.
- Progress dots: scale down on narrow screens.

### Typing Speed
- Text display area: `max-width: 700px`, centered, monospace.
- Font size: `clamp(14px, 2vw, 20px)` — must be large enough to read comfortably but not so large that only 3 words fit per line.
- Line height: `1.8` for comfortable reading.
- Stats bar below text: flex-wrap on narrow screens so WPM, accuracy, and timer don't overlap.

---

## Resize Handling

Games must respond to container resize **smoothly and instantly** — no page reload, no game restart.

**For Canvas games:**

```typescript
useEffect(() => {
  const handleResize = () => {
    const { width, height } = getContainerDimensions();
    setupCanvas(canvasRef.current!, width, height);
    redrawBoard(); // Redraw with new dimensions — game state is preserved
  };

  const observer = new ResizeObserver(handleResize);
  if (containerRef.current) observer.observe(containerRef.current);

  return () => observer.disconnect();
}, [gameState]); // Redraw when game state OR container size changes
```

**For DOM games:** CSS handles most resizing automatically if you use relative units (`clamp`, `%`, `cqi`, `min/max`). But test that:
- Solitaire card fans don't overflow their container when sidebar opens
- Minesweeper cells don't become microscopic on Hard mode (30×16) with sidebar expanded
- 2048 tiles don't lose their numbers when text shrinks below readability

**Sidebar toggle must trigger resize:** When the user opens/closes the Kente Sidebar, the content area width changes by 280-400px. Games must reflow immediately. The `ResizeObserver` on the game container handles this automatically — do NOT listen for sidebar events separately.

---

## Testing Checklist

After building each game, verify it looks and plays correctly at ALL of these viewport sizes (simulate by resizing the OS Browser window + toggling the sidebar):

| Scenario | Content Area Size | Must Work |
|----------|------------------|-----------|
| Small laptop, sidebar expanded | ~880 × 530px | ✓ |
| Small laptop, sidebar collapsed | ~1280 × 530px | ✓ |
| Full HD, sidebar expanded | ~1500 × 900px | ✓ |
| Full HD, sidebar collapsed | ~1836 × 900px | ✓ |
| Full HD, sidebar hidden | ~1880 × 900px | ✓ |
| QHD (2560×1440), sidebar expanded | ~2100 × 1260px | ✓ |
| QHD, sidebar hidden | ~2520 × 1260px | ✓ |
| Window resized to minimum (~800×600) | ~720 × 420px | ✓ or graceful message |

For each game at each size, check:
- [ ] Board/grid fills available space without scrollbars
- [ ] Text is readable (minimum 10px rendered)
- [ ] Interactive targets are clickable (minimum 24×24px touch/click area)
- [ ] No elements overflow or get clipped
- [ ] Animations run at 60fps
- [ ] Resizing mid-game preserves game state (no restart)
- [ ] Canvas is crisp on high-DPI screens (no blurriness)

Build every game with these responsive principles from the start — do NOT build fixed-size first and retrofit later.
