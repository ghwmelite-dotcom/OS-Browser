# Claude Code Prompt: OS Browser — Game Center ("GovPlay")

## Copy everything below this line and paste into Claude Code:

---

I'm building **OS Browser**, a desktop browser (React + Electron) for Ghana's civil service. I need you to build a **built-in game center** called **"GovPlay"** accessible at `os://games` and from the Kente Sidebar. It includes **12 lightweight HTML5/Canvas games** bundled directly in the app.

**CRITICAL SIZE CONSTRAINT:** The entire game center — all 12 games, all assets, all UI — must total **under 3 MB**. Every game is pure TypeScript/React with HTML5 Canvas or DOM-based rendering. No external game engines (no Phaser, no PixiJS, no Unity). No heavy asset files. All graphics are procedurally generated using Canvas API, SVG, or CSS. Audio is optional and must use Web Audio API synthesis (no .mp3/.wav files).

---

## Tech Stack

- **React 18+ with TypeScript** (same as rest of OS Browser)
- **HTML5 Canvas API** for arcade/board games
- **CSS + DOM** for card/puzzle games
- **TailwindCSS 3+** for the game center UI
- **Zustand** for game state + high scores
- **Web Audio API** for sound effects (synthesized, no audio files)
- **Framer Motion** for game center UI transitions only (not in-game)

---

## Design Direction

The game center has a distinctly **Ghanaian aesthetic** — warm earth tones, Adinkra-inspired patterns, kente-cloth color accents — but feels modern and polished, not clip-art-ish. Think: premium mobile game launcher meets Ghanaian cultural pride.

**Color palette for games:**
- Board surfaces: warm wood tones (`#8B6F47`, `#A0845C`, `#6B4E2E`)
- Game pieces: Ghana flag colors as accents (red `#CE1126`, gold `#FCD116`, green `#006B3F`)
- Card surfaces: cream (`#FAF6EE`) with gold trim
- Backgrounds: dark slate (`#1A1D27`) or warm dark wood (`#2C2318`)
- Text: clean white or cream on dark, dark brown on light
- Highlight/active: gold (`#FCD116`)

---

## File Structure

```
src/
├── renderer/
│   ├── pages/
│   │   └── GameCenter.tsx              # os://games main page
│   ├── components/
│   │   └── games/
│   │       ├── GameCenterLayout.tsx     # Grid layout, categories, search
│   │       ├── GameCard.tsx             # Game preview card in the catalog
│   │       ├── GameShell.tsx            # Wrapper: header bar, back button, score display
│   │       ├── GameOverModal.tsx        # Shared game over / win modal
│   │       ├── HighScoreBoard.tsx       # Per-game high score list
│   │       ├── GameSoundEngine.tsx      # Web Audio API synth for all games
│   │       │
│   │       ├── oware/
│   │       │   ├── OwareGame.tsx        # Main component
│   │       │   ├── owareLogic.ts        # Game rules engine
│   │       │   └── owareAI.ts           # Computer opponent (minimax)
│   │       │
│   │       ├── ludo/
│   │       │   ├── LudoGame.tsx
│   │       │   └── ludoLogic.ts
│   │       │
│   │       ├── chess/
│   │       │   ├── ChessGame.tsx
│   │       │   ├── chessLogic.ts
│   │       │   └── chessAI.ts
│   │       │
│   │       ├── checkers/
│   │       │   ├── CheckersGame.tsx
│   │       │   └── checkersLogic.ts
│   │       │
│   │       ├── solitaire/
│   │       │   ├── SolitaireGame.tsx
│   │       │   └── solitaireLogic.ts
│   │       │
│   │       ├── minesweeper/
│   │       │   ├── MinesweeperGame.tsx
│   │       │   └── minesweeperLogic.ts
│   │       │
│   │       ├── sudoku/
│   │       │   ├── SudokuGame.tsx
│   │       │   └── sudokuLogic.ts
│   │       │
│   │       ├── puzzle2048/
│   │       │   ├── Game2048.tsx
│   │       │   └── game2048Logic.ts
│   │       │
│   │       ├── snake/
│   │       │   ├── SnakeGame.tsx
│   │       │   └── snakeLogic.ts
│   │       │
│   │       ├── word-scramble/
│   │       │   ├── WordScrambleGame.tsx
│   │       │   └── wordBank.ts
│   │       │
│   │       ├── trivia/
│   │       │   ├── TriviaGame.tsx
│   │       │   └── triviaQuestions.ts
│   │       │
│   │       └── typing-speed/
│   │           ├── TypingSpeedGame.tsx
│   │           └── typingTexts.ts
│   │
│   └── stores/
│       └── useGameStore.ts             # High scores, play history, preferences
```

