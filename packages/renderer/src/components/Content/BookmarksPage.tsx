import React, { useEffect, useState } from 'react';
import { Star, Trash2, ExternalLink, FolderOpen, Globe } from 'lucide-react';
import { useTabsStore } from '@/store/tabs';

interface Bookmark {
  id: number; url: string; title: string; description: string | null;
  folder_id: number | null; favicon_path: string | null; position: number; created_at: string;
}

interface BookmarkFolder {
  id: number; name: string; parent_id: number | null; position: number;
}

export function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const { createTab } = useTabsStore();

  const load = async () => {
    const data = await window.osBrowser.bookmarks.list();
    setBookmarks(data.bookmarks || data || []);
    setFolders(data.folders || []);
  };

  useEffect(() => { load(); }, []);

  const deleteBookmark = async (id: number) => {
    await window.osBrowser.bookmarks.delete(id);
    load();
  };

  const openBookmark = (url: string) => {
    createTab(url);
  };

  const getFolderBookmarks = (folderId: number) => bookmarks.filter(b => b.folder_id === folderId);
  const unfiledBookmarks = bookmarks.filter(b => !b.folder_id);

  return (
    <div className="min-h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[780px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-accent)', color: '#fff' }}>
              <Star size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Bookmarks</h1>
              <p className="text-[12px] text-text-muted">{bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Folders */}
        {folders.map(folder => {
          const folderBookmarks = getFolderBookmarks(folder.id);
          if (folderBookmarks.length === 0) return null;
          return (
            <div key={folder.id} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen size={16} style={{ color: 'var(--color-accent)' }} />
                <h2 className="text-[14px] font-bold text-text-primary">{folder.name}</h2>
                <span className="text-[11px] text-text-muted">({folderBookmarks.length})</span>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
                {folderBookmarks.map(bm => (
                  <BookmarkRow key={bm.id} bookmark={bm} onOpen={openBookmark} onDelete={deleteBookmark} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Unfiled bookmarks */}
        {unfiledBookmarks.length > 0 && (
          <div className="mb-6">
            {folders.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Globe size={16} className="text-text-muted" />
                <h2 className="text-[14px] font-bold text-text-primary">All Bookmarks</h2>
                <span className="text-[11px] text-text-muted">({unfiledBookmarks.length})</span>
              </div>
            )}
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
              {unfiledBookmarks.map(bm => (
                <BookmarkRow key={bm.id} bookmark={bm} onOpen={openBookmark} onDelete={deleteBookmark} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {bookmarks.length === 0 && (
          <div className="text-center py-16">
            <Star size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-[16px] font-medium text-text-primary mb-2">No bookmarks yet</p>
            <p className="text-[13px] text-text-muted">Click the star icon ☆ in the address bar to bookmark a page</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BookmarkRow({ bookmark, onOpen, onDelete }: { bookmark: Bookmark; onOpen: (url: string) => void; onDelete: (id: number) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-0 group hover:bg-surface-2/50 transition-colors"
      style={{ borderColor: 'var(--color-border-1)' }}>
      {/* Favicon or initial */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-bold"
        style={{ background: 'var(--color-surface-2)', color: 'var(--color-accent)' }}>
        {bookmark.favicon_path ? (
          <img src={bookmark.favicon_path} alt="" className="w-4 h-4 rounded" />
        ) : (
          bookmark.title?.charAt(0).toUpperCase() || '?'
        )}
      </div>

      {/* Title + URL */}
      <button onClick={() => onOpen(bookmark.url)} className="flex-1 min-w-0 text-left">
        <p className="text-[14px] font-medium text-text-primary truncate hover:underline cursor-pointer">
          {bookmark.title || bookmark.url}
        </p>
        <p className="text-[11px] text-text-muted truncate">{bookmark.url}</p>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onOpen(bookmark.url)}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-3" title="Open">
          <ExternalLink size={13} className="text-text-muted" />
        </button>
        <button onClick={() => onDelete(bookmark.id)}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/10" title="Delete">
          <Trash2 size={13} style={{ color: '#CE1126' }} />
        </button>
      </div>
    </div>
  );
}
