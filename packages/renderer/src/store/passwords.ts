// TODO: SECURITY — Migrate password storage from Base64 encoding to AES-256-GCM encryption.
// The IPC bridge is ready: window.osBrowser.passwordVault.encrypt() / .decrypt()
// These call the main process credential-encryption service (AES-256-GCM with OS-level key protection).
// Migration plan:
//   1. Make encodePassword/decodePassword async, calling IPC encrypt/decrypt
//   2. Update all callers (addPassword, updatePassword, loadFromStorage, saveToStorage) to be async
//   3. On load, detect legacy Base64 entries (no ":" separator) and re-encrypt them
// Current Base64 encoding is NOT secure — it's trivially reversible.
import { create } from 'zustand';

export interface SavedPassword {
  id: string;
  url: string;
  domain: string;
  username: string;
  password: string;
  name?: string;
  createdAt: number;
  lastUsedAt: number;
  category: 'personal' | 'work' | 'government';
}

export interface PasswordState {
  passwords: SavedPassword[];
  searchQuery: string;

  addPassword: (entry: Omit<SavedPassword, 'id' | 'createdAt' | 'lastUsedAt'>) => void;
  updatePassword: (id: string, updates: Partial<SavedPassword>) => void;
  removePassword: (id: string) => void;
  setSearchQuery: (q: string) => void;
  getFilteredPasswords: () => SavedPassword[];
  getPasswordForDomain: (domain: string) => SavedPassword | undefined;
}

const STORAGE_KEY = 'os-browser-passwords';
const MAX_ENTRIES = 500;

function encodePassword(plain: string): string {
  try { return btoa(plain); } catch { return plain; }
}

function decodePassword(encoded: string): string {
  try { return atob(encoded); } catch { return encoded; }
}

function loadFromStorage(): SavedPassword[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPassword[];
    return parsed.map(p => ({
      ...p,
      password: decodePassword(p.password),
    }));
  } catch {
    return [];
  }
}

function saveToStorage(passwords: SavedPassword[]): void {
  try {
    const encoded = passwords.map(p => ({
      ...p,
      password: encodePassword(p.password),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encoded));
  } catch { /* storage full or unavailable */ }
}

function generateId(): string {
  return `pw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const usePasswordStore = create<PasswordState>((set, get) => ({
  passwords: loadFromStorage(),
  searchQuery: '',

  addPassword: (entry) => {
    const state = get();
    if (state.passwords.length >= MAX_ENTRIES) return;
    const now = Date.now();
    const newEntry: SavedPassword = {
      ...entry,
      id: generateId(),
      createdAt: now,
      lastUsedAt: now,
    };
    const updated = [...state.passwords, newEntry];
    saveToStorage(updated);
    set({ passwords: updated });
  },

  updatePassword: (id, updates) => {
    const updated = get().passwords.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    saveToStorage(updated);
    set({ passwords: updated });
  },

  removePassword: (id) => {
    const updated = get().passwords.filter(p => p.id !== id);
    saveToStorage(updated);
    set({ passwords: updated });
  },

  setSearchQuery: (q) => set({ searchQuery: q }),

  getFilteredPasswords: () => {
    const { passwords, searchQuery } = get();
    if (!searchQuery.trim()) return passwords;
    const q = searchQuery.toLowerCase();
    return passwords.filter(p =>
      p.domain.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      (p.name && p.name.toLowerCase().includes(q))
    );
  },

  getPasswordForDomain: (domain) => {
    const d = domain.toLowerCase();
    return get().passwords.find(p => p.domain.toLowerCase() === d);
  },
}));
