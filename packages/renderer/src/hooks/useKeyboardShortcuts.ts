import { useEffect } from 'react';
import { useTabsStore } from '@/store/tabs';
import { useNavigationStore } from '@/store/navigation';
import { useSidebarStore } from '@/store/sidebar';

export function useKeyboardShortcuts(callbacks: {
  onToggleHistory?: () => void;
  onToggleBookmarks?: () => void;
  onToggleSettings?: () => void;
  onToggleCommandPalette?: () => void;
  onToggleSplitScreen?: () => void;
}) {
  const { createTab, closeTab, activeTabId, switchTab, tabs, reopenLastClosed } = useTabsStore();
  const { reload, stop, isLoading } = useNavigationStore();
  const { toggleSidebar, openPanel, closePanel, activePanel } = useSidebarStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      // Ctrl+T — New tab
      if (ctrl && key === 't' && !shift) { e.preventDefault(); createTab(); }
      // Ctrl+W — Close tab
      else if (ctrl && key === 'w' && !shift) { e.preventDefault(); if (activeTabId) closeTab(activeTabId); }
      // Ctrl+Tab — Next tab
      else if (ctrl && key === 'tab' && !shift) {
        e.preventDefault();
        const idx = tabs.findIndex(t => t.id === activeTabId);
        const next = tabs[(idx + 1) % tabs.length];
        if (next) switchTab(next.id);
      }
      // Ctrl+Shift+Tab — Prev tab
      else if (ctrl && key === 'tab' && shift) {
        e.preventDefault();
        const idx = tabs.findIndex(t => t.id === activeTabId);
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        if (prev) switchTab(prev.id);
      }
      // Ctrl+1-9 — Switch to tab N
      else if (ctrl && key >= '1' && key <= '9') {
        e.preventDefault();
        const idx = parseInt(key) - 1;
        if (tabs[idx]) switchTab(tabs[idx].id);
      }
      // Ctrl+Shift+T — Reopen closed tab
      else if (ctrl && shift && key === 't') { e.preventDefault(); reopenLastClosed(); }
      // Ctrl+L — Focus URL bar
      else if (ctrl && key === 'l' && !shift) {
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
      // Ctrl+J — AI Sidebar
      else if (ctrl && key === 'j' && !shift) { e.preventDefault(); toggleSidebar(); }
      // Ctrl+Shift+O — AskOzzy
      else if (ctrl && shift && key === 'o') { e.preventDefault(); openPanel(activePanel === 'askozzy' ? 'none' : 'askozzy'); }
      // Ctrl+Shift+S — Split Screen
      else if (ctrl && shift && key === 's') { e.preventDefault(); callbacks.onToggleSplitScreen?.(); }
      // Escape — Close sidebar/panel
      else if (key === 'escape') { closePanel(); callbacks.onToggleHistory?.(); callbacks.onToggleBookmarks?.(); }
      // F11 — Fullscreen
      else if (key === 'f11') { e.preventDefault(); window.osBrowser?.fullscreen(); }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTabId, tabs, isLoading, activePanel]);
}
