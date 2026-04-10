import { BrowserWindow, WebContentsView } from 'electron';
import crypto from 'crypto';
import { getDatabase } from '../db/database';
import {
  getTabView,
  createTabView,
  destroyTabView,
  showTabView,
  hideAllTabViews,
} from './TabWebContents';

// ── Types ───────────────────────────────────────────────────────────────

export type TabGroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange';

export interface Tab {
  id: string;
  title: string;
  url: string;
  position: number;
  is_active: number;
  is_pinned: number;
  is_muted: number;
  favicon_path: string | null;
  group_id: string | null;
  last_accessed_at: string;
  created_at?: string;
}

export interface TabGroup {
  id: string;
  name: string;
  color: TabGroupColor;
  collapsed: number;
  position: number;
  created_at: string;
}

export interface ClosedTab {
  id: string;
  title: string;
  url: string;
  favicon_path: string | null;
  closedAt: number;
}

// ── Internal page titles ────────────────────────────────────────────────

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

function resolveTitle(url: string): string {
  if (INTERNAL_TITLES[url]) return INTERNAL_TITLES[url];
  if (url.startsWith('os-browser://')) {
    return url.replace('os-browser://', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  return 'New Tab';
}

function isInternalUrl(url: string): boolean {
  return url.startsWith('os-browser://');
}

// ── Constants ───────────────────────────────────────────────────────────

const MAX_CLOSED_TABS = 25;

// ── TabManager ──────────────────────────────────────────────────────────

export class TabManager {
  private mainWindow: BrowserWindow;
  private emitUpdate: () => void;
  private closedTabs: ClosedTab[] = [];
  private audioPlaying = new Map<string, boolean>();

  /** Injected by the IPC layer after construction — sets up webContents event listeners on a view. */
  public setupViewEventsFn: ((view: WebContentsView, tabId: string, mainWindow: BrowserWindow) => void) | null = null;

  constructor(mainWindow: BrowserWindow, emitUpdate: () => void) {
    this.mainWindow = mainWindow;
    this.emitUpdate = emitUpdate;
  }

  // ── Queries ─────────────────────────────────────────────────────────

  getTabs(): Tab[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tabs ORDER BY position').all() as Tab[];
  }

  getTab(tabId: string): Tab | undefined {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tabs WHERE id = ?').get(tabId) as Tab | undefined;
  }

  getActiveTab(): Tab | undefined {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tabs WHERE is_active = 1').get() as Tab | undefined;
  }

  getGroups(): TabGroup[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tab_groups ORDER BY position').all() as TabGroup[];
  }

  getClosedTabs(): ClosedTab[] {
    return [...this.closedTabs];
  }

  // ── Tab CRUD ────────────────────────────────────────────────────────

  createTab(url?: string, afterTabId?: string): Tab {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const tabUrl = url || 'os-browser://newtab';
    const title = resolveTitle(tabUrl);

    // Capture current active tab's group_id BEFORE deactivating
    const currentActive = this.getActiveTab();
    const inheritGroupId = currentActive?.group_id || null;

    // Calculate position
    let position: number;
    if (afterTabId) {
      const afterTab = this.getTab(afterTabId);
      if (afterTab) {
        position = afterTab.position + 1;
        // Shift subsequent tabs right
        db.prepare('UPDATE tabs SET position = position + 1 WHERE position >= ?').run(position);
      } else {
        position = (db.prepare('SELECT MAX(position) as max FROM tabs').get() as any)?.max + 1 || 0;
      }
    } else {
      position = (db.prepare('SELECT MAX(position) as max FROM tabs').get() as any)?.max + 1 || 0;
    }

    // Deactivate all tabs
    db.prepare('UPDATE tabs SET is_active = 0 WHERE is_active = 1').run();

    // Insert new tab
    db.prepare(
      'INSERT INTO tabs (id, title, url, position, is_active, is_pinned, is_muted, favicon_path, group_id, last_accessed_at) VALUES (?, ?, ?, ?, 1, 0, 0, ?, ?, ?)'
    ).run(id, title, tabUrl, position, null, inheritGroupId, new Date().toISOString());

    // Create WebContentsView for non-internal URLs
    if (!isInternalUrl(tabUrl)) {
      const view = createTabView(id, this.mainWindow);
      if (this.setupViewEventsFn) {
        this.setupViewEventsFn(view, id, this.mainWindow);
      }
      (view.webContents as any).__markUserNavigation?.();
      view.webContents.loadURL(tabUrl);
    } else {
      // Internal page — hide all web views so React can render
      hideAllTabViews();
    }

    this.emitUpdate();

    return {
      id,
      title,
      url: tabUrl,
      position,
      is_active: 1,
      is_pinned: 0,
      is_muted: 0,
      favicon_path: null,
      group_id: inheritGroupId,
      last_accessed_at: new Date().toISOString(),
    };
  }

  closeTab(tabId: string): Tab | null {
    const db = getDatabase();
    const tab = this.getTab(tabId);
    if (!tab) return null;

    // Push to closed tabs stack
    this.closedTabs.push({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favicon_path: tab.favicon_path,
      closedAt: Date.now(),
    });
    if (this.closedTabs.length > MAX_CLOSED_TABS) {
      this.closedTabs.shift();
    }

    // If closing the active tab, activate an adjacent one
    let activatedTab: Tab | null = null;
    if (tab.is_active) {
      const allTabs = this.getTabs();
      const idx = allTabs.findIndex(t => t.id === tabId);
      // Prefer the tab to the right, then left
      const next = allTabs[idx + 1] || allTabs[idx - 1];
      if (next) {
        db.prepare('UPDATE tabs SET is_active = 1, last_accessed_at = ? WHERE id = ?').run(new Date().toISOString(), next.id);
        activatedTab = { ...next, is_active: 1 };
        // Show the newly activated tab's view (or hide all for internal)
        if (!isInternalUrl(next.url)) {
          showTabView(next.id);
        } else {
          hideAllTabViews();
        }
      }
    }

    // Remove from DB and destroy view
    db.prepare('DELETE FROM tabs WHERE id = ?').run(tabId);
    destroyTabView(tabId, this.mainWindow);
    this.audioPlaying.delete(tabId);

    this.emitUpdate();
    return activatedTab;
  }

  activateTab(tabId: string): Tab | undefined {
    const db = getDatabase();
    const tab = this.getTab(tabId);
    if (!tab) return undefined;

    db.prepare('UPDATE tabs SET is_active = 0 WHERE is_active = 1').run();
    db.prepare('UPDATE tabs SET is_active = 1, last_accessed_at = ? WHERE id = ?').run(new Date().toISOString(), tabId);

    if (!isInternalUrl(tab.url)) {
      // Ensure WebContentsView exists
      if (!getTabView(tabId)) {
        const view = createTabView(tabId, this.mainWindow);
        if (this.setupViewEventsFn) {
          this.setupViewEventsFn(view, tabId, this.mainWindow);
        }
        (view.webContents as any).__markUserNavigation?.();
        view.webContents.loadURL(tab.url);
      }
      showTabView(tabId, this.mainWindow);
    } else {
      hideAllTabViews();
    }

    this.emitUpdate();
    return { ...tab, is_active: 1, last_accessed_at: new Date().toISOString() };
  }

  // ── Reorder ─────────────────────────────────────────────────────────

  reorderTab(tabId: string, newIndex: number): void {
    const db = getDatabase();
    const tabs = this.getTabs();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Remove tab from current position
    const reordered = tabs.filter(t => t.id !== tabId);
    // Insert at new position
    reordered.splice(newIndex, 0, tab);

    // Update all positions in a transaction
    db.transaction(() => {
      reordered.forEach((t, i) => {
        db.prepare('UPDATE tabs SET position = ? WHERE id = ?').run(i, t.id);
      });
    })();

    this.emitUpdate();
  }

  moveTabLeft(tabId: string): void {
    const tabs = this.getTabs();
    const idx = tabs.findIndex(t => t.id === tabId);
    if (idx <= 0) return;
    this.reorderTab(tabId, idx - 1);
  }

  moveTabRight(tabId: string): void {
    const tabs = this.getTabs();
    const idx = tabs.findIndex(t => t.id === tabId);
    if (idx < 0 || idx >= tabs.length - 1) return;
    this.reorderTab(tabId, idx + 1);
  }

  // ── Pin / Unpin ─────────────────────────────────────────────────────

  pinTab(tabId: string): void {
    const db = getDatabase();
    const tab = this.getTab(tabId);
    if (!tab || tab.is_pinned) return;

    // Pinned tabs go to the left — count current pinned tabs for position
    const pinnedCount = (db.prepare('SELECT COUNT(*) FROM tabs WHERE is_pinned = 1').get() as any)?.count || 0;

    db.prepare('UPDATE tabs SET is_pinned = 1 WHERE id = ?').run(tabId);
    // Move to end of pinned section
    this.reorderTab(tabId, pinnedCount);
  }

  unpinTab(tabId: string): void {
    const db = getDatabase();
    const tab = this.getTab(tabId);
    if (!tab || !tab.is_pinned) return;

    const pinnedCount = (db.prepare('SELECT COUNT(*) FROM tabs WHERE is_pinned = 1').get() as any)?.count || 0;

    db.prepare('UPDATE tabs SET is_pinned = 0 WHERE id = ?').run(tabId);
    // Move to right after last pinned tab (pinnedCount - 1 since this tab is no longer pinned)
    this.reorderTab(tabId, Math.max(0, pinnedCount - 1));
  }

  // ── Mute ────────────────────────────────────────────────────────────

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

  // ── Audio state (in-memory only) ───────────────────────────────────

  setAudioPlaying(tabId: string, playing: boolean): void {
    this.audioPlaying.set(tabId, playing);
    this.emitUpdate();
  }

  isAudioPlaying(tabId: string): boolean {
    return this.audioPlaying.get(tabId) || false;
  }

  // ── Reopen closed tab ──────────────────────────────────────────────

  reopenClosedTab(): Tab | null {
    const closed = this.closedTabs.pop();
    if (!closed) return null;
    return this.createTab(closed.url);
  }

  // ── Field update (from webContents events) ─────────────────────────

  updateTabField(tabId: string, field: string, value: any): void {
    const db = getDatabase();
    const allowed = ['title', 'url', 'favicon_path'];
    if (!allowed.includes(field)) return;
    if (typeof value === 'string' && value.length > 2048) return;

    db.prepare(`UPDATE tabs SET ${field} = ? WHERE id = ?`).run(value, tabId);
    this.emitUpdate();
  }

  // ── Navigate ────────────────────────────────────────────────────────

  navigate(tabId: string, url: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET url = ?, last_accessed_at = ? WHERE id = ?').run(url, new Date().toISOString(), tabId);

    if (isInternalUrl(url)) {
      // Switching to an internal page — hide web views
      hideAllTabViews();
      this.emitUpdate();
      return;
    }

    let view = getTabView(tabId);
    if (!view) {
      view = createTabView(tabId, this.mainWindow);
      if (this.setupViewEventsFn) {
        this.setupViewEventsFn(view, tabId, this.mainWindow);
      }
    }
    view.setVisible(true);
    (view.webContents as any).__markUserNavigation?.();
    view.webContents.loadURL(url);
    this.emitUpdate();
  }

  // ── Duplicate ───────────────────────────────────────────────────────

  duplicateTab(tabId: string): Tab | null {
    const tab = this.getTab(tabId);
    if (!tab) return null;
    return this.createTab(tab.url, tabId);
  }

  // ── Bulk close ──────────────────────────────────────────────────────

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
    if (idx < 0) return;
    for (let i = tabs.length - 1; i > idx; i--) {
      if (!tabs[i].is_pinned) {
        this.closeTab(tabs[i].id);
      }
    }
  }

  // ── Tab Groups ──────────────────────────────────────────────────────

  createGroup(tabIds: string[], name?: string): TabGroup {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const groupName = name || 'New Group';
    const maxPos = (db.prepare('SELECT MAX(position) as max FROM tab_groups').get() as any)?.max || 0;
    const position = maxPos + 1;
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO tab_groups (id, name, color, collapsed, position, created_at) VALUES (?, ?, ?, 0, ?, ?)'
    ).run(id, groupName, 'grey', position, now);

    // Assign tabs to this group
    for (const tabId of tabIds) {
      db.prepare('UPDATE tabs SET group_id = ? WHERE id = ?').run(id, tabId);
    }

    this.emitUpdate();
    return { id, name: groupName, color: 'grey', collapsed: 0, position, created_at: now };
  }

  addTabToGroup(tabId: string, groupId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET group_id = ? WHERE id = ?').run(groupId, tabId);
    this.emitUpdate();
  }

  removeTabFromGroup(tabId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tabs SET group_id = ? WHERE id = ?').run(null, tabId);
    this.emitUpdate();
  }

  updateGroup(groupId: string, updates: Partial<Pick<TabGroup, 'name' | 'color'>>): void {
    const db = getDatabase();
    if (updates.name !== undefined) {
      db.prepare('UPDATE tab_groups SET name = ? WHERE id = ?').run(updates.name, groupId);
    }
    if (updates.color !== undefined) {
      db.prepare('UPDATE tab_groups SET color = ? WHERE id = ?').run(updates.color, groupId);
    }
    this.emitUpdate();
  }

  collapseGroup(groupId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tab_groups SET collapsed = 1 WHERE id = ?').run(groupId);
    this.emitUpdate();
  }

  expandGroup(groupId: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tab_groups SET collapsed = 0 WHERE id = ?').run(groupId);
    this.emitUpdate();
  }

  deleteGroup(groupId: string): void {
    const db = getDatabase();
    // Ungroup all tabs in this group
    db.prepare('UPDATE tabs SET group_id = ? WHERE group_id = ?').run(null, groupId);
    db.prepare('DELETE FROM tab_groups WHERE id = ?').run(groupId);
    this.emitUpdate();
  }

  // ── State snapshot ──────────────────────────────────────────────────

  getState(): { tabs: Tab[]; groups: TabGroup[]; closedTabs: ClosedTab[]; audioPlaying: Record<string, boolean> } {
    const tabs = this.getTabs();
    const groups = this.getGroups();
    const audioObj: Record<string, boolean> = {};
    for (const [id, playing] of this.audioPlaying) {
      if (playing) audioObj[id] = true;
    }
    return {
      tabs,
      groups,
      closedTabs: this.getClosedTabs(),
      audioPlaying: audioObj,
    };
  }
}
