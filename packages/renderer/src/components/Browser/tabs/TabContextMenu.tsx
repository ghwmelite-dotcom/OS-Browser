import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Copy,
  Pin,
  PinOff,
  Volume2,
  VolumeX,
  FolderPlus,
  X,
  XCircle,
  RotateCcw,
  Search,
  ChevronRight,
} from 'lucide-react';
import { useTabsStore } from '@/store/tabs';

/* ────────────────────────────────────────────────────────────────
   Shared primitives
   ──────────────────────────────────────────────────────────────── */

const menuItemClass =
  'w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-text-primary hover:bg-surface-2 transition-colors cursor-default';

const separatorStyle: React.CSSProperties = { background: 'var(--color-border-1)' };

function Separator() {
  return <div className="h-px mx-2 my-1" style={separatorStyle} />;
}

function Shortcut({ children }: { children: React.ReactNode }) {
  return <span className="ml-auto text-[11px] text-text-muted pl-6 whitespace-nowrap">{children}</span>;
}

/** Clamp menu position so it stays inside the viewport. */
function clampPosition(x: number, y: number, el: HTMLDivElement | null): { left: number; top: number } {
  if (!el) return { left: x, top: y };
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x;
  let top = y;
  if (x + rect.width > vw - 8) left = vw - rect.width - 8;
  if (y + rect.height > vh - 8) top = vh - rect.height - 8;
  if (left < 4) left = 4;
  if (top < 4) top = 4;
  return { left, top };
}

/* ────────────────────────────────────────────────────────────────
   Tab Context Menu
   ──────────────────────────────────────────────────────────────── */

export interface TabContextMenuProps {
  x: number;
  y: number;
  tabId: string;
  onClose: () => void;
}

