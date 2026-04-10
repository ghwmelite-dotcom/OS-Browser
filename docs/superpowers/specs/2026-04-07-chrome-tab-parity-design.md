# Chrome Tab Parity — Design Spec

**Date**: 2026-04-07
**Status**: Approved
**Approach**: Incremental Chrome Parity (layer Chrome behaviors onto existing architecture)

---

## Overview

Upgrade the OS Browser Desktop tab system to match Chrome's tab UX across six work streams: visual fidelity, Fitts's Law closing, tab detach-to-window, middle-click & keyboard shortcuts, tab overflow scrolling, and background tab lifecycle management. The existing model layer (TabManager, IPC, Zustand store) remains intact — changes target the view layer, interaction layer, and lifecycle layer.

---

## Work Stream 1: Visual Fidelity — Tab Shape, Overlap & Z-Order

### Tab Shape

Replace rectangular tabs with trapezoid shapes using CSS `clip-path` with cubic Bezier curves. Each tab gets angled side edges (~12-15 degree slant) creating the distinctive Chrome "shoulders" at the top corners.

### Overlap & Z-Order

- Tabs overlap by **16px** via `margin-right: -16px`
- Z-order rules via `z-index`:
  - Active tab: `z-index: 3` (always on top)
  - Hovered tab: `z-index: 2`
  - Normal tabs: `z-index: 1`, increasing left-to-right (right tab paints over left)

### Active Tab Connection

- Active tab's bottom border is removed — visually merges with the content area below
- Tab strip's bottom border has a gap at the active tab's position via pseudo-element
- Active tab background matches content area background color exactly

### Tab Separators

- Thin 1px vertical separators between inactive tabs
- Separators hide when adjacent to the active tab or a hovered tab
- Implemented as `::after` pseudo-elements, conditionally hidden via CSS/class logic

### Animations

- **Close**: Tab shrinks width to 0 over 200ms with `ease-out`, then removed from DOM
- **Open**: Tab expands from 0 to calculated width over 250ms (existing behavior, keep)
- Remaining tabs slide smoothly via `transition: all 200ms ease-out` on width and transform

### Files Impacted

- `Tab.tsx` — clip-path, overlap margins, z-order, separators, animations
- `PinnedTab.tsx` — z-order alignment
- `TabBar.tsx` — active tab gap in bottom border

---

## Work Stream 2: Fitts's Law Tab Closing

### Behavior

When closing a tab via its X button:

1. Closed tab animates to zero width (200ms)
2. Remaining tabs **keep their current width** — do NOT expand
3. Next tab's close button slides directly under the cursor
4. "Frozen width" persists until the mouse **leaves the tab strip vertically**
5. On mouseleave, tabs smoothly expand to fill available space

### Implementation

- Add `isClosingMode` boolean to TabBar local state (not global store)
- Set `true` on any close-button click
- While `true`, tab width calculation uses the last computed width instead of recalculating
- `onMouseLeave` on TabBar container resets `isClosingMode` to `false` and triggers width recalculation with smooth CSS transition
- Edge case: if closing the last tab in the strip, skip frozen-width

### Files Impacted

- `TabBar.tsx` — isClosingMode state, mouseleave handler, width calculation logic
- `Tab.tsx` — pass frozen width prop

---

## Work Stream 3: Tab Detach-to-Window

### Drag Detection

- During active @dnd-kit drag, track cursor Y position relative to tab strip
- If cursor moves **more than 40px vertically** outside the tab strip bounds, enter detach mode

### Detach Mode Visual

- Dragged tab gets a floating preview (semi-transparent window ghost with title + favicon) following cursor
- Original tab strip shows a closing gap where the tab was
- If user drags back within 40px of the strip, cancel detach and re-insert at nearest position

### Creating the New Window

On mouse-up outside the strip, the main process:

1. Creates a new `BrowserWindow` at the drop coordinates
2. **Transfers** the existing `WebContentsView` to the new window (no page reload)
3. Removes the tab from the source window's `TabManager`
4. Initializes a new `TabManager` for the new window with the detached tab

