import React from 'react';
import { Plus } from 'lucide-react';
import { useTabsStore } from '@/store/tabs';
import { Tab } from './Tab';

export function TabBar() {
  const { tabs, activeTabId, createTab, closeTab, switchTab } = useTabsStore();

  return (
    <div className="h-[36px] bg-surface-1 border-b border-border-1 flex items-stretch shrink-0" role="tablist">
      {/* Tabs */}
      <div className="flex-1 flex items-stretch overflow-x-auto overflow-y-hidden">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            id={tab.id}
            title={tab.title}
            favicon={tab.favicon_path}
            isActive={tab.id === activeTabId}
            isPinned={tab.is_pinned}
            isLoading={tab.is_loading}
            onSwitch={() => switchTab(tab.id)}
            onClose={() => closeTab(tab.id)}
          />
        ))}
      </div>

      {/* New Tab button */}
      <button
        onClick={() => createTab()}
        className="w-10 h-[36px] flex items-center justify-center hover:bg-surface-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ghana-gold focus:ring-inset"
        aria-label="New tab"
      >
        <Plus size={16} className="text-text-secondary" />
      </button>
    </div>
  );
}
