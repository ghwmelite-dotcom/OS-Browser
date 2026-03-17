// ── Solitaire (Klondike) Logic Engine ───────────────────────────────

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Color = 'red' | 'black';

export interface Card {
  suit: Suit;
  rank: number; // 1=Ace, 2-10, 11=Jack, 12=Queen, 13=King
  faceUp: boolean;
  id: string;
}

export type DrawMode = 1 | 3;

export interface SolitaireState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][]; // 4 piles (spades, hearts, diamonds, clubs)
  tableau: Card[][]; // 7 columns
  drawMode: DrawMode;
  moves: number;
  score: number;
}

// ── Card Helpers ────────────────────────────────────────────────────

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spades': return '\u2660';
    case 'hearts': return '\u2665';
    case 'diamonds': return '\u2666';
    case 'clubs': return '\u2663';
  }
}

export function rankLabel(rank: number): string {
  switch (rank) {
    case 1: return 'A';
    case 11: return 'J';
    case 12: return 'Q';
    case 13: return 'K';
    default: return String(rank);
  }
}

export function cardColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, faceUp: false, id: `${suit}-${rank}` });
    }
  }
  return deck;
}

function shuffle(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ── State Clone ─────────────────────────────────────────────────────

export function cloneState(state: SolitaireState): SolitaireState {
  return {
    stock: state.stock.map((c) => ({ ...c })),
    waste: state.waste.map((c) => ({ ...c })),
    foundations: state.foundations.map((pile) => pile.map((c) => ({ ...c }))),
    tableau: state.tableau.map((col) => col.map((c) => ({ ...c }))),
    drawMode: state.drawMode,
    moves: state.moves,
    score: state.score,
  };
}

// ── Initialize ──────────────────────────────────────────────────────

export function initGame(drawMode: DrawMode = 1): SolitaireState {
  const deck = shuffle(createDeck());
  const tableau: Card[][] = [];
  let idx = 0;

  // Deal 7 tableau columns: column i gets i+1 cards, last face up
  for (let i = 0; i < 7; i++) {
    const col: Card[] = [];
    for (let j = 0; j <= i; j++) {
      const card = { ...deck[idx++] };
      card.faceUp = j === i;
      col.push(card);
    }
    tableau.push(col);
  }

  // Remaining cards go to stock (face down)
  const stock = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));

  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    drawMode,
    moves: 0,
    score: 0,
  };
}

// ── Draw from Stock ─────────────────────────────────────────────────

export function drawFromStock(state: SolitaireState): SolitaireState {
  const s = cloneState(state);

  if (s.stock.length === 0) {
    // Recycle waste back to stock
    if (s.waste.length === 0) return s;
    s.stock = s.waste.reverse().map((c) => ({ ...c, faceUp: false }));
    s.waste = [];
    s.score = Math.max(0, s.score - 20); // penalty for recycling
    return s;
  }

  const count = Math.min(s.drawMode, s.stock.length);
  for (let i = 0; i < count; i++) {
    const card = s.stock.pop()!;
    card.faceUp = true;
    s.waste.push(card);
  }

  return s;
}

// ── Foundation Helpers ──────────────────────────────────────────────

function foundationIndex(suit: Suit): number {
  return SUITS.indexOf(suit);
}

function canMoveToFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}

// ── Tableau Helpers ─────────────────────────────────────────────────

function canPlaceOnTableau(card: Card, column: Card[]): boolean {
  if (column.length === 0) return card.rank === 13; // Only Kings on empty
  const top = column[column.length - 1];
  if (!top.faceUp) return false;
  return cardColor(card.suit) !== cardColor(top.suit) && card.rank === top.rank - 1;
}

// ── Moves ───────────────────────────────────────────────────────────

/** Move waste top card to foundation */
export function wasteToFoundation(state: SolitaireState): SolitaireState | null {
  if (state.waste.length === 0) return null;
  const card = state.waste[state.waste.length - 1];
  const fi = foundationIndex(card.suit);
  if (!canMoveToFoundation(card, state.foundations[fi])) return null;

  const s = cloneState(state);
  const moved = s.waste.pop()!;
  s.foundations[fi].push(moved);
  s.moves++;
  s.score += 10;
  return s;
}

