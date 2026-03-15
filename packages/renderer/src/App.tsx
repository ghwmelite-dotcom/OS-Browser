import React, { useEffect, useState } from 'react';
import { TitleBar } from './components/Browser/TitleBar';
import { TabBar } from './components/Browser/TabBar';
import { NavigationBar } from './components/Browser/NavigationBar';
import { BookmarksBar } from './components/Browser/BookmarksBar';
import { StatusBar } from './components/Browser/StatusBar';
import { ContentArea } from './components/Content/ContentArea';
import { AISidebar } from './components/Sidebar/AISidebar';
import { AskOzzyPanel } from './components/AskOzzyPanel';
import { HistoryPanel } from './components/Panels/HistoryPanel';
import { BookmarkManager } from './components/Panels/BookmarkManager';
import { SettingsPanel } from './components/Panels/SettingsPanel';
import { useTabsStore } from './store/tabs';
import { useNavigationStore } from './store/navigation';
import { useSettingsStore } from './store/settings';
import { useConnectivityStore } from './store/connectivity';
import { useStatsStore } from './store/stats';
import { useSidebarStore } from './store/sidebar';
import { useSplitScreenStore } from './store/splitscreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { CommandPalette } from './components/CommandPalette';
import { FloatingAIBar } from './components/FloatingAIBar';
import { SplitScreenToolbar, SplitScreenContent, SplitScreenPicker } from './components/SplitScreen';
import { CurrencyTools } from './components/CurrencyTools';
import { TwiDictionary } from './components/TwiDictionary';
import { ReadingMode } from './components/ReadingMode';
import { DownloadBar } from './components/DownloadBar';
import { Onboarding } from './components/Onboarding';

