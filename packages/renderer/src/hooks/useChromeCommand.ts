import { useEffect } from 'react';
import { useTabsStore } from '@/store/tabs';
import { useSidebarStore } from '@/store/sidebar';
import { useFindStore } from '@/store/find';

/**
 * Listens for chrome:command IPC messages forwarded by main when the user
 * presses a keyboard shortcut while the WebContentsView (page) has focus.
 *
 * Without this, page-focus shortcuts like Ctrl+L / Ctrl+T / Ctrl+W silently
 * do nothing because the renderer's window keydown listener only fires when
 * the chrome (not the page) has focus.
 */
export function useChromeCommand(callbacks: {
  onToggleHistory?: () => void;
  onToggleBookmarks?: () => void;
  onToggleDownloads?: () => void;
  onBookmarkPage?: () => void;
}) {
  const { createTab, closeTab, activeTabId, switchTab, tabs, reopenLastClosed } = useTabsStore();
  const { toggleSidebar } = useSidebarStore();

  useEffect(() => {
    const unsub = (window as any).osBrowser?.tabs?.onChromeCommand?.((cmd: any) => {
      if (!cmd || !cmd.type) return;
      switch (cmd.type) {
        case 'focus-omnibar': {
          (document.querySelector('[aria-label="Address bar"]') as HTMLInputElement)?.focus();
          break;
        }
        case 'new-tab': {
          createTab();
          break;
        }
        case 'close-tab': {
          if (activeTabId) closeTab(activeTabId);
          break;
        }
        case 'reopen-tab': {
          reopenLastClosed();
          break;
        }
        case 'next-tab': {
          const sorted = [...tabs].sort((a, b) => a.position - b.position);
          const idx = sorted.findIndex((t) => t.id === activeTabId);
          if (idx >= 0 && sorted.length > 0) {
            switchTab(sorted[(idx + 1) % sorted.length].id);
          }
          break;
        }
        case 'prev-tab': {
          const sorted = [...tabs].sort((a, b) => a.position - b.position);
          const idx = sorted.findIndex((t) => t.id === activeTabId);
          if (idx >= 0 && sorted.length > 0) {
            switchTab(sorted[(idx - 1 + sorted.length) % sorted.length].id);
          }
          break;
        }
        case 'jump-to-tab': {
          const n: number = cmd.n;
          const sorted = [...tabs].sort((a, b) => a.position - b.position);
          if (n === 9) {
            // Ctrl+9: jump to last tab (Chrome convention)
            if (sorted.length > 0) switchTab(sorted[sorted.length - 1].id);
          } else if (n >= 1 && n <= 8 && n - 1 < sorted.length) {
            switchTab(sorted[n - 1].id);
          }
          break;
        }
        case 'toggle-history': {
          callbacks.onToggleHistory?.();
          break;
        }
        case 'toggle-bookmarks': {
          callbacks.onToggleBookmarks?.();
          break;
        }
        case 'toggle-downloads': {
          callbacks.onToggleDownloads?.();
          break;
        }
        case 'bookmark-page': {
          callbacks.onBookmarkPage?.();
          break;
        }
        case 'new-window': {
          (window as any).osBrowser?.newWindow?.();
          break;
        }
        case 'new-private-window': {
          (window as any).osBrowser?.newPrivateWindow?.();
          break;
        }
        case 'close-window': {
          (window as any).osBrowser?.close?.();
          break;
        }
        case 'find-next':
        case 'find-prev': {
          // Open the FindBar if closed; the bar's own input handles next/prev
          // via Enter / Shift+Enter. We open it here so F3/Shift+F3 act as
          // shortcuts even when the bar isn't visible yet.
          useFindStore.getState().open();
          break;
        }
      }
    });
    return unsub;
  }, [activeTabId, tabs, createTab, closeTab, switchTab, reopenLastClosed, toggleSidebar, callbacks]);
}
