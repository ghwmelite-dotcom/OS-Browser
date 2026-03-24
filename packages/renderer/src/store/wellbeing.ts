import { create } from 'zustand';
import { useNotificationStore } from '@/store/notifications';

const STORAGE_KEY = 'os-browser-wellbeing';

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : '<1m';
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface PersistedData {
  enabled: boolean;
  breakInterval: number;
  dailyBrowsingSeconds: number;
  siteTime: Record<string, number>;
  breaksTaken: number;
  dailyGoalMinutes: number;
  lastBreakAt: number;
  lastResetDate: string;
}

function loadFromStorage(): Partial<PersistedData> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistedData>;
  } catch {
    return null;
  }
}

function saveToStorage(data: PersistedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

interface WellbeingState {
  enabled: boolean;
  sessionStartedAt: number;
  breakInterval: number;
  lastBreakAt: number;
  dailyBrowsingSeconds: number;
  siteTime: Record<string, number>;
  currentSite: string | null;
  currentSiteEnteredAt: number | null;
  breaksTaken: number;
  dailyGoalMinutes: number;
  breakReminderShown: boolean;

  tick: () => void;
  setSite: (hostname: string | null) => void;
  dismissBreak: () => void;
  takeBreak: () => void;
  setBreakInterval: (minutes: number) => void;
  setDailyGoal: (minutes: number) => void;
  toggleEnabled: () => void;
  resetDaily: () => void;
  getTopSites: () => Array<{ hostname: string; seconds: number }>;
}

let tickCounter = 0;

// Load persisted data for initial state
const persisted = loadFromStorage();
const isNewDay = persisted?.lastResetDate !== todayDateString();

const initialState = {
  enabled: persisted?.enabled ?? true,
  breakInterval: persisted?.breakInterval ?? 45,
  dailyBrowsingSeconds: isNewDay ? 0 : (persisted?.dailyBrowsingSeconds ?? 0),
  siteTime: isNewDay ? {} : (persisted?.siteTime ?? {}),
  breaksTaken: isNewDay ? 0 : (persisted?.breaksTaken ?? 0),
  dailyGoalMinutes: persisted?.dailyGoalMinutes ?? 0,
  lastBreakAt: persisted?.lastBreakAt ?? Date.now(),
};

// Persist the reset if it was a new day
if (isNewDay && persisted) {
  saveToStorage({
    ...initialState,
    lastResetDate: todayDateString(),
  });
}

export const useWellbeingStore = create<WellbeingState>((set, get) => ({
  ...initialState,
  sessionStartedAt: Date.now(),
  currentSite: null,
  currentSiteEnteredAt: null,
  breakReminderShown: false,

  tick: () => {
    const state = get();
    if (!state.enabled) return;

    // Increment browsing time
    const newBrowsingSeconds = state.dailyBrowsingSeconds + 1;

    // Increment current site time
    const newSiteTime = { ...state.siteTime };
    if (state.currentSite) {
      newSiteTime[state.currentSite] = (newSiteTime[state.currentSite] ?? 0) + 1;
    }

    // Check break reminder
    let breakReminderShown = state.breakReminderShown;
    const timeSinceBreak = Date.now() - state.lastBreakAt;
    if (timeSinceBreak >= state.breakInterval * 60 * 1000 && !state.breakReminderShown) {
      breakReminderShown = true;
      useNotificationStore.getState().addNotification({
        type: 'info',
        title: 'Time for a break',
        message: `You've been browsing for ${formatTime(newBrowsingSeconds)}. Stretch, hydrate, rest your eyes.`,
        source: 'wellbeing',
        icon: '\u{1F33F}',
        actionLabel: 'Take a Break',
      });
    }

    set({
      dailyBrowsingSeconds: newBrowsingSeconds,
      siteTime: newSiteTime,
      breakReminderShown,
    });

    // Persist every 30 ticks
    tickCounter++;
    if (tickCounter >= 30) {
      tickCounter = 0;
      const updated = get();
      saveToStorage({
        enabled: updated.enabled,
        breakInterval: updated.breakInterval,
        dailyBrowsingSeconds: updated.dailyBrowsingSeconds,
        siteTime: updated.siteTime,
        breaksTaken: updated.breaksTaken,
        dailyGoalMinutes: updated.dailyGoalMinutes,
        lastBreakAt: updated.lastBreakAt,
        lastResetDate: todayDateString(),
      });
    }
  },

  setSite: (hostname) => {
    const state = get();
    // Flush elapsed time for previous site
    if (state.currentSite && state.currentSiteEnteredAt) {
      const elapsed = Math.floor((Date.now() - state.currentSiteEnteredAt) / 1000);
      if (elapsed > 0) {
        const newSiteTime = { ...state.siteTime };
        newSiteTime[state.currentSite] = (newSiteTime[state.currentSite] ?? 0) + elapsed;
        set({
          siteTime: newSiteTime,
          currentSite: hostname,
          currentSiteEnteredAt: hostname ? Date.now() : null,
        });
        return;
      }
    }
    set({
      currentSite: hostname,
      currentSiteEnteredAt: hostname ? Date.now() : null,
    });
  },

  dismissBreak: () => {
    set({ lastBreakAt: Date.now(), breakReminderShown: false });
  },

  takeBreak: () => {
    set(s => ({
      lastBreakAt: Date.now(),
      breakReminderShown: false,
      breaksTaken: s.breaksTaken + 1,
    }));
  },

  setBreakInterval: (minutes) => {
    set({ breakInterval: minutes });
  },

  setDailyGoal: (minutes) => {
    set({ dailyGoalMinutes: minutes });
  },

  toggleEnabled: () => {
    set(s => ({ enabled: !s.enabled }));
  },

  resetDaily: () => {
    set({
      dailyBrowsingSeconds: 0,
      siteTime: {},
      breaksTaken: 0,
    });
    const updated = get();
    saveToStorage({
      enabled: updated.enabled,
      breakInterval: updated.breakInterval,
      dailyBrowsingSeconds: 0,
      siteTime: {},
      breaksTaken: 0,
      dailyGoalMinutes: updated.dailyGoalMinutes,
      lastBreakAt: updated.lastBreakAt,
      lastResetDate: todayDateString(),
    });
  },

  getTopSites: () => {
    const { siteTime } = get();
    return Object.entries(siteTime)
      .map(([hostname, seconds]) => ({ hostname, seconds }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 10);
  },
}));
