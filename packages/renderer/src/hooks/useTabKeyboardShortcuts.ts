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
          nextIdx = (currentIdx - 1 + sortedTabs.length) % sortedTabs.length;
        } else {
          nextIdx = (currentIdx + 1) % sortedTabs.length;
        }
        switchTab(sortedTabs[nextIdx].id);
        return;
      }

      // Ctrl+N: new window (safe with optional chaining)
      if ((e.key === 'n' || e.key === 'N') && !e.shiftKey) {
        e.preventDefault();
        window.osBrowser?.app?.newWindow?.();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, switchTab, closeTab, createTab, reopenLastClosed]);
}
