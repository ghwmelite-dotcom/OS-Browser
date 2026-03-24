# Chrome-Like Tab System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current basic tab system with a Chrome-grade tab experience — drag-to-reorder, tab groups, pinned tabs, audio indicators, session restore, full context menus, and all keyboard shortcuts.

**Architecture:** Evolve the existing system (keep WebContentsView approach, JSON-file DB, Zustand store). Main process `TabManager` class becomes the single source of truth — renderer store mirrors it via IPC events. New `tab_groups` and `session_data` tables in the JSON DB. All new renderer components in `packages/renderer/src/components/Browser/tabs/`.

**Tech Stack:** Electron WebContentsView, JSON-file DB (custom SQL-like wrapper in `packages/main/src/db/database.ts`), Zustand, React 18, TypeScript, Tailwind CSS, @dnd-kit (drag-and-drop)

**CRITICAL: Database is NOT SQLite.** The DB is a custom JSON-file store (`database.json`) with a `PreparedStatement` wrapper that emulates SQL syntax. `db.exec()` is a **no-op**, `db.pragma()` returns **undefined**. Tables are just arrays in a JSON object. New "tables" are created via `ensureTable('name')` in `runMigrations()`. Columns don't need explicit creation — JSON objects are schema-free. `db.transaction()` exists and works (wraps function + marks dirty). All standard INSERT/UPDATE/DELETE/SELECT with `?` params work through the `PreparedStatement` class.

**CRITICAL: `createTabFromMain()` (line 607 in tabs.ts)** is an exported function called from within `setupViewEvents` for context menu "Open in New Tab", `window.open()`, and OAuth flows. It directly accesses the module-level `tabViews` Map and `oauthTabOrigins` Map. The new `TabManager` MUST be the codepath used by `createTabFromMain` — otherwise tabs created from links/popups will be invisible to the manager. Solution: refactor `createTabFromMain` to call `tabManager.createTab()` + pass tabManager reference into `setupViewEvents`.

**CRITICAL: `tabs:refresh` event.** The existing renderer listens for `tabs:refresh` (sent by `createTabFromMain`) via `window.osBrowser.tabs.onTabsRefresh()`. The new `tabs:state-updated` event must be supported alongside `tabs:refresh` during transition, or `createTabFromMain` must be updated atomically to use the new event.

---

## Current State Analysis

### What exists and works:
- `packages/main/src/ipc/tabs.ts` — 1349-line file handling TAB_CREATE/CLOSE/SWITCH/NAVIGATE/UPDATE via IPC, WebContentsView lifecycle, setupViewEvents (navigation guards, OAuth, PWA detection, ad blocking, context menus)
- `packages/renderer/src/store/tabs.ts` — Zustand store with basic CRUD + reopenLastClosed (10 items)
- `packages/renderer/src/components/Browser/Tab.tsx` — 220 lines, Chrome-style responsive width, 8-color tinting, loading spinner, hover preview, close animation
- `packages/renderer/src/components/Browser/TabBar.tsx` — 213 lines, horizontal scroll, fade indicators, basic context menu (pin/move workspace/duplicate/close)
- `packages/renderer/src/components/Tabs/TabSearchModal.tsx` — Full tab search with fuzzy filter, duplicate detection
- `packages/renderer/src/hooks/useKeyboardShortcuts.ts` — Ctrl+T/W/Tab/Shift+Tab/1-9/Shift+T
- `packages/preload/src/index.ts` — IPC bridge with event listeners (loading, url-updated, title-updated, favicon-updated, tabs:refresh)

### What's broken or missing:
1. **No drag-to-reorder** — tabs are static, cannot be rearranged
2. **No tab groups** — no data model, no UI, no IPC
3. **No audio indicators** — media-started-playing/media-paused events not wired
4. **No session restore** — tabs are lost on restart (JSON DB has stale data from last session)
5. **Context menu is minimal** — missing: Reload, New tab to right, Close others, Close to right, Add to group, Mute site
6. **No multi-select** — no Ctrl+Click or Shift+Click
7. **Tab position never updates after creation** — DB position field is set once
8. **State sync issues** — renderer Zustand store can drift from main process DB
9. **Hard-coded 171px view offset** — breaks when UI elements are hidden
10. **No tab tear-off/merge** between windows
11. **Missing shortcuts** — Ctrl+Shift+PageUp/Down (move tab), Ctrl+N (new window), Ctrl+Shift+W (close window), Ctrl+Shift+A (tab search)

