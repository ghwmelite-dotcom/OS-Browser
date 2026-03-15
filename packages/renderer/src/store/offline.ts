import { create } from 'zustand';

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
  toggleAutoCacheRule: (id: string) => void;
  addAutoCacheRule: (pattern: string, label: string) => void;
  setSearchQuery: (q: string) => void;
  recalcStorage: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function estimateSize(content: string): number {
  return new Blob([content]).size;
}

// ── Default auto-cache rules ──────────────────────────────────────────────

const DEFAULT_AUTO_CACHE_RULES: AutoCacheRule[] = [
  { id: 'rule-gov-gh',   pattern: '*.gov.gh',       enabled: true,  label: 'Ghana Government Sites' },
  { id: 'rule-edu-gh',   pattern: '*.edu.gh',        enabled: true,  label: 'Educational Institutions' },
  { id: 'rule-ssnit',    pattern: 'ssnit.org.gh/*',  enabled: true,  label: 'SSNIT Portal' },
  { id: 'rule-gra',      pattern: 'gra.gov.gh/*',    enabled: true,  label: 'Revenue Authority' },
  { id: 'rule-nhis',     pattern: 'nhis.gov.gh/*',   enabled: true,  label: 'Health Insurance' },
];

// ── Sample saved pages ───────────────────────────────────────────────────

const SAMPLE_SAVED_PAGES: SavedPage[] = [
  {
    id: 'sample-ghana-gov',
    url: 'https://ghana.gov.gh',
    title: 'Ghana.gov — Official Government Portal',
    savedAt: Date.now() - 86_400_000 * 2, // 2 days ago
    size: 245_760, // ~240KB
    category: 'gov',
    content: '<html><head><title>Ghana.gov</title></head><body><h1>Welcome to Ghana.gov</h1><p>The official portal of the Government of Ghana for digital services, payments, and information.</p></body></html>',
    favicon: 'https://ghana.gov.gh/favicon.ico',
  },
  {
    id: 'sample-gra',
    url: 'https://gra.gov.gh',
    title: 'Ghana Revenue Authority — Tax Services',
    savedAt: Date.now() - 86_400_000, // 1 day ago
    size: 189_440, // ~185KB
    category: 'gov',
    content: '<html><head><title>GRA</title></head><body><h1>Ghana Revenue Authority</h1><p>Tax filing, TIN registration, and revenue collection services for individuals and businesses.</p></body></html>',
    favicon: 'https://gra.gov.gh/favicon.ico',
  },
  {
    id: 'sample-ssnit',
    url: 'https://ssnit.org.gh',
    title: 'SSNIT — Social Security & National Insurance Trust',
    savedAt: Date.now() - 3_600_000 * 8, // 8 hours ago
    size: 156_672, // ~153KB
    category: 'gov',
    content: '<html><head><title>SSNIT</title></head><body><h1>SSNIT</h1><p>Manage your pension contributions, check benefits, and access social security services online.</p></body></html>',
    favicon: 'https://ssnit.org.gh/favicon.ico',
  },
  {
    id: 'sample-nhis',
    url: 'https://nhis.gov.gh',
    title: 'NHIS — National Health Insurance Scheme',
    savedAt: Date.now() - 3_600_000 * 36, // 36 hours ago
    size: 132_096, // ~129KB
    category: 'auto-cached',
    content: '<html><head><title>NHIS</title></head><body><h1>National Health Insurance Scheme</h1><p>Register, renew, and check the status of your national health insurance membership.</p></body></html>',
    favicon: 'https://nhis.gov.gh/favicon.ico',
  },
];

// ── Store ──────────────────────────────────────────────────────────────────

export const useOfflineStore = create<OfflineState>((set, get) => {
  const initialPages = SAMPLE_SAVED_PAGES;
  const initialStorage = initialPages.reduce((sum, p) => sum + p.size, 0);

  return {
    savedPages: initialPages,
    queuedSubmissions: [],
    autoCacheRules: DEFAULT_AUTO_CACHE_RULES,
    totalStorageUsed: initialStorage,
    storageLimit: 500 * 1024 * 1024, // 500MB
    searchQuery: '',

    savePage: (page) => {
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
    },

    removePage: (id) => {
      set(state => {
        const page = state.savedPages.find(p => p.id === id);
        return {
          savedPages: state.savedPages.filter(p => p.id !== id),
          totalStorageUsed: state.totalStorageUsed - (page?.size ?? 0),
        };
      });
    },

    clearAllPages: () => {
      set({ savedPages: [], totalStorageUsed: 0 });
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
    },

    removeSubmission: (id) => {
      set(state => ({
        queuedSubmissions: state.queuedSubmissions.filter(s => s.id !== id),
      }));
    },

    updateSubmissionStatus: (id, status) => {
      set(state => ({
        queuedSubmissions: state.queuedSubmissions.map(s =>
          s.id === id ? { ...s, status } : s
        ),
      }));
    },

    retrySubmission: (id) => {
      set(state => ({
        queuedSubmissions: state.queuedSubmissions.map(s =>
          s.id === id ? { ...s, status: 'pending' as const, retryCount: s.retryCount + 1 } : s
        ),
      }));
    },

    toggleAutoCacheRule: (id) => {
      set(state => ({
        autoCacheRules: state.autoCacheRules.map(r =>
          r.id === id ? { ...r, enabled: !r.enabled } : r
        ),
      }));
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
    },

    setSearchQuery: (q) => set({ searchQuery: q }),

    recalcStorage: () => {
      set(state => ({
        totalStorageUsed: state.savedPages.reduce((sum, p) => sum + p.size, 0),
      }));
    },
  };
});