Key: the WebContents/renderer process stays alive — only the view container changes. No page reload, no lost state.

### Multi-Tab Detach

- If multiple tabs are selected (Ctrl+click), dragging detaches all selected tabs together
- They appear in the new window in their original order

### Re-attach (Drag Back)

- Dragging a tab from a single-tab window back into another window's tab strip:
  1. Transfers the WebContentsView back
  2. Inserts at the drop position
  3. Closes the now-empty source window

### New IPC Channels

- `tab:detach` — removes tab from current window, returns serialized tab + WebContentsView handle
- `tab:attach` — receives tab into target window's TabManager
- `window:create-from-tab` — creates new BrowserWindow and attaches tab

### Files Impacted

- `useTabDrag.ts` — detach threshold, floating preview, re-attach logic
- `TabManager.ts` — multi-window tab transfer
- `TabWebContents.ts` — WebContentsView transfer between windows
- `tabs.ts` (IPC) — new detach/attach/create-from-tab handlers
- `TabBar.tsx` — detach drag detection integration

---

## Work Stream 4: Middle-Click & Keyboard Shortcuts

### Middle-Click

- `onAuxClick` handler on `Tab` and `PinnedTab` components
- `event.button === 1` (middle click): close the tab
- Middle-click on empty tab strip space: open new tab
- No special behavior on NewTabButton middle-click

### Keyboard Shortcuts (Chrome-exact)

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` through `Ctrl+8` | Switch to tab at position 1-8 |
| `Ctrl+9` | Switch to **last** tab (not tab 9) |
| `Ctrl+Tab` | Next tab (wraps around) |
| `Ctrl+Shift+Tab` | Previous tab (wraps around) |
| `Ctrl+W` | Close active tab |
| `Ctrl+Shift+T` | Reopen last closed tab |
| `Ctrl+T` | New tab (already implemented) |
| `Ctrl+N` | New window |

### Implementation

- Renderer-side `keydown` listener on `document` (only fires when window focused)
- `Ctrl+1-8`: Activate `tabs[index]` from the visible tab list via IPC
- `Ctrl+9`: Always activates `tabs[tabs.length - 1]`
- `Ctrl+Tab` / `Ctrl+Shift+Tab`: Calculate next/prev from active index, wrap with modulo
- All shortcuts respect pinned tabs — Ctrl+1 activates the first tab whether pinned or not

### New File

- `useTabKeyboardShortcuts.ts` — centralized shortcut handler hook, used in TabBar

### Files Impacted

- `Tab.tsx` — onAuxClick handler
- `PinnedTab.tsx` — onAuxClick handler
- `TabBar.tsx` — empty-area middle-click, mount shortcut hook

---

## Work Stream 5: Tab Overflow & Scroll Behavior

### Scroll Arrows

- When tabs overflow the strip, show chevron buttons at left and/or right edge
- Left arrow: visible only when scrolled right (not at start)
- Right arrow: visible only when more tabs exist beyond visible area
- Click scrolls by one tab width with smooth animation (200ms ease-out)
- Hold-to-scroll: holding the arrow continuously scrolls at ~3 tabs/second

### Scroll Wheel

- Mouse wheel over tab strip scrolls horizontally (keep existing behavior)

### Auto-Scroll

- Keep existing smooth scroll-active-tab-into-view behavior

### Replace Fade Gradients

- Remove left/right fade-out gradients
- Replace with scroll arrow buttons that serve as both indicator and control

### Arrow Styling

- 28px wide button area at each edge
- Semi-transparent background matching tab strip
- Subtle hover highlight
- Chevron SVG icon
- `z-index: 10` to float above tab overlap

### Files Impacted

- `TabBar.tsx` — scroll arrows replacing fade gradients, scroll logic, hold-to-scroll

---

## Work Stream 6: Background Tab Lifecycle

### Three-Tier Progressive Hierarchy

#### Tier 1 — Throttling (immediate on tab hide)

- Set `backgroundThrottling: true` on webContents (Electron native)
- Electron automatically reduces timer frequency for hidden tabs
- Exempt: tabs playing audio, using WebRTC, holding Web Locks
- No visual change — invisible optimization

#### Tier 2 — Freezing (after 5 minutes hidden)

- Inject `document.dispatchEvent(new Event('freeze'))` to notify the page
- Set `frozen: true` flag on tab model
- Reduce process priority if Electron API available
- Visual indicator: faded favicon at 60% opacity + snowflake badge
- On reactivation: dispatch `resume` event, clear frozen flag, restore priority
- Exempt: tabs with active media, WebRTC, mic/camera, memory-saver exclude list

#### Tier 3 — Discarding (after 15 minutes hidden, existing Memory Saver)

- Keep existing behavior: destroy WebContentsView, preserve tab metadata
- Enhancement: save scroll position and form data before discarding via `executeJavaScript`
- On restore: reload page, restore scroll position and form data
- Visual indicator: faded favicon at 40% opacity + lightning bolt badge (existing)

### State Machine

```
Active → [tab hidden] → Throttled → [5 min] → Frozen → [15 min] → Discarded
              ↑                          ↑                   ↑
         [reactivate]              [reactivate]         [reactivate]
              ↓                          ↓                   ↓
           Active                     Active           Reload + Active