### What to preserve:
- All of `setupViewEvents()` (lines 651-1344 in tabs.ts) — navigation guards, OAuth, PWA, ad blocking, vault, USSD detection
- WebContentsView architecture (correct modern approach)
- Tab color tinting system
- TabSearchModal (already well-built)
- Existing keyboard shortcuts (extend, don't replace)

---

## File Structure

### Main Process (new/modified)
```
packages/main/src/
  tabs/
    TabManager.ts              → NEW: Central tab state machine (replaces inline IPC logic)
    TabSessionManager.ts       → NEW: Save/restore session per profile
    TabWebContents.ts          → NEW: WebContentsView create/destroy/show/hide/resize
  ipc/
    tabs.ts                    → MODIFY: Thin IPC layer delegating to TabManager (keep setupViewEvents)
                                  Refactor createTabFromMain to use TabManager
                                  Pass tabManager reference to setupViewEvents
  db/
    database.ts                → MODIFY: Add ensureTable('tab_groups') and ensureTable('session_data') in runMigrations()
```

> **NOTE:** Files marked DELETE in the renderer section below are NOT removed until Task 15 (cleanup). During development, both old and new components co-exist.

### Renderer (new/modified)
```
packages/renderer/src/
  components/Browser/
    tabs/
      TabBar.tsx               → NEW: Full tab strip container (replaces old TabBar.tsx)
      Tab.tsx                   → NEW: Single tab (extends existing with drag, audio, multi-select)
      TabGroup.tsx              → NEW: Group label/chip with collapse/expand
      PinnedTab.tsx             → NEW: Compact pinned tab variant
      NewTabButton.tsx          → NEW: "+" button (extracted)
      TabContextMenu.tsx        → NEW: Full React context menu
      TabDragOverlay.tsx        → NEW: Custom drag preview during reorder
    TabBar.tsx                  → DELETE (replaced by tabs/TabBar.tsx)
    Tab.tsx                     → DELETE (replaced by tabs/Tab.tsx)
  hooks/
    useTabDrag.ts              → NEW: @dnd-kit integration for tab reordering
    useTabShortcuts.ts         → NEW: All tab keyboard shortcuts (replaces tab logic in useKeyboardShortcuts.ts)
  store/
    tabs.ts                    → MODIFY: Add groups, audio, multi-select, mirror main process state via events
```

### Shared
```
packages/shared/src/
  ipc-channels.ts              → MODIFY: Add group/session/audio/reorder IPC channels
packages/preload/src/
  index.ts                     → MODIFY: Expose new IPC methods + event listeners
```

---

## Phase 1: Foundation (Tasks 1-4)
Core tab state machine, IPC bridge, and basic rendering. After this phase, tabs work exactly as today but with a clean architecture.

### Task 1: Database Migration — Tab Groups + Session Tables

**Files:**
- Modify: `packages/main/src/db/database.ts` (add new tables in `runMigrations()`)

**IMPORTANT:** The database is a JSON-file store, NOT SQLite. "Tables" are arrays inside a JSON object. "Columns" are just object properties — no DDL or ALTER TABLE needed. New tables are created by calling `ensureTable('name')` in `runMigrations()`.

- [ ] **Step 1: Add new tables in runMigrations()**

In `packages/main/src/db/database.ts`, find `runMigrations()` (line 433) and add after the existing `ensureTable` calls:

```typescript
  ensureTable('tab_groups');
  ensureTable('session_data');
```

No schema definition needed — JSON objects are schema-free. The `tab_groups` table will contain objects like:
```typescript
{ id: string, name: string, color: string, is_collapsed: number, position: number }
```

The `session_data` table will contain objects like:
```typescript
{ key: string, value: string, updated_at: string }
```

Existing tab objects will gain a `group_id` property when assigned to a group — no migration needed since JSON objects accept any property.

- [ ] **Step 2: Verify by launching the app**

Build and launch. Open the `database.json` file in userData directory. Confirm `tab_groups: []` and `session_data: []` arrays exist.

- [ ] **Step 3: Commit**

```bash
git add packages/main/src/db/database.ts
git commit -m "feat(tabs): add tab_groups and session_data tables to JSON DB"
```

---

### Task 2: TabManager — Core State Machine (Main Process)

**Files:**
- Create: `packages/main/src/tabs/TabManager.ts`
- Create: `packages/main/src/tabs/TabWebContents.ts`

This is the heart of the new system. TabManager owns all tab state and delegates WebContentsView lifecycle to TabWebContents.

- [ ] **Step 1: Create TabWebContents.ts**

```typescript
// packages/main/src/tabs/TabWebContents.ts
import { BrowserWindow, WebContentsView } from 'electron';

const tabViews = new Map<string, WebContentsView>();

/**
 * Shared chrome height offsets.
 * IMPORTANT: These constants are the single source of truth — the old
 * `resizeViewToContent()` in tabs.ts (line 581) has identical values.
 * During Task 3, replace the old function with calls to resizeView() from here.
 */
const CHROME_TOP = 171; // KenteCrown(3) + TitleBar(32) + TabBar(36) + NavBar(44) + BookmarksBar(28) + StatusBar(28)
const CHROME_LEFT = 48; // Kente sidebar
const CHROME_BOTTOM = 2; // Windows taskbar safety

export function getTabView(tabId: string): WebContentsView | undefined {
  return tabViews.get(tabId);
}

export function getAllTabViews(): Map<string, WebContentsView> {
  return tabViews;
}

export function createTabView(tabId: string, mainWindow: BrowserWindow): WebContentsView {
  const view = new WebContentsView();
  mainWindow.contentView.addChildView(view);
  resizeView(view, mainWindow);
  tabViews.set(tabId, view);
  return view;
}

export function destroyTabView(tabId: string, mainWindow: BrowserWindow): void {
  const view = tabViews.get(tabId);
  if (!view) return;
  mainWindow.contentView.removeChildView(view);
  (view.webContents as any).destroy?.();
  tabViews.delete(tabId);
}

export function showTabView(tabId: string): void {
  for (const [id, view] of tabViews) {
    view.setVisible(id === tabId);
  }
}

export function hideAllTabViews(): void {
  for (const view of tabViews.values()) {
    view.setVisible(false);
  }
}

export function resizeView(view: WebContentsView, mainWindow: BrowserWindow): void {
  const [winW, winH] = mainWindow.getContentSize();
  const x = CHROME_LEFT;
  const y = CHROME_TOP;
  const w = Math.max(0, winW - x);
  const h = Math.max(0, winH - y - CHROME_BOTTOM);
  view.setBounds({ x, y, width: w, height: h });
}

export function resizeAllViews(mainWindow: BrowserWindow): void {
  for (const view of tabViews.values()) {
    resizeView(view, mainWindow);
  }
}
```

- [ ] **Step 2: Create TabManager.ts — data model and core operations**

```typescript
// packages/main/src/tabs/TabManager.ts
import { BrowserWindow } from 'electron';
import { getDatabase } from '../db/database';
import crypto from 'crypto';
import {
  createTabView, destroyTabView, showTabView, hideAllTabViews,
  getTabView, resizeView
} from './TabWebContents';

// ── Types ──────────────────────────────────────────────────────
export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon_path: string | null;
  position: number;
  is_pinned: boolean;
  is_active: boolean;
  is_muted: boolean;
  is_audio_playing: boolean;
  group_id: string | null;
  last_accessed_at: string;
}

export interface TabGroup {
  id: string;
  name: string;
  color: TabGroupColor;
  is_collapsed: boolean;
  position: number;
}

export type TabGroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan';

export interface ClosedTab {
  url: string;
  title: string;
  favicon_path: string | null;
  group_id: string | null;
  closed_at: number;
}

// ── Internal page title map ──────────────────────────────────
const INTERNAL_TITLES: Record<string, string> = {
  'os-browser://newtab': 'New Tab',
  'os-browser://settings': 'Settings',
  'os-browser://downloads': 'Downloads',
  'os-browser://stats': 'Statistics',
  'os-browser://docs': 'Documents',
  'os-browser://bookmarks': 'Bookmarks',
  'os-browser://documents': 'Documents',
  'os-browser://data': 'Data Dashboard',
  'os-browser://help': 'Help',
  'os-browser://gov': 'Gov Hub',
  'os-browser://offline': 'Offline Library',
  'os-browser://features': 'Feature Directory',
  'os-browser://games': 'GovPlay',
  'os-browser://passwords': 'Passwords',
};

// ── TabManager ─────────────────────────────────────────────────
export class TabManager {
  private mainWindow: BrowserWindow;
  private closedTabs: ClosedTab[] = [];
  private audioState = new Map<string, boolean>(); // tabId → isPlaying
  private emitUpdate: () => void;
  public setupViewEventsFn: ((view: WebContentsView, tabId: string, mainWindow: BrowserWindow, tabManager: TabManager) => void) | null = null;

  constructor(mainWindow: BrowserWindow, emitUpdate: () => void) {
    this.mainWindow = mainWindow;
    this.emitUpdate = emitUpdate;
  }

  /** Called by the IPC layer to inject setupViewEvents (preserves existing 700-line function) */
  setSetupViewEvents(fn: (view: WebContentsView, tabId: string, mainWindow: BrowserWindow, tabManager: TabManager) => void): void {
    this.setupViewEventsFn = fn;
  }

  // ── Queries ──────────────────────────────────────────────────

  getTabs(): Tab[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM tabs ORDER BY position').all() as any[];
    return rows.map(r => ({
      ...r,
      is_pinned: !!r.is_pinned,
      is_active: !!r.is_active,
      is_muted: !!r.is_muted,
      is_audio_playing: this.audioState.get(r.id) || false,
    }));
  }

  getTab(id: string): Tab | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM tabs WHERE id = ?').get(id) as any;
    if (!row) return null;
    return { ...row, is_pinned: !!row.is_pinned, is_active: !!row.is_active, is_muted: !!row.is_muted, is_audio_playing: this.audioState.get(row.id) || false };
  }

  getActiveTab(): Tab | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM tabs WHERE is_active = 1').get() as any;
    if (!row) return null;
    return { ...row, is_pinned: !!row.is_pinned, is_active: true, is_muted: !!row.is_muted, is_audio_playing: this.audioState.get(row.id) || false };
  }

  getGroups(): TabGroup[] {
    const db = getDatabase();
    return (db.prepare('SELECT * FROM tab_groups ORDER BY position').all() as any[]).map(r => ({
      ...r,
      is_collapsed: !!r.is_collapsed,
    }));
  }

  getClosedTabs(): ClosedTab[] {
    return this.closedTabs;
  }

  // ── Tab CRUD ─────────────────────────────────────────────────

  createTab(url?: string, afterTabId?: string): Tab {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const tabUrl = url || 'os-browser://newtab';
    const title = INTERNAL_TITLES[tabUrl] || (tabUrl.startsWith('os-browser://') ? tabUrl.replace('os-browser://', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'New Tab');

    // Calculate position: after the specified tab, or at the end
    let position: number;
    if (afterTabId) {
      const afterTab = this.getTab(afterTabId);
      if (afterTab) {
        position = afterTab.position + 1;
        // Shift tabs after this position
        db.prepare('UPDATE tabs SET position = position + 1 WHERE position > ?').run(afterTab.position);
      } else {
        position = this.getNextPosition();
      }
    } else {
      // Insert after active tab
      const active = this.getActiveTab();
      if (active) {
        position = active.position + 1;
        db.prepare('UPDATE tabs SET position = position + 1 WHERE position > ?').run(active.position);
      } else {
        position = this.getNextPosition();
      }
    }

    // Capture active tab's group BEFORE deactivating
    const currentActive = this.getActiveTab();
    const groupId = currentActive?.group_id || null;

    // Deactivate current active tab
    db.prepare('UPDATE tabs SET is_active = 0 WHERE is_active = 1').run();

    db.prepare(
      'INSERT INTO tabs (id, title, url, position, is_active, group_id, last_accessed_at) VALUES (?, ?, ?, ?, 1, ?, datetime("now"))'
    ).run(id, title, tabUrl, position, groupId);

    // Create WebContentsView for real URLs
    // NOTE: setupViewEvents is NOT called here — it's called by the IPC layer
    // which passes it as a callback (setupViewEventsFn) to preserve the existing
    // 700-line event wiring. The IPC layer passes (view, tabId, mainWindow, tabManager).
    if (!tabUrl.startsWith('os-browser://')) {
      const view = createTabView(id, this.mainWindow);
      if (this.setupViewEventsFn) this.setupViewEventsFn(view, id, this.mainWindow, this);
      (view.webContents as any).__markUserNavigation?.();
      view.webContents.loadURL(tabUrl);
    }

    this.emitUpdate();
    return this.getTab(id)!;
  }

  closeTab(id: string): { nextActiveId: string | null } {
    const db = getDatabase();
    const tab = this.getTab(id);
    if (!tab) return { nextActiveId: null };

    // Push to closed stack
    this.closedTabs.unshift({
      url: tab.url,
      title: tab.title,
      favicon_path: tab.favicon_path,
      group_id: tab.group_id,
      closed_at: Date.now(),
    });
    if (this.closedTabs.length > 25) this.closedTabs.pop();

    // Delete from DB
    db.prepare('DELETE FROM tabs WHERE id = ?').run(id);

    // Destroy view
    destroyTabView(id, this.mainWindow);
    this.audioState.delete(id);

    // Determine next active tab
    let nextActiveId: string | null = null;
    if (tab.is_active) {
      const remaining = this.getTabs();
      if (remaining.length > 0) {
        // Find the tab at the same position or the one before
        const next = remaining.find(t => t.position >= tab.position) || remaining[remaining.length - 1];
        nextActiveId = next.id;
        this.activateTab(nextActiveId);
      }
    }

    this.emitUpdate();
    return { nextActiveId };
  }

  activateTab(id: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET is_active = 0').run();
    db.prepare('UPDATE tabs SET is_active = 1, last_accessed_at = datetime("now") WHERE id = ?').run(id);

    const tab = this.getTab(id);
    if (!tab) return;

    if (tab.url.startsWith('os-browser://')) {
      hideAllTabViews();
    } else {
      // Create view on demand if needed (e.g., tab was discarded or created as internal then navigated)
      if (!getTabView(id)) {
        const view = createTabView(id, this.mainWindow);
        if (this.setupViewEventsFn) this.setupViewEventsFn(view, id, this.mainWindow, this);
        (view.webContents as any).__markUserNavigation?.();
        view.webContents.loadURL(tab.url);
      }
      showTabView(id);
    }

    this.emitUpdate();
  }

  // ── Reorder ──────────────────────────────────────────────────

  reorderTab(tabId: string, newIndex: number): void {
    const db = getDatabase();
    const tabs = this.getTabs();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Remove tab from current position, insert at new position
    const ordered = tabs.filter(t => t.id !== tabId);
    ordered.splice(newIndex, 0, tab);

    // Update all positions
    const stmt = db.prepare('UPDATE tabs SET position = ? WHERE id = ?');
    const txn = db.transaction(() => {
      ordered.forEach((t, i) => stmt.run(i, t.id));
    });
    txn();

    this.emitUpdate();
  }

  moveTabLeft(tabId: string): void {
    const tabs = this.getTabs();
    const idx = tabs.findIndex(t => t.id === tabId);
    if (idx > 0) this.reorderTab(tabId, idx - 1);
  }

  moveTabRight(tabId: string): void {
    const tabs = this.getTabs();
    const idx = tabs.findIndex(t => t.id === tabId);
    if (idx < tabs.length - 1) this.reorderTab(tabId, idx + 1);
  }

  // ── Pin/Unpin ────────────────────────────────────────────────

  pinTab(tabId: string): void {
    const db = getDatabase();
    // Remove from group when pinning
    db.prepare('UPDATE tabs SET is_pinned = 1, group_id = NULL WHERE id = ?').run(tabId);
    // Move to front (after other pinned tabs)
    const pinnedCount = (db.prepare('SELECT COUNT(*) as c FROM tabs WHERE is_pinned = 1').get() as any).c;
    this.reorderTab(tabId, pinnedCount - 1);
    this.emitUpdate();
  }

  unpinTab(tabId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET is_pinned = 0 WHERE id = ?').run(tabId);
    // Move after last pinned tab
    const pinnedCount = (db.prepare('SELECT COUNT(*) as c FROM tabs WHERE is_pinned = 1').get() as any).c;
    this.reorderTab(tabId, pinnedCount);
    this.emitUpdate();
  }

  // ── Mute ─────────────────────────────────────────────────────

  muteTab(tabId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET is_muted = 1 WHERE id = ?').run(tabId);
    const view = getTabView(tabId);
    if (view) view.webContents.setAudioMuted(true);
    this.emitUpdate();
  }

  unmuteTab(tabId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET is_muted = 0 WHERE id = ?').run(tabId);
    const view = getTabView(tabId);
    if (view) view.webContents.setAudioMuted(false);
    this.emitUpdate();
  }

  // ── Audio tracking ───────────────────────────────────────────

  setAudioPlaying(tabId: string, playing: boolean): void {
    this.audioState.set(tabId, playing);
    this.emitUpdate();
  }

  // ── Reopen ───────────────────────────────────────────────────

  reopenClosedTab(): Tab | null {
    const closed = this.closedTabs.shift();
    if (!closed) return null;
    return this.createTab(closed.url);
  }

  // ── Tab Update (title, url, favicon from webContents events) ─

  updateTabField(tabId: string, field: string, value: string | boolean | null): void {
    const db = getDatabase();
    const allowed = ['title', 'url', 'favicon_path', 'is_pinned', 'is_muted'];
    if (!allowed.includes(field)) return;
    if (typeof value === 'string' && value.length > 2048) return;
    db.prepare(`UPDATE tabs SET "${field}" = ? WHERE id = ?`).run(value, tabId);
    this.emitUpdate();
  }

  // ── Navigation ───────────────────────────────────────────────

  navigate(tabId: string, url: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET url = ?, last_accessed_at = datetime("now") WHERE id = ?').run(url, tabId);

    if (url.startsWith('os-browser://')) {
      hideAllTabViews();
      return;
    }

    let view = getTabView(tabId);
    if (!view) {
      view = createTabView(tabId, this.mainWindow);
      // setupViewEvents called by IPC layer
    }
    view.setVisible(true);
    (view.webContents as any).__markUserNavigation?.();
    view.webContents.loadURL(url);
  }

  // ── Duplicate ────────────────────────────────────────────────

  duplicateTab(tabId: string): Tab | null {
    const tab = this.getTab(tabId);
    if (!tab) return null;
    return this.createTab(tab.url, tabId);
  }

  // ── Bulk operations ──────────────────────────────────────────

  closeOtherTabs(keepTabId: string): void {
    const tabs = this.getTabs();
    for (const tab of tabs) {
      if (tab.id !== keepTabId && !tab.is_pinned) {
        this.closeTab(tab.id);
      }
    }
  }

  closeTabsToRight(tabId: string): void {
    const tabs = this.getTabs();
    const idx = tabs.findIndex(t => t.id === tabId);
    for (let i = tabs.length - 1; i > idx; i--) {
      if (!tabs[i].is_pinned) this.closeTab(tabs[i].id);
    }
  }

  // ── Groups ───────────────────────────────────────────────────

  createGroup(tabIds: string[], name?: string): TabGroup {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const colors: TabGroupColor[] = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'grey'];
    const existingColors = this.getGroups().map(g => g.color);
    const color = colors.find(c => !existingColors.includes(c)) || 'grey';
    const position = (db.prepare('SELECT MAX(position) as max FROM tab_groups').get() as any)?.max + 1 || 0;

    db.prepare('INSERT INTO tab_groups (id, name, color, position) VALUES (?, ?, ?, ?)').run(id, name || '', color, position);

    // Assign tabs to group
    const stmt = db.prepare('UPDATE tabs SET group_id = ? WHERE id = ?');
    for (const tabId of tabIds) {
      stmt.run(id, tabId);
    }

    this.emitUpdate();
    return this.getGroups().find(g => g.id === id)!;
  }

  addTabToGroup(tabId: string, groupId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET group_id = ? WHERE id = ?').run(groupId, tabId);
    this.emitUpdate();
  }

  removeTabFromGroup(tabId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET group_id = NULL WHERE id = ?').run(tabId);
    this.emitUpdate();
  }

  updateGroup(groupId: string, data: { name?: string; color?: TabGroupColor }): void {
    const db = getDatabase();
    if (data.name !== undefined) db.prepare('UPDATE tab_groups SET name = ? WHERE id = ?').run(data.name, groupId);
    if (data.color !== undefined) db.prepare('UPDATE tab_groups SET color = ? WHERE id = ?').run(data.color, groupId);
    this.emitUpdate();
  }

  collapseGroup(groupId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tab_groups SET is_collapsed = 1 WHERE id = ?').run(groupId);
    this.emitUpdate();
  }

  expandGroup(groupId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tab_groups SET is_collapsed = 0 WHERE id = ?').run(groupId);
    this.emitUpdate();
  }

  deleteGroup(groupId: string, closeTabs: boolean): void {
    const db = getDatabase();
    if (closeTabs) {
      const groupTabs = this.getTabs().filter(t => t.group_id === groupId);
      for (const t of groupTabs) this.closeTab(t.id);
    } else {
      db.prepare('UPDATE tabs SET group_id = NULL WHERE group_id = ?').run(groupId);
    }
    db.prepare('DELETE FROM tab_groups WHERE id = ?').run(groupId);
    this.emitUpdate();
  }

  // ── Helpers ──────────────────────────────────────────────────

  private getNextPosition(): number {
    const db = getDatabase();
    return ((db.prepare('SELECT MAX(position) as max FROM tabs').get() as any)?.max ?? -1) + 1;
  }

  // ── Full state snapshot for renderer ─────────────────────────

  getState(): { tabs: Tab[]; groups: TabGroup[]; closedTabs: ClosedTab[] } {
    return {
      tabs: this.getTabs(),
      groups: this.getGroups(),
      closedTabs: this.closedTabs,
    };
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/main && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add packages/main/src/tabs/
git commit -m "feat(tabs): add TabManager and TabWebContents classes"
```

---

### Task 3: IPC Bridge — Wire TabManager to Renderer

**Files:**
- Modify: `packages/main/src/ipc/tabs.ts` — Refactor to delegate to TabManager
- Modify: `packages/shared/src/ipc-channels.ts` — Add new channels
- Modify: `packages/preload/src/index.ts` — Expose new methods

- [ ] **Step 1: Add new IPC channels to shared/ipc-channels.ts**

Add after the existing TAB_STOP entry:
```typescript
TAB_REORDER: 'tab:reorder',
TAB_DUPLICATE: 'tab:duplicate',
TAB_CLOSE_OTHERS: 'tab:close-others',
TAB_CLOSE_TO_RIGHT: 'tab:close-to-right',
TAB_MOVE_LEFT: 'tab:move-left',
TAB_MOVE_RIGHT: 'tab:move-right',
TAB_PIN: 'tab:pin',
TAB_UNPIN: 'tab:unpin',
TAB_MUTE: 'tab:mute',
TAB_UNMUTE: 'tab:unmute',
TAB_REOPEN_CLOSED: 'tab:reopen-closed',
TAB_GET_STATE: 'tab:get-state',
GROUP_CREATE: 'group:create',
GROUP_ADD_TAB: 'group:add-tab',
GROUP_REMOVE_TAB: 'group:remove-tab',
GROUP_UPDATE: 'group:update',
GROUP_COLLAPSE: 'group:collapse',
GROUP_EXPAND: 'group:expand',
GROUP_DELETE: 'group:delete',
SESSION_SAVE: 'session:save',
SESSION_RESTORE: 'session:restore',
```

- [ ] **Step 2: Refactor tabs.ts to use TabManager**

At the top of `registerTabHandlers`, create TabManager instance and rewire all existing IPC handlers to delegate to it.

**Key changes:**

a) Create `tabManager` at the top of `registerTabHandlers`:
```typescript
const broadcastState = () => mainWindow.webContents.send('tabs:state-updated', tabManager.getState());
const tabManager = new TabManager(mainWindow, broadcastState);
tabManager.setSetupViewEvents(setupViewEvents as any);
```

