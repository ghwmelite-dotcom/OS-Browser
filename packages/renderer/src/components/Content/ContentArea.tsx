import React from 'react';
import { useTabsStore } from '@/store/tabs';
import { NewTabPage } from './NewTabPage';
import { SettingsPage } from '../Panels/SettingsPanel';

export function ContentArea() {
  const { tabs, activeTabId } = useTabsStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const tabUrl = activeTab?.url || 'os-browser://newtab';

  // Internal pages
  if (!tabUrl || tabUrl === 'os-browser://newtab') {
    return <NewTabPage />;
  }

  if (tabUrl === 'os-browser://settings') {
    return <SettingsPage />;
  }

  // For real URLs the main-process WebContentsView renders natively on top.
  return <div className="flex-1" style={{ pointerEvents: 'none' }} />;
}
