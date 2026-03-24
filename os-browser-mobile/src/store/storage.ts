import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

// ── Persistent storage layer ────────────────────────────────────────────────
// Uses AsyncStorage for durable cross-session persistence on both iOS and Android.

export const mmkvStorage: StateStorage = {
  getItem: (name: string): Promise<string | null> => {
    return AsyncStorage.getItem(name);
  },
  setItem: (name: string, value: string): Promise<void> => {
    return AsyncStorage.setItem(name, value);
  },
  removeItem: (name: string): Promise<void> => {
    return AsyncStorage.removeItem(name);
  },
};
