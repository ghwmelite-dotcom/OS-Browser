# GovPlay Mobile Games — Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 mobile-friendly games (2048, Snake, Minesweeper, Ghana Trivia) for the OS Mini app, touch-optimized for Android.

**Architecture:** Reuse pure logic files from the desktop app verbatim. Build new React Native rendering components with touch/swipe controls. Each game is a standalone screen navigated from a GovPlay launcher. Games push via OTA update — no new APK needed.

**Tech Stack:** React Native, TypeScript, Zustand (score persistence), gesture handling (PanResponder/touch events), Animated API for transitions.

---

## File Structure

```
os-browser-mobile/src/
├── games/
│   ├── GovPlayScreen.tsx          [Game launcher: grid of games, scores]
│   ├── GameShell.tsx              [Wrapper: header, back, score, new game]
│   ├── game2048/
│   │   ├── game2048Logic.ts       [COPY from desktop — pure logic]
│   │   └── Game2048Screen.tsx     [RN rendering: grid + swipe]
│   ├── snake/
│   │   ├── snakeLogic.ts          [COPY from desktop — pure logic]
│   │   └── SnakeScreen.tsx        [RN rendering: canvas-like grid + swipe]
│   ├── minesweeper/
│   │   ├── minesweeperLogic.ts    [COPY from desktop — pure logic]
│   │   └── MinesweeperScreen.tsx  [RN rendering: grid + tap/long-press]
│   └── trivia/
│       ├── triviaQuestions.ts     [COPY from desktop — question bank]
│       └── TriviaScreen.tsx       [RN rendering: question + 4 options]
├── store/
│   └── gameScores.ts              [Zustand: best scores, times played]
```

**Modify:**
- `os-browser-mobile/App.tsx` — Add GovPlay tab navigation
- `os-browser-mobile/src/screens/GovHubScreen.tsx` — Link game cards to actual games
- `os-browser-mobile/src/screens/BrowserScreen.tsx` — Link feature shortcut to GovPlay

---

## Task 1: Game Score Store + Game Shell

**Files:**
- Create: `os-browser-mobile/src/store/gameScores.ts`
- Create: `os-browser-mobile/src/games/GameShell.tsx`

- [ ] **Step 1: Create game score store**

```typescript
// gameScores.ts — Zustand store for game stats
// Fields: bestScore, timesPlayed, lastPlayed per gameId
// Persisted to AsyncStorage via mmkvStorage adapter
```

- [ ] **Step 2: Create GameShell wrapper component**

```typescript
// GameShell.tsx — Wraps every game screen
// Props: title, score, gameId, onBack, onNewGame, children
// Header: back arrow + title + score display
// Footer: New Game button
// Kente color accent based on game
```

- [ ] **Step 3: Commit**

```bash
git add os-browser-mobile/src/store/gameScores.ts os-browser-mobile/src/games/GameShell.tsx
git commit -m "feat(games): score store + GameShell wrapper"
```

---

## Task 2: GovPlay Launcher Screen

**Files:**
- Create: `os-browser-mobile/src/games/GovPlayScreen.tsx`

- [ ] **Step 1: Build game launcher**

Grid of game cards (2 columns) with:
- Emoji icon, name, best score badge
- Tap → navigate to game screen
- Kente-themed header with "GovPlay" title
- Category tabs: All, Puzzles, Arcade, Quiz

- [ ] **Step 2: Wire into App.tsx navigation**

Add `GovPlayScreen` as a sub-screen that overlays when accessed from GovHub game cards or the Browse feature shortcuts. Use a state flag in App.tsx: `activeGame: string | null`.

- [ ] **Step 3: Commit**

```bash
git add os-browser-mobile/src/games/GovPlayScreen.tsx os-browser-mobile/App.tsx
git commit -m "feat(games): GovPlay launcher screen"
```

---

## Task 3: 2048 Game

**Files:**
- Copy: `packages/renderer/src/components/games/puzzle2048/game2048Logic.ts` → `os-browser-mobile/src/games/game2048/game2048Logic.ts`
- Create: `os-browser-mobile/src/games/game2048/Game2048Screen.tsx`

- [ ] **Step 1: Copy logic file verbatim from desktop**

The logic is pure TypeScript, zero DOM dependencies. Copy as-is.

- [ ] **Step 2: Build React Native renderer**

- 4x4 grid using `View` with `flexDirection: 'row'` + `flexWrap: 'wrap'`
- Tile colors: value-based palette (2=light, 4=tan, 8=orange... 2048=gold)
- Swipe detection via `PanResponder` (threshold 30px)
- Animated tile appearance (scale spring 0→1)
- Score display in GameShell header
- Game over / You win modal overlay
- Undo button (stores previous state)

