import React, { useEffect } from 'react';
import { useBookmarksStore } from '@/store/bookmarks';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';

export function BookmarksBar() {
  const { bookmarks, loadBookmarks } = useBookmarksStore();
  const { navigate } = useNavigationStore();
  const { activeTabId } = useTabsStore();

  useEffect(() => { loadBookmarks(); }, []);

  const topLevel = bookmarks.filter(b => !b.folder_id).slice(0, 12);
  if (topLevel.length === 0) return null;

  return (
    <div className="h-8 bg-surface-1 border-b border-border-1 flex items-center gap-1 px-3 overflow-x-auto shrink-0">
      {topLevel.map(bm => (
        <button key={bm.id} onClick={() => activeTabId && navigate(activeTabId, bm.url)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-btn text-xs text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-ghana-gold">
          <div className="w-3 h-3 rounded-sm bg-border-2 shrink-0" />
          <span className="truncate max-w-[100px]">{bm.title}</span>
        </button>
      ))}
    </div>
  );
}