b) **Refactor `setupViewEvents` signature** from `(view, tabId, mainWindow)` to `(view, tabId, mainWindow, tabManager)`. Inside, replace direct `tabViews` Map access with `getTabView()`/`getAllTabViews()` from TabWebContents. Replace direct `db.prepare(...)` calls for tab updates with `tabManager.updateTabField()`.

c) **Refactor `createTabFromMain`** to use TabManager instead of direct DB/view access:
```typescript
export function createTabFromMain(mainWindow: BrowserWindow, url: string, tabManager: TabManager, oauthOpener?: { ... }): void {
  const tab = tabManager.createTab(url);
  if (oauthOpener) oauthTabOrigins.set(tab.id, oauthOpener);
  // tabs:state-updated is already broadcast by tabManager.createTab()
  // Also send legacy tabs:refresh for backward compat during transition
  mainWindow.webContents.send('tabs:refresh', { newTabId: tab.id, url, title: tab.title, position: tab.position });
}
```
Pass `tabManager` to `setupViewEvents` so that internal callers of `createTabFromMain` can access it.

d) **Preserve all non-tab IPC handlers** that are currently in tabs.ts: `tab:pip`, `tab:print`, `tab:print-to-pdf`, `tab:get-content`, `exchange:inject-overlay`, `exchange:remove-overlay`, `pwa:install`. These use `tabViews.get(id)` — change to `getTabView(id)` from TabWebContents.

