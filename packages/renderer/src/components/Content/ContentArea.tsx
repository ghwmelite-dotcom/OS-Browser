import React from 'react';
import { useTabsStore } from '@/store/tabs';
import { NewTabPage } from './NewTabPage';

export function ContentArea() {
  const { tabs, activeTabId } = useTabsStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const tabUrl = activeTab?.url || 'os-browser://newtab';

  // Show NewTabPage when the active tab's URL is the newtab sentinel.
  // This is the ONLY check — no navigation store dependency.
  if (!tabUrl || tabUrl === 'os-browser://newtab') {
    return <NewTabPage />;
  }

  // For real URLs the main-process WebContentsView renders natively on top.
  return <div className="flex-1" style={{ pointerEvents: 'none' }} />;
}
