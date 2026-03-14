import React, { useRef, useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useTabsStore } from '@/store/tabs';
import { Tab } from './Tab';

export function TabBar() {
  const { tabs, activeTabId, createTab, closeTab, switchTab } = useTabsStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFadeLeft, setShowFadeLeft] = useState(false);
  const [showFadeRight, setShowFadeRight] = useState(false);

  const updateFades = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowFadeLeft(el.scrollLeft > 4);
    setShowFadeRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    updateFades();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateFades, { passive: true });
    const ro = new ResizeObserver(updateFades);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateFades);
      ro.disconnect();
    };
  }, [tabs.length]);

  useEffect(() => {
    if (!activeTabId || !scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  return (
    <div
      className="h-9 bg-bg flex items-end shrink-0 relative select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      role="tablist"
    >
      <div className="flex-1 relative overflow-hidden flex items-end">
        {showFadeLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-6 z-30 pointer-events-none bg-gradient-to-r from-bg to-transparent" />
        )}

        <div
          ref={scrollRef}
          className="flex items-end overflow-x-auto overflow-y-hidden scrollbar-none h-full"
          style={{
            WebkitAppRegion: 'no-drag',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
          onWheel={(e) => {
            if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY;
          }}
        >
          {tabs.map((tab, index) => (
            <div key={tab.id} data-tab-id={tab.id} className="h-[36px] flex items-end">
              <Tab
                id={tab.id}
                title={tab.title}
                favicon={tab.favicon_path}
                url={tab.url}
                isActive={tab.id === activeTabId}
                isPinned={tab.is_pinned}
                isLoading={tab.is_loading}
                index={index}
                onSwitch={() => switchTab(tab.id)}
                onClose={() => closeTab(tab.id)}
              />
            </div>
          ))}

          {/* + button inline right after the last tab */}
          <div
            className="h-[36px] flex items-center px-1"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={() => createTab()}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-2 transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-ghana-gold/50"
              aria-label="New tab"
              title="New tab (Ctrl+T)"
            >
              <Plus size={15} className="text-text-muted hover:text-text-primary transition-colors duration-150" />
            </button>
          </div>
        </div>

        {showFadeRight && (
          <div className="absolute right-0 top-0 bottom-0 w-6 z-30 pointer-events-none bg-gradient-to-l from-bg to-transparent" />
        )}
      </div>
    </div>
  );
}
