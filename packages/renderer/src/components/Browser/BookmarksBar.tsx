import React, { useEffect } from 'react';
import { Folder } from 'lucide-react';
import { useBookmarksStore } from '@/store/bookmarks';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';

export function BookmarksBar() {
  const { bookmarks, folders, loadBookmarks } = useBookmarksStore();
  const { navigate } = useNavigationStore();
  const { activeTabId } = useTabsStore();

  useEffect(() => { loadBookmarks(); }, []);

  const topLevel = bookmarks.filter(b => !b.folder_id).slice(0, 16);
  const topFolders = folders.filter(f => !f.parent_id).slice(0, 4);

  if (topLevel.length === 0 && topFolders.length === 0) return null;

  return (
    <div className="h-7 bg-surface-1 border-b border-border-1/40 flex items-center gap-0.5 px-2 overflow-x-auto shrink-0 scrollbar-none"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
    >
      {/* Bookmark items */}
      {topLevel.map((bm, i) => (
        <React.Fragment key={bm.id}>
          <button
            onClick={() => activeTabId && navigate(activeTabId, bm.url)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-all duration-150 ease-out whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-ghana-gold/50 shrink-0"
            title={bm.url}
          >
            {bm.favicon_path ? (
              <img src={bm.favicon_path} alt="" className="w-3 h-3 rounded-[1px] object-cover shrink-0" />
            ) : (
              <div className="w-3 h-3 rounded-[1px] bg-border-2/50 shrink-0" />
            )}
            <span className="truncate max-w-[90px]">{bm.title}</span>
          </button>
          {/* Subtle separator dot */}
          {i < topLevel.length - 1 && (
            <div className="w-[2px] h-[2px] rounded-full bg-border-1/60 shrink-0 mx-0.5" />
          )}
        </React.Fragment>
      ))}

      {/* Folder items */}
      {topFolders.length > 0 && topLevel.length > 0 && (
        <div className="w-px h-3 bg-border-1/50 mx-1 shrink-0" />
      )}
      {topFolders.map((folder) => (
        <button
          key={folder.id}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-text-muted hover:bg-surface-2 hover:text-text-secondary transition-all duration-150 ease-out whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-ghana-gold/50 shrink-0"
          title={folder.name}
        >
          <Folder size={10} strokeWidth={1.5} className="shrink-0" />
          <span className="truncate max-w-[80px]">{folder.name}</span>
        </button>
      ))}
    </div>
  );
}
