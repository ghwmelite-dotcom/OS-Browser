import React, { useState, useRef, useEffect } from 'react';
import { Search, Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';

export function OmniBar() {
  const { currentUrl, isLoading, isSecure } = useNavigationStore();
  const { activeTabId } = useTabsStore();
  const { navigate } = useNavigationStore();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(currentUrl === 'os-browser://newtab' ? '' : currentUrl);
    }
  }, [currentUrl, isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeTabId) return;
    navigate(activeTabId, inputValue.trim());
    inputRef.current?.blur();
  };

  const displayUrl = currentUrl === 'os-browser://newtab' ? '' : currentUrl;

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-[800px]">
      <div className={`
        flex items-center gap-2 h-8 px-3 rounded-search bg-surface-2 border transition-colors
        ${isFocused ? 'border-ghana-gold' : 'border-transparent'}
      `}>
        {/* Icon */}
        <div className="shrink-0">
          {isLoading ? (
            <Loader2 size={14} className="text-ghana-gold animate-spin" />
          ) : isSecure ? (
            <ShieldCheck size={14} className="text-ghana-green" />
          ) : displayUrl ? (
            <Shield size={14} className="text-text-muted" />
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
          onFocus={() => { setIsFocused(true); setInputValue(displayUrl); }}
          onBlur={() => setIsFocused(false)}
          placeholder="Search or enter URL..."
          className="flex-1 bg-transparent text-md text-text-primary font-mono placeholder:text-text-muted outline-none"
          spellCheck={false}
          aria-label="Address bar"
        />
      </div>
    </form>
  );
}
