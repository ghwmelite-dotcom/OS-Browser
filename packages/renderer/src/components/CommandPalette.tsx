import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Globe, Star, Clock, Zap, Settings, Plus, Trash2, Moon, Sun, MessageSquare, Sparkles, Maximize, X } from 'lucide-react';
import { useTabsStore } from '@/store/tabs';
import { useSettingsStore } from '@/store/settings';
import { useSidebarStore } from '@/store/sidebar';

interface PaletteItem {
  id: string;
  type: 'tab' | 'bookmark' | 'history' | 'command';
  icon: any;
  title: string;
  subtitle?: string;
  action: () => void;
}

// Browser commands
function getCommands(actions: {
  createTab: () => void;
  openSettings: () => void;
  toggleSidebar: () => void;
  openAskOzzy: () => void;
  toggleTheme: () => void;
  clearHistory: () => void;
  fullscreen: () => void;
  closeTab: () => void;
}): PaletteItem[] {
  return [
    { id: 'cmd-newtab', type: 'command', icon: Plus, title: 'New Tab', subtitle: 'Ctrl+T', action: actions.createTab },
    { id: 'cmd-settings', type: 'command', icon: Settings, title: 'Settings', action: actions.openSettings },
    { id: 'cmd-ai', type: 'command', icon: MessageSquare, title: 'AI Assistant', subtitle: 'Ctrl+J', action: actions.toggleSidebar },
    { id: 'cmd-askozzy', type: 'command', icon: Sparkles, title: 'AskOzzy', subtitle: 'Ctrl+Shift+O', action: actions.openAskOzzy },
    { id: 'cmd-theme', type: 'command', icon: Sun, title: 'Toggle Dark/Light Mode', action: actions.toggleTheme },
    { id: 'cmd-fullscreen', type: 'command', icon: Maximize, title: 'Toggle Fullscreen', subtitle: 'F11', action: actions.fullscreen },
    { id: 'cmd-closetab', type: 'command', icon: X, title: 'Close Current Tab', subtitle: 'Ctrl+W', action: actions.closeTab },
    { id: 'cmd-clearhistory', type: 'command', icon: Trash2, title: 'Clear Browsing History', action: actions.clearHistory },
  ];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PaletteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { tabs, activeTabId, createTab, closeTab, switchTab } = useTabsStore();
  const { settings, updateSettings } = useSettingsStore();
  const { toggleSidebar, openPanel } = useSidebarStore();

  const commands = getCommands({
    createTab: () => { createTab(); onClose(); },
    openSettings: () => { createTab('os-browser://settings'); onClose(); },
    toggleSidebar: () => { toggleSidebar(); onClose(); },
    openAskOzzy: () => { openPanel('askozzy'); onClose(); },
    toggleTheme: () => {
      const newTheme = settings?.theme === 'dark' ? 'light' : 'dark';
      updateSettings({ theme: newTheme });
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      document.documentElement.classList.toggle('light', newTheme !== 'dark');
      onClose();
    },
    clearHistory: () => { window.osBrowser.history.clear(); onClose(); },
    fullscreen: () => { window.osBrowser?.fullscreen(); onClose(); },
    closeTab: () => { if (activeTabId) closeTab(activeTabId); onClose(); },
  });

  // Search function
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      // Show recent tabs + commands when empty
      const tabItems: PaletteItem[] = tabs.slice(0, 5).map(t => ({
        id: `tab-${t.id}`, type: 'tab', icon: Globe, title: t.title || 'New Tab',
        subtitle: t.url === 'os-browser://newtab' ? 'New Tab' : t.url,
        action: () => { switchTab(t.id); onClose(); },
      }));
      setResults([...tabItems, ...commands.slice(0, 4)]);
      return;
    }

    const lower = q.toLowerCase();
    const items: PaletteItem[] = [];

    // Search open tabs
    tabs.forEach(t => {
      if (t.title?.toLowerCase().includes(lower) || t.url?.toLowerCase().includes(lower)) {
        items.push({
          id: `tab-${t.id}`, type: 'tab', icon: Globe, title: t.title || t.url,
          subtitle: t.url, action: () => { switchTab(t.id); onClose(); },
        });
      }
    });

    // Search bookmarks
    try {
      const bData = await window.osBrowser.bookmarks.list();
      const bookmarks = bData.bookmarks || bData || [];
      bookmarks.forEach((b: any) => {
        if (b.title?.toLowerCase().includes(lower) || b.url?.toLowerCase().includes(lower)) {
          items.push({
            id: `bm-${b.id}`, type: 'bookmark', icon: Star, title: b.title || b.url,
            subtitle: b.url, action: () => { createTab(b.url); onClose(); },
          });
        }
      });
    } catch {}

    // Search history
    try {
      const history = await window.osBrowser.history.search(q);
      (history || []).slice(0, 5).forEach((h: any) => {
        // Don't duplicate tabs already shown
        if (!items.find(i => i.subtitle === h.url)) {
          items.push({
            id: `hist-${h.id}`, type: 'history', icon: Clock, title: h.title || h.url,
            subtitle: h.url, action: () => { createTab(h.url); onClose(); },
          });
        }
      });
    } catch {}

    // Search commands
    commands.forEach(cmd => {
      if (cmd.title.toLowerCase().includes(lower)) {
        items.push(cmd);
      }
    });

    // If query looks like a URL, add "Go to" option
    if (q.includes('.') && !q.includes(' ')) {
      const url = q.startsWith('http') ? q : `https://${q}`;
      items.push({
        id: 'go-url', type: 'command', icon: Globe, title: `Go to ${q}`,
        subtitle: url, action: () => { createTab(url); onClose(); },
      });
    }

    // If no URL match, add "Search Google" option
    if (!q.includes('.') || q.includes(' ')) {
      items.push({
        id: 'search', type: 'command', icon: Search, title: `Search "${q}"`,
        subtitle: 'Google Search',
        action: () => { createTab(`https://www.google.com/search?q=${encodeURIComponent(q)}`); onClose(); },
      });
    }

    setResults(items.slice(0, 12));
    setSelectedIndex(0);
  }, [tabs, commands, onClose, switchTab, createTab]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 80);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      results[selectedIndex].action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const typeLabels: Record<string, { label: string; color: string }> = {
    tab: { label: 'Tab', color: 'text-blue-400' },
    bookmark: { label: 'Bookmark', color: 'text-ghana-gold' },
    history: { label: 'History', color: 'text-green-400' },
    command: { label: 'Command', color: 'text-purple-400' },
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-[560px] rounded-2xl border shadow-2xl overflow-hidden animate-fade-up"
        style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 border-b" style={{ height: '54px', borderColor: 'var(--color-border-1)' }}>
          <Search size={18} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tabs, bookmarks, commands..."
            className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-muted outline-none"
            spellCheck={false}
          />
          <kbd className="text-[10px] text-text-muted px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--color-border-2)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {results.length === 0 && query && (
            <div className="px-5 py-8 text-center text-text-muted text-[13px]">
              No results for "{query}"
            </div>
          )}

          {results.map((item, i) => {
            const typeInfo = typeLabels[item.type];
            return (
              <button
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors duration-75 ${
                  i === selectedIndex ? 'bg-surface-2' : ''
                }`}
              >
                <item.icon size={16} className="text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-text-primary truncate">{item.title}</div>
                  {item.subtitle && (
                    <div className="text-[11px] text-text-muted truncate">{item.subtitle}</div>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2.5 border-t flex items-center gap-4 text-[10px] text-text-muted" style={{ borderColor: 'var(--color-border-1)' }}>
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>ESC Close</span>
          <span className="ml-auto">Ctrl+K to open</span>
        </div>
      </div>
    </div>
  );
}
