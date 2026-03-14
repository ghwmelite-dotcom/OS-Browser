import React, { useEffect, useState } from 'react';
import { X, FolderPlus, Star, Trash2 } from 'lucide-react';
import { useBookmarksStore } from '@/store/bookmarks';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';

export function BookmarkManager({ onClose }: { onClose: () => void }) {
  const { bookmarks, folders, loadBookmarks, removeBookmark, createFolder } = useBookmarksStore();
  const { navigate } = useNavigationStore();
  const { activeTabId } = useTabsStore();
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  useEffect(() => { loadBookmarks(); }, []);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder({ name: newFolderName.trim() });
    setNewFolderName('');
    setShowNewFolder(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="w-[480px] bg-surface-1 border-r border-border-1 flex flex-col h-full animate-slide-in-right">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-1">
          <div className="flex items-center gap-2"><Star size={16} className="text-ghana-gold" /><span className="text-md font-medium">Bookmarks</span></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewFolder(!showNewFolder)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ghana-gold" title="New folder"><FolderPlus size={16} className="text-text-secondary" /></button>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ghana-gold"><X size={16} className="text-text-muted" /></button>
          </div>
        </div>
        {showNewFolder && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border-1">
            <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} placeholder="Folder name" className="flex-1 px-3 py-1.5 bg-surface-2 rounded-btn text-sm text-text-primary outline-none focus:ring-2 focus:ring-ghana-gold" autoFocus />
            <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-ghana-gold text-bg text-sm rounded-btn hover:brightness-110">Create</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {folders.map((folder: any) => (
            <div key={folder.id} className="border-b border-border-1">
              <div className="px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider bg-surface-2/50">{folder.name}</div>
              {bookmarks.filter((b: any) => b.folder_id === folder.id).map((bm: any) => (
                <div key={bm.id} className="flex items-center gap-3 px-6 py-2 hover:bg-surface-2 transition-colors group">
                  <button onClick={() => { if (activeTabId) navigate(activeTabId, bm.url); onClose(); }} className="flex-1 text-left truncate focus:outline-none">
                    <div className="text-sm text-text-primary truncate">{bm.title}</div>
                    <div className="text-xs text-text-muted truncate">{bm.url}</div>
                  </button>
                  <button onClick={() => removeBookmark(bm.id)} className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-ghana-red/20 focus:outline-none"><Trash2 size={12} className="text-ghana-red" /></button>
                </div>
              ))}
            </div>
          ))}
          {/* Unfiled bookmarks */}
          {bookmarks.filter((b: any) => !b.folder_id).length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider bg-surface-2/50">Unfiled</div>
              {bookmarks.filter((b: any) => !b.folder_id).map((bm: any) => (
                <div key={bm.id} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-2 transition-colors group">
                  <button onClick={() => { if (activeTabId) navigate(activeTabId, bm.url); onClose(); }} className="flex-1 text-left truncate focus:outline-none">
                    <div className="text-sm text-text-primary truncate">{bm.title}</div>
                    <div className="text-xs text-text-muted truncate">{bm.url}</div>
                  </button>
                  <button onClick={() => removeBookmark(bm.id)} className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-ghana-red/20 focus:outline-none"><Trash2 size={12} className="text-ghana-red" /></button>
                </div>
              ))}
            </div>
          )}
          {bookmarks.length === 0 && <div className="text-center text-text-muted text-sm py-12">No bookmarks yet</div>}
        </div>
      </div>
      <div className="flex-1 bg-black/50" onClick={onClose} />
    </div>
  );
}
