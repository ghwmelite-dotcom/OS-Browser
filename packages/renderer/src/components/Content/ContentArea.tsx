import React from 'react';
import { useTabsStore } from '@/store/tabs';
import { useNavigationStore } from '@/store/navigation';
import { NewTabPage } from './NewTabPage';

export function ContentArea() {
  const { tabs, activeTabId } = useTabsStore();
  const { currentUrl } = useNavigationStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  // Show NewTabPage only if BOTH the tab URL and navigation URL are newtab
  // This handles the case where navigate() updates currentUrl but tab store hasn't synced yet
  const tabUrl = activeTab?.url || 'os-browser://newtab';
  const isNewTab = tabUrl === 'os-browser://newtab' && (currentUrl === 'os-browser://newtab' || currentUrl === '');

  if (isNewTab) {
    return <NewTabPage />;
  }

  // For real URLs, WebContentsView is managed by the main process
  return <div className="flex-1" />;
}
