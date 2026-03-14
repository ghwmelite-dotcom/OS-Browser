import React, { useEffect } from 'react';
import { TitleBar } from './components/Browser/TitleBar';
import { TabBar } from './components/Browser/TabBar';
import { NavigationBar } from './components/Browser/NavigationBar';
import { StatusBar } from './components/Browser/StatusBar';
import { useTabsStore } from './store/tabs';
import { useSettingsStore } from './store/settings';
import { useConnectivityStore } from './store/connectivity';
import { useStatsStore } from './store/stats';
import { useSidebarStore } from './store/sidebar';

export function App() {
  const { loadTabs, createTab, tabs } = useTabsStore();
  const { loadSettings } = useSettingsStore();
  const { init: initConnectivity } = useConnectivityStore();
  const { loadStats } = useStatsStore();
  const { isOpen } = useSidebarStore();

  useEffect(() => {
    loadSettings();
    loadTabs().then(() => {
      if (useTabsStore.getState().tabs.length === 0) {
        createTab();
      }
    });
    loadStats();
    const cleanup = initConnectivity();
    return cleanup;
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg">
      <TitleBar />
      <TabBar />
      <NavigationBar />

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex items-center justify-center text-text-muted">
          {/* NewTabPage or WebContentsView will render here */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-ghana-gold mb-2">OS Browser</h1>
            <p className="text-md text-text-secondary">Ghana's AI-Powered Browser</p>
          </div>
        </div>

        {/* Sidebar placeholder */}
        {isOpen && (
          <div className="w-[380px] bg-surface-1 border-l border-border-1 animate-slide-in-right">
            <div className="p-4 text-text-secondary text-sm">AI Sidebar — Coming next</div>
          </div>
        )}
      </div>

      <StatusBar />
    </div>
  );
}