export function App() {
  const { loadTabs, createTab } = useTabsStore();
  const { loadSettings } = useSettingsStore();
  const { init: initConnectivity } = useConnectivityStore();
  const { loadStats } = useStatsStore();
  const { isOpen, activePanel } = useSidebarStore();

  const [showHistory, setShowHistory] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSplitPicker, setShowSplitPicker] = useState(false);
  const [showCurrencyTools, _setShowCurrencyTools] = useState(false);
  const [showTwiDictionary, _setShowTwiDictionary] = useState(false);
  const [readingMode, setReadingMode] = useState<{ active: boolean; content: string; title: string; url: string }>({ active: false, content: '', title: '', url: '' });
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Wrap sidebar panel setters to hide/show WebContentsViews
  const setShowCurrencyTools = (v: boolean | ((prev: boolean) => boolean)) => {
    _setShowCurrencyTools(prev => {
      const newVal = typeof v === 'function' ? v(prev) : v;
      if (newVal) window.osBrowser?.hideWebViews?.();
      else if (!showTwiDictionary && !isOpen) window.osBrowser?.showWebViews?.();
      return newVal;
    });
  };
  const setShowTwiDictionary = (v: boolean | ((prev: boolean) => boolean)) => {
    _setShowTwiDictionary(prev => {
      const newVal = typeof v === 'function' ? v(prev) : v;
      if (newVal) window.osBrowser?.hideWebViews?.();
      else if (!showCurrencyTools && !isOpen) window.osBrowser?.showWebViews?.();
      return newVal;
    });
  };

  // Also hide views when AI sidebar or AskOzzy panel opens
  useEffect(() => {
    if (isOpen) window.osBrowser?.hideWebViews?.();
    else if (!showCurrencyTools && !showTwiDictionary) window.osBrowser?.showWebViews?.();
  }, [isOpen]);
  const splitActive = useSplitScreenStore(s => s.isActive);

  useKeyboardShortcuts({
    onToggleHistory: () => setShowHistory(prev => !prev),
    onToggleBookmarks: () => setShowBookmarks(prev => !prev),
    onToggleSettings: () => setShowSettings(prev => !prev),
    onToggleCommandPalette: () => setShowCommandPalette(prev => !prev),
    onToggleSplitScreen: () => {
      const { isActive, deactivate } = useSplitScreenStore.getState();
      if (isActive) deactivate();
      else setShowSplitPicker(true);
    },
    onBookmarkPage: async () => {
      const url = useNavigationStore.getState().currentUrl;
      const tabs = useTabsStore.getState().tabs;
      const activeTab = tabs.find(t => t.id === useTabsStore.getState().activeTabId);
      if (url && !url.startsWith('os-browser://')) {
        const isBookmarked = await window.osBrowser.bookmarks.isBookmarked(url);
        if (!isBookmarked) {
          await window.osBrowser.bookmarks.add({ url, title: activeTab?.title || url });
        } else {
          const data = await window.osBrowser.bookmarks.list();
          const bms = data.bookmarks || data || [];
          const match = bms.find((b: any) => b.url === url);
          if (match) await window.osBrowser.bookmarks.delete(match.id);
        }
        // Notify BookmarkStar to refresh its state
        window.dispatchEvent(new Event('bookmark-changed'));
      }
    },
  });

  useEffect(() => {
    const init = async () => {
      try {
        await loadSettings();
        const settings = useSettingsStore.getState().settings as any;
        const startupMode = settings?.startup_mode || 'newtab';

        // Check if this is a private window (always dark mode)
        const isPrivate = new URLSearchParams(window.location.search).get('private') === 'true';
        if (isPrivate) {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
          // Set privacy mode
          window.osBrowser.settings.update({ privacy_mode: true });
        } else {
          // Apply saved theme on startup
          const theme = settings?.theme || 'light';
          document.documentElement.classList.toggle('dark', theme === 'dark');
          document.documentElement.classList.toggle('light', theme !== 'dark');
        }

        // Check if onboarding was completed
        const onboardingDone = (useSettingsStore.getState().settings as any)?.onboarding_completed;
        if (!onboardingDone) {
          setShowOnboarding(true);
          // During onboarding: start fresh — hide any existing web views
          // and create a single clean new tab
          window.osBrowser?.hideWebViews?.();
          await loadTabs();
          if (useTabsStore.getState().tabs.length === 0) {
            await createTab();
          }
          await loadStats();
          return; // Skip session restore — onboarding is showing
        }

        await loadTabs();
        const existingTabs = useTabsStore.getState().tabs;

        if (startupMode === 'restore' && existingTabs.length > 0) {
          for (const tab of existingTabs) {
            if (tab.url && tab.url !== 'os-browser://newtab') {
              await window.osBrowser.tabs.navigate(tab.id, tab.url);
            }
          }
        } else {
          if (existingTabs.length === 0) {
            await createTab();
          }
        }

        await loadStats();
      } catch (err) {
        console.error('Init error:', err);
      }
    };
    init();

    let cleanup: (() => void) | undefined;
    try {
      cleanup = initConnectivity();
    } catch {}

    // Listen for tab events from main process
    const cleanups: (() => void)[] = [];
    try {
      cleanups.push(window.osBrowser.tabs.onLoading((data: any) => {
        useTabsStore.getState().updateTab(data.id, { is_loading: data.isLoading });
        if (data.id === useTabsStore.getState().activeTabId) {
          useNavigationStore.getState().setLoading(data.isLoading);
        }
      }));
      cleanups.push(window.osBrowser.tabs.onUrlUpdated((data: any) => {
        useTabsStore.getState().updateTab(data.id, { url: data.url });
        if (data.id === useTabsStore.getState().activeTabId) {
          useNavigationStore.getState().setUrl(data.url);
          useNavigationStore.getState().setNavState({
            canGoBack: data.canGoBack,
            canGoForward: data.canGoForward,
          });
        }
      }));
      cleanups.push(window.osBrowser.tabs.onTitleUpdated((data: any) => {
        useTabsStore.getState().updateTab(data.id, { title: data.title });
      }));
      cleanups.push(window.osBrowser.tabs.onFaviconUpdated((data: any) => {
        useTabsStore.getState().updateTab(data.id, { favicon_path: data.favicon });
      }));
    } catch {}

    return () => {
      cleanup?.();
      cleanups.forEach(c => c());
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      const { isActive, deactivate } = useSplitScreenStore.getState();
      if (isActive) deactivate();
      else setShowSplitPicker(true);
    };
    window.addEventListener('os-browser:split-screen', handler);
    return () => window.removeEventListener('os-browser:split-screen', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowCurrencyTools(prev => !prev);
    window.addEventListener('os-browser:currency-tools', handler);
    return () => window.removeEventListener('os-browser:currency-tools', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowTwiDictionary(prev => !prev);
    window.addEventListener('os-browser:twi-dictionary', handler);
    return () => window.removeEventListener('os-browser:twi-dictionary', handler);
  }, []);

  useEffect(() => {
    const handleReadingMode = () => {
      const tabs = useTabsStore.getState().tabs;
      const active = tabs.find(t => t.id === useTabsStore.getState().activeTabId);
      if (active && !active.url?.startsWith('os-browser://')) {
        setReadingMode({ active: true, content: 'Reading mode extracts content from the current page. This feature is being enhanced.', title: active.title || '', url: active.url || '' });
      }
    };
    window.addEventListener('os-browser:reading-mode', handleReadingMode);
    return () => window.removeEventListener('os-browser:reading-mode', handleReadingMode);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg">
      <TitleBar />
      <TabBar />
      <NavigationBar
        onOpenHistory={() => setShowHistory(true)}
        onOpenBookmarks={() => setShowBookmarks(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => useTabsStore.getState().createTab('os-browser://stats')}
      />
      <BookmarksBar />

      {/* Content + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {splitActive && <SplitScreenToolbar />}
          {splitActive ? (
            <SplitScreenContent />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <ContentArea />
              <FloatingAIBar />
            </div>
          )}
        </div>

        {/* AI Sidebar */}
        {isOpen && activePanel === 'ai' && <AISidebar />}

        {/* AskOzzy Panel */}
        {isOpen && activePanel === 'askozzy' && <AskOzzyPanel />}

        {/* GHS Currency & SSNIT Tools */}
        {showCurrencyTools && <CurrencyTools onClose={() => setShowCurrencyTools(false)} />}

        {/* Twi Dictionary */}
        {showTwiDictionary && <TwiDictionary onClose={() => setShowTwiDictionary(false)} />}
      </div>

      <DownloadBar />
      <StatusBar />

      {showSplitPicker && <SplitScreenPicker onClose={() => setShowSplitPicker(false)} />}

      <ReadingMode
        isActive={readingMode.active}
        content={readingMode.content}
        title={readingMode.title}
        url={readingMode.url}
        onClose={() => setReadingMode({ active: false, content: '', title: '', url: '' })}
      />

      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />

      {/* Overlay Panels */}
      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
      {showBookmarks && <BookmarkManager onClose={() => setShowBookmarks(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {showOnboarding && <Onboarding onComplete={() => {
        useSettingsStore.getState().updateSettings({ onboarding_completed: true });
        setShowOnboarding(false);
        useSettingsStore.getState().loadSettings();
        // Show web views now that onboarding is done
        window.osBrowser?.showWebViews?.();
      }} />}
    </div>
  );
}
