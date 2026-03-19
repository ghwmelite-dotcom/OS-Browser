import React, { useState, useRef, useEffect } from 'react';
import { Search, Lock, Info, Loader2, X, Clock, Globe, Star, MonitorDown } from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { useSettingsStore } from '@/store/settings';
import { useBookmarksStore } from '@/store/bookmarks';

interface Suggestion {
  url: string;
  title: string;
  type: 'history' | 'suggestion';
}

export function OmniBar() {
  const { currentUrl, isLoading, isSecure } = useNavigationStore();
  const { activeTabId } = useTabsStore();
  const { navigate } = useNavigationStore();
  const { settings } = useSettingsStore();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update input when URL changes (and not focused)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(currentUrl === 'os-browser://newtab' ? '' : simplifyUrl(currentUrl));
    }
  }, [currentUrl, isFocused]);

  // Fetch history suggestions when typing
  useEffect(() => {
    if (!isFocused || !inputValue.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await window.osBrowser.history.search(inputValue);
        const mapped: Suggestion[] = (results || []).slice(0, 6).map((r: any) => ({
          url: r.url,
          title: r.title || r.url,
          type: 'history' as const,
        }));
        setSuggestions(mapped);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [inputValue, isFocused]);

  function simplifyUrl(url: string): string {
    if (!url || url === 'os-browser://newtab') return '';
    try {
      const u = new URL(url);
      let display = u.hostname.replace(/^www\./, '');
      if (u.pathname !== '/') display += u.pathname;
      return display;
    } catch {
      return url;
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitValue(inputValue.trim());
  };

  const submitValue = (value: string) => {
    if (!value || !activeTabId) return;
    let url = value;
    if (!value.includes('://') && value.includes('.') && !value.includes(' ')) {
      url = `https://${value}`;
    } else if (!value.includes('://') && !value.includes('.')) {
      const searchEngines: Record<string, string> = {
        google: 'https://www.google.com/search?q=',
        duckduckgo: 'https://duckduckgo.com/?q=',
        bing: 'https://www.bing.com/search?q=',
        osbrowser: 'https://www.google.com/search?q=',
      };
      const searchUrl = searchEngines[(settings as any)?.search_engine || 'google'] || searchEngines.google;
      url = `${searchUrl}${encodeURIComponent(value)}`;
    }
    navigate(activeTabId, url);
    setSuggestions([]);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      submitValue(suggestions[selectedIndex].url);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setInputValue(currentUrl === 'os-browser://newtab' ? '' : currentUrl);
    // Select all text on focus
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    // Delay to allow suggestion clicks
    setTimeout(() => {
      setIsFocused(false);
      setSuggestions([]);
    }, 200);
  };

  const displayUrl = currentUrl === 'os-browser://newtab' ? '' : simplifyUrl(currentUrl);

  return (
    <div className="flex-1 max-w-[800px] relative">
      <form onSubmit={handleSubmit}>
        <div
          className="flex items-center gap-2 px-3.5 rounded-[20px] transition-all duration-200"
          style={{
            height: '36px',
            background: isFocused ? 'var(--color-surface-1)' : 'var(--color-surface-2)',
            border: isFocused ? '2px solid var(--color-accent)' : '1.5px solid var(--color-border-1)',
            boxShadow: isFocused
              ? 'var(--search-glow)'
              : '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
          }}
        >
          {/* Icon */}
          <div className="shrink-0 w-4 flex items-center justify-center">
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            ) : isFocused ? (
              <Search size={14} className="text-text-muted" />
            ) : isSecure ? (
              <Lock size={13} className="text-ghana-green" />
            ) : displayUrl ? (
              <Info size={13} className="text-text-muted" />
            ) : (
              <Search size={14} className="text-text-muted" />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={isFocused ? inputValue : displayUrl}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Search or enter URL..."
            className={`
              flex-1 bg-transparent text-text-primary placeholder:text-text-muted outline-none
              ${isFocused ? 'text-[13px] font-mono' : 'text-[13px]'}
            `}
            spellCheck={false}
            aria-label="Address bar"
            autoComplete="off"
          />

          {/* Clear button when focused */}
          {isFocused && inputValue && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setInputValue(''); inputRef.current?.focus(); }}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-surface-3 shrink-0"
            >
              <X size={12} className="text-text-muted" />
            </button>
          )}

          {/* PWA install button — inside the URL bar */}
          {!isFocused && displayUrl && <PWAInstallButton />}

          {/* Bookmark star — inside the URL bar */}
          {!isFocused && displayUrl && (
            <BookmarkStar url={currentUrl} />
          )}
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-[38px] left-0 right-0 rounded-xl border shadow-2xl z-[100] overflow-hidden py-1"
          style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.url + i}
              onMouseDown={(e) => { e.preventDefault(); submitValue(s.url); }}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-left transition-colors duration-75
                ${i === selectedIndex ? 'bg-surface-2' : 'hover:bg-surface-2/50'}
              `}
            >
              <Clock size={13} className="text-text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-text-primary truncate">{s.title}</div>
                <div className="text-[11px] text-text-muted truncate">{s.url}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Bookmark star inside the URL bar — highlights gold when bookmarked
function BookmarkStar({ url }: { url: string }) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { addBookmark, removeBookmark, bookmarks, loadBookmarks } = useBookmarksStore();
  const { tabs, activeTabId } = useTabsStore();

  useEffect(() => {
    const check = () => {
      if (url && !url.startsWith('os-browser://')) {
        window.osBrowser.bookmarks.isBookmarked(url).then(setIsBookmarked).catch(() => {});
      } else {
        setIsBookmarked(false);
      }
    };
    check();
    // Listen for Ctrl+D toggle events to refresh star state
    window.addEventListener('bookmark-changed', check);
    return () => window.removeEventListener('bookmark-changed', check);
  }, [url]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!url || url.startsWith('os-browser://')) return;

    if (isBookmarked) {
      // Find and remove
      const bData = await window.osBrowser.bookmarks.list();
      const bms = bData.bookmarks || bData || [];
      const match = bms.find((b: any) => b.url === url);
      if (match) {
        await window.osBrowser.bookmarks.delete(match.id);
        setIsBookmarked(false);
      }
    } else {
      const title = tabs.find(t => t.id === activeTabId)?.title || url;
      await window.osBrowser.bookmarks.add({ url, title });
      setIsBookmarked(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="w-6 h-6 flex items-center justify-center rounded-full shrink-0 transition-all duration-150 hover:scale-110"
      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
      title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page (Ctrl+D)'}
    >
      <Star
        size={15}
        strokeWidth={1.8}
        fill={isBookmarked ? 'var(--color-accent)' : 'none'}
        style={{ color: isBookmarked ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
      />
    </button>
  );
}

// PWA install button — shown inside the URL bar when page is an installable PWA
// Auto-shows install prompt after 3 seconds so users don't miss it
function PWAInstallButton() {
  const [pwaData, setPwaData] = useState<any>(null);
  const [pulse, setPulse] = useState(true);
  const autoPromptFired = useRef(false);

  useEffect(() => {
    const handleInstallable = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data && data.tabId === useTabsStore.getState().activeTabId) {
        setPwaData(data);
        setPulse(true);
        autoPromptFired.current = false;

        // Auto-show the install prompt after 3 seconds
        // Only if user hasn't dismissed this app before
        setTimeout(() => {
          if (autoPromptFired.current) return;
          autoPromptFired.current = true;
          try {
            const dismissed = JSON.parse(localStorage.getItem('pwa_dismissed') || '[]');
            if (dismissed.includes(data.startUrl)) return;
          } catch {}
          window.dispatchEvent(new CustomEvent('pwa:show-install-prompt', { detail: data }));
        }, 3000);

        setTimeout(() => setPulse(false), 8000);
      }
    };
    const handleCleared = () => {
      setPwaData(null);
      autoPromptFired.current = false;
    };

    window.addEventListener('pwa:installable', handleInstallable);
    window.addEventListener('pwa:installable-cleared', handleCleared);
    return () => {
      window.removeEventListener('pwa:installable', handleInstallable);
      window.removeEventListener('pwa:installable-cleared', handleCleared);
    };
  }, []);

  if (!pwaData) return null;

  return (
    <button
      type="button"
      onClick={() => {
        autoPromptFired.current = true;
        window.dispatchEvent(new CustomEvent('pwa:show-install-prompt', { detail: pwaData }));
      }}
      className="w-7 h-7 flex items-center justify-center rounded-full shrink-0 transition-all duration-200 hover:scale-110"
      title={`Install ${pwaData.name} as an app`}
      style={{
        background: pulse ? 'rgba(212, 160, 23, 0.12)' : 'transparent',
        animation: pulse ? 'pwa-pulse 2s ease-in-out infinite' : 'none',
      }}
    >
      <MonitorDown
        size={15}
        strokeWidth={1.8}
        style={{ color: '#D4A017' }}
      />
      <style>{`
        @keyframes pwa-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212, 160, 23, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(212, 160, 23, 0); }
        }
      `}</style>
    </button>
  );
}