/** Move waste top card to tableau column */
export function wasteToTableau(state: SolitaireState, colIdx: number): SolitaireState | null {
  if (state.waste.length === 0) return null;
  const card = state.waste[state.waste.length - 1];
  if (!canPlaceOnTableau(card, state.tableau[colIdx])) return null;

  const s = cloneState(state);
  const moved = s.waste.pop()!;
  s.tableau[colIdx].push(moved);
  s.moves++;
  s.score += 5;
  return s;
}

/** Move tableau card(s) to another tableau column */
export function tableauToTableau(
  state: SolitaireState,
  fromCol: number,
  cardIndex: number,
  toCol: number,
): SolitaireState | null {
  const fromColumn = state.tableau[fromCol];
  if (cardIndex < 0 || cardIndex >= fromColumn.length) return null;
  if (!fromColumn[cardIndex].faceUp) return null;

  const movingCards = fromColumn.slice(cardIndex);
  if (!canPlaceOnTableau(movingCards[0], state.tableau[toCol])) return null;

  const s = cloneState(state);
  s.tableau[fromCol] = s.tableau[fromCol].slice(0, cardIndex);

  // Flip the new top card if needed
  const newFrom = s.tableau[fromCol];
  if (newFrom.length > 0 && !newFrom[newFrom.length - 1].faceUp) {
    newFrom[newFrom.length - 1].faceUp = true;
    s.score += 5;
  }

  s.tableau[toCol] = [...s.tableau[toCol], ...movingCards.map((c) => ({ ...c }))];
  s.moves++;
  return s;
}

/** Move tableau top card to foundation */
export function tableauToFoundation(state: SolitaireState, colIdx: number): SolitaireState | null {
  const col = state.tableau[colIdx];
  if (col.length === 0) return null;
  const card = col[col.length - 1];
  if (!card.faceUp) return null;

  const fi = foundationIndex(card.suit);
  if (!canMoveToFoundation(card, state.foundations[fi])) return null;

  const s = cloneState(state);
  s.tableau[colIdx].pop();

  // Flip new top
  const newCol = s.tableau[colIdx];
  if (newCol.length > 0 && !newCol[newCol.length - 1].faceUp) {
    newCol[newCol.length - 1].faceUp = true;
    s.score += 5;
  }

  s.foundations[fi].push({ ...card });
  s.moves++;
  s.score += 10;
  return s;
}

/** Move foundation top card back to tableau */
export function foundationToTableau(
  state: SolitaireState,
  foundIdx: number,
  colIdx: number,
): SolitaireState | null {
  const pile = state.foundations[foundIdx];
  if (pile.length === 0) return null;
  const card = pile[pile.length - 1];
  if (!canPlaceOnTableau(card, state.tableau[colIdx])) return null;

  const s = cloneState(state);
  const moved = s.foundations[foundIdx].pop()!;
  s.tableau[colIdx].push(moved);
  s.moves++;
  s.score = Math.max(0, s.score - 15);
  return s;
}

// ── Auto-move to foundation ─────────────────────────────────────────

export function tryAutoMoveToFoundation(
  state: SolitaireState,
  card: Card,
  source: 'waste' | ['tableau', number],
): SolitaireState | null {
  const fi = foundationIndex(card.suit);
  if (!canMoveToFoundation(card, state.foundations[fi])) return null;

  if (source === 'waste') {
    return wasteToFoundation(state);
  } else {
    return tableauToFoundation(state, source[1]);
  }
}

// ── Win Check ───────────────────────────────────────────────────────

export function checkWin(state: SolitaireState): boolean {
  return state.foundations.every((pile) => pile.length === 13);
}

/** Can auto-complete: all remaining cards are face up */
export function canAutoComplete(state: SolitaireState): boolean {
  if (state.stock.length > 0) return false;
  if (state.waste.length > 0) return false;
  for (const col of state.tableau) {
    for (const card of col) {
      if (!card.faceUp) return false;
    }
  }
  return true;
}

/** Perform one auto-complete step — move lowest available card to foundation */
export function autoCompleteStep(state: SolitaireState): SolitaireState | null {
  // Try each tableau column
  for (let i = 0; i < 7; i++) {
    const result = tableauToFoundation(state, i);
    if (result) return result;
  }
  return null;
}
