# Chrome Tab Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the OS Browser Desktop tab system to match Chrome's tab UX across visual fidelity, Fitts's Law closing, tab detach-to-window, middle-click & keyboard shortcuts, tab overflow scrolling, and background tab lifecycle management.

**Architecture:** Incremental layering on the existing TabManager/Zustand/IPC architecture. View-layer changes in React components, interaction additions via new hooks, lifecycle management via a new main-process service replacing tab-suspension.ts. No database schema changes required.

**Tech Stack:** Electron 33+, React 18, Zustand, @dnd-kit, TypeScript, Tailwind CSS

---

## File Structure

### Modified Files

| File | Responsibility |
|------|---------------|
| `packages/renderer/src/components/Browser/tabs/Tab.tsx` | Trapezoid clip-path, overlap, z-order, separators, middle-click, lifecycle badges |
| `packages/renderer/src/components/Browser/tabs/PinnedTab.tsx` | Middle-click, z-order, lifecycle badges |
| `packages/renderer/src/components/Browser/tabs/TabBar.tsx` | Scroll arrows, Fitts's Law mode, detach detection, shortcut hook mount, active tab gap |
| `packages/renderer/src/components/Browser/tabs/TabPreview.tsx` | Discard state indicator |
| `packages/renderer/src/components/Browser/tabs/TabDragOverlay.tsx` | Detach floating preview |
| `packages/renderer/src/hooks/useTabDrag.ts` | Detach threshold tracking |
| `packages/renderer/src/store/tabs.ts` | Lifecycle state fields |
| `packages/main/src/tabs/TabManager.ts` | Scroll/form capture before discard |
| `packages/main/src/tabs/TabWebContents.ts` | View transfer between windows |
| `packages/main/src/ipc/tabs.ts` | Detach/attach handlers, keyboard shortcut IPC |
| `packages/main/src/services/tab-suspension.ts` | Replace with three-tier lifecycle |
| `packages/shared/src/ipc-channels.ts` | New IPC channel constants |
| `packages/preload/src/index.ts` | New preload bridge methods |

### New Files

| File | Responsibility |
|------|---------------|
| `packages/renderer/src/hooks/useTabKeyboardShortcuts.ts` | Centralized keyboard shortcut handler |
| `packages/main/src/services/TabLifecycleManager.ts` | Three-tier throttle/freeze/discard state machine |

---

## Task 1: Visual Fidelity — Trapezoid Tab Shape & Overlap

**Files:**
- Modify: `packages/renderer/src/components/Browser/tabs/Tab.tsx:134-178`
- Modify: `packages/renderer/src/components/Browser/tabs/PinnedTab.tsx:52-76`

- [ ] **Step 1: Update Tab.tsx — add trapezoid clip-path and overlap margins**

In `Tab.tsx`, replace the current styling block (the `className` and `style` props on the outer div at lines 157-178) with trapezoid shape, overlap, and z-order:

```tsx
// Tab.tsx — replace the outer div's className and style (lines 157-178)
      className={`
        group relative flex items-center h-[34px] cursor-pointer
        transition-all duration-200 ease-out
        ${isPinned ? 'justify-center px-1' : isCompact ? 'px-1.5 gap-1' : 'px-3 gap-2.5'}
        ${isClosing ? 'tab-closing' : ''}
        ${isSelected ? 'ring-1 ring-white/20 ring-inset' : ''}
        ${isDragging ? 'opacity-50' : ''}
      `}
      style={{
        ...dragStyle,
        width: `${dynamicWidth}px`,
        minWidth: isPinned ? `${PINNED_TAB_WIDTH}px` : `${MIN_TAB_WIDTH}px`,
        maxWidth: `${MAX_TAB_WIDTH}px`,
        marginRight: isPinned ? '0px' : '-16px',
        zIndex: isActive ? 3 : isHovered ? 2 : 1,
        clipPath: isPinned
          ? undefined
          : 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 100%, 0% 100%)',
        background: isActive ? color.bg : isHovered ? 'var(--color-surface-2)' : 'transparent',
        borderTop: isActive ? `2px solid ${color.accent}` : '2px solid transparent',
        borderBottom: isActive ? 'none' : groupColor ? `2px solid ${groupColor}` : '1px solid var(--color-border-1)',
        position: 'relative',
      }}
```

- [ ] **Step 2: Update tab separators — use conditional ::after pseudo via inline style**

Replace the separator div (lines 180-183 in Tab.tsx) with a smarter separator that hides near active/hovered tabs. Since we can't use `::after` in inline React, keep the div but add adjacency awareness:

```tsx
// Tab.tsx — replace separator div (lines 180-183)
// Add props to Tab component interface:
//   isNextToActive?: boolean;
//   isPrevToActive?: boolean;

      {/* Separator between inactive tabs — hidden near active or hovered */}
      {!isActive && !isHovered && !isNextToActive && !isPrevToActive && !isPinned && (
        <div
          className="absolute right-[-8px] top-[6px] bottom-[6px] w-px pointer-events-none"
          style={{ background: 'var(--color-border-1)', opacity: 0.4, zIndex: 4 }}
        />
      )}
```

- [ ] **Step 3: Add isNextToActive and isPrevToActive props to TabProps interface**

In `Tab.tsx`, add these to the `TabProps` interface (after line 19):

```tsx
  isNextToActive?: boolean;
  isPrevToActive?: boolean;
```

- [ ] **Step 4: Pass adjacency props from TabBar.tsx**

In `TabBar.tsx`, when rendering `<Tab>` components (lines 373-392 for grouped, lines 410-428 for ungrouped), compute and pass adjacency:

