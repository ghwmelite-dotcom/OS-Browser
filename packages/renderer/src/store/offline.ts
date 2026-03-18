import { create } from 'zustand';
import { useNotificationStore } from '@/store/notifications';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SavedPage {
  id: string;
  url: string;
  title: string;
  savedAt: number;
  size: number; // bytes (estimated)
  category: 'manual' | 'auto-cached' | 'gov';
  content: string; // simplified HTML content
  favicon?: string;
}

export interface QueuedSubmission {
  id: string;
  url: string;
  method: 'POST' | 'PUT';
  formData: Record<string, string>;
  queuedAt: number;
  status: 'pending' | 'submitting' | 'failed' | 'submitted';
  retryCount: number;
  description: string; // user-friendly label like "GRA Tax Filing Form"
}

export interface AutoCacheRule {
  id: string;
  pattern: string; // URL pattern like "*.gov.gh"
  enabled: boolean;
  label: string;
}

interface OfflineState {
  savedPages: SavedPage[];
  queuedSubmissions: QueuedSubmission[];
  autoCacheRules: AutoCacheRule[];
  totalStorageUsed: number; // bytes
  storageLimit: number; // 500MB default
  searchQuery: string;

  // Actions
  savePage: (page: Omit<SavedPage, 'id' | 'savedAt' | 'size'>) => void;
  removePage: (id: string) => void;
  clearAllPages: () => void;
  queueSubmission: (sub: Omit<QueuedSubmission, 'id' | 'queuedAt' | 'status' | 'retryCount'>) => void;
  removeSubmission: (id: string) => void;
  updateSubmissionStatus: (id: string, status: QueuedSubmission['status']) => void;
  retrySubmission: (id: string) => void;
  retryAllPending: () => void;
  toggleAutoCacheRule: (id: string) => void;
  addAutoCacheRule: (pattern: string, label: string) => void;
  setSearchQuery: (q: string) => void;
  recalcStorage: () => void;
  urlMatchesAutoCacheRules: (url: string) => boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function estimateSize(content: string): number {
  return new Blob([content]).size;
}

// ── localStorage persistence ──────────────────────────────────────────────

const STORAGE_KEY = 'offline_library_data';

interface PersistedData {
  savedPages: SavedPage[];
  queuedSubmissions: QueuedSubmission[];
  autoCacheRules: AutoCacheRule[];
}

function loadFromStorage(): PersistedData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedData;
    // Validate structure
    if (Array.isArray(parsed.savedPages) && Array.isArray(parsed.queuedSubmissions) && Array.isArray(parsed.autoCacheRules)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(data: PersistedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable - silently fail
  }
}

function getRealStorageUsed(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    return new Blob([raw]).size;
  } catch {
    return 0;
  }
}

// ── URL pattern matching ──────────────────────────────────────────────────

function urlMatchesPattern(url: string, pattern: string): boolean {
  try {
    // Normalize: remove protocol for matching
    const urlHost = new URL(url).hostname;
    const urlPath = new URL(url).pathname;
    const urlFull = urlHost + urlPath;

    // Convert glob pattern to regex:
    // *.gov.gh -> matches any subdomain of gov.gh
    // gra.gov.gh/* -> matches any path on gra.gov.gh
    // ssnit.org.gh/* -> matches any path on ssnit.org.gh
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // escape regex specials except *
      .replace(/\\\*/g, '.*'); // convert * back to .*

    // If pattern has no slash, match against hostname only
    if (!pattern.includes('/')) {
      const re = new RegExp(`^${escaped}$`, 'i');
      return re.test(urlHost);
    }

    // Otherwise match against host+path
    const re = new RegExp(`^${escaped}`, 'i');
    return re.test(urlFull);
  } catch {
    return false;
  }
}

// ── Default auto-cache rules ──────────────────────────────────────────────

const DEFAULT_AUTO_CACHE_RULES: AutoCacheRule[] = [
  { id: 'rule-gov-gh',   pattern: '*.gov.gh',       enabled: true,  label: 'Ghana Government Sites' },
  { id: 'rule-edu-gh',   pattern: '*.edu.gh',        enabled: true,  label: 'Educational Institutions' },
  { id: 'rule-ssnit',    pattern: 'ssnit.org.gh/*',  enabled: true,  label: 'SSNIT Portal' },
  { id: 'rule-gra',      pattern: 'gra.gov.gh/*',    enabled: true,  label: 'Revenue Authority' },
  { id: 'rule-nhis',     pattern: 'nhis.gov.gh/*',   enabled: true,  label: 'Health Insurance' },
];

// ── Store ──────────────────────────────────────────────────────────────────

