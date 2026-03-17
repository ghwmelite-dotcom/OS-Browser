import React, { useState, useMemo } from 'react';
import { GameCard } from './GameCard';
import { useGameStore } from '@/store/gameStore';

// ── Game Metadata ────────────────────────────────────────────────────
export interface GameMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

export const GAMES: GameMeta[] = [
  { id: 'oware', name: 'Oware', description: 'Classic Akan mancala — capture seeds to win', category: 'Strategy', icon: '\u26AB' },
  { id: 'chess', name: 'Chess', description: 'The king of strategy games', category: 'Strategy', icon: '\u265A' },
  { id: 'checkers', name: 'Checkers', description: 'Draughts with jump captures and king promotion', category: 'Strategy', icon: '\u26C0' },
  { id: 'ludo', name: 'Ludo', description: 'Race your tokens home — roll a 6 to start', category: 'Strategy', icon: '\uD83C\uDFB2' },
  { id: 'sudoku', name: 'Sudoku', description: 'Fill the 9x9 grid with logic', category: 'Puzzles', icon: '\uD83E\uDDEE' },
  { id: '2048', name: '2048', description: 'Slide and merge tiles to reach 2048', category: 'Puzzles', icon: '\uD83D\uDD22' },
  { id: 'minesweeper', name: 'Minesweeper', description: 'Clear the board without hitting mines', category: 'Puzzles', icon: '\uD83D\uDCA3' },
  { id: 'solitaire', name: 'Solitaire', description: 'Classic Klondike — sort cards by suit', category: 'Cards', icon: '\u2660' },
  { id: 'snake', name: 'Snake', description: 'Grow your snake, dodge your tail', category: 'Arcade', icon: '\uD83D\uDC0D' },
  { id: 'word-scramble', name: 'Word Scramble', description: 'Unscramble letters to find the word', category: 'Educational', icon: '\uD83D\uDD24' },
  { id: 'trivia', name: 'Ghana Trivia', description: 'Test your knowledge of Ghana', category: 'Educational', icon: '\uD83C\uDDEC\uD83C\uDDED' },
  { id: 'typing', name: 'Typing Speed', description: 'Test and improve your typing speed', category: 'Educational', icon: '\u2328\uFE0F' },
];

const CATEGORIES = ['All', 'Strategy', 'Puzzles', 'Cards', 'Arcade', 'Educational'] as const;

// ── Props ────────────────────────────────────────────────────────────
export interface GameCenterLayoutProps {
  onSelectGame: (gameId: string) => void;
}

// ── Component ────────────────────────────────────────────────────────
export const GameCenterLayout: React.FC<GameCenterLayoutProps> = ({ onSelectGame }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const stats = useGameStore((s) => s.stats);

  const filtered = useMemo(() => {
    let list = GAMES;
    if (category !== 'All') {
      list = list.filter((g) => g.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [search, category]);

  // ── Styles ──────────────────────────────────────────────────────
  const page: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    background: '#1A1D27',
    color: '#FAF6EE',
    fontFamily: 'Inter, system-ui, sans-serif',
    overflow: 'auto',
  };

  const headerArea: React.CSSProperties = {
    padding: '24px 24px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };

  const title: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: '-0.02em',
  };

  const subtitle: React.CSSProperties = {
    fontSize: 13,
    color: 'rgba(250,246,238,0.5)',
    marginTop: -8,
  };

  const searchInput: React.CSSProperties = {
    width: '100%',
    maxWidth: 360,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid rgba(252,209,22,0.2)',
    background: 'rgba(252,209,22,0.05)',
    color: '#FAF6EE',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
  };

  const tabs: React.CSSProperties = {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  };

  const tab = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 20,
    border: 'none',
    background: active ? 'rgba(252,209,22,0.15)' : 'transparent',
    color: active ? '#FCD116' : 'rgba(250,246,238,0.5)',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.1s, color 0.1s',
  });

  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 200px)',
    gap: 16,
    padding: 24,
    justifyContent: 'center',
  };

  return (
    <div style={page}>
      <div style={headerArea}>
        <div style={title}>
          <span style={{ color: '#FCD116' }}>{'\u2726'}</span> GovPlay
        </div>
        <div style={subtitle}>Take a break. Sharpen your mind.</div>

        <input
          type="text"
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />

        <div style={tabs}>
          {CATEGORIES.map((cat) => (
            <button key={cat} style={tab(category === cat)} onClick={() => setCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={grid}>
        {filtered.map((game) => (
          <GameCard
            key={game.id}
            id={game.id}
            name={game.name}
            description={game.description}
            category={game.category}
            icon={game.icon}
            bestScore={stats[game.id]?.bestScore}
            onPlay={() => onSelectGame(game.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: 40,
              color: 'rgba(250,246,238,0.3)',
              fontSize: 14,
            }}
          >
            No games match your search.
          </div>
        )}
      </div>
    </div>
  );
};