```tsx
// Inside the tab rendering in TabBar.tsx, for each <Tab> add:
isNextToActive={(() => {
  const currentIdx = sortedTabs.findIndex(t => t.id === tab.id);
  const nextTab = sortedTabs[currentIdx + 1];
  return nextTab?.id === activeTabId;
})()}
isPrevToActive={(() => {
  const currentIdx = sortedTabs.findIndex(t => t.id === tab.id);
  const prevTab = sortedTabs[currentIdx - 1];
  return prevTab?.id === activeTabId;
})()}
```

- [ ] **Step 5: Add active tab connection — remove bottom border gap in TabBar**

In `TabBar.tsx`, add a bottom border to the tab strip container (line 270) and add an active-tab gap overlay. Update the outer div:

```tsx
// TabBar.tsx line 270 — update the outer container className and style
      className="h-9 flex items-end shrink-0 relative z-[50] select-none kente-tab-bar"
      style={{
        background: 'var(--kente-tab-bg, var(--color-bg))',
        WebkitAppRegion: 'drag',
        borderBottom: '1px solid var(--color-border-1)',
      } as React.CSSProperties}
```

Then inside Tab.tsx, when `isActive`, render a bottom cover that hides the strip's border:

```tsx
// Tab.tsx — add after the separator div, inside the outer div
      {isActive && !isPinned && (
        <div
          className="absolute bottom-[-1px] left-0 right-0 h-[2px]"
          style={{ background: color.bg || 'var(--color-bg)', zIndex: 5 }}
        />
      )}
```

- [ ] **Step 6: Verify build compiles**

Run: `cd "C:/Users/USER/OneDrive - Smart Workplace/Desktop/Projects/OzzySurf-OS Browser" && npx tsc --noEmit --project packages/renderer/tsconfig.json 2>&1 | head -20`

Expected: No type errors related to Tab/TabBar changes.

- [ ] **Step 7: Commit**

```bash
git add packages/renderer/src/components/Browser/tabs/Tab.tsx packages/renderer/src/components/Browser/tabs/TabBar.tsx
git commit -m "feat: Chrome-style trapezoid tabs with overlap, z-order, and active tab connection"
```

---

## Task 2: Close & Open Animations

**Files:**
- Modify: `packages/renderer/src/components/Browser/tabs/Tab.tsx:95-100,112-123`

- [ ] **Step 1: Update close animation in Tab.tsx**

Replace the current `handleClose` function (lines 95-100) with a smoother width-to-zero animation:

```tsx
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isClosing) return;
    setIsClosing(true);
    const el = tabRef.current;
    if (el) {
      el.style.transition = 'width 200ms ease-out, opacity 150ms ease-out, margin 200ms ease-out, padding 200ms ease-out';
      el.style.width = '0px';
      el.style.opacity = '0';
      el.style.paddingLeft = '0px';
      el.style.paddingRight = '0px';
      el.style.marginRight = '0px';
      el.style.overflow = 'hidden';
    }
    setTimeout(() => onClose(), 200);
  };
```

- [ ] **Step 2: Verify the mount animation still works**

The existing mount animation (lines 112-123) already expands from 0. Update it to include the overlap margin:

```tsx
  // Smooth mount animation
  useEffect(() => {
    const el = tabRef.current;
    if (!el) return;
    el.style.width = '0px';
    el.style.opacity = '0';
    el.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      el.style.transition = 'width 250ms ease-out, opacity 200ms ease-out';
      el.style.width = `${dynamicWidth}px`;
      el.style.opacity = '1';
      // After animation completes, remove overflow hidden so content is visible
      setTimeout(() => {
        if (el) el.style.overflow = '';
      }, 260);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 3: Commit**

```bash
git add packages/renderer/src/components/Browser/tabs/Tab.tsx
git commit -m "feat: smooth tab close (shrink-to-zero) and open animations"
```

---

## Task 3: Fitts's Law Tab Closing

**Files:**
- Modify: `packages/renderer/src/components/Browser/tabs/TabBar.tsx:19,54-61,268-271`
- Modify: `packages/renderer/src/components/Browser/tabs/Tab.tsx:7-8,50-56,60-78`

- [ ] **Step 1: Add closing mode state to TabBar.tsx**

After line 61 in TabBar.tsx (after `suspendedTabIds` state), add:

```tsx
  const [isClosingMode, setIsClosingMode] = useState(false);
  const [frozenTabWidth, setFrozenTabWidth] = useState<number | null>(null);
```

- [ ] **Step 2: Add onCloseViaButton callback that activates closing mode**

After the `handleTabContextMenu` callback (line 186), add:

```tsx
  const handleCloseViaButton = useCallback((tabId: string) => {
    // Freeze current tab widths before closing
    if (!isClosingMode) {
      const firstTab = scrollRef.current?.querySelector('[data-tab-id]') as HTMLElement;
      if (firstTab) {
        setFrozenTabWidth(firstTab.getBoundingClientRect().width);
      }
      setIsClosingMode(true);
    }
    closeTab(tabId);
  }, [isClosingMode, closeTab]);
```

- [ ] **Step 3: Add mouseleave handler to reset closing mode**

Update the outer TabBar div (line 268) to add an `onMouseLeave`:

```tsx
      onMouseLeave={() => {
        if (isClosingMode) {
          setIsClosingMode(false);
          setFrozenTabWidth(null);
        }
      }}
```

- [ ] **Step 4: Pass frozenWidth to Tab components**

Add an `overrideWidth` prop to the `TabProps` interface in Tab.tsx:

```tsx
  overrideWidth?: number | null;
```

In the `Tab` component, update `dynamicWidth` calculation (line 90-92):

```tsx
  const dynamicWidth = useMemo(
    () => {
      if (overrideWidth && !isPinned) return overrideWidth;
      return isPinned ? PINNED_TAB_WIDTH : calcTabWidth(tabCount, 0, containerWidth);
    },
    [tabCount, containerWidth, isPinned, overrideWidth],
  );