export const useOfflineStore = create<OfflineState>((set, get) => {
  // Load persisted data or start clean
  const persisted = loadFromStorage();
  const initialPages = persisted?.savedPages ?? [];
  const initialSubmissions = persisted?.queuedSubmissions ?? [];
  const initialRules = persisted?.autoCacheRules ?? DEFAULT_AUTO_CACHE_RULES;
  const initialStorage = initialPages.reduce((sum, p) => sum + p.size, 0);

  // Helper to persist after each mutation
  const persistState = () => {
    const state = get();
    saveToStorage({
      savedPages: state.savedPages,
      queuedSubmissions: state.queuedSubmissions,
      autoCacheRules: state.autoCacheRules,
    });
  };

  return {
    savedPages: initialPages,
    queuedSubmissions: initialSubmissions,
    autoCacheRules: initialRules,
    totalStorageUsed: initialStorage,
    storageLimit: 500 * 1024 * 1024, // 500MB
    searchQuery: '',

    savePage: (page) => {
      // Prevent duplicate saves of the same URL
      const existing = get().savedPages.find(p => p.url === page.url);
      if (existing) {
        // Update existing page instead of adding duplicate
        const size = estimateSize(page.content);
        set(state => ({
          savedPages: state.savedPages.map(p =>
            p.url === page.url
              ? { ...p, ...page, savedAt: Date.now(), size }
              : p
          ),
          totalStorageUsed: state.totalStorageUsed - (existing.size) + size,
        }));
        persistState();
        return;
      }

      const size = estimateSize(page.content);
      const newPage: SavedPage = {
        ...page,
        id: generateId(),
        savedAt: Date.now(),
        size,
      };
      set(state => ({
        savedPages: [newPage, ...state.savedPages],
        totalStorageUsed: state.totalStorageUsed + size,
      }));
      persistState();

      useNotificationStore.getState().addNotification({
        type: 'success',
        title: 'Page Saved Offline',
        message: `${page.title} saved for offline viewing`,
        source: 'offline',
        icon: '\u{1F4E5}',
      });
    },

    removePage: (id) => {
      set(state => {
        const page = state.savedPages.find(p => p.id === id);
        return {
          savedPages: state.savedPages.filter(p => p.id !== id),
          totalStorageUsed: state.totalStorageUsed - (page?.size ?? 0),
        };
      });
      persistState();
    },

    clearAllPages: () => {
      set({ savedPages: [], totalStorageUsed: 0 });
      persistState();
    },

    queueSubmission: (sub) => {
      const newSub: QueuedSubmission = {
        ...sub,
        id: generateId(),
        queuedAt: Date.now(),
        status: 'pending',
        retryCount: 0,
      };
      set(state => ({
        queuedSubmissions: [newSub, ...state.queuedSubmissions],
      }));
      persistState();
    },

    removeSubmission: (id) => {
      set(state => ({
        queuedSubmissions: state.queuedSubmissions.filter(s => s.id !== id),
      }));
      persistState();
    },

    updateSubmissionStatus: (id, status) => {
      set(state => ({
        queuedSubmissions: state.queuedSubmissions.map(s =>
          s.id === id ? { ...s, status } : s
        ),
      }));
      persistState();
    },

    retrySubmission: (id) => {
      const sub = get().queuedSubmissions.find(s => s.id === id);
      if (!sub || sub.status === 'submitting') return;

      // Mark as submitting
      set(state => ({
        queuedSubmissions: state.queuedSubmissions.map(s =>
          s.id === id ? { ...s, status: 'submitting' as const, retryCount: s.retryCount + 1 } : s
        ),
      }));

      // Attempt to send the request
      if (navigator.onLine) {
        fetch(sub.url, {
          method: sub.method,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(sub.formData).toString(),
        })
          .then(res => {
            if (res.ok) {
              get().updateSubmissionStatus(id, 'submitted');
            } else {
              get().updateSubmissionStatus(id, 'failed');
            }
          })
          .catch(() => {
            get().updateSubmissionStatus(id, 'failed');
          });
      } else {
        // Not online - revert to pending
        set(state => ({
          queuedSubmissions: state.queuedSubmissions.map(s =>
            s.id === id ? { ...s, status: 'pending' as const } : s
          ),
        }));
      }
      persistState();
    },

    retryAllPending: () => {
      const pending = get().queuedSubmissions.filter(
        s => s.status === 'pending' || s.status === 'failed'
      );
      for (const sub of pending) {
        get().retrySubmission(sub.id);
      }
    },

    toggleAutoCacheRule: (id) => {
      set(state => ({
        autoCacheRules: state.autoCacheRules.map(r =>
          r.id === id ? { ...r, enabled: !r.enabled } : r
        ),
      }));
      persistState();
    },

    addAutoCacheRule: (pattern, label) => {
      const rule: AutoCacheRule = {
        id: generateId(),
        pattern,
        enabled: true,
        label,
      };
      set(state => ({
        autoCacheRules: [...state.autoCacheRules, rule],
      }));
      persistState();
    },

    setSearchQuery: (q) => set({ searchQuery: q }),

    recalcStorage: () => {
      set(state => ({
        totalStorageUsed: state.savedPages.reduce((sum, p) => sum + p.size, 0),
      }));
    },

    urlMatchesAutoCacheRules: (url: string) => {
      const rules = get().autoCacheRules;
      return rules.some(r => r.enabled && urlMatchesPattern(url, r.pattern));
    },
  };
});

// ── Online event listener: auto-retry pending submissions ─────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const store = useOfflineStore.getState();
    const pending = store.queuedSubmissions.filter(
      s => s.status === 'pending' || s.status === 'failed'
    );
    if (pending.length > 0) {
      store.retryAllPending();
    }
  });
}
