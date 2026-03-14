import { create } from 'zustand';

interface NavigationState {
  currentUrl: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isSecure: boolean;
  pageTitle: string;

  setUrl: (url: string) => void;
  setLoading: (loading: boolean) => void;
  setNavState: (data: Partial<NavigationState>) => void;
  navigate: (tabId: string, url: string) => Promise<void>;
  goBack: (tabId: string) => Promise<void>;
  goForward: (tabId: string) => Promise<void>;
  reload: (tabId: string) => Promise<void>;
  stop: (tabId: string) => Promise<void>;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentUrl: 'os-browser://newtab',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  isSecure: false,
  pageTitle: 'New Tab',

  setUrl: (url) => set({ currentUrl: url, isSecure: url.startsWith('https://') }),
  setLoading: (isLoading) => set({ isLoading }),
  setNavState: (data) => set(data),

  navigate: async (tabId, url) => {
    let finalUrl = url;
    if (!url.includes('://') && url.includes('.') && !url.includes(' ')) {
      finalUrl = `https://${url}`;
    }
    set({ isLoading: true, currentUrl: finalUrl, isSecure: finalUrl.startsWith('https://') });
    // Also update the tab's URL in the tabs store so ContentArea switches from NewTabPage
    const { useTabsStore } = await import('./tabs');
    useTabsStore.getState().updateTab(tabId, { url: finalUrl });
    await window.osBrowser.tabs.navigate(tabId, finalUrl);
  },

  goBack: async (tabId) => {
    await window.osBrowser.tabs.goBack(tabId);
  },

  goForward: async (tabId) => {
    await window.osBrowser.tabs.goForward(tabId);
  },

  reload: async (tabId) => {
    set({ isLoading: true });
    await window.osBrowser.tabs.reload(tabId);
  },

  stop: async (tabId) => {
    set({ isLoading: false });
    await window.osBrowser.tabs.stop(tabId);
  },
}));