```

### Unified Exemptions (All Tiers)

- Active audio playback
- WebRTC/media streams
- Active downloads
- Domains on memory-saver exclude list
- Active within last 30 seconds (debounce rapid switching)

### New File

- `TabLifecycleManager.ts` (main process) — three-tier state machine replacing current tab-suspension.ts

### Files Impacted

- `tab-suspension.ts` — refactor into TabLifecycleManager
- `TabManager.ts` — lifecycle state fields, scroll/form capture
- `TabWebContents.ts` — process priority management
- `Tab.tsx` — lifecycle badge indicators (frozen snowflake, discarded lightning)
- `PinnedTab.tsx` — lifecycle badge indicators

---

## Files Summary

### Modified Files

| File | Changes |
|------|---------|
| `packages/renderer/src/components/Browser/tabs/TabBar.tsx` | Overflow arrows, Fitts's Law mode, detach detection, mouseleave handler, active tab gap, shortcut hook |
| `packages/renderer/src/components/Browser/tabs/Tab.tsx` | Trapezoid clip-path, overlap margins, z-order, separators, middle-click, lifecycle badges, frozen width prop |
| `packages/renderer/src/components/Browser/tabs/PinnedTab.tsx` | Middle-click, lifecycle badges, z-order alignment |
| `packages/renderer/src/components/Browser/tabs/TabPreview.tsx` | Discard state display |
| `packages/renderer/src/hooks/useTabDrag.ts` | Detach threshold, floating preview, re-attach logic |
| `packages/renderer/src/store/tabs.ts` | Lifecycle state fields |
| `packages/main/src/tabs/TabManager.ts` | Lifecycle state, scroll/form capture, multi-window transfer |
| `packages/main/src/tabs/TabWebContents.ts` | View transfer between windows, process priority |
| `packages/main/src/ipc/tabs.ts` | Detach/attach/create-from-tab handlers, shortcut wiring |
| `packages/main/src/services/tab-suspension.ts` | Refactor into three-tier lifecycle |

### New Files

| File | Purpose |
|------|---------|
| `packages/main/src/services/TabLifecycleManager.ts` | Three-tier throttle/freeze/discard state machine |
| `packages/renderer/src/hooks/useTabKeyboardShortcuts.ts` | Centralized keyboard shortcut handler |

### Unchanged

- TabManager CRUD, database schema, groups, workspaces
- Session save/restore
- Context menu structure
- Memory Saver exclude list (extended to cover all tiers)
- IPC architecture pattern (renderer → main → broadcast)