---

## Game Center Page (`os://games`)

### `GameCenter.tsx`

The main internal page. Registered in OS Browser's `os://` protocol router.

**Layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   ✦ GovPlay                                                     │
│   Take a break. Sharpen your mind.                               │
│                                                                  │
│   [🔍 Search games...]                                          │
│                                                                  │
│   [All] [Strategy] [Puzzles] [Cards] [Arcade] [Educational]     │
│                                                                  │
│   ── Strategy ───────────────────────────────────────────────    │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│   │ ♟ Oware     │ │ ♚ Chess     │ │ ⬡ Checkers  │              │
│   │ [Canvas     │ │ [Canvas     │ │ [Canvas     │              │
│   │  preview]   │ │  preview]   │ │  preview]   │              │
│   │ Ghana's own │ │ Classic     │ │ Dame        │              │
│   │ Best: 42    │ │ Best: 1842  │ │ 5 wins      │              │
│   └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                  │
│   ── Puzzles ────────────────────────────────────────────────    │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│   │ 🔢 Sudoku   │ │ 🎯 2048     │ │ 💣 Mine-    │              │
│   │ ...         │ │ ...         │ │  sweeper    │              │
│   └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                  │
│   ... (more categories)                                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Categories and game assignments:**

| Category | Games |
|----------|-------|
| Strategy | Oware, Chess, Checkers, Ludo |
| Puzzles | Sudoku, 2048, Minesweeper |
| Cards | Solitaire |
| Arcade | Snake |
| Educational | Word Scramble, Trivia Quiz, Typing Speed |

### `GameCard.tsx`

Each game's preview card in the catalog:

- Size: 200×240px card
- Top: Canvas-rendered mini preview of the game board/state (120px tall, live mini animation or static preview)
- Middle: Game name (14px weight 500) + short description (12px muted)
- Bottom: Best score or play stats + "Play" button
- Hover: subtle lift (translateY -2px), border brightens
- Click: opens the game in `GameShell`

### `GameShell.tsx`

Wrapper that frames every game with consistent UI:

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Back to GovPlay     Oware          Score: 24  |  Best: 42    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    [GAME CANVAS/DOM]                              │
│                                                                  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ [New Game]  [Undo] (if applicable)  [🔇/🔊]       [Difficulty ▾] │
└──────────────────────────────────────────────────────────────────┘
```

- Header: back button, game name, current score, best score
- Footer: context-sensitive controls (new game, undo, sound toggle, difficulty selector)
- The game component fills the middle area
- ESC key returns to game center

### `GameOverModal.tsx`

Shared modal for all games when a game ends:

```
┌────────────────────────────────┐
│                                │
│   [Adinkra symbol: Aya]        │
│                                │
│      You scored 2048!          │
│     🏆 New high score!        │
│                                │
│   ┌──────────┐ ┌────────────┐ │
│   │ Play     │ │ Back to    │ │
│   │ Again    │ │ GovPlay    │ │
│   └──────────┘ └────────────┘ │
│                                │
└────────────────────────────────┘
```

- Shows score, whether it's a new high score, and win/loss message
- "Play Again" restarts the game, "Back to GovPlay" returns to the catalog
- Uses the Aya (Endurance) Adinkra symbol as decoration

### `GameSoundEngine.ts`

A tiny Web Audio API synthesizer shared by all games. NO audio files — everything is synthesized.

```typescript
class GameSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  toggle(): void { this.enabled = !this.enabled; }
  isEnabled(): boolean { return this.enabled; }

  // Sound effects — all synthesized
  move(): void;         // Short click/tap: 800Hz sine, 30ms, quick fade
  capture(): void;      // Satisfying pop: 400→600Hz sine sweep, 80ms
  win(): void;          // Ascending arpeggio: C5→E5→G5→C6, 60ms each, sine
  lose(): void;         // Descending: C4→A3→F3, 80ms each, triangle wave
  error(): void;        // Low buzz: 200Hz square wave, 100ms
  tick(): void;         // Soft tick: noise burst 20ms (for timers)
  score(): void;        // Coin-like: 1200Hz→1600Hz sine, 50ms
  dice(): void;         // Short noise burst + low thump: for Ludo
  deal(): void;         // Quick swoosh: filtered noise sweep for cards
  type(): void;         // Key click: 3000Hz sine 10ms for typing game
}
```

Each sound is 3-10 lines of Web Audio API code. Total size of the entire sound engine: ~2 KB.

### `useGameStore.ts`

```typescript
interface GameState {
  // High scores per game (persisted to localStorage)
  highScores: Record<string, HighScore[]>;  // gameId → sorted scores

