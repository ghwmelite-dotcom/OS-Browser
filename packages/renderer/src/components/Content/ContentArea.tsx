import React from 'react';
import { useTabsStore } from '@/store/tabs';
import { NewTabPage } from './NewTabPage';

export function ContentArea() {
  const { tabs, activeTabId } = useTabsStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const isNewTab = !activeTab || activeTab.url === 'os-browser://newtab';

  if (isNewTab) {
    return <NewTabPage />;
  }

  // For real URLs, WebContentsView is managed by the main process
  // The renderer just shows a transparent container
  return <div className="flex-1" />;
}
