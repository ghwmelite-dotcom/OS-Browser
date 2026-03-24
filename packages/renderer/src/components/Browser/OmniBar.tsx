import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Lock, Info, Loader2, X, Clock, Globe, Star, MonitorDown } from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { useSettingsStore } from '@/store/settings';
import { useBookmarksStore } from '@/store/bookmarks';

interface Suggestion {
  url: string;
  title: string;
  favicon?: string | null;
  type: 'history' | 'bookmark';
}

export function OmniBar() {
  const { currentUrl, isLoading, isSecure } = useNavigationStore();
  const { activeTabId, tabs } = useTabsStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const { navigate } = useNavigationStore();
  const { settings } = useSettingsStore();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState({ top: 0, left: 0, width: 0 });

  // Update input when URL changes (and not focused)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(currentUrl === 'os-browser://newtab' ? '' : simplifyUrl(currentUrl));
    }
  }, [currentUrl, isFocused]);

  // Fetch history + bookmark suggestions when typing (200ms debounce)
  useEffect(() => {
    if (!isFocused || !inputValue.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const query = inputValue.toLowerCase();
        const allSuggestions: Suggestion[] = [];

        // History results
        try {
          const results = await window.osBrowser.history.search(inputValue);
          (results || []).forEach((r: any) => {
            allSuggestions.push({
              url: r.url,
              title: r.title || r.url,
              favicon: r.favicon || null,
              type: 'history' as const,
            });
          });
        } catch {
          // If search fails, try list + client-side filter
          try {
            const allHistory = await window.osBrowser.history.list();
            const items = Array.isArray(allHistory) ? allHistory : (allHistory as any)?.history || [];
            items.filter((r: any) =>
              (r.title || '').toLowerCase().includes(query) ||
              (r.url || '').toLowerCase().includes(query)
            ).forEach((r: any) => {
              allSuggestions.push({
                url: r.url,
                title: r.title || r.url,
                favicon: r.favicon || null,
                type: 'history' as const,
              });
            });
          } catch {}
        }

        // Bookmark results
        try {
          const bData = await window.osBrowser.bookmarks.list();
          const bms = Array.isArray(bData) ? bData : (bData as any)?.bookmarks || [];
          bms.filter((b: any) =>
            (b.title || '').toLowerCase().includes(query) ||
            (b.url || '').toLowerCase().includes(query)
          ).forEach((b: any) => {
            // Avoid duplicates
            if (!allSuggestions.some(s => s.url === b.url)) {
              allSuggestions.push({
                url: b.url,
                title: b.title || b.url,
                favicon: b.favicon || null,
                type: 'bookmark' as const,
              });
            }
          });
        } catch {}

        setSuggestions(allSuggestions.slice(0, 8));
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [inputValue, isFocused]);

  useEffect(() => {
    if (isFocused && suggestions.length > 0 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isFocused, suggestions]);

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
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    if (alt && e.key === 'Enter') {
      // Alt+Enter — open current input in a NEW tab (keep current tab)
      e.preventDefault();
      const raw = inputValue.trim();
      if (raw && activeTabId) {
        let url = raw;
        if (!raw.includes('://') && raw.includes('.') && !raw.includes(' ')) {
          url = `https://${raw}`;
        } else if (!raw.includes('://') && !raw.includes('.')) {
          const searchEngines: Record<string, string> = {
            google: 'https://www.google.com/search?q=',
            duckduckgo: 'https://duckduckgo.com/?q=',
            bing: 'https://www.bing.com/search?q=',
            osbrowser: 'https://www.google.com/search?q=',
          };
          const searchUrl = searchEngines[(settings as any)?.search_engine || 'google'] || searchEngines.google;
          url = `${searchUrl}${encodeURIComponent(raw)}`;
        }
        useTabsStore.getState().createTab(url);
        setSuggestions([]);
        setIsFocused(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && !ctrl && !shift) {
      // Enter with suggestion selected — navigate to suggestion
      e.preventDefault();
      submitValue(suggestions[selectedIndex].url);
    } else if (e.key === 'Enter' && ctrl && shift) {
      // Ctrl+Shift+Enter — wrap input as www._____.org
      e.preventDefault();
      const raw = inputValue.trim();
      if (raw && !raw.includes('://') && !raw.includes('.')) {
        submitValue(`https://www.${raw}.org`);
      } else {
        submitValue(raw);
      }
    } else if (e.key === 'Enter' && ctrl && !shift) {
      // Ctrl+Enter — wrap input as www._____.com and navigate
      e.preventDefault();
      const raw = inputValue.trim();
      if (raw && !raw.includes('://') && !raw.includes('.')) {
        submitValue(`https://www.${raw}.com`);
      } else {
        submitValue(raw);
      }
    } else if (e.key === 'Enter' && shift && !ctrl) {
      // Shift+Enter — wrap input as www._____.net
      e.preventDefault();
      const raw = inputValue.trim();
      if (raw && !raw.includes('://') && !raw.includes('.')) {
        submitValue(`https://www.${raw}.net`);
      } else {
        submitValue(raw);
      }
    } else if (e.key === 'Escape') {
      // Escape — revert to current URL and blur
      setSuggestions([]);
      setInputValue(currentUrl === 'os-browser://newtab' ? '' : simplifyUrl(currentUrl));
      inputRef.current?.blur();
    } else if (e.key === 'a' && ctrl) {
      // Ctrl+A — select all text in the address bar (native behavior, but ensure it works)
      e.stopPropagation();
    } else if (e.key === 'c' && ctrl) {
      // Ctrl+C — copy selected text (allow native)
      e.stopPropagation();
    } else if (e.key === 'v' && ctrl) {
      // Ctrl+V — paste and allow typing to continue (allow native)
      e.stopPropagation();
    } else if (e.key === 'x' && ctrl) {
      // Ctrl+X — cut selected text (allow native)
      e.stopPropagation();
    } else if (e.key === 'z' && ctrl && !shift) {
      // Ctrl+Z — undo (allow native)
      e.stopPropagation();
    } else if ((e.key === 'z' && ctrl && shift) || (e.key === 'y' && ctrl)) {
      // Ctrl+Shift+Z or Ctrl+Y — redo (allow native)
      e.stopPropagation();
    } else if (e.key === 'Delete' && shift) {
      // Shift+Delete — remove selected autocomplete suggestion
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        const removed = suggestions[selectedIndex];
        setSuggestions(prev => prev.filter((_, i) => i !== selectedIndex));
        setSelectedIndex(prev => Math.min(prev, suggestions.length - 2));
        // Delete from history if it's a history suggestion
        if (removed.type === 'history') {
          try { window.osBrowser.history.delete((removed as any).id); } catch {}
        }
      }
    } else if (e.key === 'Tab' && !shift && suggestions.length > 0 && selectedIndex >= 0) {
      // Tab — autocomplete with selected suggestion URL
      e.preventDefault();
      setInputValue(suggestions[selectedIndex].url);
      setSuggestions([]);
    } else if (e.key === 'Home' || e.key === 'End') {
      // Home/End — allow cursor movement (stop propagation to prevent global shortcuts)
      e.stopPropagation();
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
    <div ref={containerRef} className="flex-1 max-w-[800px] relative">
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

          {/* Favicon */}
          {!isFocused && displayUrl && (
            (() => {
              const faviconUrl = activeTab?.favicon_path;
              const isNewTab = currentUrl === 'os-browser://newtab';
              if (isNewTab || !faviconUrl) {
                return <Globe size={14} className="text-text-muted shrink-0" />;
              }
              return (
                <img
                  src={faviconUrl}
                  alt=""
                  className="w-4 h-4 rounded-[2px] shrink-0 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              );
            })()
          )}

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
          style={{
            position: 'fixed',
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: dropdownRect.width,
            background: 'var(--color-surface-1)',
            borderColor: 'var(--color-border-1)',
            borderWidth: 1,
            borderStyle: 'solid',
            borderRadius: 12,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            zIndex: 100,
            overflow: 'hidden',
            padding: '4px 0',
          }}
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
              {/* Favicon or type icon */}
              <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                {s.favicon ? (
                  <img
                    src={s.favicon}
                    alt=""
                    className="w-4 h-4 rounded-[2px] object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : s.type === 'bookmark' ? (
                  <Star size={13} className="text-text-muted" />
                ) : (
                  <Clock size={13} className="text-text-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-text-primary truncate">{s.title}</div>
                <div className="text-[11px] text-text-muted truncate">{s.url}</div>
              </div>
              {/* Type badge */}
              <span className="text-[10px] text-text-muted shrink-0 opacity-60">
                {s.type === 'bookmark' ? 'Bookmark' : 'History'}
              </span>
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

// PWA install button — Chrome-style: "Install" pill in OmniBar, popup only on click
function PWAInstallButton() {
  const [pwaData, setPwaData] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [iconError, setIconError] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (showPopup && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      (window as any).osBrowser?.hideWebViews?.();
    } else if (!showPopup) {
      (window as any).osBrowser?.showWebViews?.();
    }
  }, [showPopup]);

  useEffect(() => {
    const handleInstallable = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data && data.tabId === useTabsStore.getState().activeTabId) {
        // Check if already dismissed
        try {
          const dismissed = JSON.parse(localStorage.getItem('pwa_dismissed') || '[]');
          if (dismissed.includes(data.startUrl)) return;
        } catch {}
        setPwaData(data);
        setIconError(false);
      }
    };
    const handleCleared = () => {
      setPwaData(null);
      setShowPopup(false);
    };
    window.addEventListener('pwa:installable', handleInstallable);
    window.addEventListener('pwa:installable-cleared', handleCleared);
    return () => {
      window.removeEventListener('pwa:installable', handleInstallable);
      window.removeEventListener('pwa:installable-cleared', handleCleared);
    };
  }, []);

  if (!pwaData) return null;

  const firstLetter = (pwaData.shortName || pwaData.name || 'A').charAt(0).toUpperCase();
  const displayHost = (() => {
    try { return new URL(pwaData.url).hostname; } catch { return pwaData.url; }
  })();

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await (window as any).osBrowser.pwa.install({
        name: pwaData.name,
        startUrl: pwaData.startUrl,
        iconUrl: pwaData.iconUrl || '',
      });
      try {
        const dismissed = JSON.parse(localStorage.getItem('pwa_dismissed') || '[]');
        if (!dismissed.includes(pwaData.startUrl)) {
          dismissed.push(pwaData.startUrl);
          localStorage.setItem('pwa_dismissed', JSON.stringify(dismissed));
        }
      } catch {}
      setShowPopup(false);
      setPwaData(null);
      (window as any).osBrowser?.showWebViews?.();
    } catch {
      setInstalling(false);
    }
  };

  const handleClose = () => {
    setShowPopup(false);
    (window as any).osBrowser?.showWebViews?.();
  };

  return (
    <>
      {/* Chrome-style "Install" pill button — sits quietly in OmniBar */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowPopup(!showPopup)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 transition-all duration-200 hover:brightness-110"
        title={`Install ${pwaData.name}`}
        style={{
          background: showPopup ? 'var(--color-accent)' : 'rgba(212, 160, 23, 0.12)',
          color: showPopup ? '#fff' : '#D4A017',
          fontSize: 12,
          fontWeight: 600,
          border: '1px solid rgba(212, 160, 23, 0.25)',
        }}
      >
        <MonitorDown size={13} strokeWidth={2} />
        <span>Install</span>
      </button>

      {/* Install popup — only appears when user clicks the Install pill */}
      {showPopup && createPortal(
        <>
          <div className="fixed inset-0 z-[199]" onClick={handleClose} />
          <div
            className="fixed z-[200] w-[300px] rounded-xl border overflow-hidden"
            style={{
              top: popupPos.top,
              right: popupPos.right,
              background: 'var(--color-surface-1)',
              borderColor: 'var(--color-border-1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
              animation: 'pwa-slide-in 0.2s ease-out',
            }}
          >
            {/* Arrow */}
            <div
              className="absolute -top-[6px] right-4 w-3 h-3 rotate-45 border-l border-t"
              style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
            />

            {/* Header */}
            <div className="px-4 pt-4 pb-3">
              <p className="text-[14px] font-semibold text-text-primary mb-1">Install app?</p>
            </div>

            {/* App info */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-3">
                {pwaData.iconUrl && !iconError ? (
                  <img src={pwaData.iconUrl} alt={pwaData.name}
                    className="shrink-0 rounded-lg" style={{ width: 40, height: 40, objectFit: 'cover' }}
                    onError={() => setIconError(true)} />
                ) : (
                  <div className="shrink-0 flex items-center justify-center rounded-lg font-bold text-white text-[18px]"
                    style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #D4A017, #b8860b)' }}>
                    {firstLetter}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-text-primary truncate">{pwaData.name}</p>
                  <p className="text-[11px] text-text-muted truncate">{displayHost}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex items-center justify-end gap-2"
              style={{ borderTop: '1px solid var(--color-border-1)', paddingTop: 12 }}>
              <button onClick={handleClose}
                className="px-4 py-[7px] rounded-lg text-[12px] font-medium border transition-colors hover:bg-surface-2"
                style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handleInstall} disabled={installing}
                className="px-5 py-[7px] rounded-lg text-[12px] font-bold transition-all hover:brightness-110 disabled:opacity-60"
                style={{ background: '#D4A017', color: '#1a1a1a' }}>
                {installing ? 'Installing...' : 'Install'}
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}

      <style>{`
        @keyframes pwa-slide-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