  // Play statistics
  stats: Record<string, GameStats>;         // gameId → stats

  // Preferences
  soundEnabled: boolean;
  lastPlayedGameId: string | null;

  // Actions
  addHighScore: (gameId: string, score: number, playerName?: string) => void;
  getHighScores: (gameId: string, limit?: number) => HighScore[];
  incrementStat: (gameId: string, stat: 'played' | 'won' | 'lost') => void;
  getStats: (gameId: string) => GameStats;
  toggleSound: () => void;
  setLastPlayed: (gameId: string) => void;
}

interface HighScore {
  score: number;
  playerName: string;   // From GovChat profile or "Player"
  date: number;
}

interface GameStats {
  played: number;
  won: number;
  lost: number;
  bestScore: number;
  totalTimePlayed: number;  // seconds
}
```

Persist to `localStorage` under key `govchat-game-scores`. Keep max 10 high scores per game.

---

## The 12 Games — Complete Specifications

---

### GAME 1: Oware (Flagship — Ghana's National Board Game)

**Category:** Strategy
**Size budget:** ~30 KB
**Render:** HTML5 Canvas

This is the **crown jewel** of GovPlay. Every Ghanaian knows Oware. A beautifully rendered version will make OS Browser feel authentically Ghanaian.

**Rules (Abapa variation — most common in Ghana):**
- 2 players, 12 pits (6 per side) + 2 scoring houses
- Each pit starts with 4 seeds (48 seeds total)
- On your turn, pick up all seeds from one of your pits and sow counterclockwise, one seed per pit
- If the last seed lands in an opponent's pit that now contains 2 or 3 seeds, capture those seeds
- Continue capturing backwards from the landing pit while consecutive opponent pits have 2 or 3 seeds
- You MUST make a move that feeds your opponent if they have no seeds (forced feed rule)
- Game ends when one player has captured 25+ seeds, or the remaining seeds cycle endlessly
- Player with more captured seeds wins

**Canvas rendering:**
- Board: rounded rectangle with rich dark wood texture (procedural — use Canvas gradients + noise)
- Pits: 12 circular depressions with subtle inner shadows
- Seeds: small circles with slight 3D effect (radial gradient). Use earth tones: browns, dark reds, warm grays
- Scoring houses: larger semicircles at each end
- Seed count: number displayed in each pit
- Animation: seeds sowing one-by-one with a 100ms delay per pit (smooth arc path using quadratic Bezier)
- Capture animation: seeds fly from pit to scoring house with a satisfying curve
- Player labels: "You" (bottom) and "Computer" (top), or "Player 1" / "Player 2"

**AI opponent (`owareAI.ts`):**
- Minimax algorithm with alpha-beta pruning
- Depth: 8-10 plies (Oware has a branching factor of ~6, so this is fast)
- Evaluation function: captured seeds differential + board control (seeds on your side)
- Three difficulty levels:
  - Easy: random moves with occasional smart moves (30% best move)
  - Medium: minimax depth 4
  - Hard: minimax depth 8+ with the full evaluation function

**Controls:**
- Click on any of your 6 pits to sow
- Invalid moves (empty pit, would starve opponent without alternative) show a subtle red flash
- "New Game" and "Undo" buttons in the footer

**Multiplayer hook (future):**
- The game logic is structured to support a `GameMode: 'local' | 'ai' | 'online'`
- For `'online'` mode (future integration with GovChat): moves are serialized as `{ pit: number }` and sent as Matrix room events
- For now, only implement `'local'` (2 players same device) and `'ai'`

---

### GAME 2: Ludo

**Category:** Strategy
**Size budget:** ~25 KB
**Render:** HTML5 Canvas

**Rules:**
- 2-4 players, standard Ludo rules
- Roll a 6 to leave the starting area
- First player to get all 4 tokens home wins
- Landing on an opponent's token sends it back to start
- Rolling a 6 gives an extra turn
- Safe squares exist at each colored entry point

**Canvas rendering:**
- Board: classic cross-shaped Ludo board, drawn procedurally
- Four quadrant colors: red, blue, green, yellow (use Ghana-warm versions of these)
- Tokens: circles with player color and a number (1-4)
- Dice: 3D-looking die with dots, animated roll (rotate + bounce, 500ms)
- Path highlighting: when a token is selected, show the projected landing square
- Current player indicator: glowing border around their home area

**AI:** Simple probabilistic — always moves the token that benefits most (prioritize captures, then advancing the furthest-back token, then leaving start)

**Players:** 2-4 (human or AI for each). Player count selector before game starts.

---

### GAME 3: Chess

**Category:** Strategy
**Size budget:** ~40 KB
**Render:** HTML5 Canvas

**Rules:** Standard chess, all rules including castling, en passant, pawn promotion, stalemate, 50-move rule, threefold repetition.

**Canvas rendering:**
- Board: 8×8 grid, alternating cream (`#F0E6C0`) and warm brown (`#8B6F47`) squares
- Pieces: drawn as clean SVG-style vector shapes directly on Canvas using `Path2D`. NOT Unicode characters. NOT images. Each piece is a programmatic drawing:
  - King: cross on top of a dome on a base
  - Queen: crown with 5 points on a base
  - Rook: castle crenellations on a base
  - Bishop: mitre (pointed hat) on a base
  - Knight: horse head silhouette on a base
  - Pawn: simple round head on a narrow body on a base
