// Password store with AES-256-GCM encryption via IPC (passwordVault).
// Falls back to Base64 when IPC is unavailable (dev mode).
// On load, legacy Base64 entries are detected and re-encrypted transparently.
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
  ready: boolean;

  addPassword: (entry: Omit<SavedPassword, 'id' | 'createdAt' | 'lastUsedAt'>) => void;
  updatePassword: (id: string, updates: Partial<SavedPassword>) => void;
  removePassword: (id: string) => void;
  setSearchQuery: (q: string) => void;
  getFilteredPasswords: () => SavedPassword[];
  getPasswordForDomain: (domain: string) => SavedPassword | undefined;
}

const STORAGE_KEY = 'os-browser-passwords';
const MAX_ENTRIES = 500;

// AES-256-GCM encrypted strings contain a ":" separator (iv:ciphertext).
// Pure Base64 (legacy) strings do NOT contain ":".
function isLegacyBase64(stored: string): boolean {
  return !stored.includes(':');
}

function hasIPC(): boolean {
  return !!(window as any).osBrowser?.passwordVault;
}

async function encryptPassword(plain: string): Promise<string> {
  if (hasIPC()) {
    try {
      const result = await (window as any).osBrowser.passwordVault.encrypt(plain);
      if (result?.success && result.data) return result.data;
    } catch { /* fall through */ }
  }
  // Fallback: Base64 (dev mode only)
  try { return btoa(plain); } catch { return plain; }
}

async function decryptPassword(stored: string): Promise<string> {
  if (hasIPC() && !isLegacyBase64(stored)) {
    try {
      const result = await (window as any).osBrowser.passwordVault.decrypt(stored);
      if (result?.success && result.data) return result.data;
    } catch { /* fall through to Base64 attempt */ }
  }
  // Fallback: try Base64 decode (handles legacy data + dev mode)
  try { return atob(stored); } catch { return stored; }
}

async function loadFromStorage(): Promise<SavedPassword[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPassword[];

    let needsReEncrypt = false;
    const decrypted = await Promise.all(
      parsed.map(async (p) => {
        const wasLegacy = isLegacyBase64(p.password);
        const plaintext = await decryptPassword(p.password);
        if (wasLegacy && hasIPC()) needsReEncrypt = true;
        return { ...p, password: plaintext };
      }),
    );

    // Re-encrypt legacy Base64 entries with AES-256-GCM
    if (needsReEncrypt) {
      const reEncoded = await Promise.all(
        decrypted.map(async (p) => ({
          ...p,
          password: await encryptPassword(p.password),
        })),
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reEncoded));
      } catch { /* storage full */ }
    }

    return decrypted;
  } catch {
    return [];
  }
}

async function saveToStorage(passwords: SavedPassword[]): Promise<void> {
  try {
    const encoded = await Promise.all(
      passwords.map(async (p) => ({
        ...p,
        password: await encryptPassword(p.password),
      })),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encoded));
  } catch { /* storage full or unavailable */ }
}

function generateId(): string {
  return `pw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const usePasswordStore = create<PasswordState>((set, get) => {
  // Kick off async load
  loadFromStorage().then((passwords) => {
    set({ passwords, ready: true });
  });

  return {
    passwords: [],
    searchQuery: '',
    ready: false,

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
  };
});
