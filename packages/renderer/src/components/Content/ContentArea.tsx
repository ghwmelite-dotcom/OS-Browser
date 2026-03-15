import React from 'react';
import { useTabsStore } from '@/store/tabs';
import { NewTabPage } from './NewTabPage';
import { PrivateTabPage } from './PrivateTabPage';
import { SettingsPage } from '../Panels/SettingsPanel';
import { StatsPage } from '../Panels/StatsPage';
import { HelpPage } from './HelpPage';
import { DocsPage } from './DocsPage';
import { BookmarksPage } from './BookmarksPage';
import { DataDashboard } from '../DataSaver/DataDashboard';

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

  // Downloads tab
  if (tabUrl === 'os-browser://downloads') {
    return (
      <div className="min-h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-[680px] mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-accent)', color: '#fff' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Downloads</h1>
              <p className="text-[12px] text-text-muted">Your downloaded files appear here</p>
            </div>
          </div>
          <div className="text-center py-16 text-text-muted">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-30"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <p className="text-[14px]">No downloads yet</p>
            <p className="text-[12px] mt-1">Files you download will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  // Statistics tab
  if (tabUrl === 'os-browser://stats') {
    return <StatsPage />;
  }

  // Docs tab
  if (tabUrl === 'os-browser://docs') {
    return <DocsPage />;
  }

  if (tabUrl === 'os-browser://bookmarks') {
    return <BookmarksPage />;
  }

  // Data Dashboard tab
  if (tabUrl === 'os-browser://data') {
    return <DataDashboard />;
  }

  // Help tab
  if (tabUrl === 'os-browser://help') {
    return <HelpPage />;
  }

  // Real URLs — WebContentsView renders natively on top
  return <div className="flex-1" style={{ pointerEvents: 'none' }} />;
}
