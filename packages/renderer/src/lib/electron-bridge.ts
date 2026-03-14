// Provides a safe wrapper around window.osBrowser
// In Electron: uses real IPC bridge from preload
// In browser (dev): uses mock implementations so the UI renders

const isElectron = !!(window as any).osBrowser;

const noop = () => Promise.resolve(undefined as any);
const noopArr = () => Promise.resolve([]);
const noopObj = () => Promise.resolve({});

// Mock osBrowser API for browser-only dev mode
const mockBridge = {
  minimize: noop,
  maximize: noop,
  close: noop,
  fullscreen: noop,

  tabs: {
    create: async (url?: string) => ({
      id: crypto.randomUUID(),
      title: 'New Tab',
      url: url || 'os-browser://newtab',
      favicon_path: null,
      position: 0,
      is_pinned: false,
      is_active: true,
      is_muted: false,
      last_accessed_at: new Date().toISOString(),
    }),
    close: noop,
    switch: noop,
    update: noop,
    list: noopArr,
    navigate: noop,
    goBack: noop,
    goForward: noop,
    reload: noop,
    stop: noop,
  },

  history: {
    list: noopArr,
    add: noop,
    delete: noop,
    clear: noop,
    search: noopArr,
  },

  bookmarks: {
    list: async () => ({ bookmarks: [], folders: [] }),
    add: noop,
    update: noop,
    delete: noop,
    isBookmarked: async () => false,
    createFolder: noop,
    deleteFolder: noop,
  },

  ai: {
    chat: async () => ({ content: 'AI features require Electron + Cloudflare Worker', model: 'mock' }),
    onChatStream: () => () => {},
    summarize: async () => ({ summary: 'Mock summary', cached: false }),
    translate: async () => ({ translated_text: 'Mock translation' }),
    search: async () => ({ answer: 'Mock search answer', query: '' }),
  },

  settings: {
    get: async () => ({
      id: 1,
      display_name: 'User',
      email: null,
      avatar_path: null,
      default_model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      theme: 'dark' as const,
      language: 'en',
      sidebar_position: 'right' as const,
      ad_blocking: true,
      privacy_mode: false,
      search_engine: 'osbrowser',
      sync_enabled: false,
      created_at: new Date().toISOString(),
    }),
    update: async (data: any) => data,
  },

  conversations: {
    list: noopArr,
    create: noop,
    delete: noop,
    messages: noopArr,
    addMessage: noop,
  },

  agents: {
    list: noopArr,
    create: noop,
    update: noop,
    delete: noop,
    execute: async () => ({ content: 'Mock agent response' }),
  },

  stats: {
    get: async () => ({ totalPages: 0, totalBookmarks: 0, totalConversations: 0, totalAdsBlocked: 0 }),
  },

  govPortals: {
    list: async () => [
      { id: 1, name: 'Ghana.gov', url: 'https://ghana.gov.gh', category: 'General', icon_path: null, position: 0, is_default: true, is_visible: true },
      { id: 2, name: 'GIFMIS', url: 'https://gifmis.finance.gov.gh', category: 'Finance', icon_path: null, position: 1, is_default: true, is_visible: true },
      { id: 3, name: 'CAGD Payroll', url: 'https://cagd.gov.gh', category: 'Payroll', icon_path: null, position: 2, is_default: true, is_visible: true },
      { id: 4, name: 'GRA Tax Portal', url: 'https://gra.gov.gh', category: 'Tax', icon_path: null, position: 3, is_default: true, is_visible: true },
      { id: 5, name: 'SSNIT', url: 'https://ssnit.org.gh', category: 'Pensions', icon_path: null, position: 4, is_default: true, is_visible: true },
      { id: 6, name: 'Public Services Commission', url: 'https://psc.gov.gh', category: 'HR', icon_path: null, position: 5, is_default: true, is_visible: true },
      { id: 7, name: 'Ghana Health Service', url: 'https://ghs.gov.gh', category: 'Health', icon_path: null, position: 6, is_default: true, is_visible: true },
      { id: 8, name: 'Ministry of Finance', url: 'https://mofep.gov.gh', category: 'Finance', icon_path: null, position: 7, is_default: true, is_visible: true },
      { id: 9, name: 'OHCS Platform', url: 'https://ohcs.gov.gh', category: 'HR', icon_path: null, position: 8, is_default: true, is_visible: true },
      { id: 10, name: 'E-SPAR Portal', url: 'https://ohcsgh.web.app', category: 'HR/Appraisal', icon_path: null, position: 9, is_default: true, is_visible: true },
    ],
    update: noop,
  },

  connectivity: {
    getStatus: async () => 'online',
    onStatusChanged: () => () => {},
  },

  offlineQueue: {
    count: async () => 0,
    onStatus: () => () => {},
  },

  app: {
    getVersion: async () => '1.0.0',
    checkUpdate: noop,
  },
};

// Inject mock if not in Electron
if (!isElectron) {
  (window as any).osBrowser = mockBridge;
}

export const bridge = (window as any).osBrowser;
export { isElectron };
