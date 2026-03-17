import React from 'react';
import { Gamepad2 } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';

// ── Lazy-load sidebar panel ──────────────────────────────────────────
const LazyGovPlayQuickPanel = React.lazy(() =>
  import('@/components/games/GovPlayQuickPanel').then((m) => ({ default: m.GovPlayQuickPanel })),
);

const GovPlaySidebarPanel: React.FC<SidebarPanelProps> = (props) => {
  return React.createElement(
    React.Suspense,
    {
      fallback: React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--color-text-muted)',
            fontSize: '12px',
          },
        },
        'Loading GovPlay...',
      ),
    },
    React.createElement(LazyGovPlayQuickPanel, props),
  );
};

// ── Navigation helper ────────────────────────────────────────────────
const openGovPlay = () => {
  import('@/store/tabs').then(({ useTabsStore }) => {
    useTabsStore.getState().createTab('os-browser://games');
  });
};

const openGame = (gameId: string) => {
  import('@/store/tabs').then(({ useTabsStore }) => {
    useTabsStore.getState().createTab('os-browser://games');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('govplay:navigate', { detail: { view: 'game', gameId } }));
    }, 100);
  });
};

// ── Feature Definition ───────────────────────────────────────────────
const govplayFeature = {
  id: 'govplay',
  name: 'GovPlay',
  description: 'Game center with strategy, puzzle, arcade, and educational games for break-time entertainment.',
  stripColor: '#FF4081',
  icon: Gamepad2,
  category: 'productivity' as const,
  defaultEnabled: true,
  priority: 1,
  internalPageUrl: 'os-browser://games',
  surfaces: {
    sidebar: {
      panelComponent: GovPlaySidebarPanel,
      order: 3,
      defaultPanelWidth: 340,
    },
    commandBar: [
      {
        id: 'govplay:open',
        label: 'Open GovPlay',
        description: 'Open the GovPlay game center',
        keywords: ['govplay', 'games', 'play', 'arcade', 'entertainment', 'break'],
        action: openGovPlay,
        group: 'GovPlay',
      },
      {
        id: 'govplay:oware',
        label: 'Play Oware',
        description: 'Classic Akan mancala game',
        keywords: ['oware', 'mancala', 'strategy', 'akan', 'seeds'],
        action: () => openGame('oware'),
        group: 'GovPlay',
      },
      {
        id: 'govplay:checkers',
        label: 'Play Checkers',
        description: 'Draughts with jump captures',
        keywords: ['checkers', 'draughts', 'strategy', 'board'],
        action: () => openGame('checkers'),
        group: 'GovPlay',
      },
      {
        id: 'govplay:chess',
        label: 'Play Chess',
        description: 'The king of strategy games',
        keywords: ['chess', 'strategy', 'board', 'king'],
        action: () => openGame('chess'),
        group: 'GovPlay',
      },
      {
        id: 'govplay:solitaire',
        label: 'Play Solitaire',
        description: 'Classic Klondike card game',
        keywords: ['solitaire', 'klondike', 'cards', 'patience'],
        action: () => openGame('solitaire'),
        group: 'GovPlay',
      },
      {
        id: 'govplay:minesweeper',
        label: 'Play Minesweeper',
        description: 'Clear the minefield with logic',
        keywords: ['minesweeper', 'mines', 'puzzle', 'logic'],
        action: () => openGame('minesweeper'),
        group: 'GovPlay',
      },
      {
        id: 'govplay:2048',
        label: 'Play 2048',
        description: 'Slide and merge number tiles',
        keywords: ['2048', 'tiles', 'numbers', 'merge', 'puzzle'],
        action: () => openGame('2048'),
        group: 'GovPlay',
      },
      {
        id: 'govplay:sudoku',
        label: 'Play Sudoku',
        description: 'Fill the grid with logic',
        keywords: ['sudoku', 'numbers', 'logic', 'grid', 'puzzle'],
        action: () => openGame('sudoku'),
        group: 'GovPlay',
      },
      {
        id: 'govplay:snake',
        label: 'Play Snake',
        description: 'Classic snake arcade game',
        keywords: ['snake', 'arcade', 'retro', 'classic'],
        action: () => openGame('snake'),
        group: 'GovPlay',
      },
      {
        id: 'govplay:tetris',
        label: 'Play Tetris',
        description: 'Stack and clear falling blocks',
        keywords: ['tetris', 'blocks', 'arcade', 'falling'],
        action: () => openGame('tetris'),
        group: 'GovPlay',
      },
      {
        id: 'govplay:wordscramble',
        label: 'Play Word Scramble',
        description: 'Unscramble letters to find words',
        keywords: ['word', 'scramble', 'letters', 'vocabulary', 'educational'],
        action: () => openGame('wordscramble'),
        group: 'GovPlay',
      },
      {
        id: 'govplay:mathblitz',
        label: 'Play Math Blitz',
        description: 'Speed arithmetic challenge',
        keywords: ['math', 'blitz', 'arithmetic', 'numbers', 'educational'],
        action: () => openGame('mathblitz'),
        group: 'GovPlay',
      },
      {
        id: 'govplay:typing',
        label: 'Play Typing Test',
        description: 'Test and improve typing speed',
        keywords: ['typing', 'speed', 'keyboard', 'wpm', 'educational'],
        action: () => openGame('typing'),
        group: 'GovPlay',
      },
    ],
  },
};

FeatureRegistry.register(govplayFeature);

export default govplayFeature;
