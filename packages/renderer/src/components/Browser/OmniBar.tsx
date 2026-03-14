import React, { useState, useRef, useEffect } from 'react';
import { Search, Lock, Info, Loader2, X, Clock, Globe } from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';

interface Suggestion {
  url: string;
  title: string;
  type: 'history' | 'suggestion';
}

export function OmniBar() {
  const { currentUrl, isLoading, isSecure } = useNavigationStore();
  const { activeTabId } = useTabsStore();
  const { navigate } = useNavigationStore();
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
      url = `https://www.google.com/search?q=${encodeURIComponent(value)}`;
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
          className={`
            flex items-center gap-2 px-3 rounded-[24px] transition-all duration-200
            ${isFocused
              ? 'bg-surface-1 border-2'
              : 'bg-surface-2 border border-transparent hover:bg-surface-3/50'
            }
          `}
          style={{
            height: '34px',
            borderColor: isFocused ? 'var(--color-accent)' : undefined,
            boxShadow: isFocused ? 'var(--search-glow)' : 'none',
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
