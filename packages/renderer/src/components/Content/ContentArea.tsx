import React from 'react';
import { useTabsStore } from '@/store/tabs';
import { useNavigationStore } from '@/store/navigation';
import { NewTabPage } from './NewTabPage';

export function ContentArea() {
  const { tabs, activeTabId } = useTabsStore();
  const { currentUrl } = useNavigationStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  // Show NewTabPage when EITHER indicator says "newtab":
  //  - tab URL is the newtab sentinel, AND
  //  - navigation URL is also newtab (or blank/empty, which is the initial state)
  // If EITHER store has been updated to a real URL, hide NewTabPage so the
  // native WebContentsView behind becomes visible.
  const tabUrl = activeTab?.url || 'os-browser://newtab';
  const navUrl = currentUrl || '';

  const tabIsNewTab = tabUrl === 'os-browser://newtab';
  const navIsNewTab = navUrl === '' || navUrl === 'os-browser://newtab';
  const isNewTab = tabIsNewTab && navIsNewTab;

  if (isNewTab) {
    return <NewTabPage />;
  }

  // For real URLs the main-process WebContentsView is rendered natively on top
  // of this BrowserWindow. pointer-events:none ensures this transparent div
  // never intercepts clicks meant for the WebContentsView underneath.
  return <div className="flex-1" style={{ pointerEvents: 'none' }} />;
}
