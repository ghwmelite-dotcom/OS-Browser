import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, X, CaseSensitive } from 'lucide-react';
import { useFindStore } from '@/store/find';
import { useTabsStore } from '@/store/tabs';

/**
 * Chrome-parity find-in-page bar.
 * Opens via Ctrl+F (handled in useKeyboardShortcuts).
 * Anchored top-right of the page area, below the chrome.
 *
 * Wired to webContents.findInPage / stopFindInPage / found-in-page event
 * via the preload bridge: window.osBrowser.tabs.findStart / findStop / onFindResult.
 */
export function FindBar() {
  const { isOpen, close } = useFindStore();
  const { activeTabId } = useTabsStore();
  const [query, setQuery] = useState('');
  const [matchOrdinal, setMatchOrdinal] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  // Subscribe to find result events from main
  useEffect(() => {
    const unsub = (window as any).osBrowser?.tabs?.onFindResult?.((data: any) => {
      if (!data || data.id !== activeTabId) return;
      if (typeof data.activeMatchOrdinal === 'number') setMatchOrdinal(data.activeMatchOrdinal);
      if (typeof data.matches === 'number') setMatchCount(data.matches);
    });
    return unsub;
  }, [activeTabId]);

  // Open the bar when main forwards Ctrl+F from the focused WebContentsView.
  // (renderer's window.addEventListener only fires when chrome has focus,
  // which is rarely the case while the user is reading a page.)
  useEffect(() => {
    const unsub = (window as any).osBrowser?.tabs?.onFindOpen?.(() => {
      useFindStore.getState().open();
    });
    return unsub;
  }, []);

  // Focus + select text when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    } else {
      // Reset counts when closed
      setMatchOrdinal(0);
      setMatchCount(0);
    }
  }, [isOpen]);

  // Debounced fresh search on query / case-sensitive change
  useEffect(() => {
    if (!isOpen || !activeTabId) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setMatchOrdinal(0);
      setMatchCount(0);
      (window as any).osBrowser?.tabs?.findStop?.(activeTabId, 'clearSelection');
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      (window as any).osBrowser?.tabs?.findStart?.(activeTabId, query, {
        findNext: false,
        forward: true,
        matchCase: caseSensitive,
      });
    }, 120);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, caseSensitive, isOpen, activeTabId]);

  const findNext = (forward: boolean) => {
    if (!query.trim() || !activeTabId) return;
    (window as any).osBrowser?.tabs?.findStart?.(activeTabId, query, {
      findNext: true,
      forward,
      matchCase: caseSensitive,
    });
  };

  const handleClose = () => {
    if (activeTabId) {
      (window as any).osBrowser?.tabs?.findStop?.(activeTabId, 'clearSelection');
    }
    close();
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      findNext(!e.shiftKey);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 142,
        right: 16,
        width: 380,
        height: 38,
        background: 'var(--color-surface-1, #fff)',
        border: '1px solid var(--color-border-1, rgba(0,0,0,0.1))',
        borderRadius: 8,
        boxShadow: '0 6px 18px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px 0 12px',
        zIndex: 1000,
        gap: 4,
      }}
      role="dialog"
      aria-label="Find in page"
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in page"
        spellCheck={false}
        style={{
          flex: 1,
          height: 32,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 13,
          color: 'var(--color-text-primary)',
          minWidth: 0,
        }}
        aria-label="Search query"
      />
      {query.length > 0 && (
        <span
          style={{
            fontSize: 11,
            color: matchCount === 0 ? 'var(--color-danger, #ef4444)' : 'var(--color-text-muted)',
            whiteSpace: 'nowrap',
            padding: '0 4px',
          }}
        >
          {matchCount === 0 ? 'No matches' : `${matchOrdinal} of ${matchCount}`}
        </span>
      )}
      <FindBtn
        active={caseSensitive}
        title={caseSensitive ? 'Case-sensitive (on)' : 'Case-sensitive (off)'}
        onClick={() => setCaseSensitive((v) => !v)}
      >
        <CaseSensitive size={14} />
      </FindBtn>
      <FindBtn
        title="Previous match (Shift+Enter)"
        onClick={() => findNext(false)}
        disabled={matchCount === 0}
      >
        <ChevronUp size={14} />
      </FindBtn>
      <FindBtn
        title="Next match (Enter)"
        onClick={() => findNext(true)}
        disabled={matchCount === 0}
      >
        <ChevronDown size={14} />
      </FindBtn>
      <FindBtn title="Close (Esc)" onClick={handleClose}>
        <X size={14} />
      </FindBtn>
    </div>
  );
}

const FindBtn: React.FC<{
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}> = ({ children, title, onClick, disabled, active }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      width: 26,
      height: 26,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 4,
      border: 'none',
      background: active ? 'var(--color-accent-soft, rgba(59,130,246,0.12))' : 'transparent',
      color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1,
    }}
  >
    {children}
  </button>
);