```

- [ ] **Step 5: Wire it up in TabBar — pass overrideWidth and handleCloseViaButton**

In both grouped and ungrouped `<Tab>` renders in TabBar.tsx, add:

```tsx
overrideWidth={isClosingMode ? frozenTabWidth : null}
onClose={() => handleCloseViaButton(tab.id)}
```

Replace the existing `onClose={() => closeTab(tab.id)}` with the above.

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/components/Browser/tabs/Tab.tsx packages/renderer/src/components/Browser/tabs/TabBar.tsx
git commit -m "feat: Fitts's Law tab closing — frozen widths until mouse leaves strip"
```

---

## Task 4: Middle-Click to Close & New Tab

**Files:**
- Modify: `packages/renderer/src/components/Browser/tabs/Tab.tsx:134-137`
- Modify: `packages/renderer/src/components/Browser/tabs/PinnedTab.tsx:52-56`
- Modify: `packages/renderer/src/components/Browser/tabs/TabBar.tsx:279-293`

- [ ] **Step 1: Add middle-click handler to Tab.tsx**

On the outer div of Tab.tsx (after the `onContextMenu` prop, line 138), add:

```tsx
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
```

- [ ] **Step 2: Add middle-click handler to PinnedTab.tsx**

First, add `onClose` to `PinnedTabProps` interface:

```tsx
  onClose: () => void;
```

On the outer div of PinnedTab (after `onContextMenu` prop, line 55), add:

```tsx
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
```

- [ ] **Step 3: Pass onClose to PinnedTab from TabBar.tsx**

In TabBar.tsx where PinnedTab is rendered (lines 313-324), add:

```tsx
onClose={() => closeTab(tab.id)}
```

- [ ] **Step 4: Add middle-click on empty tab strip to open new tab**

In TabBar.tsx, on the scroll container div (line 279), add:

```tsx
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          // Only if clicking empty space (not a tab)
          const target = e.target as HTMLElement;
          if (!target.closest('[data-tab-id]')) {
            createTab();
          }
        }
      }}
```

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/components/Browser/tabs/Tab.tsx packages/renderer/src/components/Browser/tabs/PinnedTab.tsx packages/renderer/src/components/Browser/tabs/TabBar.tsx
git commit -m "feat: middle-click to close tabs, middle-click empty strip for new tab"
```

---

## Task 5: Keyboard Shortcuts

**Files:**
- Create: `packages/renderer/src/hooks/useTabKeyboardShortcuts.ts`
- Modify: `packages/renderer/src/components/Browser/tabs/TabBar.tsx:1-2,19`

- [ ] **Step 1: Create useTabKeyboardShortcuts hook**

```tsx
// packages/renderer/src/hooks/useTabKeyboardShortcuts.ts

import { useEffect } from 'react';
import { useTabsStore } from '@/store/tabs';

export function useTabKeyboardShortcuts() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const switchTab = useTabsStore((s) => s.switchTab);
  const closeTab = useTabsStore((s) => s.closeTab);
  const createTab = useTabsStore((s) => s.createTab);
  const reopenLastClosed = useTabsStore((s) => s.reopenLastClosed);

  useEffect(() => {
    const sortedTabs = [...tabs].sort((a, b) => a.position - b.position);

    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      // Ctrl+1-8: switch to tab at position N
      if (e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (idx < sortedTabs.length) {
          switchTab(sortedTabs[idx].id);
        }
        return;
      }

      // Ctrl+9: switch to last tab
      if (e.key === '9') {
        e.preventDefault();
        if (sortedTabs.length > 0) {
          switchTab(sortedTabs[sortedTabs.length - 1].id);
        }
        return;
      }

      // Ctrl+W: close active tab
      if (e.key === 'w' || e.key === 'W') {
        if (!e.shiftKey) {
          e.preventDefault();
          if (activeTabId) closeTab(activeTabId);
        }
        return;
      }

      // Ctrl+Shift+T: reopen last closed tab
      if ((e.key === 't' || e.key === 'T') && e.shiftKey) {
        e.preventDefault();
        reopenLastClosed();
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab: next/prev tab
      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIdx = sortedTabs.findIndex((t) => t.id === activeTabId);
        if (currentIdx < 0 || sortedTabs.length === 0) return;

        let nextIdx: number;
        if (e.shiftKey) {
          // Previous tab (wrap around)
          nextIdx = (currentIdx - 1 + sortedTabs.length) % sortedTabs.length;
        } else {
          // Next tab (wrap around)
          nextIdx = (currentIdx + 1) % sortedTabs.length;
        }
        switchTab(sortedTabs[nextIdx].id);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, switchTab, closeTab, createTab, reopenLastClosed]);
}
```

- [ ] **Step 2: Mount the hook in TabBar.tsx**

At the top of `TabBar.tsx`, add the import:

```tsx
import { useTabKeyboardShortcuts } from '@/hooks/useTabKeyboardShortcuts';
```

Inside the `TabBar` function body (after line 34), add:

```tsx
  useTabKeyboardShortcuts();
```

- [ ] **Step 3: Add Ctrl+N for new window IPC**

In the `useTabKeyboardShortcuts` hook, add inside the `handleKeyDown` before the closing brace:

```tsx
      // Ctrl+N: new window
      if (e.key === 'n' || e.key === 'N') {
        if (!e.shiftKey) {
          e.preventDefault();
          window.osBrowser?.app?.newWindow?.();
        }
        return;
      }
