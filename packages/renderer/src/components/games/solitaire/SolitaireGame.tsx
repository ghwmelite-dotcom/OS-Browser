import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameShell } from '../GameShell';
import { gameSounds } from '../GameSoundEngine';
import {
  type Card,
  type DrawMode,
  type SolitaireState,
  suitSymbol,
  rankLabel,
  cardColor,
  initGame,
  cloneState,
  drawFromStock,
  wasteToFoundation,
  wasteToTableau,
  tableauToTableau,
  tableauToFoundation,
  foundationToTableau,
  checkWin,
  canAutoComplete,
  autoCompleteStep,
} from './solitaireLogic';

// ── CSS Keyframes ───────────────────────────────────────────────────
const STYLE_ID = 'solitaire-animations';
function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes solitaire-fly {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(-120vh) rotate(720deg); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ── Types ───────────────────────────────────────────────────────────
interface DragInfo {
  source: 'waste' | 'foundation' | 'tableau';
  sourceIdx: number;
  cardIdx: number;
  cards: Card[];
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

// ── Component ───────────────────────────────────────────────────────
export const SolitaireGame: React.FC = () => {
  const [state, setState] = useState<SolitaireState | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>(1);
  const [timer, setTimer] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [autoCompleting, setAutoCompleting] = useState(false);
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [flyCards, setFlyCards] = useState<Card[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectStyles();
    startNewGame();
  }, []);

  const startNewGame = useCallback(() => {
    setState(initGame(drawMode));
    setTimer(0);
    setGameWon(false);
    setAutoCompleting(false);
    setDrag(null);
    setFlyCards([]);
  }, [drawMode]);

  // Timer
  useEffect(() => {
    if (gameWon || !state) return;
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameWon, state]);

  // Win check
  useEffect(() => {
    if (!state || gameWon) return;
    if (checkWin(state)) {
      setGameWon(true);
      gameSounds.win();
      // Fly animation
      const allCards = state.foundations.flat();
      setFlyCards(allCards);
      return;
    }
    if (canAutoComplete(state) && !autoCompleting) {
      setAutoCompleting(true);
    }
  }, [state, gameWon, autoCompleting]);

  // Auto-complete
  useEffect(() => {
    if (!autoCompleting || !state || gameWon) return;
    const timer = setTimeout(() => {
      const next = autoCompleteStep(state);
      if (next) {
        setState(next);
        gameSounds.move();
      } else {
        setAutoCompleting(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [autoCompleting, state, gameWon]);

  // ── Actions ─────────────────────────────────────────────────────
  const handleStockClick = useCallback(() => {
    if (!state || gameWon) return;
    const next = drawFromStock(state);
    setState(next);
    gameSounds.deal();
  }, [state, gameWon]);

  const handleDoubleClick = useCallback(
    (card: Card, source: 'waste' | ['tableau', number]) => {
      if (!state || gameWon) return;
      // Try to auto-move to foundation
      if (source === 'waste') {
        const result = wasteToFoundation(state);
        if (result) {
          setState(result);
          gameSounds.score();
          return;
        }
      } else {
        const result = tableauToFoundation(state, source[1]);
        if (result) {
          setState(result);
          gameSounds.score();
          return;
        }
      }
    },
    [state, gameWon],
  );

  // ── Drag and Drop ──────────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, source: DragInfo['source'], sourceIdx: number, cardIdx: number, cards: Card[]) => {
      if (gameWon || autoCompleting) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();

      setDrag({
        source,
        sourceIdx,
        cardIdx,
        cards,
        startX: clientX,
        startY: clientY,
        offsetX: clientX - rect.left,
        offsetY: clientY - rect.top,
      });
      setDragPos({ x: clientX, y: clientY });
    },
    [gameWon, autoCompleting],
  );

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setDragPos({ x: clientX, y: clientY });
    };

    const onEnd = (e: MouseEvent | TouchEvent) => {
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

      // Find drop target
      if (state) {
        const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
        if (el) {
          const dropTarget = el.closest('[data-drop-target]') as HTMLElement | null;
          if (dropTarget) {
            const targetType = dropTarget.dataset.dropTarget;
            const targetIdx = parseInt(dropTarget.dataset.dropIdx ?? '-1', 10);

            let result: SolitaireState | null = null;

            if (targetType === 'tableau' && targetIdx >= 0) {
              if (drag.source === 'waste') {
                result = wasteToTableau(state, targetIdx);
              } else if (drag.source === 'tableau') {
                result = tableauToTableau(state, drag.sourceIdx, drag.cardIdx, targetIdx);
              } else if (drag.source === 'foundation') {
                result = foundationToTableau(state, drag.sourceIdx, targetIdx);
              }
            } else if (targetType === 'foundation' && targetIdx >= 0) {
              if (drag.source === 'waste') {
                result = wasteToFoundation(state);
              } else if (drag.source === 'tableau') {
                result = tableauToFoundation(state, drag.sourceIdx);
              }
            }

            if (result) {
              setState(result);
              gameSounds.move();
            } else {
              gameSounds.error();
            }
          }
        }
      }

      setDrag(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [drag, state]);

  // ── Format Timer ────────────────────────────────────────────────
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Card Rendering ──────────────────────────────────────────────
  if (!state) return null;

  const cardW = 'clamp(50px, 8vw, 80px)';
  const cardH = `calc(${cardW} * 7 / 5)`;
  const stackOffset = 'clamp(16px, 2.5vw, 24px)';
  const faceDownOffset = 'clamp(4px, 0.7vw, 8px)';

  const renderCardFace = (card: Card, style?: React.CSSProperties): React.ReactElement => {
    const color = cardColor(card.suit) === 'red' ? '#CE1126' : '#1A1D27';
    return (
      <div style={{
        width: cardW,
        height: cardH,
        aspectRatio: '5/7',
        background: '#FFFFFF',
        borderRadius: 'clamp(4px, 0.8vw, 8px)',
        border: '1px solid rgba(0,0,0,0.15)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'clamp(2px, 0.4vw, 4px)',
        position: 'relative',
        userSelect: 'none',
        ...style,
      }}>
        {/* Top-left rank + suit */}
        <div style={{
          color,
          fontSize: 'clamp(10px, 1.5vw, 14px)',
          fontWeight: 700,
          lineHeight: 1.1,
          textAlign: 'left',
        }}>
          <div>{rankLabel(card.rank)}</div>
          <div style={{ fontSize: 'clamp(8px, 1.2vw, 12px)' }}>{suitSymbol(card.suit)}</div>
        </div>
        {/* Center suit */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          fontSize: 'clamp(18px, 3vw, 28px)',
          pointerEvents: 'none',
        }}>
          {suitSymbol(card.suit)}
        </div>
      </div>
    );
  };

  const renderCardBack = (style?: React.CSSProperties): React.ReactElement => (
    <div style={{
      width: cardW,
      height: cardH,
      aspectRatio: '5/7',
      background: `
        repeating-linear-gradient(
          45deg,
          #006B3F,
          #006B3F 4px,
          #005A34 4px,
          #005A34 8px
        )
      `,
      borderRadius: 'clamp(4px, 0.8vw, 8px)',
      border: '2px solid #FCD116',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      userSelect: 'none',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {/* Adinkra-inspired pattern overlay */}
      <div style={{
        position: 'absolute',
        inset: 3,
        borderRadius: 'clamp(2px, 0.5vw, 4px)',
        border: '1px solid rgba(252,209,22,0.3)',
        background: `
          radial-gradient(circle at 25% 25%, rgba(252,209,22,0.15) 2px, transparent 2px),
          radial-gradient(circle at 75% 25%, rgba(252,209,22,0.15) 2px, transparent 2px),
          radial-gradient(circle at 25% 75%, rgba(252,209,22,0.15) 2px, transparent 2px),
          radial-gradient(circle at 75% 75%, rgba(252,209,22,0.15) 2px, transparent 2px),
          radial-gradient(circle at 50% 50%, rgba(252,209,22,0.12) 3px, transparent 3px)
        `,
        backgroundSize: '50% 50%',
      }} />
    </div>
  );

  const emptySlot = (style?: React.CSSProperties): React.ReactElement => (
    <div style={{
      width: cardW,
      height: cardH,
      aspectRatio: '5/7',
      borderRadius: 'clamp(4px, 0.8vw, 8px)',
      border: '2px dashed rgba(252,209,22,0.2)',
      background: 'rgba(252,209,22,0.03)',
      ...style,
    }} />
  );

  // ── Layout ──────────────────────────────────────────────────────
  const drawModeLabel = drawMode === 1 ? 'Draw 1 (Easy)' : 'Draw 3 (Hard)';

  return (
    <GameShell
      gameId="solitaire"
      gameName="Solitaire"
      score={state.score}
      onNewGame={startNewGame}
      hasDifficulty
      difficulty={drawModeLabel}
      onDifficultyChange={(d) => {
        const mode: DrawMode = d.includes('3') ? 3 : 1;
        setDrawMode(mode);
        setState(initGame(mode));
        setTimer(0);
        setGameWon(false);
        setAutoCompleting(false);
        setFlyCards([]);
      }}
      difficulties={['Draw 1 (Easy)', 'Draw 3 (Hard)']}
    >
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'clamp(8px, 1.5vw, 16px)',
          width: '100%',
          padding: '0 clamp(4px, 1vw, 12px)',
          maxWidth: 720,
          position: 'relative',
        }}
      >
        {/* Status */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: 'clamp(10px, 2vw, 13px)',
          color: 'rgba(250,246,238,0.5)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <span>Moves: {state.moves}</span>
          <span>Time: {formatTime(timer)}</span>
        </div>

        {/* Top row: stock, waste, gap, foundations */}
        <div style={{
          display: 'flex',
          gap: 'clamp(4px, 0.8vw, 8px)',
          width: '100%',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          flexWrap: 'nowrap',
        }}>
          {/* Stock */}
          <div
            onClick={handleStockClick}
            style={{ cursor: 'pointer', flexShrink: 0 }}
          >
            {state.stock.length > 0 ? renderCardBack() : emptySlot()}
          </div>

          {/* Waste */}
          <div style={{ position: 'relative', flexShrink: 0, width: cardW, height: cardH }}>
            {state.waste.length === 0
              ? emptySlot()
              : (() => {
                  // Show top 1-3 waste cards fanned
                  const show = drawMode === 3 ? state.waste.slice(-3) : state.waste.slice(-1);
                  return show.map((card, i) => {
                    const isTop = i === show.length - 1;
                    return (
                      <div
                        key={card.id}
                        style={{
                          position: i === 0 ? 'relative' : 'absolute',
                          left: `calc(${i} * clamp(8px, 1.5vw, 16px))`,
                          top: 0,
                          zIndex: i,
                          cursor: isTop ? 'grab' : 'default',
                        }}
                        onMouseDown={isTop ? (e) => handleDragStart(e, 'waste', 0, state.waste.length - 1, [card]) : undefined}
                        onTouchStart={isTop ? (e) => handleDragStart(e, 'waste', 0, state.waste.length - 1, [card]) : undefined}
                        onDoubleClick={isTop ? () => handleDoubleClick(card, 'waste') : undefined}
                      >
                        {renderCardFace(card)}
                      </div>
                    );
                  });
                })()
            }
          </div>

          {/* Spacer */}
          <div style={{ width: cardW, flexShrink: 0 }} />

          {/* Foundations */}
          {state.foundations.map((pile, fi) => (
            <div
              key={`f-${fi}`}
              data-drop-target="foundation"
              data-drop-idx={fi}
              style={{ flexShrink: 0 }}
            >
              {pile.length === 0
                ? emptySlot()
                : renderCardFace(pile[pile.length - 1])
              }
            </div>
          ))}
        </div>

        {/* Tableau */}
        <div style={{
          display: 'flex',
          gap: 'clamp(3px, 0.6vw, 6px)',
          width: '100%',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
        }}>
          {state.tableau.map((col, ci) => (
            <div
              key={`t-${ci}`}
              data-drop-target="tableau"
              data-drop-idx={ci}
              style={{
                position: 'relative',
                flex: 1,
                minHeight: cardH,
              }}
            >
              {col.length === 0
                ? emptySlot({ width: '100%' })
                : col.map((card, cardIdx) => {
                    const isFaceUp = card.faceUp;
                    const top = isFaceUp
                      ? `calc(${cardIdx} * ${col.slice(0, cardIdx).filter((c) => !c.faceUp).length > 0 ? faceDownOffset : stackOffset})`
                      : `calc(${cardIdx} * ${faceDownOffset})`;
                    // Better: compute cumulative offset
                    let cumulativeTop = 0;
                    for (let i = 0; i < cardIdx; i++) {
                      cumulativeTop += col[i].faceUp ? 1 : 0.35;
                    }

                    const isTopCard = cardIdx === col.length - 1;
                    const isDraggable = isFaceUp;

                    return (
                      <div
                        key={card.id}
                        style={{
                          position: cardIdx === 0 ? 'relative' : 'absolute',
                          top: cardIdx === 0 ? 0 : `calc(${cumulativeTop} * ${stackOffset})`,
                          left: 0,
                          right: 0,
                          zIndex: cardIdx,
                          cursor: isDraggable ? 'grab' : 'default',
                        }}
                        onMouseDown={isDraggable ? (e) => {
                          const cards = col.slice(cardIdx);
                          handleDragStart(e, 'tableau', ci, cardIdx, cards);
                        } : undefined}
                        onTouchStart={isDraggable ? (e) => {
                          const cards = col.slice(cardIdx);
                          handleDragStart(e, 'tableau', ci, cardIdx, cards);
                        } : undefined}
                        onDoubleClick={isTopCard && isFaceUp ? () => handleDoubleClick(card, ['tableau', ci]) : undefined}
                      >
                        {isFaceUp
                          ? renderCardFace(card, { width: '100%' })
                          : renderCardBack({ width: '100%' })
                        }
                      </div>
                    );
                  })
              }
            </div>
          ))}
        </div>

        {/* Drag overlay */}
        {drag && (
          <div
            style={{
              position: 'fixed',
              left: dragPos.x - drag.offsetX,
              top: dragPos.y - drag.offsetY,
              zIndex: 1000,
              pointerEvents: 'none',
              opacity: 0.9,
            }}
          >
            {drag.cards.map((card, i) => (
              <div key={card.id} style={{ marginTop: i === 0 ? 0 : -70 }}>
                {renderCardFace(card)}
              </div>
            ))}
          </div>
        )}

        {/* Win celebration */}
        {gameWon && (
          <>
            {/* Flying cards */}
            {flyCards.map((card, i) => (
              <div
                key={`fly-${card.id}`}
                style={{
                  position: 'fixed',
                  left: `${10 + (i % 7) * 12}%`,
                  bottom: 0,
                  animation: `solitaire-fly ${1.5 + (i * 0.08)}s ease-in ${i * 0.06}s forwards`,
                  zIndex: 50,
                }}
              >
                {renderCardFace(card)}
              </div>
            ))}

            {/* Win overlay */}
            <div
              style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  background: '#2C2318',
                  border: '2px solid #FCD116',
                  borderRadius: 16,
                  padding: '32px 40px',
                  textAlign: 'center',
                  color: '#FAF6EE',
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: '#FCD116', marginBottom: 8 }}>
                  You Win!
                </div>
                <div style={{ fontSize: 16, marginBottom: 4 }}>
                  Score: {state.score} | Moves: {state.moves}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(250,246,238,0.6)', marginBottom: 16 }}>
                  Time: {formatTime(timer)}
                </div>
                <button
                  onClick={startNewGame}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#FCD116',
                    color: '#1A1D27',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  New Game
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </GameShell>
  );
};

export default SolitaireGame;
