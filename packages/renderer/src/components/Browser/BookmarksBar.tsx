import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, FolderOpen, LayoutGrid } from 'lucide-react';
import { useBookmarksStore } from '@/store/bookmarks';
import { useTabsStore } from '@/store/tabs';

export function BookmarksBar() {
  const { bookmarks, folders, loadBookmarks } = useBookmarksStore();
  const { createTab } = useTabsStore();
  const [openFolder, setOpenFolder] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadBookmarks(); }, []);

  // Refresh when bookmarks change (e.g. after browser import)
  useEffect(() => {
    const handler = () => loadBookmarks();
    window.addEventListener('bookmark-changed', handler);
    // Also listen for IPC-driven refresh from main process
    const cleanup = window.osBrowser?.bookmarks?.onRefresh?.(handler);
    return () => {
      window.removeEventListener('bookmark-changed', handler);
      cleanup?.();
    };
  }, [loadBookmarks]);

  const topLevel = bookmarks.filter(b => !b.folder_id).slice(0, 20);
  const topFolders = folders.filter(f => !f.parent_id);

  const openUrl = (url: string) => {
    createTab(url);
    setOpenFolder(null);
  };

  const getFolderBookmarks = (folderId: number) => bookmarks.filter(b => b.folder_id === folderId);

  if (topLevel.length === 0 && topFolders.length === 0) {
    return (
      <div className="h-7 bg-surface-1 border-b border-border-1/40 flex items-center justify-center shrink-0">
        <span className="text-[10px] text-text-muted">Add bookmarks for quick access — click ☆ in the address bar</span>
      </div>
    );
  }

  return (
    <div ref={barRef} className="h-7 bg-surface-1 border-b border-border-1/40 flex items-center gap-0.5 px-2 overflow-x-auto shrink-0"
      style={{ scrollbarWidth: 'none' }}>

      {/* All Bookmarks icon — opens bookmarks manager page */}
      <button
        onClick={() => createTab('os-browser://bookmarks')}
        className="bookmarks-grid-btn flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200 shrink-0"
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border-1)',
        }}
        title={`All Bookmarks (${bookmarks.length})`}
      >
        <LayoutGrid size={13} strokeWidth={2} style={{ color: 'var(--color-accent)' }} />
      </button>

      <div className="w-px h-3 bg-border-1/50 mx-0.5 shrink-0" />

      {/* Bookmark items */}
      {topLevel.map((bm) => (
        <button key={bm.id} onClick={() => openUrl(bm.url)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-all duration-150 whitespace-nowrap shrink-0"
          title={bm.url}>
          {bm.favicon_path ? (
            <img src={bm.favicon_path} alt="" className="w-3 h-3 rounded-[1px] object-cover shrink-0" />
          ) : (
            <div className="w-3 h-3 rounded-[2px] flex items-center justify-center text-[7px] font-bold shrink-0"
              style={{ background: 'var(--color-surface-3)', color: 'var(--color-accent)' }}>
              {bm.title?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <span className="truncate max-w-[100px]">{bm.title}</span>
        </button>
      ))}

      {/* Folder items with dropdown */}
      {topFolders.length > 0 && topLevel.length > 0 && (
        <div className="w-px h-3 bg-border-1/50 mx-1 shrink-0" />
      )}
      {topFolders.map(folder => (
        <div key={folder.id} className="relative shrink-0">
          <button onClick={() => setOpenFolder(openFolder === folder.id ? null : folder.id)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-text-muted hover:bg-surface-2 hover:text-text-secondary transition-all duration-150 whitespace-nowrap"
            title={folder.name}>
            <FolderOpen size={10} strokeWidth={1.5} className="shrink-0" />
            <span className="truncate max-w-[80px]">{folder.name}</span>
            <ChevronRight size={9} className={`transition-transform ${openFolder === folder.id ? 'rotate-90' : ''}`} />
          </button>

          {/* Dropdown for folder contents */}
          {openFolder === folder.id && (
            <>
              <div className="fixed inset-0 z-[40]" onClick={() => setOpenFolder(null)} />
              <div className="absolute top-full left-0 mt-1 w-[240px] rounded-lg border shadow-xl z-[50] py-1 max-h-[300px] overflow-y-auto"
                style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
                {getFolderBookmarks(folder.id).length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-text-muted">Empty folder</div>
                ) : (
                  getFolderBookmarks(folder.id).map(bm => (
                    <button key={bm.id} onClick={() => openUrl(bm.url)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 transition-colors">
                      {bm.favicon_path ? (
                        <img src={bm.favicon_path} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold shrink-0"
                          style={{ background: 'var(--color-surface-3)', color: 'var(--color-accent)' }}>
                          {bm.title?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-text-primary truncate">{bm.title}</div>
                        <div className="text-[10px] text-text-muted truncate">{bm.url}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