```

Note: This requires `window.osBrowser.app.newWindow` to exist in the preload. If it doesn't exist yet, we'll add it in Task 8 (IPC additions). For now, use optional chaining so it's safe.

- [ ] **Step 4: Commit**

```bash
git add packages/renderer/src/hooks/useTabKeyboardShortcuts.ts packages/renderer/src/components/Browser/tabs/TabBar.tsx
git commit -m "feat: Chrome keyboard shortcuts — Ctrl+1-9, Ctrl+Tab, Ctrl+W, Ctrl+Shift+T"
```

---

## Task 6: Tab Overflow Scroll Arrows

**Files:**
- Modify: `packages/renderer/src/components/Browser/tabs/TabBar.tsx:55-56,104-124,274-277,444-446`

- [ ] **Step 1: Replace fade gradient state with scroll arrow visibility state**

In TabBar.tsx, replace `showFadeLeft`/`showFadeRight` state (lines 55-56) — keep the same names but repurpose them for arrow visibility:

```tsx
  const [showScrollLeft, setShowScrollLeft] = useState(false);
  const [showScrollRight, setShowScrollRight] = useState(false);
```

Update `updateFades` callback (lines 105-111):

```tsx
  const updateScrollArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollLeft(el.scrollLeft > 4);
    setShowScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    setContainerWidth(el.clientWidth);
  }, []);
