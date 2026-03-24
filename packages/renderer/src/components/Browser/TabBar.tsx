import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Plus, ArrowRightLeft, Pin, PinOff, Copy, X as XIcon } from 'lucide-react';
import { useTabsStore } from '@/store/tabs';
import { useWorkspaceStore } from '@/store/workspaces';
import { Tab } from './Tab';

interface ContextMenuState {
  x: number;
  y: number;
  tabId: string;
}

export function TabBar() {
  const { tabs, activeTabId, createTab, closeTab, switchTab } = useTabsStore();
  const { workspaces, activeWorkspaceId, globalPinnedTabIds, getVisibleTabIds, moveTabToWorkspace, pinTabGlobally, unpinTabGlobally, isGloballyPinned, getTabWorkspace } = useWorkspaceStore();
  const visibleTabIds = getVisibleTabIds();

  const anyWorkspaceHasTabs = workspaces.some(w => w.tabIds.length > 0);
  const visibleTabs = anyWorkspaceHasTabs
    ? tabs.filter(t => visibleTabIds.includes(t.id))
    : tabs;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFadeLeft, setShowFadeLeft] = useState(false);
  const [showFadeRight, setShowFadeRight] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowFadeLeft(el.scrollLeft > 4);
    setShowFadeRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    setContainerWidth(el.clientWidth);
  }, []);

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
  }, [visibleTabs.length, updateFades]);

  useEffect(() => {
    if (!activeTabId || !scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
    };
  }, [contextMenu]);

  const handleTabContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  }, []);

  const contextTabWorkspace = contextMenu ? getTabWorkspace(contextMenu.tabId) : undefined;
  const contextTabIsGloballyPinned = contextMenu ? isGloballyPinned(contextMenu.tabId) : false;

  return (
    <div
      className="h-9 flex items-end shrink-0 relative z-[50] select-none kente-tab-bar"
      style={{ background: 'var(--kente-tab-bg, var(--color-bg))', WebkitAppRegion: 'drag' } as React.CSSProperties}
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
          {visibleTabs.map((tab, index) => (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              className="h-[36px] flex items-end shrink-0"
              onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
            >
              <Tab
                id={tab.id}
                title={tab.title}
                favicon={tab.favicon_path}
                url={tab.url}
                isActive={tab.id === activeTabId}
                isPinned={tab.is_pinned}
                isLoading={tab.is_loading}
                index={index}
                tabCount={visibleTabs.length}
                containerWidth={containerWidth}
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

      {/* ── Tab Context Menu ── */}
      {contextMenu && (
        <div
          className="fixed z-[100] min-w-[200px] rounded-lg border shadow-xl py-1 animate-in fade-in-0 zoom-in-95 duration-100"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--color-surface-1)',
            borderColor: 'var(--color-border-1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-text-primary hover:bg-surface-2 transition-colors"
            onClick={() => {
              if (contextTabIsGloballyPinned) unpinTabGlobally(contextMenu.tabId);
              else pinTabGlobally(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            {contextTabIsGloballyPinned ? <PinOff size={14} className="text-text-muted" /> : <Pin size={14} className="text-text-muted" />}
            {contextTabIsGloballyPinned ? 'Unpin from All Workspaces' : 'Pin to All Workspaces'}
          </button>

          <div className="h-px mx-2 my-1" style={{ background: 'var(--color-border-1)' }} />

          {workspaces.filter(w => w.id !== (contextTabWorkspace?.id)).map(ws => (
            <button
              key={ws.id}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-text-primary hover:bg-surface-2 transition-colors"
              onClick={() => {
                moveTabToWorkspace(contextMenu.tabId, ws.id);
                setContextMenu(null);
              }}
            >
              <ArrowRightLeft size={14} className="text-text-muted" />
              <span>Move to</span>
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: ws.color }} />
              <span className="font-medium">{ws.name}</span>
            </button>
          ))}

          <div className="h-px mx-2 my-1" style={{ background: 'var(--color-border-1)' }} />

          <button
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-text-primary hover:bg-surface-2 transition-colors"
            onClick={() => {
              const tab = tabs.find(t => t.id === contextMenu.tabId);
              if (tab) createTab(tab.url);
              setContextMenu(null);
            }}
          >
            <Copy size={14} className="text-text-muted" />
            Duplicate Tab
          </button>

          <button
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-red-400 hover:bg-surface-2 transition-colors"
            onClick={() => {
              closeTab(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            <XIcon size={14} />
            Close Tab
          </button>
        </div>
      )}
    </div>
  );
}
