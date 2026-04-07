import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowRightLeft, Pin, PinOff, Copy, X as XIcon, ChevronRight, ChevronDown } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useTabsStore } from '@/store/tabs';
import { useWorkspaceStore } from '@/store/workspaces';
import { Tab, getTabColor } from './Tab';
import { PinnedTab } from './PinnedTab';
import { NewTabButton } from './NewTabButton';
import { TabDragOverlay } from './TabDragOverlay';

interface ContextMenuState {
  x: number;
  y: number;
  tabId: string;
}

export function TabBar() {
  const {
    tabs,
    groups,
    activeTabId,
    selectedTabIds,
    createTab,
    closeTab,
    switchTab,
    toggleSelectTab,
    rangeSelectTab,
    clearSelection,
    collapseGroup,
    expandGroup,
    reorderTab,
  } = useTabsStore();

  const {
    workspaces,
    activeWorkspaceId,
    globalPinnedTabIds,
    getVisibleTabIds,
    moveTabToWorkspace,
    pinTabGlobally,
    unpinTabGlobally,
    isGloballyPinned,
    getTabWorkspace,
  } = useWorkspaceStore();

  const visibleTabIds = getVisibleTabIds();
  const anyWorkspaceHasTabs = workspaces.some((w) => w.tabIds.length > 0);
  const visibleTabs = anyWorkspaceHasTabs
    ? tabs.filter((t) => visibleTabIds.includes(t.id))
    : tabs;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFadeLeft, setShowFadeLeft] = useState(false);
  const [showFadeRight, setShowFadeRight] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [suspendedTabIds, setSuspendedTabIds] = useState<Set<string>>(new Set());

  // DnD sensors with 5px activation distance to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Sort tabs by position
  const sortedTabs = useMemo(
    () => [...visibleTabs].sort((a, b) => a.position - b.position),
    [visibleTabs],
  );

  // Split tabs into pinned / grouped / ungrouped
  const pinnedTabs = useMemo(
    () => sortedTabs.filter((t) => t.is_pinned),
    [sortedTabs],
  );
  const unpinnedTabs = useMemo(
    () => sortedTabs.filter((t) => !t.is_pinned),
    [sortedTabs],
  );
  const groupedTabs = useMemo(
    () => unpinnedTabs.filter((t) => t.group_id != null),
    [unpinnedTabs],
  );
  const ungroupedTabs = useMemo(
    () => unpinnedTabs.filter((t) => t.group_id == null),
    [unpinnedTabs],
  );

  // Groups sorted by position, only those with visible tabs
  const activeGroups = useMemo(() => {
    const groupIds = new Set(groupedTabs.map((t) => t.group_id!));
    return [...groups]
      .filter((g) => groupIds.has(g.id))
      .sort((a, b) => a.position - b.position);
  }, [groups, groupedTabs]);

  // Total unpinned count for width calc
  const unpinnedCount = unpinnedTabs.length;
  const pinnedCount = pinnedTabs.length;

  // ── Scroll fades + container width ──
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

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!activeTabId || !scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  // Close context menu on click/right-click elsewhere
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

  // ── Memory Saver: track suspended tab IDs ──
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    try {
      if (window.osBrowser?.memorySaver?.onTabSuspended) {
        cleanups.push(window.osBrowser.memorySaver.onTabSuspended((data: any) => {
          setSuspendedTabIds(prev => new Set([...prev, data.id]));
        }));
      }
      if (window.osBrowser?.memorySaver?.onTabRestored) {
        cleanups.push(window.osBrowser.memorySaver.onTabRestored((data: any) => {
          setSuspendedTabIds(prev => {
            const next = new Set(prev);
            next.delete(data.id);
            return next;
          });
        }));
      }
    } catch {}
    return () => cleanups.forEach(c => c());
  }, []);

  // ── Click handlers ──
  const handleTabClick = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      if (e.ctrlKey || e.metaKey) {
        toggleSelectTab(tabId);
      } else if (e.shiftKey) {
        rangeSelectTab(tabId);
      } else {
        clearSelection();
        switchTab(tabId);
      }
    },
    [switchTab, toggleSelectTab, rangeSelectTab, clearSelection],
  );

  const handleTabContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  }, []);

  // ── Group collapse toggle ──
  const toggleGroupCollapse = useCallback(
    (groupId: string) => {
      setCollapsedGroupIds((prev) => {
        const next = new Set(prev);
        if (next.has(groupId)) {
          next.delete(groupId);
          expandGroup(groupId);
        } else {
          next.add(groupId);
          collapseGroup(groupId);
        }
        return next;
      });
    },
    [collapseGroup, expandGroup],
  );

  // Keep collapsedGroupIds in sync with store collapsed state
  useEffect(() => {
    const collapsed = new Set(groups.filter((g) => g.collapsed).map((g) => g.id));
    setCollapsedGroupIds(collapsed);
  }, [groups]);

  // All visible tab IDs in order for SortableContext
  const allVisibleTabIds = useMemo(() => {
    const ids: string[] = [];
    // Pinned first
    pinnedTabs.forEach((t) => ids.push(t.id));
    // Grouped tabs (per group)
    activeGroups.forEach((group) => {
      if (!collapsedGroupIds.has(group.id)) {
        groupedTabs
          .filter((t) => t.group_id === group.id)
          .sort((a, b) => a.position - b.position)
          .forEach((t) => ids.push(t.id));
      }
    });
    // Ungrouped tabs
    ungroupedTabs.forEach((t) => ids.push(t.id));
    return ids;
  }, [pinnedTabs, activeGroups, groupedTabs, ungroupedTabs, collapsedGroupIds]);

  // Handle drag end — reorder tab to the new position
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = allVisibleTabIds.indexOf(active.id as string);
      const newIndex = allVisibleTabIds.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderTab(active.id as string, newIndex);
      }
    },
    [allVisibleTabIds, reorderTab],
  );

  // Active drag tab info for overlay
  const activeDragTab = useMemo(() => {
    if (!activeDragId) return null;
    const tab = tabs.find((t) => t.id === activeDragId);
    if (!tab) return null;
    return { id: tab.id, title: tab.title, favicon: tab.favicon_path };
  }, [activeDragId, tabs]);

  // Accent color for the drag overlay
  const activeDragColor = useMemo(() => {
    if (!activeDragId) return '#D4A017';
    const idx = allVisibleTabIds.indexOf(activeDragId);
    return getTabColor(idx >= 0 ? idx : 0).accent;
  }, [activeDragId, allVisibleTabIds]);

  const contextTabWorkspace = contextMenu ? getTabWorkspace(contextMenu.tabId) : undefined;
  const contextTabIsGloballyPinned = contextMenu ? isGloballyPinned(contextMenu.tabId) : false;

  // Build global index counter for color cycling
  let globalIndex = pinnedCount;

  return (
    <div
      className="h-9 flex items-end shrink-0 relative z-[50] select-none kente-tab-bar"
      style={{ background: 'var(--kente-tab-bg, var(--color-bg))', borderBottom: '1px solid var(--color-border-1)', WebkitAppRegion: 'drag' } as React.CSSProperties}
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
          onClick={(e) => {
            // Handle click modifiers at scroll container level
            // Individual tabs handle their own clicks
          }}
        >
         <DndContext
           sensors={sensors}
           collisionDetection={closestCenter}
           onDragStart={(event) => setActiveDragId(event.active.id as string)}
           onDragEnd={handleDragEnd}
           onDragCancel={() => setActiveDragId(null)}
         >
          <SortableContext items={allVisibleTabIds} strategy={horizontalListSortingStrategy}>
          {/* ── Pinned tabs ── */}
          {pinnedTabs.map((tab, i) => {
            const color = getTabColor(i);
            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                className="h-[36px] flex items-end shrink-0"
                onClick={(e) => handleTabClick(e, tab.id)}
              >
                <PinnedTab
                  id={tab.id}
                  favicon={tab.favicon_path}
                  title={tab.title}
                  isActive={tab.id === activeTabId}
                  isLoading={tab.is_loading}
                  isAudioPlaying={tab.is_audio_playing}
                  isMuted={!!tab.is_muted}
                  accentColor={color.accent}
                  onSwitch={() => {}}
                  onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                />
              </div>
            );
          })}

          {/* ── Grouped tabs ── */}
          {activeGroups.map((group) => {
            const memberTabs = groupedTabs
              .filter((t) => t.group_id === group.id)
              .sort((a, b) => a.position - b.position);
            const isCollapsed = collapsedGroupIds.has(group.id);

            return (
              <React.Fragment key={`group-${group.id}`}>
                {/* Group label chip */}
                <div className="h-[36px] flex items-center px-1 shrink-0">
                  <button
                    onClick={() => toggleGroupCollapse(group.id)}
                    className="flex items-center gap-1 h-[20px] rounded-full px-2 text-[10px] font-semibold cursor-pointer transition-colors duration-150 hover:brightness-110"
                    style={{
                      background: `${group.color}33`,
                      color: group.color,
                    }}
                    title={isCollapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
                  >
                    <span
                      className="w-[6px] h-[6px] rounded-full shrink-0"
                      style={{ background: group.color }}
                    />
                    <span className="max-w-[80px] truncate">{group.name}</span>
                    {isCollapsed ? (
                      <ChevronRight size={10} />
                    ) : (
                      <ChevronDown size={10} />
                    )}
                  </button>
                </div>

                {/* Member tabs (hidden when collapsed) */}
                {!isCollapsed &&
                  memberTabs.map((tab, mIdx) => {
                    const idx = globalIndex++;
                    const prevTab = mIdx > 0 ? memberTabs[mIdx - 1] : null;
                    const nextTab = mIdx < memberTabs.length - 1 ? memberTabs[mIdx + 1] : null;
                    return (
                      <div
                        key={tab.id}
                        data-tab-id={tab.id}
                        className="h-[36px] flex items-end shrink-0"
                        onClick={(e) => handleTabClick(e, tab.id)}
                      >
                        <Tab
                          id={tab.id}
                          title={tab.title}
                          favicon={tab.favicon_path}
                          url={tab.url}
                          isActive={tab.id === activeTabId}
                          isPinned={false}
                          isLoading={tab.is_loading}
                          isAudioPlaying={tab.is_audio_playing}
                          isMuted={!!tab.is_muted}
                          isSelected={selectedTabIds.includes(tab.id)}
                          isSuspended={suspendedTabIds.has(tab.id)}
                          groupColor={group.color}
                          isNextToActive={nextTab?.id === activeTabId}
                          isPrevToActive={prevTab?.id === activeTabId}
                          index={idx}
                          tabCount={unpinnedCount + pinnedCount}
                          containerWidth={containerWidth}
                          onSwitch={() => {}}
                          onClose={() => closeTab(tab.id)}
                          onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                        />
                      </div>
                    );
                  })}
              </React.Fragment>
            );
          })}

          {/* ── Ungrouped tabs ── */}
          {ungroupedTabs.map((tab, uIdx) => {
            const idx = globalIndex++;
            const prevTab = uIdx > 0 ? ungroupedTabs[uIdx - 1] : null;
            const nextTab = uIdx < ungroupedTabs.length - 1 ? ungroupedTabs[uIdx + 1] : null;
            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                className="h-[36px] flex items-end shrink-0"
                onClick={(e) => handleTabClick(e, tab.id)}
              >
                <Tab
                  id={tab.id}
                  title={tab.title}
                  favicon={tab.favicon_path}
                  url={tab.url}
                  isActive={tab.id === activeTabId}
                  isPinned={false}
                  isLoading={tab.is_loading}
                  isAudioPlaying={tab.is_audio_playing}
                  isMuted={!!tab.is_muted}
                  isSelected={selectedTabIds.includes(tab.id)}
                  isSuspended={suspendedTabIds.has(tab.id)}
                  groupColor={null}
                  isNextToActive={nextTab?.id === activeTabId}
                  isPrevToActive={prevTab?.id === activeTabId}
                  index={idx}
                  tabCount={unpinnedCount + pinnedCount}
                  containerWidth={containerWidth}
                  onSwitch={() => {}}
                  onClose={() => closeTab(tab.id)}
                  onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                />
              </div>
            );
          })}

          </SortableContext>
          <TabDragOverlay activeTab={activeDragTab} accentColor={activeDragColor} />
         </DndContext>

          {/* ── New tab button — inline right after last tab (Chrome-style) ── */}
          <div className="shrink-0 sticky right-0 z-20" style={{ background: 'var(--kente-tab-bg, var(--color-bg))' }}>
            <NewTabButton onClick={() => createTab()} />
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
            {contextTabIsGloballyPinned ? (
              <PinOff size={14} className="text-text-muted" />
            ) : (
              <Pin size={14} className="text-text-muted" />
            )}
            {contextTabIsGloballyPinned ? 'Unpin from All Workspaces' : 'Pin to All Workspaces'}
          </button>

          <div className="h-px mx-2 my-1" style={{ background: 'var(--color-border-1)' }} />

          {workspaces
            .filter((w) => w.id !== contextTabWorkspace?.id)
            .map((ws) => (
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
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: ws.color }}
                />
                <span className="font-medium">{ws.name}</span>
              </button>
            ))}

          <div className="h-px mx-2 my-1" style={{ background: 'var(--color-border-1)' }} />

          <button
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-text-primary hover:bg-surface-2 transition-colors"
            onClick={() => {
              const tab = tabs.find((t) => t.id === contextMenu.tabId);
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