- Colors: white pieces are cream with dark outline, black pieces are dark charcoal with gold outline
- Selected piece: square highlighted gold
- Valid moves: shown as dots (empty squares) or red corners (capture squares)
- Last move: highlighted with subtle blue tint on both squares
- Check indicator: king's square flashes red
- Captured pieces: shown in a row beside the board

**AI (`chessAI.ts`):**
- Minimax with alpha-beta pruning
- Depth: Easy (2), Medium (4), Hard (5-6)
- Evaluation: material count + piece-square tables (positional bonuses for each piece type per square)
- Move ordering: captures first, then checks, then others (dramatically improves alpha-beta pruning)
- Opening book: hardcode 10-15 common openings (first 4-6 moves) for the hard AI to feel natural

---

### GAME 4: Checkers (Dame)

**Category:** Strategy
**Size budget:** ~15 KB
**Render:** HTML5 Canvas

**Rules:** International draughts (10×10 board, mandatory captures, kings can fly/move multiple squares). If you prefer the 8×8 version, use standard American checkers rules.

**Canvas rendering:**
- Board: 8×8 (or 10×10) alternating dark green and cream squares
- Pieces: flat circles with rim shadow. Red and black (or green and gold for Ghana theme).
- Kings: piece with a crown symbol drawn on top
- Valid moves: dots. Mandatory captures highlighted with pulsing indicator.
- Capture chain: animate piece hopping across multiple captured pieces

**AI:** Minimax depth 6-8 (checkers has a low branching factor, so this is fast). Evaluation: piece count + kings count × 1.5 + positional advancement.

---

### GAME 5: Solitaire (Klondike)

**Category:** Cards
**Size budget:** ~25 KB
**Render:** DOM + CSS (cards are styled divs, not Canvas)

**Rules:** Standard Klondike solitaire. Draw 1 card (easy) or draw 3 (hard) from the stock.

