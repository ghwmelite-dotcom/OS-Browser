import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Lock, Info, Loader2, X } from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';

/** Extract the simplified domain from a URL for display when blurred */
function simplifyUrl(url: string): string {
  if (!url || url.startsWith('os-browser://')) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function OmniBar() {
  const { currentUrl, isLoading, isSecure } = useNavigationStore();
  const { activeTabId } = useTabsStore();
  const { navigate } = useNavigationStore();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isNewTab = currentUrl === 'os-browser://newtab';
  const fullUrl = isNewTab ? '' : currentUrl;
  const displayDomain = useMemo(() => simplifyUrl(currentUrl), [currentUrl]);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(fullUrl);
    }
  }, [currentUrl, isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeTabId) return;
    navigate(activeTabId, inputValue.trim());
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setIsFocused(true);
    setInputValue(fullUrl);
    // Select all text on focus for easy replacement
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const clearInput = () => {
    setInputValue('');
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-[720px] mx-3">
      <div
        className={`
          flex items-center gap-2 h-[34px] px-3 rounded-[24px] transition-all duration-150 ease-out
          ${isFocused
            ? 'bg-surface-2 ring-2 ring-ghana-gold/40 shadow-[0_0_12px_rgba(212,160,23,0.1)]'
            : 'bg-surface-2/80 hover:bg-surface-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]'
          }
        `}
      >
        {/* Security / Search icon */}
        <div className="shrink-0 flex items-center justify-center w-4">
          {isLoading ? (
            <Loader2 size={13} className="text-ghana-gold animate-spin" />
          ) : isFocused || isNewTab ? (
            <Search size={13} className="text-text-muted" />
          ) : isSecure ? (
            <Lock size={13} className="text-ghana-green" />
          ) : fullUrl ? (
            <Info size={13} className="text-text-muted" />
          ) : (
            <Search size={13} className="text-text-muted" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={isFocused ? inputValue : displayDomain}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search or enter URL..."
          className={`
            flex-1 bg-transparent text-sm outline-none
            placeholder:text-text-muted/70
            ${isFocused
              ? 'text-text-primary font-mono'
              : 'text-text-secondary font-sans'
            }
          `}
          spellCheck={false}
          autoComplete="off"
          aria-label="Address bar"
        />

        {/* Clear button when focused and has input */}
        {isFocused && inputValue && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); clearInput(); }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-border-1 transition-all duration-150 ease-out focus:outline-none"
            aria-label="Clear address bar"
            tabIndex={-1}
          >
            <X size={11} className="text-text-muted" />
          </button>
        )}
      </div>
    </form>
  );
}