e) **Dual-event support**: During transition, broadcast BOTH `tabs:state-updated` (new) and `tabs:refresh` (legacy). Remove legacy event in Task 15 (cleanup).

- [ ] **Step 3: Add new handlers for reorder, groups, pin, mute, etc.**

Each new IPC channel maps directly to a TabManager method. Example:
```typescript
ipcMain.handle(IPC.TAB_REORDER, (_e, tabId: string, newIndex: number) => {
  tabManager.reorderTab(tabId, newIndex);
});
ipcMain.handle(IPC.GROUP_CREATE, (_e, tabIds: string[], name?: string) => {
  return tabManager.createGroup(tabIds, name);
});
```

- [ ] **Step 4: Update preload to expose new methods**

Add to `window.osBrowser.tabs`:
```typescript
reorder: (id: string, newIndex: number) => ipcRenderer.invoke(IPC.TAB_REORDER, id, newIndex),
duplicate: (id: string) => ipcRenderer.invoke(IPC.TAB_DUPLICATE, id),
closeOthers: (id: string) => ipcRenderer.invoke(IPC.TAB_CLOSE_OTHERS, id),
closeToRight: (id: string) => ipcRenderer.invoke(IPC.TAB_CLOSE_TO_RIGHT, id),
moveLeft: (id: string) => ipcRenderer.invoke(IPC.TAB_MOVE_LEFT, id),
moveRight: (id: string) => ipcRenderer.invoke(IPC.TAB_MOVE_RIGHT, id),
pin: (id: string) => ipcRenderer.invoke(IPC.TAB_PIN, id),
unpin: (id: string) => ipcRenderer.invoke(IPC.TAB_UNPIN, id),
mute: (id: string) => ipcRenderer.invoke(IPC.TAB_MUTE, id),
unmute: (id: string) => ipcRenderer.invoke(IPC.TAB_UNMUTE, id),
reopenClosed: () => ipcRenderer.invoke(IPC.TAB_REOPEN_CLOSED),
getState: () => ipcRenderer.invoke(IPC.TAB_GET_STATE),
onStateUpdated: (cb: (data: any) => void) => {
  const listener = (_e: any, data: any) => cb(data);
  ipcRenderer.on('tabs:state-updated', listener);
  return () => ipcRenderer.removeListener('tabs:state-updated', listener);
},
```

