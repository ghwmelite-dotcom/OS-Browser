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
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export function App() {
  const { loadTabs, createTab } = useTabsStore();
  const { loadSettings } = useSettingsStore();
  const { init: initConnectivity } = useConnectivityStore();
  const { loadStats } = useStatsStore();
  const { isOpen, activePanel } = useSidebarStore();

  const [showHistory, setShowHistory] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useKeyboardShortcuts({
    onToggleHistory: () => setShowHistory(prev => !prev),
    onToggleBookmarks: () => setShowBookmarks(prev => !prev),
    onToggleSettings: () => setShowSettings(prev => !prev),
  });

  useEffect(() => {
    const init = async () => {
      try {
        await loadSettings();
        const settings = useSettingsStore.getState().settings as any;
        const startupMode = settings?.startup_mode || 'newtab';

        await loadTabs();
        const existingTabs = useTabsStore.getState().tabs;

        if (startupMode === 'restore' && existingTabs.length > 0) {
          // Resume where user left off — tabs are already loaded from DB
          // Navigate each tab that has a real URL to restore the WebContentsView
          for (const tab of existingTabs) {
            if (tab.url && tab.url !== 'os-browser://newtab') {
              await window.osBrowser.tabs.navigate(tab.id, tab.url);
            }
          }
        } else {
          // Start fresh — create a new tab if none exist
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

  return (
    <div className="h-screen w-screen flex flex-col bg-bg">
      <TitleBar />
      <TabBar />
      <NavigationBar
        onOpenHistory={() => setShowHistory(true)}
        onOpenBookmarks={() => setShowBookmarks(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => {}}
      />
      <BookmarksBar />

      {/* Content + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <ContentArea />
        </div>

        {/* AI Sidebar */}
        {isOpen && activePanel === 'ai' && <AISidebar />}

        {/* AskOzzy Panel */}
        {isOpen && activePanel === 'askozzy' && <AskOzzyPanel />}
      </div>

      <StatusBar />

      {/* Overlay Panels */}
      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
      {showBookmarks && <BookmarkManager onClose={() => setShowBookmarks(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
