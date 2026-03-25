import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';

// ── Types ───────────────────────────────────────────────────────────────────

interface GameStats {
  bestScore: number;
  timesPlayed: number;
  lastPlayed: number | null;
}

interface GameScoresState {
  stats: Record<string, GameStats>;
  getStats: (gameId: string) => GameStats;
  recordGame: (gameId: string, score: number) => void;
  resetStats: (gameId: string) => void;
}

// ── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_STATS: GameStats = {
  bestScore: 0,
  timesPlayed: 0,
  lastPlayed: null,
};

// ── Store ───────────────────────────────────────────────────────────────────

export const useGameScoresStore = create<GameScoresState>()(
  persist(
    (set, get) => ({
      stats: {},

      getStats: (gameId: string): GameStats => {
        return get().stats[gameId] ?? { ...DEFAULT_STATS };
      },

      recordGame: (gameId: string, score: number) =>
        set((state) => {
          const current = state.stats[gameId] ?? { ...DEFAULT_STATS };
          return {
            stats: {
              ...state.stats,
              [gameId]: {
                bestScore: Math.max(current.bestScore, score),
                timesPlayed: current.timesPlayed + 1,
                lastPlayed: Date.now(),
              },
            },
          };
        }),

      resetStats: (gameId: string) =>
        set((state) => {
          const { [gameId]: _, ...rest } = state.stats;
          return { stats: rest };
        }),
    }),
    {
      name: 'os-browser-game-scores',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