Add `window.osBrowser.groups`:
```typescript
groups: {
  create: (tabIds: string[], name?: string) => ipcRenderer.invoke(IPC.GROUP_CREATE, tabIds, name),
  addTab: (tabId: string, groupId: string) => ipcRenderer.invoke(IPC.GROUP_ADD_TAB, tabId, groupId),
  removeTab: (tabId: string) => ipcRenderer.invoke(IPC.GROUP_REMOVE_TAB, tabId),
  update: (groupId: string, data: any) => ipcRenderer.invoke(IPC.GROUP_UPDATE, groupId, data),
  collapse: (groupId: string) => ipcRenderer.invoke(IPC.GROUP_COLLAPSE, groupId),
  expand: (groupId: string) => ipcRenderer.invoke(IPC.GROUP_EXPAND, groupId),
  delete: (groupId: string, closeTabs: boolean) => ipcRenderer.invoke(IPC.GROUP_DELETE, groupId, closeTabs),
},
```

- [ ] **Step 5: Build and test basic operations work**

Launch the app. Verify: create tab, close tab, switch tab, navigate — all still work as before.

- [ ] **Step 6: Commit**

```bash
git add packages/main/src/ipc/tabs.ts packages/shared/src/ipc-channels.ts packages/preload/src/index.ts
git commit -m "feat(tabs): wire TabManager to IPC bridge with new channels"
```

---

### Task 4: Renderer Store — Mirror Main Process State

**Files:**
- Modify: `packages/renderer/src/store/tabs.ts`

- [ ] **Step 1: Expand store to handle groups, audio, multi-select, and state sync**

Replace the current store with:

```typescript
import { create } from 'zustand';
import { useNavigationStore } from './navigation';

// ── Types ──────────────────────────────────────────────────────
export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon_path: string | null;
  position: number;
  is_pinned: boolean;
  is_active: boolean;
  is_muted: boolean;
  is_audio_playing: boolean;
  is_loading?: boolean;
  group_id: string | null;
}

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  is_collapsed: boolean;
  position: number;
}

interface ClosedTab {
  url: string;
  title: string;
  favicon_path: string | null;
  closed_at: number;
}

interface TabsState {
  tabs: Tab[];
  groups: TabGroup[];
  activeTabId: string | null;
  closedTabs: ClosedTab[];
  selectedTabIds: string[];  // Use array not Set — Zustand shallow equality + JSON serializable

  // Init
  loadTabs: () => Promise<void>;
  syncFromMain: (state: { tabs: Tab[]; groups: TabGroup[]; closedTabs: ClosedTab[] }) => void;

  // Tab CRUD
  createTab: (url?: string) => Promise<void>;
  closeTab: (id: string) => Promise<void>;
  switchTab: (id: string) => Promise<void>;
  updateTab: (id: string, data: Partial<Tab>) => void;

  // Extended
  duplicateTab: (id: string) => Promise<void>;
  reopenLastClosed: () => Promise<void>;
  reorderTab: (id: string, newIndex: number) => Promise<void>;
  pinTab: (id: string) => Promise<void>;
  unpinTab: (id: string) => Promise<void>;
  muteTab: (id: string) => Promise<void>;
  unmuteTab: (id: string) => Promise<void>;
  closeOtherTabs: (id: string) => Promise<void>;
  closeTabsToRight: (id: string) => Promise<void>;
  moveTabLeft: (id: string) => Promise<void>;
  moveTabRight: (id: string) => Promise<void>;

  // Groups
  createGroup: (tabIds: string[], name?: string) => Promise<void>;
  addTabToGroup: (tabId: string, groupId: string) => Promise<void>;
  removeTabFromGroup: (tabId: string) => Promise<void>;
  updateGroup: (groupId: string, data: { name?: string; color?: string }) => Promise<void>;
  collapseGroup: (groupId: string) => Promise<void>;
  expandGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string, closeTabs: boolean) => Promise<void>;

  // Multi-select
  toggleSelectTab: (id: string) => void;
  rangeSelectTab: (id: string) => void;
  clearSelection: () => void;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  groups: [],
  activeTabId: null,
  closedTabs: [],
  selectedTabIds: [],

  loadTabs: async () => {
    const state = await window.osBrowser.tabs.getState();
    const active = state.tabs.find((t: Tab) => t.is_active);
    set({
      tabs: state.tabs,
      groups: state.groups,
      closedTabs: state.closedTabs,
      activeTabId: active?.id || null,
    });
  },

  syncFromMain: (state) => {
    const active = state.tabs.find(t => t.is_active);
    set({
      tabs: state.tabs,
      groups: state.groups,
      closedTabs: state.closedTabs,
      activeTabId: active?.id || null,
    });
  },

  createTab: async (url) => {
    const tab = await window.osBrowser.tabs.create(url);
    // State will sync via 'tabs:state-updated' event
    // But also do optimistic update for responsiveness
    set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
    await window.osBrowser.tabs.switch(tab.id);
    useNavigationStore.getState().setUrl(tab.url || '');
    useNavigationStore.getState().setLoading(false);
    // Workspace integration (renderer-side, preserved from original)
    try {
      const { useWorkspaceStore } = await import('./workspaces');
      useWorkspaceStore.getState().addTabToWorkspace(tab.id);
    } catch {}
  },

  closeTab: async (id) => {
    // Remove from workspace BEFORE closing (renderer-side workspace state)
    try {
      const { useWorkspaceStore } = await import('./workspaces');
      useWorkspaceStore.getState().removeTabFromWorkspace(id);
    } catch {}
    await window.osBrowser.tabs.close(id);
    // Main process handles next-tab selection and broadcasts state
  },

  switchTab: async (id) => {
    await window.osBrowser.tabs.switch(id);
    set({ activeTabId: id, selectedTabIds: [] });
    const tab = get().tabs.find(t => t.id === id);
    useNavigationStore.getState().setUrl(tab?.url || '');
    useNavigationStore.getState().setLoading(false);
  },

  updateTab: (id, data) => {
    set(s => ({ tabs: s.tabs.map(t => t.id === id ? { ...t, ...data } : t) }));
  },

  duplicateTab: async (id) => { await window.osBrowser.tabs.duplicate(id); },
  reopenLastClosed: async () => { await window.osBrowser.tabs.reopenClosed(); },
  reorderTab: async (id, newIndex) => { await window.osBrowser.tabs.reorder(id, newIndex); },
  pinTab: async (id) => { await window.osBrowser.tabs.pin(id); },
  unpinTab: async (id) => { await window.osBrowser.tabs.unpin(id); },
  muteTab: async (id) => { await window.osBrowser.tabs.mute(id); },
  unmuteTab: async (id) => { await window.osBrowser.tabs.unmute(id); },
  closeOtherTabs: async (id) => { await window.osBrowser.tabs.closeOthers(id); },
  closeTabsToRight: async (id) => { await window.osBrowser.tabs.closeToRight(id); },
  moveTabLeft: async (id) => { await window.osBrowser.tabs.moveLeft(id); },
  moveTabRight: async (id) => { await window.osBrowser.tabs.moveRight(id); },

  createGroup: async (tabIds, name) => { await window.osBrowser.groups.create(tabIds, name); },
  addTabToGroup: async (tabId, groupId) => { await window.osBrowser.groups.addTab(tabId, groupId); },
  removeTabFromGroup: async (tabId) => { await window.osBrowser.groups.removeTab(tabId); },
  updateGroup: async (groupId, data) => { await window.osBrowser.groups.update(groupId, data); },
  collapseGroup: async (groupId) => { await window.osBrowser.groups.collapse(groupId); },
  expandGroup: async (groupId) => { await window.osBrowser.groups.expand(groupId); },
  deleteGroup: async (groupId, closeTabs) => { await window.osBrowser.groups.delete(groupId, closeTabs); },

  toggleSelectTab: (id) => {
    set(s => {
      const has = s.selectedTabIds.includes(id);
      return { selectedTabIds: has ? s.selectedTabIds.filter(i => i !== id) : [...s.selectedTabIds, id] };
    });
  },

  rangeSelectTab: (id) => {
    const { tabs, activeTabId } = get();
    if (!activeTabId) return;
    const activeIdx = tabs.findIndex(t => t.id === activeTabId);
    const targetIdx = tabs.findIndex(t => t.id === id);
    const [start, end] = [Math.min(activeIdx, targetIdx), Math.max(activeIdx, targetIdx)];
    set({ selectedTabIds: tabs.slice(start, end + 1).map(t => t.id) });
  },

  clearSelection: () => set({ selectedTabIds: [] }),
}));
```

- [ ] **Step 2: Wire state sync listener in App.tsx (or wherever tabs init)**

In the component that calls `loadTabs()` on mount, also register:
```typescript
useEffect(() => {
  const unsub = window.osBrowser.tabs.onStateUpdated((state) => {
    useTabsStore.getState().syncFromMain(state);
  });
  return unsub;
}, []);
```

- [ ] **Step 3: Build and verify basic tab operations still work**

- [ ] **Step 4: Commit**

```bash
git add packages/renderer/src/store/tabs.ts packages/renderer/src/App.tsx
git commit -m "feat(tabs): expanded Zustand store with groups, selection, and state sync"
```

---

## Phase 2: Tab Bar UI (Tasks 5-8)
New tab bar with drag-and-drop, full context menu, pinned tabs, and groups.

### Task 5: New Tab Bar + Tab Components

**Files:**
- Create: `packages/renderer/src/components/Browser/tabs/Tab.tsx`
- Create: `packages/renderer/src/components/Browser/tabs/PinnedTab.tsx`
- Create: `packages/renderer/src/components/Browser/tabs/NewTabButton.tsx`
- Create: `packages/renderer/src/components/Browser/tabs/TabBar.tsx`

- [ ] **Step 1: Create Tab.tsx — enhanced single tab component**

Port the existing `Tab.tsx` logic but add:
- `isSelected` prop (multi-select highlight)
- `isAudioPlaying` / `isMuted` props with speaker icon
- `groupColor` prop for group underline
- `onContextMenu` prop
- `data-tab-id` attribute for drag identification
- Remove the hover preview (will be a separate component later)

Keep the existing color tinting, responsive width calculation, loading spinner, and close animation.

- [ ] **Step 2: Create PinnedTab.tsx — compact pinned variant**

Favicon-only, 34px wide, no close button, no title. Click to switch. Right-click for context menu.

- [ ] **Step 3: Create NewTabButton.tsx**

Extract the existing `+` button from TabBar.tsx into its own component.

- [ ] **Step 4: Create TabBar.tsx — full tab strip container**

Layout: `[Pinned Tabs] [Group Label + Grouped Tabs] [Ungrouped Tabs] [+ New Tab]`
- Render pinned tabs first (left side)
- For each group: render group label chip + member tabs
- Then ungrouped tabs
- Then new tab button
- Horizontal scroll with fade indicators (port from old TabBar)
- ResizeObserver for container width
- Active tab auto-scroll

- [ ] **Step 5: Update imports in parent components**

Change all `import { TabBar } from './TabBar'` to use the new `tabs/TabBar`. Update `import { Tab }` similarly.

- [ ] **Step 6: Build and verify tabs render correctly**

- [ ] **Step 7: Commit**

```bash
git add packages/renderer/src/components/Browser/tabs/
git commit -m "feat(tabs): new TabBar, Tab, PinnedTab, NewTabButton components"
```

