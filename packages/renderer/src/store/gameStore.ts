import { create } from 'zustand';
import { gameSounds } from '@/components/games/GameSoundEngine';
import { useNotificationStore } from '@/store/notifications';

// ── Types ────────────────────────────────────────────────────────────
export interface HighScore {
  score: number;
  playerName: string;
  date: number;
}

export interface GameStats {
  played: number;
  won: number;
  lost: number;
  bestScore: number;
  totalTimePlayed: number;
}

interface GameState {
  highScores: Record<string, HighScore[]>;
  stats: Record<string, GameStats>;
  soundEnabled: boolean;
  lastPlayedGameId: string | null;

  addHighScore: (gameId: string, score: number, playerName?: string) => void;
  getHighScores: (gameId: string, limit?: number) => HighScore[];
  incrementStat: (gameId: string, stat: 'played' | 'won' | 'lost') => void;
  updateBestScore: (gameId: string, score: number) => void;
  addTimePlayed: (gameId: string, seconds: number) => void;
  getStats: (gameId: string) => GameStats;
  toggleSound: () => void;
  setLastPlayed: (gameId: string) => void;
}

// ── Persistence Helpers ──────────────────────────────────────────────
const STORAGE_KEY = 'govplay-game-data';

interface PersistedData {
  highScores: Record<string, HighScore[]>;
  stats: Record<string, GameStats>;
  soundEnabled: boolean;
  lastPlayedGameId: string | null;
}

function loadPersisted(): Partial<PersistedData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedData;
  } catch {
    return {};
  }
}

function persist(state: Pick<GameState, 'highScores' | 'stats' | 'soundEnabled' | 'lastPlayedGameId'>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      highScores: state.highScores,
      stats: state.stats,
      soundEnabled: state.soundEnabled,
      lastPlayedGameId: state.lastPlayedGameId,
    }));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

const DEFAULT_STATS: GameStats = {
  played: 0,
  won: 0,
  lost: 0,
  bestScore: 0,
  totalTimePlayed: 0,
};

const MAX_HIGH_SCORES = 10;

// ── Store ────────────────────────────────────────────────────────────
const saved = loadPersisted();

export const useGameStore = create<GameState>((set, get) => ({
  highScores: saved.highScores ?? {},
  stats: saved.stats ?? {},
  soundEnabled: saved.soundEnabled ?? true,
  lastPlayedGameId: saved.lastPlayedGameId ?? null,

  addHighScore: (gameId, score, playerName = 'Player') => {
    set((state) => {
      const existing = state.highScores[gameId] ?? [];
      const entry: HighScore = { score, playerName, date: Date.now() };
      const updated = [...existing, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_HIGH_SCORES);
      const newHighScores = { ...state.highScores, [gameId]: updated };

      // Also update best score in stats
      const currentStats = state.stats[gameId] ?? { ...DEFAULT_STATS };
      const newStats = {
        ...state.stats,
        [gameId]: {
          ...currentStats,
          bestScore: Math.max(currentStats.bestScore, score),
        },
      };

      // Notify if this is a new personal best
      if (score > currentStats.bestScore) {
        useNotificationStore.getState().addNotification({
          type: 'success',
          title: 'New High Score!',
          message: `You scored ${score} in ${gameId}`,
          source: 'govplay',
          icon: '\u{1F3C6}',
          actionLabel: 'Play Again',
          actionRoute: 'os-browser://games',
        });
      }

      const newState = { highScores: newHighScores, stats: newStats };
      persist({ ...state, ...newState });
      return newState;
    });
  },

  getHighScores: (gameId, limit = MAX_HIGH_SCORES) => {
    const scores = get().highScores[gameId] ?? [];
    return scores.slice(0, limit);
  },

  incrementStat: (gameId, stat) => {
    set((state) => {
      const current = state.stats[gameId] ?? { ...DEFAULT_STATS };
      const newStats = {
        ...state.stats,
        [gameId]: { ...current, [stat]: current[stat] + 1 },
      };
      const newState = { stats: newStats };
      persist({ ...state, ...newState });
      return newState;
    });
  },

  updateBestScore: (gameId, score) => {
    set((state) => {
      const current = state.stats[gameId] ?? { ...DEFAULT_STATS };
      if (score <= current.bestScore) return state;
      const newStats = {
        ...state.stats,
        [gameId]: { ...current, bestScore: score },
      };
      const newState = { stats: newStats };
      persist({ ...state, ...newState });
      return newState;
    });
  },

  addTimePlayed: (gameId, seconds) => {
    set((state) => {
      const current = state.stats[gameId] ?? { ...DEFAULT_STATS };
      const newStats = {
        ...state.stats,
        [gameId]: { ...current, totalTimePlayed: current.totalTimePlayed + seconds },
      };
      const newState = { stats: newStats };
      persist({ ...state, ...newState });
      return newState;
    });
  },

  getStats: (gameId) => {
    return get().stats[gameId] ?? { ...DEFAULT_STATS };
  },

  toggleSound: () => {
    gameSounds.toggle();
    set((state) => {
      const newState = { soundEnabled: !state.soundEnabled };
      persist({ ...state, ...newState });
      return newState;
    });
  },

  setLastPlayed: (gameId) => {
    set((state) => {
      const newState = { lastPlayedGameId: gameId };
      persist({ ...state, ...newState });
      return newState;
    });
  },
}));
