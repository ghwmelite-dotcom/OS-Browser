import React from 'react';
import { useTabsStore } from '@/store/tabs';
import { NewTabPage } from './NewTabPage';
import { PrivateTabPage } from './PrivateTabPage';
import { SettingsPage } from '../Panels/SettingsPanel';

// Detect if we're in a private window
const isPrivateWindow = new URLSearchParams(window.location.search).get('private') === 'true';

export function ContentArea() {
  const { tabs, activeTabId } = useTabsStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const tabUrl = activeTab?.url || 'os-browser://newtab';

  // New tab — show landing page (or private page in private windows)
  if (!tabUrl || tabUrl === 'os-browser://newtab') {
    return isPrivateWindow ? <PrivateTabPage /> : <NewTabPage />;
  }

  // Settings tab
  if (tabUrl === 'os-browser://settings') {
    return <SettingsPage />;
  }

  // Real URLs — WebContentsView renders natively on top
  return <div className="flex-1" style={{ pointerEvents: 'none' }} />;
}