---

### Task 6: Tab Drag-and-Drop Reordering

**Files:**
- Create: `packages/renderer/src/hooks/useTabDrag.ts`
- Create: `packages/renderer/src/components/Browser/tabs/TabDragOverlay.tsx`
- Modify: `packages/renderer/src/components/Browser/tabs/TabBar.tsx`

- [ ] **Step 1: Install @dnd-kit**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Create useTabDrag.ts hook**

Wraps @dnd-kit's `useSortable` for each tab. Handles:
- `onDragEnd`: calls `reorderTab(tabId, newIndex)` via store
- 5px drag threshold (activationConstraint: distance: 5)
- Smooth animation of other tabs sliding aside

- [ ] **Step 3: Create TabDragOverlay.tsx**

Custom drag preview that shows a translucent copy of the tab being dragged.

- [ ] **Step 4: Wrap TabBar with DndContext and SortableContext**

The tab list becomes a `SortableContext` with items = tab IDs. Each Tab gets `useSortable`. Group boundaries are maintained during drag.

- [ ] **Step 5: Test drag reorder with 5+ tabs**

Verify: drag left/right reorders. Tabs animate smoothly. Position persists after refresh.

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/hooks/useTabDrag.ts packages/renderer/src/components/Browser/tabs/
git commit -m "feat(tabs): drag-and-drop tab reordering with @dnd-kit"
```

---

### Task 7: Full Tab Context Menu

**Files:**
- Create: `packages/renderer/src/components/Browser/tabs/TabContextMenu.tsx`
- Modify: `packages/renderer/src/components/Browser/tabs/TabBar.tsx`

- [ ] **Step 1: Create TabContextMenu.tsx**

React context menu component with all items from the spec:
```
New tab to the right
────────────────────
Reload                              Ctrl+R
Duplicate
Pin / Unpin
Mute site / Unmute site
────────────────────
Add tab to group  →  [New group] / [Existing groups...]
Remove from group
────────────────────
Close                               Ctrl+W
Close other tabs
Close tabs to the right
Reopen closed tab                    Ctrl+Shift+T
```

When multiple tabs are selected, show plural labels.

Use a submenu pattern for "Add tab to group" (show existing groups + "New group" option).

- [ ] **Step 2: Add empty-space context menu**

Right-clicking empty space in the tab bar:
```
New tab                              Ctrl+T
Reopen closed tab                    Ctrl+Shift+T
Bookmark all tabs                    Ctrl+Shift+D
Tab search                           Ctrl+Shift+A
```

- [ ] **Step 3: Wire into TabBar**

Replace the old context menu in TabBar with the new TabContextMenu component.

- [ ] **Step 4: Test all menu items**

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/components/Browser/tabs/TabContextMenu.tsx
git commit -m "feat(tabs): full Chrome-style tab context menu"
```

---

### Task 8: Tab Groups UI

**Files:**
- Create: `packages/renderer/src/components/Browser/tabs/TabGroup.tsx`
- Modify: `packages/renderer/src/components/Browser/tabs/TabBar.tsx`

- [ ] **Step 1: Create TabGroup.tsx — group label chip**

Colored chip/label that:
- Shows group name (or blank if unnamed) with group color
- Click to toggle collapse/expand
- Right-click: rename, change color, ungroup, close group, move to new window
- Inline rename (contentEditable or input on click)
- 8 color options shown as swatches in the color picker dropdown

- [ ] **Step 2: Update TabBar to render groups**

Group tabs visually: for each group, render `<TabGroup>` label followed by member `<Tab>` components. When collapsed, hide member tabs.

Group tabs share a colored bottom border matching the group color.

- [ ] **Step 3: Handle drag in/out of groups**

When a tab is dragged between group members, it joins the group. When dragged outside, it leaves.

- [ ] **Step 4: Test: create group, rename, change color, collapse, expand, delete**

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/components/Browser/tabs/TabGroup.tsx
git commit -m "feat(tabs): tab groups with colored labels, collapse/expand"
```

---

## Phase 3: Indicators & Interaction (Tasks 9-12)

### Task 9: Audio Indicator

**Files:**
- Create: `packages/main/src/tabs/TabAudioMonitor.ts`
- Modify: `packages/main/src/tabs/TabWebContents.ts` (or setupViewEvents in tabs.ts)
- Modify: `packages/renderer/src/components/Browser/tabs/Tab.tsx`

- [ ] **Step 1: Wire media events in main process**

In `setupViewEvents`, add:
```typescript
view.webContents.on('media-started-playing', () => {
  tabManager.setAudioPlaying(tabId, true);
});
view.webContents.on('media-paused', () => {
  tabManager.setAudioPlaying(tabId, false);
});
```

- [ ] **Step 2: Add speaker icon to Tab.tsx**

When `isAudioPlaying` is true, show a small speaker icon (Volume2 from lucide). When `isMuted`, show VolumeX. Clicking the icon toggles mute.

- [ ] **Step 3: Test with a YouTube tab**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(tabs): audio playing indicator with click-to-mute"
```

---

### Task 10: Enhanced Loading States

**Files:**
- Modify: `packages/renderer/src/components/Browser/tabs/Tab.tsx`

- [ ] **Step 1: Two-phase loading spinner**

The existing spinner is a single animation. Add two phases:
- **Connecting** (did-start-loading → did-start-navigation): Slower, subtler spin (2s duration)
- **Loading** (did-start-navigation → did-stop-loading): Faster spin (0.8s duration)

Wire `did-start-navigation` as a new event from main process → renderer.

- [ ] **Step 2: Smooth favicon transition**

When loading completes, crossfade from spinner to favicon (opacity transition 200ms).

- [ ] **Step 3: Error state**

When `did-fail-load` fires, show a warning icon instead of favicon.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(tabs): two-phase loading spinner and error states"
```

---

### Task 11: Tab Hover Preview with Thumbnail

**Files:**
- Create: `packages/renderer/src/components/Browser/tabs/TabPreview.tsx`
- Modify: `packages/main/src/ipc/tabs.ts` (add thumbnail capture)

- [ ] **Step 1: Add thumbnail capture in main process**

New IPC handler `tab:capture-thumbnail` that calls `webContents.capturePage()` and returns a data URL. Capture at reduced resolution (300x200) for performance.

Also: periodically capture thumbnails (every 30s for the active tab, on tab switch for the deactivated tab).

- [ ] **Step 2: Create TabPreview.tsx**

Tooltip card that appears on 400ms hover delay:
- Page title (full)
- URL (domain + truncated path)
- Thumbnail image (if available)
- Styled with shadow, rounded corners, dark background

- [ ] **Step 3: Wire into Tab component**

On mouseenter with 400ms delay, show TabPreview. On mouseleave, hide.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(tabs): hover preview with page thumbnail"
```

---

### Task 12: Complete Keyboard Shortcuts

**Files:**
- Modify: `packages/renderer/src/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 1: Add missing shortcuts**

```typescript
// Ctrl+Shift+PageUp — Move tab left
// Ctrl+Shift+PageDown — Move tab right
// Ctrl+N — New window
// Ctrl+Shift+W — Close window
// Ctrl+Shift+A — Tab search
// Ctrl+9 — Jump to last tab (special case, not tab 9)
```

- [ ] **Step 2: Fix Ctrl+9 to always go to last tab**

Currently `Ctrl+9` goes to tab index 8. Chrome behavior: Ctrl+9 always goes to the LAST tab regardless of count.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(tabs): complete keyboard shortcuts (move, search, window)"
```

