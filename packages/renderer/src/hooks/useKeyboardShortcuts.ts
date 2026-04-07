import { useEffect } from 'react';
import { useTabsStore } from '@/store/tabs';
import { useNavigationStore } from '@/store/navigation';
import { useSidebarStore } from '@/store/sidebar';
import { useSplitScreenStore } from '@/store/splitscreen';

export function useKeyboardShortcuts(callbacks: {
  onToggleHistory?: () => void;
  onToggleBookmarks?: () => void;
  onToggleSettings?: () => void;
  onToggleCommandPalette?: () => void;
  onToggleSplitScreen?: () => void;
  onBookmarkPage?: () => void;
}) {
  const { createTab, closeTab, activeTabId, switchTab, tabs, reopenLastClosed, moveTabLeft, moveTabRight } = useTabsStore();
  const { reload, stop, isLoading, currentUrl } = useNavigationStore();
  const { toggleSidebar, openPanel, closePanel, activePanel } = useSidebarStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();

      // Ctrl+T — New tab
      if (ctrl && key === 't' && !shift) { e.preventDefault(); createTab(); }
      // Tab switching shortcuts (Ctrl+W, Ctrl+Tab, Ctrl+1-9, Ctrl+Shift+T) handled by useTabKeyboardShortcuts
      // Ctrl+Shift+PageUp — Move tab left
      else if (ctrl && shift && key === 'pageup') {
        e.preventDefault();
        if (activeTabId) moveTabLeft(activeTabId);
      }
      // Ctrl+Shift+PageDown — Move tab right
      else if (ctrl && shift && key === 'pagedown') {
        e.preventDefault();
        if (activeTabId) moveTabRight(activeTabId);
      }
      // Ctrl+N, Ctrl+Shift+T handled by useTabKeyboardShortcuts
      // Ctrl+Shift+W — Close window
      else if (ctrl && shift && key === 'w') {
        e.preventDefault();
        window.osBrowser?.close?.();
      }
      // Ctrl+L / Alt+D / F6 — Focus URL bar
      else if ((ctrl && key === 'l' && !shift) || (alt && key === 'd' && !ctrl) || key === 'f6') {
        e.preventDefault();
        (document.querySelector('[aria-label="Address bar"]') as HTMLInputElement)?.focus();
      }
      // Ctrl+K — Command Palette
      else if (ctrl && key === 'k' && !shift) {
        e.preventDefault();
        callbacks.onToggleCommandPalette?.();
      }
      // F5 / Ctrl+R — Reload
      else if (key === 'f5' || (ctrl && key === 'r')) {
        e.preventDefault();
        if (activeTabId) isLoading ? stop(activeTabId) : reload(activeTabId);
      }
      // Ctrl+H — History
      else if (ctrl && key === 'h' && !shift) { e.preventDefault(); callbacks.onToggleHistory?.(); }
      // Ctrl+B — Bookmarks
      else if (ctrl && key === 'b' && !shift) { e.preventDefault(); callbacks.onToggleBookmarks?.(); }
      // Ctrl+D — Bookmark current page
      else if (ctrl && key === 'd' && !shift) {
        e.preventDefault();
        callbacks.onBookmarkPage?.();
      }
      // Ctrl+J — AI Sidebar
      else if (ctrl && key === 'j' && !shift) { e.preventDefault(); toggleSidebar(); }
      // Ctrl+Shift+O — AskOzzy
      else if (ctrl && shift && key === 'o') { e.preventDefault(); openPanel(activePanel === 'askozzy' ? 'none' : 'askozzy'); }
      // Ctrl+Shift+S — Split Screen
      else if (ctrl && shift && key === 's') { e.preventDefault(); callbacks.onToggleSplitScreen?.(); }
      // Escape — Close sidebar/panel
      else if (key === 'escape') { closePanel(); }
      // F11 — Fullscreen
      else if (key === 'f11') { e.preventDefault(); window.osBrowser?.fullscreen(); }
      // Alt+P — Picture-in-Picture toggle
      else if (alt && key === 'p' && !ctrl && !shift) {
        e.preventDefault();
        if (activeTabId && currentUrl && !currentUrl.startsWith('os-browser://')) {
          (window as any).osBrowser?.tabs?.pip?.(activeTabId);
        }
      }
      // Ctrl+Shift+ArrowLeft — Snap current tab to left split pane
      else if (ctrl && shift && e.key === 'ArrowLeft') {
        e.preventDefault();
        const splitState = useSplitScreenStore.getState();
        if (splitState.isActive && activeTabId) {
          // Already in split — swap current tab into left pane
          useSplitScreenStore.setState({ leftTabId: activeTabId });
        } else if (activeTabId) {
          // Not in split — find first other tab and activate split with current on left
          const otherTab = tabs.find(t => t.id !== activeTabId && t.url !== 'os-browser://newtab');
          if (otherTab) splitState.activate(activeTabId, otherTab.id);
        }
      }
      // Ctrl+Shift+ArrowRight — Snap current tab to right split pane
      else if (ctrl && shift && e.key === 'ArrowRight') {
        e.preventDefault();
        const splitState = useSplitScreenStore.getState();
        if (splitState.isActive && activeTabId) {
          useSplitScreenStore.setState({ rightTabId: activeTabId });
        } else if (activeTabId) {
          const otherTab = tabs.find(t => t.id !== activeTabId && t.url !== 'os-browser://newtab');
          if (otherTab) splitState.activate(otherTab.id, activeTabId);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTabId, tabs, isLoading, activePanel, currentUrl, createTab, closeTab, switchTab, reopenLastClosed, moveTabLeft, moveTabRight, reload, stop, toggleSidebar, openPanel, closePanel, callbacks.onToggleHistory, callbacks.onToggleBookmarks, callbacks.onToggleSettings, callbacks.onToggleCommandPalette, callbacks.onToggleSplitScreen, callbacks.onBookmarkPage]);
}