export function TabContextMenu({ x, y, tabId, onClose }: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [submenuOpen, setSubmenuOpen] = useState(false);

  const {
    tabs,
    groups,
    selectedTabIds,
    createTab,
    closeTab,
    duplicateTab,
    pinTab,
    unpinTab,
    muteTab,
    unmuteTab,
    closeOtherTabs,
    closeTabsToRight,
    reopenLastClosed,
    createGroup,
    addTabToGroup,
    removeTabFromGroup,
  } = useTabsStore();

  const tab = tabs.find(t => t.id === tabId);

  // Multi-select: if the right-clicked tab is part of a selection with >1 items
  const isMulti = selectedTabIds.includes(tabId) && selectedTabIds.length > 1;
  const count = isMulti ? selectedTabIds.length : 1;
  const targetIds = isMulti ? selectedTabIds : [tabId];

  // Tab state
  const isPinned = tab?.is_pinned === 1;
  const isMuted = tab?.is_muted === 1;
  const inGroup = !!tab?.group_id;

  // Clamp position after mount
  useEffect(() => {
    if (menuRef.current) {
      setPos(clampPosition(x, y, menuRef.current));
    }
  }, [x, y]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use timeout so the opening right-click doesn't immediately close it
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const act = useCallback((fn: () => void | Promise<void>) => {
    return () => {
      fn();
      onClose();
    };
  }, [onClose]);

  if (!tab) return null;

  // Find position for "new tab to the right"
  const tabIndex = tabs.findIndex(t => t.id === tabId);

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[240px] rounded-lg border shadow-xl py-1 animate-in fade-in-0 zoom-in-95 duration-100"
      style={{
        left: pos.left,
        top: pos.top,
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
      }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
    >
      {/* ── New tab to the right ── */}
      <button className={menuItemClass} onClick={act(() => createTab())}>
        <Plus size={14} className="text-text-muted" />
        New tab to the right
      </button>

      <Separator />

      {/* ── Reload ── */}
      <button
        className={menuItemClass}
        onClick={act(() => {
          window.osBrowser?.tabs?.reload?.(tabId);
        })}
      >
        <RefreshCw size={14} className="text-text-muted" />
        Reload
        <Shortcut>Ctrl+R</Shortcut>
      </button>

      {/* ── Duplicate ── */}
      <button className={menuItemClass} onClick={act(() => duplicateTab(tabId))}>
        <Copy size={14} className="text-text-muted" />
        Duplicate
      </button>

      {/* ── Pin / Unpin ── */}
      <button
        className={menuItemClass}
        onClick={act(() => {
          if (isMulti) {
            targetIds.forEach(id => isPinned ? unpinTab(id) : pinTab(id));
          } else {
            isPinned ? unpinTab(tabId) : pinTab(tabId);
          }
        })}
      >
        {isPinned
          ? <PinOff size={14} className="text-text-muted" />
          : <Pin size={14} className="text-text-muted" />
        }
        {isPinned
          ? (isMulti ? `Unpin ${count} tabs` : 'Unpin')
          : (isMulti ? `Pin ${count} tabs` : 'Pin')
        }
      </button>

      {/* ── Mute / Unmute ── */}
      <button
        className={menuItemClass}
        onClick={act(() => {
          if (isMulti) {
            targetIds.forEach(id => isMuted ? unmuteTab(id) : muteTab(id));
          } else {
            isMuted ? unmuteTab(tabId) : muteTab(tabId);
          }
        })}
      >
        {isMuted
          ? <Volume2 size={14} className="text-text-muted" />
          : <VolumeX size={14} className="text-text-muted" />
        }
        {isMuted
          ? (isMulti ? `Unmute ${count} sites` : 'Unmute site')
          : (isMulti ? `Mute ${count} sites` : 'Mute site')
        }
      </button>

      <Separator />

      {/* ── Add tab to group (with submenu) ── */}
      <div
        className="relative"
        onMouseEnter={() => setSubmenuOpen(true)}
        onMouseLeave={() => setSubmenuOpen(false)}
      >
        <button className={menuItemClass}>
          <FolderPlus size={14} className="text-text-muted" />
          {isMulti ? `Add ${count} tabs to group` : 'Add tab to group'}
          <ChevronRight size={12} className="ml-auto text-text-muted" />
        </button>

        {submenuOpen && (
          <GroupSubmenu
            parentRight={pos.left + 240}
            parentTop={0}
            targetIds={targetIds}
            groups={groups}
            onNewGroup={() => {
              createGroup(targetIds);
              onClose();
            }}
            onAddToGroup={(groupId) => {
              targetIds.forEach(id => addTabToGroup(id, groupId));
              onClose();
            }}
          />
        )}
      </div>

      {/* ── Remove from group (only if in a group) ── */}
      {inGroup && (
        <button
          className={menuItemClass}
          onClick={act(() => {
            targetIds.forEach(id => removeTabFromGroup(id));
          })}
        >
          <XCircle size={14} className="text-text-muted" />
          Remove from group
        </button>
      )}

      <Separator />

      {/* ── Close ── */}
      <button
        className={`${menuItemClass} text-red-400 hover:text-red-300`}
        onClick={act(() => {
          targetIds.forEach(id => closeTab(id));
        })}
      >
        <X size={14} />
        {isMulti ? `Close ${count} tabs` : 'Close'}
        {!isMulti && <Shortcut>Ctrl+W</Shortcut>}
      </button>

      {/* ── Close other tabs ── */}
      <button
        className={menuItemClass}
        onClick={act(() => closeOtherTabs(tabId))}
        disabled={tabs.length <= 1}
      >
        <XCircle size={14} className="text-text-muted" />
        Close other tabs
      </button>

      {/* ── Close tabs to the right ── */}
      <button
        className={menuItemClass}
        onClick={act(() => closeTabsToRight(tabId))}
        disabled={tabIndex >= tabs.length - 1}
      >
        <XCircle size={14} className="text-text-muted" />
        Close tabs to the right
      </button>

      {/* ── Reopen closed tab ── */}
      <button className={menuItemClass} onClick={act(() => reopenLastClosed())}>
        <RotateCcw size={14} className="text-text-muted" />
        Reopen closed tab
        <Shortcut>Ctrl+Shift+T</Shortcut>
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Group Submenu
   ──────────────────────────────────────────────────────────────── */

interface GroupSubmenuProps {
  parentRight: number;
  parentTop: number;
  targetIds: string[];
  groups: { id: string; name: string; color: string }[];
  onNewGroup: () => void;
  onAddToGroup: (groupId: string) => void;
}

function GroupSubmenu({ parentRight, parentTop, groups, onNewGroup, onAddToGroup }: GroupSubmenuProps) {
  const subRef = useRef<HTMLDivElement>(null);
  const [flipLeft, setFlipLeft] = useState(false);

  useEffect(() => {
    if (subRef.current) {
      const rect = subRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        setFlipLeft(true);
      }
    }
  }, []);

  return (
    <div
      ref={subRef}
      className="absolute top-0 min-w-[180px] rounded-lg border shadow-xl py-1 animate-in fade-in-0 zoom-in-95 duration-75"
      style={{
        [flipLeft ? 'right' : 'left']: '100%',
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
      }}
    >
      <button className={menuItemClass} onClick={onNewGroup}>
        <Plus size={14} className="text-text-muted" />
        New group
      </button>

      {groups.length > 0 && <Separator />}

      {groups.map(g => (
        <button key={g.id} className={menuItemClass} onClick={() => onAddToGroup(g.id)}>
          <span
            className="inline-block w-3 h-3 rounded-full shrink-0"
            style={{ background: g.color }}
          />
          {g.name || 'Unnamed group'}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Tab Bar Context Menu (empty space right-click)
   ──────────────────────────────────────────────────────────────── */

export interface TabBarContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export function TabBarContextMenu({ x, y, onClose }: TabBarContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  const { createTab, reopenLastClosed } = useTabsStore();

  // Clamp position after mount
  useEffect(() => {
    if (menuRef.current) {
      setPos(clampPosition(x, y, menuRef.current));
    }
  }, [x, y]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const act = useCallback((fn: () => void | Promise<void>) => {
    return () => {
      fn();
      onClose();
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[220px] rounded-lg border shadow-xl py-1 animate-in fade-in-0 zoom-in-95 duration-100"
      style={{
        left: pos.left,
        top: pos.top,
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
      }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
    >
      <button className={menuItemClass} onClick={act(() => createTab())}>
        <Plus size={14} className="text-text-muted" />
        New tab
        <Shortcut>Ctrl+T</Shortcut>
      </button>

      <button className={menuItemClass} onClick={act(() => reopenLastClosed())}>
        <RotateCcw size={14} className="text-text-muted" />
        Reopen closed tab
        <Shortcut>Ctrl+Shift+T</Shortcut>
      </button>

      <button
        className={menuItemClass}
        onClick={act(() => {
          // Dispatch a custom event or use a keyboard shortcut simulation for tab search
          window.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'A',
            code: 'KeyA',
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
          }));
        })}
      >
        <Search size={14} className="text-text-muted" />
        Tab search
        <Shortcut>Ctrl+Shift+A</Shortcut>
      </button>
    </div>
  );
}
