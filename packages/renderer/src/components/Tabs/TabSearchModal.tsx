import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, X, Copy, Globe } from 'lucide-react';
import { useTabsStore } from '@/store/tabs';
import { useWorkspaceStore } from '@/store/workspaces';
import { useTabIntelligenceStore } from '@/store/tab-intelligence';

interface TabSearchModalProps {
  onClose: () => void;
}

export function TabSearchModal({ onClose }: TabSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const tabs = useTabsStore(s => s.tabs);
  const switchTab = useTabsStore(s => s.switchTab);
  const closeTab = useTabsStore(s => s.closeTab);
  const workspaces = useWorkspaceStore(s => s.workspaces);
  const getTabWorkspace = useWorkspaceStore(s => s.getTabWorkspace);
  const getDuplicates = useTabIntelligenceStore(s => s.getDuplicates);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fuzzy search
  const filtered = useMemo(() => {
    if (!query.trim()) return tabs;
    const q = query.toLowerCase();
    return tabs.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.url.toLowerCase().includes(q)
    );
  }, [tabs, query]);

  // Clamp selection
  useEffect(() => {
    setSelectedIdx(prev => Math.min(prev, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Duplicates
  const duplicateGroups = useMemo(() => {
    return getDuplicates(tabs.map(t => ({ id: t.id, url: t.url })));
  }, [tabs, getDuplicates]);

  const duplicateCount = duplicateGroups.reduce((sum, g) => sum + g.length - 1, 0);

  const closeDuplicates = useCallback(() => {
    for (const group of duplicateGroups) {
      // Keep first, close the rest
      for (let i = 1; i < group.length; i++) {
        closeTab(group[i]);
      }
    }
  }, [duplicateGroups, closeTab]);

  const handleSelect = useCallback((tabId: string) => {
    switchTab(tabId);
    onClose();
  }, [switchTab, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      handleSelect(filtered[selectedIdx].id);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIdx] as HTMLElement;
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const getDomain = (url: string) => {
    try { return new URL(url).hostname; } catch { return ''; }
  };

  const hostnameHue = (hostname: string) => {
    let hash = 0;
    for (let i = 0; i < hostname.length; i++) {
      hash = ((hash << 5) - hash + hostname.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 360;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 600,
          maxHeight: 'calc(100vh - 160px)',
          background: 'var(--color-surface, #1e1e3a)',
          borderRadius: 16,
          border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Search bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
        }}>
          <Search size={16} style={{ color: 'var(--color-text-secondary, #8892b0)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search open tabs..."
            style={{
              flex: 1, fontSize: 14, background: 'transparent', border: 'none',
              color: 'var(--color-text, #ccd6f6)', outline: 'none',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary, #8892b0)' }}>
            {filtered.length} tab{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tab list */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {filtered.map((tab, idx) => {
            const isSelected = idx === selectedIdx;
            const domain = getDomain(tab.url);
            const ws = getTabWorkspace(tab.id);
            const hue = hostnameHue(domain);

            return (
              <div
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                onMouseEnter={() => setSelectedIdx(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                  transition: 'background 0.1s',
                }}
              >
                {/* Domain color bar */}
                <div style={{
                  width: 3, height: 28, borderRadius: 2,
                  background: `hsl(${hue}, 65%, 55%)`,
                  flexShrink: 0,
                }} />

                {/* Favicon */}
                {tab.favicon_path ? (
                  <img src={tab.favicon_path} style={{ width: 16, height: 16, borderRadius: 2, flexShrink: 0 }} alt="" />
                ) : (
                  <Globe size={16} style={{ color: 'var(--color-text-secondary, #8892b0)', flexShrink: 0 }} />
                )}

                {/* Title + URL */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--color-text, #ccd6f6)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {tab.title || 'Untitled'}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--color-text-secondary, #8892b0)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {tab.url}
                  </div>
                </div>

                {/* Workspace badge */}
                {ws && (
                  <span style={{
                    fontSize: 9, padding: '1px 6px', borderRadius: 6,
                    background: `${ws.color}25`, color: ws.color,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {ws.name}
                  </span>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              color: 'var(--color-text-secondary, #8892b0)', fontSize: 13,
            }}>
              No tabs match your search
            </div>
          )}
        </div>

        {/* Duplicates footer */}
        {duplicateCount > 0 && (
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--color-border, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Copy size={12} />
              {duplicateCount} duplicate tab{duplicateCount !== 1 ? 's' : ''} found
            </span>
            <button
              onClick={closeDuplicates}
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 6,
                border: '1px solid #F59E0B40', background: '#F59E0B15',
                color: '#F59E0B', cursor: 'pointer', fontWeight: 500,
              }}
            >
              Close duplicates
            </button>
          </div>
        )}

        {/* Keyboard hints */}
        <div style={{
          padding: '6px 16px',
          borderTop: '1px solid var(--color-border, rgba(255,255,255,0.06))',
          display: 'flex', gap: 12, justifyContent: 'center',
        }}>
          {[
            { key: '↑↓', label: 'Navigate' },
            { key: '↵', label: 'Select' },
            { key: 'Esc', label: 'Close' },
          ].map(h => (
            <span key={h.key} style={{ fontSize: 10, color: 'var(--color-text-secondary, #8892b0)' }}>
              <kbd style={{
                padding: '1px 4px', borderRadius: 3,
                background: 'rgba(255,255,255,0.08)', marginRight: 3,
                fontSize: 9, fontFamily: 'inherit',
              }}>{h.key}</kbd>
              {h.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
