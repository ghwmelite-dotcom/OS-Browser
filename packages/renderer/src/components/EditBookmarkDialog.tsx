import React, { useState, useEffect } from 'react';
import { X, Star, Trash2, FolderOpen, ChevronDown } from 'lucide-react';

interface EditBookmarkDialogProps {
  bookmark: { id: number; title: string; url: string; folder_id: number | null } | null;
  folders: { id: number; name: string }[];
  onSave: (id: number, data: { title: string; url: string; folder_id: number | null }) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export function EditBookmarkDialog({ bookmark, folders, onSave, onDelete, onClose }: EditBookmarkDialogProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setUrl(bookmark.url);
      setFolderId(bookmark.folder_id);
    }
  }, [bookmark]);

  if (!bookmark) return null;

  const selectedFolder = folders.find(f => f.id === folderId);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-[380px] rounded-xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
          <div className="flex items-center gap-2">
            <Star size={16} fill="var(--color-accent)" style={{ color: 'var(--color-accent)' }} />
            <span className="text-[14px] font-bold text-text-primary">Edit Bookmark</span>
          </div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-2">
            <X size={14} className="text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1 block">Name</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none border"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1 block">URL</label>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[13px] font-mono outline-none border"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1 block">Folder</label>
            <div className="relative">
              <button onClick={() => setShowFolderPicker(!showFolderPicker)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] border"
                style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}>
                <span className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-text-muted" />
                  {selectedFolder?.name || 'No folder (root)'}
                </span>
                <ChevronDown size={14} className="text-text-muted" />
              </button>
              {showFolderPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-10 py-1 max-h-[200px] overflow-y-auto"
                  style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
                  <button onClick={() => { setFolderId(null); setShowFolderPicker(false); }}
                    className={`w-full text-left px-3 py-2 text-[13px] hover:bg-surface-2 ${folderId === null ? 'font-semibold' : ''}`}
                    style={{ color: 'var(--color-text-primary)' }}>
                    No folder (root)
                  </button>
                  {folders.map(f => (
                    <button key={f.id} onClick={() => { setFolderId(f.id); setShowFolderPicker(false); }}
                      className={`w-full text-left px-3 py-2 text-[13px] hover:bg-surface-2 flex items-center gap-2 ${folderId === f.id ? 'font-semibold' : ''}`}
                      style={{ color: 'var(--color-text-primary)' }}>
                      <FolderOpen size={13} className="text-text-muted" />
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--color-border-1)' }}>
          <button onClick={() => { onDelete(bookmark.id); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-red-500/10 transition-colors"
            style={{ color: '#CE1126' }}>
            <Trash2 size={13} /> Remove
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-[12px] font-medium border hover:bg-surface-2"
              style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}>
              Cancel
            </button>
            <button onClick={() => { onSave(bookmark.id, { title, url, folder_id: folderId }); onClose(); }}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background: 'var(--color-accent)', color: '#fff' }}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