**Card rendering (CSS-only — no images):**
- Cards are 70×100px rounded rectangles with white bg, subtle shadow
- Suit symbols rendered as CSS/Unicode: ♠ ♥ ♦ ♣
- Red suits (♥♦) in `#CE1126`, black suits (♠♣) in `#1A1D27`
- Card value (A, 2-10, J, Q, K) in top-left and bottom-right corners
- Face cards: just the letter (J, Q, K) in a larger font with a crown/shield decorative accent — no illustrated faces
- Card backs: dark background with a repeating small Adinkra symbol pattern (Dwennimmen) in gold, CSS-only using `background-image: repeating-linear-gradient(...)` or a tiny inline SVG pattern
- Drag and drop: CSS transforms for smooth dragging. Cards fan out in tableau columns.

**Interactions:**
- Click stock to draw
- Drag cards between tableau columns, to foundations, or from waste pile
- Double-click a card to auto-move to foundation if valid
- Auto-complete: when all cards are face-up and can be moved to foundations, animate them flying up one by one

**Scoring:** Standard Klondike scoring. Timer display. Move counter.

---

### GAME 6: Minesweeper

**Category:** Puzzles
**Size budget:** ~10 KB
**Render:** DOM + CSS grid

**Rules:** Standard Minesweeper. Click to reveal, right-click to flag. Numbers show adjacent mine count. Reveal all non-mine cells to win.

**Grid sizes:**
- Easy: 9×9, 10 mines
- Medium: 16×16, 40 mines
- Hard: 30×16, 99 mines

**Rendering:**
- Grid of square cells (24×24px each)
- Unrevealed: raised button look (subtle gradient top-light)
- Revealed: flat, light background
- Numbers 1-8: each a different color (1=blue, 2=green, 3=red, 4=navy, 5=maroon, 6=teal, 7=black, 8=gray)
- Mines: simple circle with spikes (drawn with CSS borders or a tiny SVG)
- Flag: small triangle on a stick (CSS or Unicode 🚩)
- Smiley face button at top: 😊 (playing), 😎 (won), 💀 (lost) — using emoji
- Mine counter (top left) and timer (top right) in retro LED-style font

**First click is always safe** (generate board after first click, ensuring no mine on clicked cell).

---

### GAME 7: Sudoku

**Category:** Puzzles
**Size budget:** ~15 KB
**Render:** DOM + CSS grid

**Puzzle generation (`sudokuLogic.ts`):**
- Generate a complete valid 9×9 solution using backtracking
- Remove cells to create a puzzle:
  - Easy: 35-40 given digits
  - Medium: 28-34 given digits
  - Hard: 22-27 given digits
- Ensure unique solution (check by solving after each removal — if multiple solutions exist, put the digit back)

**Rendering:**
- 9×9 grid with 3×3 subgrid borders (thicker lines)
- Given digits: dark, weight 600
- Player-entered digits: blue, weight 400
- Selected cell: gold highlight
- Conflicting digits (same row/col/box): red highlight
- Notes mode: small 1-9 in a 3×3 micro-grid within the cell (pencil marks)

**Controls:**
- Click cell to select
- Type 1-9 to enter digit
- Press 0 or Backspace to clear
- "Notes" toggle button — when on, typed digits become pencil marks
- "Check" button — highlights all incorrect entries in red
- "Hint" button — fills in one correct cell (limit 3 hints per game)
- Timer + mistake counter

---

### GAME 8: 2048

**Category:** Puzzles
**Size budget:** ~10 KB
**Render:** DOM + CSS (animated tiles)

**Rules:** Standard 2048. Swipe/arrow keys to slide all tiles in one direction. Matching tiles merge. Reach 2048 to win (can continue playing beyond).

**Rendering:**
- 4×4 grid on a rounded background
- Tiles: rounded squares with number and color based on value:
  - 2: cream, dark text
  - 4: light tan
  - 8: orange
  - 16: deep orange
  - 32: coral red
  - 64: bright red
  - 128: gold yellow
  - 256: gold
  - 512: bright gold
  - 1024: warm gold with subtle glow
  - 2048: GOLD with Ghana-flag green border (celebration!)
  - 4096+: dark with gold text
- Tile animations: slide with CSS transitions (150ms ease-out), new tiles pop in with scale animation (0→1, 100ms)
- Merge animation: brief scale-up bounce (1→1.2→1, 150ms)

**Controls:** Arrow keys or WASD. Swipe gestures (for future touch support). Undo button (stores last move).

**Score:** Current score + best score. Each merge adds the resulting tile's value to the score.

---

### GAME 9: Snake