---

## Phase 4: Session & Polish (Tasks 13-15)

### Task 13: Multi-Select

**Files:**
- Modify: `packages/renderer/src/components/Browser/tabs/Tab.tsx`
- Modify: `packages/renderer/src/components/Browser/tabs/TabBar.tsx`

- [ ] **Step 1: Handle Ctrl+Click and Shift+Click in TabBar**

On tab click:
- No modifier: switch to tab, clear selection
- Ctrl+Click: toggle tab in selection set
- Shift+Click: range select from active tab to clicked tab

- [ ] **Step 2: Visual indicator for selected tabs**

Selected tabs get a subtle highlight ring or different background.

- [ ] **Step 3: Bulk context menu for selection**

When right-clicking with multiple tabs selected: "Close N tabs", "Add N tabs to group", "Move N tabs".

- [ ] **Step 4: Bulk drag**

Dragging a selected tab moves all selected tabs together.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(tabs): multi-select with Ctrl+Click, Shift+Click, bulk operations"
```

---

### Task 14: Session Save & Restore

**Files:**
- Create: `packages/main/src/tabs/TabSessionManager.ts`
- Modify: `packages/main/src/main.ts` (wire session save/restore)

- [ ] **Step 1: Create TabSessionManager.ts**

```typescript
export class TabSessionManager {
  private saveInterval: NodeJS.Timeout | null = null;

  startAutoSave(tabManager: TabManager, intervalMs = 30000): void {
    this.saveInterval = setInterval(() => this.save(tabManager), intervalMs);
  }

  stopAutoSave(): void {
    if (this.saveInterval) clearInterval(this.saveInterval);
  }

  save(tabManager: TabManager): void {
    const db = getDatabase();
    const state = tabManager.getState();
    db.prepare('INSERT OR REPLACE INTO session_data (key, value, updated_at) VALUES (?, ?, datetime("now"))').run(
      'last_session',
      JSON.stringify({
        tabs: state.tabs.map(t => ({ url: t.url, title: t.title, position: t.position, is_pinned: t.is_pinned, group_id: t.group_id })),
        groups: state.groups,
        activeTabId: state.tabs.find(t => t.is_active)?.id,
        cleanExit: false,
      })
    );
  }

  markCleanExit(): void {
    const db = getDatabase();
    const raw = db.prepare('SELECT value FROM session_data WHERE key = ?').get('last_session') as any;
    if (raw) {
      const data = JSON.parse(raw.value);
      data.cleanExit = true;
      db.prepare('UPDATE session_data SET value = ? WHERE key = ?').run(JSON.stringify(data), 'last_session');
    }
  }

  restore(): { tabs: any[]; groups: any[]; wasClean: boolean } | null {
    const db = getDatabase();
    const raw = db.prepare('SELECT value FROM session_data WHERE key = ?').get('last_session') as any;
    if (!raw) return null;
    const data = JSON.parse(raw.value);
    return { tabs: data.tabs, groups: data.groups, wasClean: data.cleanExit };
  }
}
```

- [ ] **Step 2: Wire into main.ts**

On app ready: check for previous session. If found and wasn't clean exit, send `'session:crashed'` to renderer (shows "Restore previous session?" prompt). If clean, restore pinned tabs only.

On app quit: call `markCleanExit()`.

Start auto-save after window ready.

- [ ] **Step 3: Add "Restore session" prompt in renderer**

Simple modal: "OS Browser didn't shut down correctly. Restore your tabs?" → [Restore] [Start Fresh]

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(tabs): session save/restore with crash recovery"
```

---

### Task 15: Performance & Cleanup

**Files:**
- Modify: multiple files

- [ ] **Step 1: Tab discarding for memory**

When a tab hasn't been accessed in 30+ minutes and 20+ tabs are open, set its WebContentsView bounds to 0,0,0,0 and free memory. Restore on switch.

- [ ] **Step 2: Debounce state broadcasts**

The `emitUpdate` function in TabManager should be debounced (16ms) to avoid flooding the renderer during bulk operations.

- [ ] **Step 3: Remove old TabBar.tsx and Tab.tsx**

Delete the original `packages/renderer/src/components/Browser/TabBar.tsx` and `Tab.tsx` once all imports point to the new `tabs/` directory.

- [ ] **Step 4: Test with 30+ tabs**

Open 30+ tabs. Verify: no UI jank, tab switching is instant, scrolling is smooth.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(tabs): performance optimization, tab discarding, cleanup"
```

---

## Phase 5: Advanced (Task 16) — DEFER

### Task 16: Tab Tear-Off / Merge Between Windows

This is the hardest feature and can be implemented later. It requires:
- Detecting drag out of tab bar bounds
- Creating a new BrowserWindow
- Transferring WebContentsView between windows
- Detecting drag from another window into this tab bar

**Defer until the core tab system is stable and tested.**

---

## Implementation Notes

1. **Keep setupViewEvents intact** — The 700-line function in `tabs.ts` handles OAuth, PWA, ad blocking, vault, USSD, context menus. Change its signature to accept `tabManager` as 4th parameter, but don't rewrite internal logic. Replace direct `tabViews` Map access with `getTabView()` from TabWebContents. Replace direct `db.prepare(...)` calls for tab updates with `tabManager.updateTabField()`.

2. **`createTabFromMain` MUST go through TabManager** — This function is called by `setupViewEvents` for context-menu link opens, `window.open()`, and OAuth flows. Refactor it to accept `tabManager` as a parameter and call `tabManager.createTab()` instead of direct DB/view manipulation. This is critical — without it, tabs created from links will be invisible to the manager.

3. **Backward compatibility — workspace store** — The workspace store (`useWorkspaceStore`) references tabs by ID in localStorage. The new renderer store preserves `addTabToWorkspace()`/`removeTabFromWorkspace()` calls in `createTab()`/`closeTab()`. Chrome-style `is_pinned` in DB takes precedence over workspace-based pinning (`pinTabGlobally`).

4. **Dual event support during transition** — Both `tabs:state-updated` (new) and `tabs:refresh` (legacy) are broadcast until Task 15 cleanup. The existing `onTabsRefresh` listener in the renderer continues to work during migration.

5. **Preserve non-tab IPC handlers** — `tab:pip`, `tab:print`, `tab:print-to-pdf`, `tab:get-content`, `exchange:inject-overlay`, `exchange:remove-overlay`, `pwa:install` all live in `tabs.ts` and use `tabViews.get(id)`. Change these to `getTabView(id)` from TabWebContents.

6. **@dnd-kit vs native HTML5 drag** — Use @dnd-kit for better control over animations and touch support. Adds ~15KB to renderer bundle.

7. **State sync strategy** — Main process is source of truth. Renderer does optimistic updates for responsiveness, then reconciles when `tabs:state-updated` arrives. This prevents the state drift bugs in the current system.

8. **Kente theme integration** — All new components use CSS custom properties from the existing theme system (`var(--color-surface-1)`, `var(--kente-tab-bg)`, etc.).

9. **Chrome offset constants** — The 171px/48px/2px values in TabWebContents.ts are the SINGLE source of truth. Remove the duplicate `resizeViewToContent()` function from tabs.ts in Task 3 and replace all callers with `resizeView()` from TabWebContents.
