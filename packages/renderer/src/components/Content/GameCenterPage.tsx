import React, { useState } from 'react';
import { GameCenterLayout } from '@/components/games/GameCenterLayout';
import { GameShell } from '@/components/games/GameShell';
import { useGameStore } from '@/store/gameStore';

// Lazy-load all games
const OwareGame = React.lazy(() => import('@/components/games/oware/OwareGame').then(m => ({ default: m.OwareGame })));
const ChessGame = React.lazy(() => import('@/components/games/chess/ChessGame'));
const CheckersGame = React.lazy(() => import('@/components/games/checkers/CheckersGame'));
const LudoGame = React.lazy(() => import('@/components/games/ludo/LudoGame').then(m => ({ default: m.LudoGame })));
const SudokuGame = React.lazy(() => import('@/components/games/sudoku/SudokuGame').then(m => ({ default: m.SudokuGame })));
const Game2048 = React.lazy(() => import('@/components/games/puzzle2048/Game2048').then(m => ({ default: m.Game2048 })));
const MinesweeperGame = React.lazy(() => import('@/components/games/minesweeper/MinesweeperGame').then(m => ({ default: m.MinesweeperGame })));
const SolitaireGame = React.lazy(() => import('@/components/games/solitaire/SolitaireGame').then(m => ({ default: m.SolitaireGame })));
const SnakeGame = React.lazy(() => import('@/components/games/snake/SnakeGame').then(m => ({ default: m.SnakeGame })));
const WordScrambleGame = React.lazy(() => import('@/components/games/word-scramble/WordScrambleGame').then(m => ({ default: m.WordScrambleGame })));
const TriviaGame = React.lazy(() => import('@/components/games/trivia/TriviaGame').then(m => ({ default: m.TriviaGame })));
const TypingSpeedGame = React.lazy(() => import('@/components/games/typing-speed/TypingSpeedGame').then(m => ({ default: m.TypingSpeedGame })));

const GAME_NAMES: Record<string, string> = {
  oware: 'Oware',
  chess: 'Chess',
  checkers: 'Checkers',
  ludo: 'Ludo',
  sudoku: 'Sudoku',
  '2048': '2048',
  minesweeper: 'Minesweeper',
  solitaire: 'Solitaire',
  snake: 'Snake',
  'word-scramble': 'Word Scramble',
  trivia: 'Ghana Trivia',
  typing: 'Typing Speed',
};

function GameLoader({ gameId }: { gameId: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dims, setDims] = React.useState({ width: 600, height: 400 });

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDims({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <React.Suspense fallback={
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading game...</div>
      }>
        {dims.width < 50 || dims.height < 50 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Preparing game...</div>
        ) : <>
        {gameId === 'oware' && <OwareGame containerWidth={dims.width} containerHeight={dims.height} />}
        {gameId === 'chess' && <ChessGame containerWidth={dims.width} containerHeight={dims.height} />}
        {gameId === 'checkers' && <CheckersGame containerWidth={dims.width} containerHeight={dims.height} />}
        {gameId === 'ludo' && <LudoGame containerWidth={dims.width} containerHeight={dims.height} />}
        {gameId === 'sudoku' && <SudokuGame />}
        {gameId === '2048' && <Game2048 />}
        {gameId === 'minesweeper' && <MinesweeperGame />}
        {gameId === 'solitaire' && <SolitaireGame />}
        {gameId === 'snake' && <SnakeGame containerWidth={dims.width} containerHeight={dims.height} />}
        {gameId === 'word-scramble' && <WordScrambleGame />}
        {gameId === 'trivia' && <TriviaGame />}
        {gameId === 'typing' && <TypingSpeedGame />}
        </>}
      </React.Suspense>
    </div>
  );
}

export function GameCenterPage() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const setLastPlayed = useGameStore(s => s.setLastPlayed);

  // Listen for navigation events from command bar
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.gameId) {
        setActiveGameId(detail.gameId);
        setLastPlayed(detail.gameId);
      } else {
        setActiveGameId(null);
      }
    };
    window.addEventListener('govplay:navigate', handler);
    return () => window.removeEventListener('govplay:navigate', handler);
  }, [setLastPlayed]);

  if (activeGameId) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
        <GameShell
          gameId={activeGameId}
          gameName={GAME_NAMES[activeGameId] ?? activeGameId}
          onBack={() => setActiveGameId(null)}
        >
          <GameLoader gameId={activeGameId} />
        </GameShell>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--color-bg)' }}>
      <GameCenterLayout onSelectGame={(id) => {
        setActiveGameId(id);
        setLastPlayed(id);
      }} />
    </div>
  );
}