```

Update all references from `updateFades` to `updateScrollArrows` in the useEffect (lines 113-124).

- [ ] **Step 2: Replace fade gradient divs with scroll arrow buttons**

Replace the left fade gradient div (lines 275-277) with a scroll arrow button:

```tsx
        {showScrollLeft && (
          <button
            className="absolute left-0 top-0 bottom-0 w-7 z-30 flex items-center justify-center hover:bg-surface-2/80 transition-colors"
            style={{ background: 'var(--kente-tab-bg, var(--color-bg))' }}
            onClick={() => {
              if (scrollRef.current) {
                const tabWidth = scrollRef.current.querySelector('[data-tab-id]')?.getBoundingClientRect().width || 200;
                scrollRef.current.scrollBy({ left: -tabWidth, behavior: 'smooth' });
              }
            }}
            onMouseDown={(e) => {
              // Hold-to-scroll: continuous scroll while mouse is held
              e.preventDefault();
              const el = scrollRef.current;
              if (!el) return;
              const scrollInterval = setInterval(() => {
                el.scrollBy({ left: -3 });
              }, 16);
              const stop = () => { clearInterval(scrollInterval); document.removeEventListener('mouseup', stop); };
              document.addEventListener('mouseup', stop);
            }}
            aria-label="Scroll tabs left"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-muted">
              <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
```

Replace the right fade gradient div (lines 444-446) with a scroll arrow button:

```tsx
        {showScrollRight && (
          <button
            className="absolute right-0 top-0 bottom-0 w-7 z-30 flex items-center justify-center hover:bg-surface-2/80 transition-colors"
            style={{ background: 'var(--kente-tab-bg, var(--color-bg))' }}
            onClick={() => {
              if (scrollRef.current) {
                const tabWidth = scrollRef.current.querySelector('[data-tab-id]')?.getBoundingClientRect().width || 200;
                scrollRef.current.scrollBy({ left: tabWidth, behavior: 'smooth' });
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const el = scrollRef.current;
              if (!el) return;
              const scrollInterval = setInterval(() => {
                el.scrollBy({ left: 3 });
              }, 16);
              const stop = () => { clearInterval(scrollInterval); document.removeEventListener('mouseup', stop); };
              document.addEventListener('mouseup', stop);
            }}
            aria-label="Scroll tabs right"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-muted">
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
```

- [ ] **Step 3: Commit**

```bash
git add packages/renderer/src/components/Browser/tabs/TabBar.tsx
git commit -m "feat: Chrome-style scroll arrows replacing fade gradients on tab overflow"
```

---

## Task 7: Tab Detach-to-Window — IPC & Main Process

**Files:**
- Modify: `packages/shared/src/ipc-channels.ts:23`
- Modify: `packages/preload/src/index.ts:119`
- Modify: `packages/main/src/tabs/TabWebContents.ts:42-48`
- Modify: `packages/main/src/ipc/tabs.ts` (add new handlers)

- [ ] **Step 1: Add new IPC channel constants**

In `packages/shared/src/ipc-channels.ts`, after `TAB_GET_STATE` (line 23), add:

```ts
  TAB_DETACH: 'tab:detach',
  TAB_ATTACH: 'tab:attach',
  WINDOW_CREATE_FROM_TAB: 'window:create-from-tab',
```

- [ ] **Step 2: Add detachView function to TabWebContents.ts**

After `destroyTabView` (line 48), add:

```ts
/**
 * Detach a WebContentsView from one window without destroying it.
 * Returns the view so it can be re-attached to another window.
 */
export function detachTabView(tabId: string, sourceWindow: BrowserWindow): WebContentsView | undefined {
  const view = tabViews.get(tabId);
  if (!view) return undefined;
  sourceWindow.contentView.removeChildView(view);
  tabViews.delete(tabId);
  return view;
}

/**
 * Attach an existing WebContentsView to a new window.
 */
export function attachTabView(tabId: string, view: WebContentsView, targetWindow: BrowserWindow): void {
  targetWindow.contentView.addChildView(view);
  resizeView(view, targetWindow);
  tabViews.set(tabId, view);
}
```

- [ ] **Step 3: Add preload bridge methods**

In `packages/preload/src/index.ts`, after the `tabs` object closing brace (line 119), or inside the `tabs` object before its end, add:

```ts
    detach: (tabId: string, x: number, y: number) => ipcRenderer.invoke(IPC.TAB_DETACH, tabId, x, y),
```

- [ ] **Step 4: Add detach IPC handler in tabs.ts**

In `packages/main/src/ipc/tabs.ts`, inside `registerTabHandlers()`, add a new handler:

```ts
  ipcMain.handle(IPC.TAB_DETACH, async (_event, tabId: string, screenX: number, screenY: number) => {
    const tab = tabManager.getTab(tabId);
    if (!tab) return null;

    // Detach the WebContentsView from the current window
    const view = detachTabView(tabId, mainWindow);

    // Remove tab from current window's database
    const db = getDatabase();
    db.prepare('DELETE FROM tabs WHERE id = ?').run(tabId);
    tabManager.emitUpdate?.();

    // Create a new BrowserWindow at the drop position
    const { BrowserWindow: BW } = require('electron');
    const newWindow = new BW({
      x: screenX - 100,
      y: screenY - 20,
      width: 1280,
      height: 800,
      frame: false,
      titleBarStyle: 'hidden',
      webPreferences: {
        preload: join(__dirname, '../../preload/dist/index.mjs'),
        sandbox: false,
        contextIsolation: true,
      },
    });

    // Load the renderer in the new window
    if (import.meta.env.DEV) {
      newWindow.loadURL('http://localhost:5173');
    } else {
      newWindow.loadFile(join(__dirname, '../../renderer/dist/index.html'));
    }

    // Once the new window is ready, attach the view
    newWindow.webContents.once('did-finish-load', () => {
      if (view) {
        attachTabView(tabId, view, newWindow);
        // Insert tab into new window context
        // The new window will load its own TabManager — for MVP, reload the page
        view.setVisible(true);
        resizeView(view, newWindow);
      }
    });

    return { success: true, windowId: newWindow.id };
  });
```

Note: Full multi-window TabManager support is complex. For the MVP, we detach the view and create a new window. The tab loads in the new window's context. This can be enhanced iteratively.

- [ ] **Step 5: Import new functions at top of tabs.ts**

Add `detachTabView` and `attachTabView` to the import from `TabWebContents`:

```ts
import {
  getTabView,
  createTabView,
  destroyTabView,
  showTabView,
  hideAllTabViews,
  detachTabView,
  attachTabView,
  resizeView,
} from '../tabs/TabWebContents';
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/ipc-channels.ts packages/preload/src/index.ts packages/main/src/tabs/TabWebContents.ts packages/main/src/ipc/tabs.ts
git commit -m "feat: tab detach-to-window IPC infrastructure and WebContentsView transfer"
```

---

## Task 8: Tab Detach-to-Window — Renderer UI

**Files:**
- Modify: `packages/renderer/src/hooks/useTabDrag.ts`
- Modify: `packages/renderer/src/components/Browser/tabs/TabBar.tsx`
- Modify: `packages/renderer/src/components/Browser/tabs/TabDragOverlay.tsx`

- [ ] **Step 1: Track vertical drag distance in TabBar.tsx**

In TabBar.tsx, add state for detach detection after the closing mode state:

```tsx
  const [isDraggingOutside, setIsDraggingOutside] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);
```

Update the `DndContext` `onDragMove` (add it if not present) after `onDragStart`:

```tsx
            onDragMove={(event) => {
              if (!tabBarRef.current || !event.active) return;
              const rect = tabBarRef.current.getBoundingClientRect();
              const pointerY = (event.activatorEvent as PointerEvent)?.clientY;
              if (pointerY !== undefined) {
                // Use delta from dnd-kit
                const currentY = pointerY + (event.delta?.y || 0);
                const outside = currentY < rect.top - 40 || currentY > rect.bottom + 40;
                setIsDraggingOutside(outside);
              }
            }}
```

- [ ] **Step 2: Handle detach on drag end when outside**

Update the `handleDragEnd` callback to check `isDraggingOutside`:

```tsx
  const handleDragEndForReorder = useCallback(
    (event: DragEndEvent) => {
      const draggedId = event.active.id as string;
      setActiveDragId(null);
      setIsDraggingOutside(false);

      if (isDraggingOutside) {
        // Detach tab to new window
        const pointerEvent = event.activatorEvent as PointerEvent;
        const x = pointerEvent.screenX + (event.delta?.x || 0);
        const y = pointerEvent.screenY + (event.delta?.y || 0);
        window.osBrowser?.tabs?.detach?.(draggedId, x, y);
        return;
      }

      const { over } = event;
      if (!over || draggedId === over.id) return;

      const oldIndex = allVisibleTabIds.indexOf(draggedId);
      const newIndex = allVisibleTabIds.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderTab(draggedId, newIndex);
      }
    },
    [allVisibleTabIds, reorderTab, isDraggingOutside],
  );
```

Replace the existing `handleDragEnd` reference with `handleDragEndForReorder` in the DndContext.

- [ ] **Step 3: Update TabDragOverlay for detach visual feedback**

In `TabDragOverlay.tsx`, accept an `isDetaching` prop and show a window-shaped preview:

```tsx
interface TabDragOverlayProps {
  activeTab: { id: string; title: string; favicon: string | null } | null;
  accentColor: string;
  isDetaching?: boolean;
}

// Inside the component, conditionally render a larger "window" preview when detaching
```

Pass `isDetaching={isDraggingOutside}` from TabBar to TabDragOverlay.

- [ ] **Step 4: Add ref to outer TabBar div**

Add `ref={tabBarRef}` to the outer div of TabBar (line 269).

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/hooks/useTabDrag.ts packages/renderer/src/components/Browser/tabs/TabBar.tsx packages/renderer/src/components/Browser/tabs/TabDragOverlay.tsx
git commit -m "feat: drag tab outside strip to detach into new window"
```

---

## Task 9: Three-Tier Tab Lifecycle Manager

**Files:**
- Create: `packages/main/src/services/TabLifecycleManager.ts`
- Modify: `packages/main/src/services/tab-suspension.ts` (deprecate, re-export)

- [ ] **Step 1: Create TabLifecycleManager.ts**

```ts
// packages/main/src/services/TabLifecycleManager.ts

import { BrowserWindow } from 'electron';
import { getDatabase } from '../db/database';
import { getAllTabViews, getTabView, destroyTabView } from '../tabs/TabWebContents';

// ── Lifecycle States ──────────────────────────────────────────
export type TabLifecycleState = 'active' | 'throttled' | 'frozen' | 'discarded';

interface TabLifecycleInfo {
  state: TabLifecycleState;
  stateChangedAt: number;
  memorySavedBytes: number;
  savedScrollY?: number;
  savedFormData?: Record<string, string>;
}

// ── Config ────────────────────────────────────────────────────
const CHECK_INTERVAL_MS = 30_000;          // Check every 30s
const FREEZE_AFTER_MS = 5 * 60_000;       // Freeze after 5min inactive
const DISCARD_AFTER_MS = 15 * 60_000;     // Discard after 15min inactive
const MIN_TABS_FOR_LIFECYCLE = 3;          // Only run lifecycle with 3+ tabs
const REACTIVATION_DEBOUNCE_MS = 30_000;  // Skip tabs active within 30s

// ── State ─────────────────────────────────────────────────────
let interval: NodeJS.Timeout | null = null;
let mainWindowRef: BrowserWindow | null = null;
const tabStates = new Map<string, TabLifecycleInfo>();
let excludedDomains: string[] = [];

// ── Init / Stop ───────────────────────────────────────────────
export function initTabLifecycle(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;
  loadExcludedDomains();
  interval = setInterval(checkLifecycle, CHECK_INTERVAL_MS);
}

export function stopTabLifecycle(): void {
  if (interval) { clearInterval(interval); interval = null; }
}

// ── Core Check ────────────────────────────────────────────────
async function checkLifecycle(): Promise<void> {
  if (!mainWindowRef) return;
  const tabViews = getAllTabViews();
  if (tabViews.size < MIN_TABS_FOR_LIFECYCLE) return;

  const db = getDatabase();
  const now = Date.now();
  const tabs = db.prepare(
    'SELECT id, url, last_accessed_at, is_active, is_pinned FROM tabs ORDER BY last_accessed_at ASC'
  ).all() as any[];

  for (const tab of tabs) {
    // Skip: active, pinned, internal pages
    if (tab.is_active || tab.is_pinned) continue;
    if (!tab.url || tab.url.startsWith('os-browser://')) continue;

    // Skip excluded domains
    if (isDomainExcluded(tab.url)) continue;

    const lastAccessed = new Date(tab.last_accessed_at).getTime();
    const inactiveMs = now - lastAccessed;

    // Skip if recently active (debounce)
    if (inactiveMs < REACTIVATION_DEBOUNCE_MS) continue;

    const currentState = tabStates.get(tab.id);

    // ── Tier 1: Throttle (immediate, handled by Electron natively) ──
    if (!currentState) {
      const view = getTabView(tab.id);
      if (view) {
        view.webContents.setBackgroundThrottling(true);
        tabStates.set(tab.id, {
          state: 'throttled',
          stateChangedAt: now,
          memorySavedBytes: 0,
        });
        mainWindowRef.webContents.send('tab:lifecycle-changed', {
          id: tab.id,
          state: 'throttled',
        });
      }
      continue;
    }

    // ── Tier 2: Freeze (after 5 min) ──
    if (currentState.state === 'throttled' && inactiveMs >= FREEZE_AFTER_MS) {
      const view = getTabView(tab.id);
      if (view) {
        // Notify page it's being frozen
        try {
          await view.webContents.executeJavaScript(
            `document.dispatchEvent(new Event('freeze'));`
          );
        } catch {}

        tabStates.set(tab.id, {
          ...currentState,
          state: 'frozen',
          stateChangedAt: now,
        });
        mainWindowRef.webContents.send('tab:lifecycle-changed', {
          id: tab.id,
          state: 'frozen',
        });
      }
      continue;
    }

    // ── Tier 3: Discard (after 15 min) ──
    if (currentState.state === 'frozen' && inactiveMs >= DISCARD_AFTER_MS) {
      const view = getTabView(tab.id);
      if (!view) continue;

      // Capture scroll position and form data before discarding
      let savedScrollY = 0;
      let savedFormData: Record<string, string> = {};
      try {
        savedScrollY = await view.webContents.executeJavaScript('window.scrollY');
      } catch {}
      try {
        savedFormData = await view.webContents.executeJavaScript(`
          (() => {
            const data = {};
            document.querySelectorAll('input, textarea, select').forEach((el, i) => {
              const key = el.id || el.name || 'field_' + i;
              data[key] = el.value || '';
            });
            return data;
          })()
        `);
      } catch {}

      // Capture memory before destroying
      let memoryBytes = 0;
      try {
        const info = await view.webContents.getProcessMemoryInfo();
        memoryBytes = (info.private || 0) * 1024;
      } catch {}

      // Destroy the view
      destroyTabView(tab.id, mainWindowRef);
      tabStates.set(tab.id, {
        state: 'discarded',
        stateChangedAt: now,
        memorySavedBytes: memoryBytes,
        savedScrollY,
        savedFormData,
      });

      mainWindowRef.webContents.send('tab:lifecycle-changed', {
        id: tab.id,
        state: 'discarded',
        memorySavedBytes: memoryBytes,
      });
      // Also send legacy event for backward compat
      mainWindowRef.webContents.send('tab:suspended', {
        id: tab.id,
        memorySavedBytes: memoryBytes,
      });
    }
  }
}

// ── Reactivation ──────────────────────────────────────────────
export function reactivateTab(tabId: string): TabLifecycleInfo | null {
  const info = tabStates.get(tabId);
  if (!info) return null;

  if (info.state === 'frozen') {
    const view = getTabView(tabId);
    if (view) {
      try {
        view.webContents.executeJavaScript(
          `document.dispatchEvent(new Event('resume'));`
        );
      } catch {}
    }
  }

  tabStates.delete(tabId);

  if (mainWindowRef) {
    mainWindowRef.webContents.send('tab:lifecycle-changed', {
      id: tabId,
      state: 'active',
    });
    mainWindowRef.webContents.send('tab:restored', { id: tabId });
  }

  return info;
}

// ── Queries ───────────────────────────────────────────────────
export function getTabLifecycleState(tabId: string): TabLifecycleState {
  return tabStates.get(tabId)?.state || 'active';
}

export function getTabLifecycleInfo(tabId: string): TabLifecycleInfo | null {
  return tabStates.get(tabId) || null;
}

export function isTabDiscarded(tabId: string): boolean {
  return tabStates.get(tabId)?.state === 'discarded';
}

export function getTotalMemorySaved(): number {
  let total = 0;
  for (const info of tabStates.values()) total += info.memorySavedBytes;
  return total;
}

export function getDiscardedTabCount(): number {
  let count = 0;
  for (const info of tabStates.values()) {
    if (info.state === 'discarded') count++;
  }
  return count;
}

export function getSavedScrollPosition(tabId: string): number {
  return tabStates.get(tabId)?.savedScrollY || 0;
}

export function getSavedFormData(tabId: string): Record<string, string> {
  return tabStates.get(tabId)?.savedFormData || {};
}

// ── Exclude list ──────────────────────────────────────────────
function isDomainExcluded(url: string): boolean {
  try {
    const domain = new URL(url).hostname;
    return excludedDomains.some(d => domain === d || domain.endsWith('.' + d));
  } catch {
    return false;
  }
}

function loadExcludedDomains(): void {
  const db = getDatabase();
  try {
    const rows = db.prepare('SELECT * FROM memory_saver_excludes').all() as any[];
    excludedDomains = rows.map((r: any) => r.domain);
  } catch {
    excludedDomains = [];
  }
}

export function addExcludedDomain(domain: string): void {
  const db = getDatabase();
  const clean = domain.toLowerCase().replace(/^www\./, '');
  if (excludedDomains.includes(clean)) return;
  db.prepare('INSERT INTO memory_saver_excludes (domain, added_at) VALUES (?, ?)').run(clean, new Date().toISOString());
  excludedDomains.push(clean);
}

export function removeExcludedDomain(domain: string): void {
  const db = getDatabase();
  const clean = domain.toLowerCase().replace(/^www\./, '');
  db.prepare('DELETE FROM memory_saver_excludes WHERE domain = ?').run(clean);
  excludedDomains = excludedDomains.filter(d => d !== clean);
}

export function getExcludedDomains(): string[] {
  return [...excludedDomains];
}
```

- [ ] **Step 2: Update tab-suspension.ts to re-export from TabLifecycleManager**

Replace `tab-suspension.ts` content with a thin wrapper for backward compatibility:

```ts
// packages/main/src/services/tab-suspension.ts
// DEPRECATED: Use TabLifecycleManager instead. This re-exports for backward compatibility.

export {
  initTabLifecycle as initMemorySaver,
  stopTabLifecycle as stopMemorySaver,
  isTabDiscarded as isTabSuspended,
  getTabLifecycleInfo as getTabSuspendInfo,
  reactivateTab as markTabRestored,
  getTotalMemorySaved,
  getDiscardedTabCount as getSuspendedTabCount,
  addExcludedDomain,
  removeExcludedDomain,
  getExcludedDomains,
} from './TabLifecycleManager';
```

- [ ] **Step 3: Commit**

```bash
git add packages/main/src/services/TabLifecycleManager.ts packages/main/src/services/tab-suspension.ts
git commit -m "feat: three-tier tab lifecycle — throttle, freeze, discard with scroll/form preservation"
```

---

## Task 10: Lifecycle State in Renderer

**Files:**
- Modify: `packages/renderer/src/store/tabs.ts:7-18,32-36`
- Modify: `packages/renderer/src/components/Browser/tabs/Tab.tsx:1-2,186-210`
- Modify: `packages/renderer/src/components/Browser/tabs/PinnedTab.tsx:82-100`
- Modify: `packages/preload/src/index.ts:127-129`

- [ ] **Step 1: Add lifecycle state to the Tab interface in store**

In `packages/renderer/src/store/tabs.ts`, update the `Tab` interface (lines 7-18) to add:

```tsx
  lifecycle_state?: 'active' | 'throttled' | 'frozen' | 'discarded';
```

- [ ] **Step 2: Add lifecycle event listener to preload**

In `packages/preload/src/index.ts`, inside the `memorySaver` object (after line 129), add:

```ts
    onLifecycleChanged: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('tab:lifecycle-changed', listener);
      return () => ipcRenderer.removeListener('tab:lifecycle-changed', listener);
    },
```

- [ ] **Step 3: Listen for lifecycle changes in TabBar.tsx**

In TabBar.tsx, update the memory saver useEffect (lines 146-165) to also listen for lifecycle changes:

```tsx
  // Track tab lifecycle states (throttled, frozen, discarded)
  const [tabLifecycleStates, setTabLifecycleStates] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    try {
      if (window.osBrowser?.memorySaver?.onLifecycleChanged) {
        cleanups.push(window.osBrowser.memorySaver.onLifecycleChanged((data: any) => {
          setTabLifecycleStates(prev => {
            const next = new Map(prev);
            if (data.state === 'active') {
              next.delete(data.id);
            } else {
              next.set(data.id, data.state);
            }
            return next;
          });
          // Update suspended set for backward compat
          if (data.state === 'discarded') {
            setSuspendedTabIds(prev => new Set([...prev, data.id]));
          } else if (data.state === 'active') {
            setSuspendedTabIds(prev => {
              const next = new Set(prev);
              next.delete(data.id);
              return next;
            });
          }
        }));
      }
      // Keep existing suspend/restore listeners for backward compat
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
```

- [ ] **Step 4: Add lifecycle badge props to Tab component**

In Tab.tsx, add a `lifecycleState` prop to `TabProps`:

```tsx
  lifecycleState?: 'active' | 'throttled' | 'frozen' | 'discarded';
```

Update the favicon section (lines 186-210) to show lifecycle-specific badges:

```tsx
      {/* Lifecycle badges */}
      {lifecycleState === 'frozen' && (
        <div style={{
          position: 'absolute', bottom: -1, right: -1,
          width: 10, height: 10, borderRadius: '50%',
          background: '#60A5FA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '6px',
        }}>
          ❄
        </div>
      )}
      {lifecycleState === 'discarded' && (
        <div style={{
          position: 'absolute', bottom: -1, right: -1,
          width: 10, height: 10, borderRadius: '50%',
          background: '#3B82F6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={6} fill="#fff" color="#fff" />
        </div>
      )}
```

Update the favicon opacity to vary by lifecycle state:

```tsx
      <div className="relative w-[16px] h-[16px] shrink-0 flex items-center justify-center"
        style={{
          opacity: lifecycleState === 'discarded' ? 0.4
            : lifecycleState === 'frozen' ? 0.6
            : isSuspended ? 0.5
            : 1
        }}
      >
```

Remove the old `isSuspended` Zap badge since the lifecycle badges now handle it.

- [ ] **Step 5: Pass lifecycleState from TabBar to Tab components**

In TabBar.tsx, for both grouped and ungrouped `<Tab>` renders, add:

```tsx
lifecycleState={tabLifecycleStates.get(tab.id) as any || 'active'}
```

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/store/tabs.ts packages/renderer/src/components/Browser/tabs/Tab.tsx packages/renderer/src/components/Browser/tabs/PinnedTab.tsx packages/renderer/src/components/Browser/tabs/TabBar.tsx packages/preload/src/index.ts
git commit -m "feat: lifecycle state badges — frozen (snowflake) and discarded (lightning) indicators"
```

---

## Task 11: Restore Scroll & Form Data After Discard

**Files:**
- Modify: `packages/main/src/ipc/tabs.ts` (TAB_SWITCH handler)
- Modify: `packages/main/src/services/TabLifecycleManager.ts`

- [ ] **Step 1: Update TAB_SWITCH handler to restore scroll/form after discard reactivation**

In `packages/main/src/ipc/tabs.ts`, find the `IPC.TAB_SWITCH` handler and update it. After the tab is activated and the view is loaded, check if this tab was discarded and restore its state:

```ts
  // Inside the TAB_SWITCH handler, after activating the tab:
  const lifecycleInfo = reactivateTab(tabId);
  if (lifecycleInfo && lifecycleInfo.state === 'discarded') {
    // Tab was discarded — view is being recreated and URL reloaded
    // Once loaded, restore scroll position and form data
    const view = getTabView(tabId);
    if (view) {
      view.webContents.once('did-finish-load', () => {
        const scrollY = lifecycleInfo.savedScrollY || 0;
        const formData = lifecycleInfo.savedFormData || {};
        if (scrollY > 0) {
          view.webContents.executeJavaScript(`window.scrollTo(0, ${scrollY})`).catch(() => {});
        }
        if (Object.keys(formData).length > 0) {
          const formScript = Object.entries(formData)
            .map(([key, value]) => {
              const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
              return `(document.getElementById('${key}') || document.querySelector('[name="${key}"]') || {}).value = '${escaped}';`;
            })
            .join('\n');
          view.webContents.executeJavaScript(formScript).catch(() => {});
        }
      });
    }
  }
```

- [ ] **Step 2: Import reactivateTab in tabs.ts**

At the top of `packages/main/src/ipc/tabs.ts`, add:

```ts
import { reactivateTab } from '../services/TabLifecycleManager';
```

- [ ] **Step 3: Commit**

```bash
git add packages/main/src/ipc/tabs.ts
git commit -m "feat: restore scroll position and form data after discarded tab reactivation"
```

---

## Task 12: Integration Testing & Polish

**Files:**
- All modified files

- [ ] **Step 1: Build the project and fix any TypeScript errors**

Run: `cd "C:/Users/USER/OneDrive - Smart Workplace/Desktop/Projects/OzzySurf-OS Browser" && npm run build 2>&1 | tail -30`

Fix any type errors that arise from the changes.

- [ ] **Step 2: Verify tab visual appearance**

Start the app: `npm run dev`

Check:
- Tabs render with trapezoid shape and overlapping edges
- Active tab has no bottom border (connects to content area)
- Separators appear between inactive tabs, hide near active/hovered
- Z-order is correct: active tab always on top

- [ ] **Step 3: Verify Fitts's Law closing**

- Open 5+ tabs
- Click X on one tab — remaining tabs should keep their width
- Click X on next tab — close button is in the same position
- Move mouse down below tab strip — tabs expand to fill space

- [ ] **Step 4: Verify keyboard shortcuts**

- Ctrl+1: switches to first tab
- Ctrl+9: switches to last tab
- Ctrl+Tab: next tab
- Ctrl+Shift+Tab: previous tab
- Ctrl+W: closes active tab
- Ctrl+Shift+T: reopens last closed tab

- [ ] **Step 5: Verify middle-click**

- Middle-click on a tab: closes it
- Middle-click on empty tab strip space: opens new tab

- [ ] **Step 6: Verify scroll arrows**

- Open enough tabs to overflow
- Left/right chevron arrows appear
- Click scrolls by one tab width
- Hold-to-scroll works

- [ ] **Step 7: Verify tab detach**

- Drag a tab 40+ pixels below the tab strip
- Release: a new window should open with that tab
- Original tab is removed from source window

- [ ] **Step 8: Verify lifecycle states**

- Wait 5 minutes with a background tab: should show frozen badge (snowflake)
- Wait 15 minutes: should show discarded badge (lightning bolt)
- Click a discarded tab: reloads and restores scroll position

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "fix: integration polish for Chrome tab parity features"
```