**Category:** Arcade
**Size budget:** ~8 KB
**Render:** HTML5 Canvas

**Rules:** Classic Snake. Eat food to grow. Don't hit walls or yourself. Speed increases as score increases.

**Canvas rendering:**
- Grid-based board (20×20 cells on a ~400×400px canvas)
- Snake: chain of rounded squares. Head is slightly larger with two dot eyes. Body segments are solid green (Ghana green `#006B3F`) with a slightly lighter segment every 3rd piece for visual rhythm.
- Food: red circle (apple-like) with a tiny stem drawn on canvas
- Background: very dark green grid lines on black
- Score and speed display above the canvas

**Difficulty:**
- Initial speed: 150ms per frame
- Speed increases by 5ms every 5 food items eaten
- Maximum speed: 60ms per frame

**Controls:** Arrow keys or WASD. Prevent 180° reversal (can't go directly backwards).

---

### GAME 10: Word Scramble

**Category:** Educational
**Size budget:** ~20 KB (mostly the word bank)
**Render:** DOM + CSS

**Gameplay:**
- A scrambled word is displayed as jumbled letter tiles
- Player rearranges the letters to form the correct word
- Timer counts down (60 seconds per word on Easy, 30 on Hard)
- Score: points based on word length × time remaining
- Streak bonus: consecutive correct answers multiply the score

**Word bank (`wordBank.ts`):**
Include ~200 words across categories:
- **English common words** (50): government, parliament, democracy, education, agriculture, technology, development, constitution, etc.
- **Twi words** (30): akwaaba (welcome), medaase (thank you), ɛyɛ (good), adwuma (work), etc. — with English meanings shown
- **Ghana geography** (30): Kumasi, Tamale, Accra, Volta, Ashanti, etc.
- **Ghana history** (30): Nkrumah, independence, republic, cocoa, goldcoast, etc.
- **Civil service terms** (30): procurement, budget, circular, gazette, ministry, etc.
- **General knowledge** (30): science, mathematics, computer, internet, browser, etc.

**Rendering:**
- Letter tiles: 44×44px squares, rounded, with the letter in 20px bold
- Tiles can be dragged to reorder OR clicked to select + click position to place
- Scrambled display (top) → Answer slots (bottom)
- Category label shown above the word
- If it's a Twi word, show "Twi: [meaning]" after solving

---

### GAME 11: Ghana Trivia Quiz

**Category:** Educational
**Size budget:** ~25 KB (mostly the question bank)
**Render:** DOM + CSS

**Gameplay:**
- Multiple choice quiz (4 options per question)
- 10 questions per round
- Timer: 15 seconds per question
- Score: 10 points per correct answer + bonus points for speed (up to 5 extra for answering in under 3 seconds)
- At the end: show score, correct answers review, fun fact for each wrong answer

**Question bank (`triviaQuestions.ts`):**
Include 150+ questions across categories:
- **Ghana History** (30): "When did Ghana gain independence?" → 1957. "Who was the first president?" → Kwame Nkrumah. "What was Ghana called before independence?" → Gold Coast. Etc.
- **Ghana Geography** (25): "What is the largest lake in Ghana?" → Lake Volta. "Which region is Kumasi in?" → Ashanti. Etc.
- **Ghana Culture** (25): "What does the Adinkra symbol Gye Nyame mean?" → Supremacy of God. "What is the main ingredient in fufu?" → Cassava and plantain. Etc.
- **Government & Civics** (25): "How many regions does Ghana have?" → 16. "What document is the supreme law of Ghana?" → The 1992 Constitution. Etc.
- **Science & Technology** (20): "What does CPU stand for?" → Central Processing Unit. Basic digital literacy questions relevant for civil servants.
- **World Knowledge** (25): Mix of general knowledge questions.

Each question object:
```typescript
interface TriviaQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;    // 0-3
  category: string;
  funFact?: string;        // Shown after answering
  difficulty: 'easy' | 'medium' | 'hard';
}
```

**Rendering:**
- Question card centered on screen
- 4 option buttons in a 2×2 grid
- Timer bar at top (green → yellow → red as time runs out)
- Correct answer: button flashes green with checkmark
- Wrong answer: selected button flashes red, correct button flashes green
- Progress dots at bottom (10 dots, filled as you progress)
- End screen: score out of 100, category breakdown, "Play Again" button

---

### GAME 12: Typing Speed Test

**Category:** Educational
**Size budget:** ~15 KB (mostly the text samples)
**Render:** DOM + CSS

**Gameplay:**
- A passage of text is displayed
- Player types it as fast and accurately as possible
- Real-time WPM (words per minute) counter
- Accuracy percentage
- Duration: 30 seconds (quick), 60 seconds (standard), 120 seconds (marathon)
- Characters turn green as correctly typed, red for errors

**Text samples (`typingTexts.ts`):**
Include 30+ passages:
- **Ghana-related paragraphs** (10): excerpts about Ghana's history, geography, government structure. E.g., "The Republic of Ghana is a country along the Gulf of Guinea and the Atlantic Ocean in West Africa. Spanning a land mass of 238,535 square kilometres, Ghana is bordered by..."
- **Civil service text** (10): passages about public administration, governance, policy. E.g., "The Office of the Head of Civil Service is responsible for the management and coordination of the Ghana Civil Service. Civil servants play a critical role in..."
- **Technology text** (5): about digital literacy, computing basics. E.g., "A web browser is a software application used to access information on the World Wide Web. Each individual web page is identified by a unique URL..."
- **Classic typing exercises** (5): pangrams, common word sequences. E.g., "The quick brown fox jumps over the lazy dog."

**Rendering:**
- Text display area: large, well-spaced monospace font on a dark background
- Current position: blinking cursor
- Typed correctly: character turns green
- Typed incorrectly: character turns red with underline
- Not yet typed: dim gray
- Stats bar below: WPM (large number), Accuracy %, Characters typed, Time remaining
- WPM calculation: (correctly typed characters / 5) / minutes elapsed
- End screen: final WPM, accuracy, comparison ("Faster than 70% of players" — based on stored high scores)

---

## Feature Registry Integration

Register GovPlay in the Kente Sidebar's Feature Registry:

```typescript
const govPlayFeature: FeatureDefinition = {
  id: 'govplay',
  name: 'GovPlay',
  description: 'Games and brain teasers',
  stripColor: '#D4537E',        // Pink strip color
  icon: Gamepad2,               // lucide-react icon
  category: 'productivity',     // Yes, brain breaks are productive
  defaultEnabled: true,
  internalPageUrl: 'os://games',
  surfaces: {
    sidebar: {
      panelComponent: GovPlayQuickPanel,  // Shows "Quick Play" with last played + top 3 games
      order: 8,                           // After Payments, before Settings
    },
    commandBar: [
      { id: 'open-games', label: 'Open GovPlay', description: 'Games and brain teasers', keywords: ['games', 'play', 'fun', 'break', 'relax'], action: () => navigateTo('os://games') },
      { id: 'play-oware', label: 'Play Oware', keywords: ['oware', 'mancala', 'board', 'ghana', 'strategy'], action: () => navigateTo('os://games/oware') },
      { id: 'play-chess', label: 'Play Chess', keywords: ['chess', 'strategy', 'board'], action: () => navigateTo('os://games/chess') },
      { id: 'play-ludo', label: 'Play Ludo', keywords: ['ludo', 'dice', 'board'], action: () => navigateTo('os://games/ludo') },
      { id: 'play-solitaire', label: 'Play Solitaire', keywords: ['solitaire', 'cards', 'klondike'], action: () => navigateTo('os://games/solitaire') },
      { id: 'play-2048', label: 'Play 2048', keywords: ['2048', 'puzzle', 'numbers'], action: () => navigateTo('os://games/2048') },
      { id: 'play-sudoku', label: 'Play Sudoku', keywords: ['sudoku', 'puzzle', 'numbers'], action: () => navigateTo('os://games/sudoku') },
      { id: 'play-snake', label: 'Play Snake', keywords: ['snake', 'arcade', 'classic', 'nokia'], action: () => navigateTo('os://games/snake') },
      { id: 'play-minesweeper', label: 'Play Minesweeper', keywords: ['minesweeper', 'mines', 'puzzle'], action: () => navigateTo('os://games/minesweeper') },
      { id: 'play-trivia', label: 'Ghana Trivia Quiz', keywords: ['trivia', 'quiz', 'ghana', 'history', 'questions'], action: () => navigateTo('os://games/trivia') },
      { id: 'play-typing', label: 'Typing Speed Test', keywords: ['typing', 'speed', 'wpm', 'keyboard', 'practice'], action: () => navigateTo('os://games/typing') },
      { id: 'play-words', label: 'Word Scramble', keywords: ['word', 'scramble', 'anagram', 'twi', 'english'], action: () => navigateTo('os://games/word-scramble') },
      { id: 'play-checkers', label: 'Play Checkers', keywords: ['checkers', 'dame', 'draughts', 'board'], action: () => navigateTo('os://games/checkers') },
    ],
  },
};
```

### `GovPlayQuickPanel.tsx` (Sidebar panel)

A compact sidebar panel for quick access:

```
┌──────────────────────────────┐
│ ● GovPlay             [→]   │
├──────────────────────────────┤
│                              │
│ Continue playing             │
│ ┌──────────────────────────┐ │
│ │ ♟ Oware   Score: 18     │ │  ← Last played game (click to resume)
│ └──────────────────────────┘ │
│                              │
│ Quick play                   │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ 🐍   │ │ 🔢   │ │ 💣   │ │  ← Top 3 most played games
│ │Snake │ │Sudoku│ │Mines │ │
│ └──────┘ └──────┘ └──────┘ │
│                              │
│ [Open GovPlay →]             │  ← Opens os://games
│                              │
└──────────────────────────────┘
```

---

## Size Verification

After building all 12 games, verify the total size:

```bash
# Check the size of all game files
find src/renderer/components/games -type f | xargs wc -c | tail -1

# After build, check in the output
find dist/ -path "*/games/*" -type f | xargs du -ch | tail -1
```

The total MUST be under 3 MB. If any individual game exceeds its budget:
- Reduce word/question banks (use fewer but higher quality entries)
- Simplify Canvas rendering (fewer gradient stops, simpler shapes)
- Use shorter variable names in logic files after minification handles it

**Expected sizes after minification + bundling:**

| Game | Raw TS | Minified |
|------|--------|----------|
| Oware | ~25 KB | ~8 KB |
| Ludo | ~20 KB | ~7 KB |
| Chess | ~40 KB | ~15 KB |
| Checkers | ~12 KB | ~5 KB |
| Solitaire | ~22 KB | ~8 KB |
| Minesweeper | ~8 KB | ~3 KB |
| Sudoku | ~12 KB | ~5 KB |
| 2048 | ~8 KB | ~3 KB |
| Snake | ~6 KB | ~2 KB |
| Word Scramble | ~18 KB | ~12 KB (word bank) |
| Trivia | ~25 KB | ~18 KB (question bank) |
| Typing Speed | ~15 KB | ~10 KB (text samples) |
| Game Center UI | ~15 KB | ~5 KB |
| Sound Engine | ~2 KB | ~1 KB |
| Store | ~3 KB | ~1 KB |
| **TOTAL** | **~231 KB** | **~103 KB** |

Even with generous overhead, the entire game system should be **well under 500 KB minified** — less than a single JPEG photo.

---

## Build Order

1. **Shared infrastructure**: GameSoundEngine, useGameStore, GameShell, GameOverModal, GameCard, GameCenterLayout
2. **Oware** (flagship — build this first and make it beautiful)
3. **Chess** (most complex logic)
4. **Checkers** (simpler version of Chess rendering)
5. **Ludo** (unique board shape)
6. **Solitaire** (card rendering system)
7. **Minesweeper** (quick to build)
8. **Sudoku** (puzzle generation is the interesting part)
9. **2048** (quick to build)
10. **Snake** (quick to build)
11. **Word Scramble** (focus on the word bank quality)
12. **Trivia Quiz** (focus on the question bank quality)
13. **Typing Speed** (focus on the text samples)
14. **Game Center page** (`os://games`) and Feature Registry integration
15. **GovPlayQuickPanel** (sidebar panel)

Build all 12 games now. Start with the shared infrastructure, then Oware. Make every game complete, polished, and fun. The games should feel like they were designed by a professional game studio — not thrown together as an afterthought. Oware especially should be something a Ghanaian sees and says "they got this right."