- [ ] **Step 3: Test on device**

Verify: swipe all 4 directions, tiles merge correctly, score updates, game over triggers, new game resets.

- [ ] **Step 4: Commit**

```bash
git add os-browser-mobile/src/games/game2048/
git commit -m "feat(games): 2048 — swipe-based tile puzzle"
```

---

## Task 4: Snake Game

**Files:**
- Copy: `packages/renderer/src/components/games/snake/snakeLogic.ts` → `os-browser-mobile/src/games/snake/snakeLogic.ts`
- Create: `os-browser-mobile/src/games/snake/SnakeScreen.tsx`

- [ ] **Step 1: Copy logic file from desktop**

- [ ] **Step 2: Build React Native renderer**

- 20x20 grid rendered as View grid (not Canvas — RN doesn't have native Canvas)
- Each cell is a small colored View (snake=green gradient, food=red, empty=dark)
- Swipe controls via PanResponder for direction
- On-screen D-pad buttons as alternative input (up/down/left/right)
- Game loop via `setInterval` at snake speed
- Head segment distinguished with different shade
- Score + speed display in header
- Game starts on first swipe

- [ ] **Step 3: Performance optimization**

- Use `React.memo` on grid cells to prevent full re-renders
- Only re-render cells that changed (snake head/tail + food)
- Keep state in ref, trigger render via setState counter

- [ ] **Step 4: Commit**

```bash
git add os-browser-mobile/src/games/snake/
git commit -m "feat(games): Snake — swipe + d-pad controls"
```

---

## Task 5: Minesweeper Game

**Files:**
- Copy: `packages/renderer/src/components/games/minesweeper/minesweeperLogic.ts` → `os-browser-mobile/src/games/minesweeper/minesweeperLogic.ts`
- Create: `os-browser-mobile/src/games/minesweeper/MinesweeperScreen.tsx`

- [ ] **Step 1: Copy logic file from desktop**

- [ ] **Step 2: Build React Native renderer**

- Grid sized by difficulty: Easy 9x9, Medium 16x16 (scrollable)
- Tap to reveal cell, long-press to flag
- Number colors: 1=blue, 2=green, 3=red, 4=purple, 5=maroon, 6=teal, 7=black, 8=gray
- Mine = red circle, flag = gold flag icon
- Revealed cells: lighter background, unrevealed: darker raised surface
- Difficulty selector: Easy/Medium/Hard in GameShell footer
- Timer display
- First tap is always safe (generate board after first tap)

- [ ] **Step 3: Commit**

```bash
git add os-browser-mobile/src/games/minesweeper/
git commit -m "feat(games): Minesweeper — tap reveal, long-press flag"
```

---

## Task 6: Ghana Trivia Game

**Files:**
- Copy: `packages/renderer/src/components/games/trivia/triviaQuestions.ts` → `os-browser-mobile/src/games/trivia/triviaQuestions.ts`
- Create: `os-browser-mobile/src/games/trivia/TriviaScreen.tsx`

- [ ] **Step 1: Copy question bank from desktop**

- [ ] **Step 2: Build React Native renderer**

- Question card with category badge + question text
- 4 option buttons in a 2x2 grid
- Tap to answer: correct = green flash + score, wrong = red flash + show correct
- Fun fact reveal after each question
- Progress bar (question X of 20)
- 15-second countdown timer per question
- Difficulty filter: Easy/Medium/Hard
- End screen: score summary with Kente gold/green/red tiers
- Share score button (copy to clipboard)

- [ ] **Step 3: Commit**

```bash
git add os-browser-mobile/src/games/trivia/
git commit -m "feat(games): Ghana Trivia — quiz with timer + fun facts"
```

---

## Task 7: Integration + OTA Push

**Files:**
- Modify: `os-browser-mobile/src/screens/GovHubScreen.tsx`
- Modify: `os-browser-mobile/src/screens/BrowserScreen.tsx`

- [ ] **Step 1: Update GovHub game cards to navigate to GovPlay**

Replace "desktop only" note with working navigation to the game launcher.

- [ ] **Step 2: Update BrowserScreen feature shortcuts**

GovPlay shortcut navigates to game launcher.

- [ ] **Step 3: Push OTA update**

```bash
cd os-browser-mobile
eas update --channel production --environment production --platform android --message "feat: GovPlay Batch 1 — 2048, Snake, Minesweeper, Ghana Trivia"
```

- [ ] **Step 4: Commit + push to GitHub**

```bash
git add -A
git commit -m "feat: GovPlay mobile Batch 1 — 4 games + launcher"
git push origin main
```
