import React, { useEffect, useState } from 'react';
import { X, Trash2, Search, Clock } from 'lucide-react';
import { useHistoryStore } from '@/store/history';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const { entries, loadHistory, searchHistory, deleteEntry, clearAll } = useHistoryStore();
  const { navigate } = useNavigationStore();
  const { activeTabId } = useTabsStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadHistory(); }, []);

  // Hide WebContentsViews so the panel renders above tab content
  useEffect(() => {
    window.osBrowser?.hideWebViews?.();
    return () => { window.osBrowser?.showWebViews?.(); };
  }, []);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.trim()) searchHistory(q); else loadHistory();
  };

  const groupByDate = (items: any[]) => {
    const groups: Record<string, any[]> = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    items.forEach(item => {
      const date = new Date(item.last_visited_at).toDateString();
      const label = date === today ? 'Today' : date === yesterday ? 'Yesterday' : date;
      (groups[label] ||= []).push(item);
    });
    return groups;
  };

  const groups = groupByDate(entries);

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="w-[420px] bg-surface-1 border-r border-border-1 flex flex-col h-full animate-slide-in-right">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-1">
          <div className="flex items-center gap-2"><Clock size={16} className="text-ghana-gold" /><span className="text-md font-medium">History</span></div>
          <div className="flex items-center gap-2">
            <button onClick={clearAll} className="text-xs text-ghana-red hover:underline focus:outline-none">Clear all</button>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ghana-gold"><X size={16} className="text-text-muted" /></button>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-border-1">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 rounded-btn">
            <Search size={14} className="text-text-muted" />
            <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="Search history..." className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {Object.entries(groups).map(([label, items]) => (
            <div key={label}>
              <div className="px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider bg-surface-2/50">{label}</div>
              {items.map((entry: any) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-2 transition-colors group">
                  <button onClick={() => { if (activeTabId) navigate(activeTabId, entry.url); onClose(); }} className="flex-1 text-left truncate focus:outline-none">
                    <div className="text-sm text-text-primary truncate">{entry.title || entry.url}</div>
                    <div className="text-xs text-text-muted truncate">{entry.url}</div>
                  </button>
                  <button onClick={() => deleteEntry(entry.id)} className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-ghana-red/20 focus:outline-none"><Trash2 size={12} className="text-ghana-red" /></button>
                </div>
              ))}
            </div>
          ))}
          {entries.length === 0 && <div className="text-center text-text-muted text-sm py-12">No history yet</div>}
        </div>
      </div>
      <div className="flex-1 bg-black/50" onClick={onClose} />
    </div>
  );
}
