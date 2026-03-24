import React, { useEffect, useState, useRef } from 'react';
import { Play, FolderOpen, Edit3, X, Check, Video } from 'lucide-react';
import { useRecorderStore } from '../../store/recorder';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PostRecordingToast: React.FC = () => {
  const { showPostRecordingToast, lastSavedRecording, setShowPostRecordingToast, renameRecording, setShowLibrary } = useRecorderStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!showPostRecordingToast) return;
    const timer = setTimeout(() => setShowPostRecordingToast(false), 8000);
    return () => clearTimeout(timer);
  }, [showPostRecordingToast]);

  useEffect(() => {
    if (isRenaming && inputRef.current) inputRef.current.focus();
  }, [isRenaming]);

  if (!showPostRecordingToast || !lastSavedRecording) return null;

  const rec = lastSavedRecording;

  const handleRename = async () => {
    if (renameValue.trim() && renameValue.trim() !== rec.title) {
      await renameRecording(rec.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-[10000] w-[340px] rounded-2xl border overflow-hidden shadow-2xl"
      style={{
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
        animation: 'toast-slide-in 300ms ease-out',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--color-surface-2)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <Video size={12} style={{ color: '#EF4444' }} />
          </div>
          <span className="text-[13px] font-semibold text-text-primary">Recording saved</span>
        </div>
        <button onClick={() => setShowPostRecordingToast(false)}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-surface-3 transition-colors">
          <X size={12} className="text-text-muted" />
        </button>
      </div>

      {/* Info */}
      <div className="px-4 py-3">
        {isRenaming ? (
          <div className="flex items-center gap-2 mb-2">
            <input
              ref={inputRef}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              className="flex-1 px-2 py-1.5 rounded-lg text-[12px] outline-none border"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-2)', color: 'var(--color-text-primary)' }}
            />
            <button onClick={handleRename}
              className="w-6 h-6 rounded flex items-center justify-center" style={{ color: '#22C55E' }}>
              <Check size={14} />
            </button>
          </div>
        ) : (
          <p className="text-[12px] text-text-secondary mb-2 truncate">{rec.title}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="font-mono">{formatDuration(rec.duration)}</span>
          <span>{formatFileSize(rec.fileSize)}</span>
          {rec.hasMic && <span>+ Mic</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t" style={{ borderColor: 'var(--color-border-1)' }}>
        <button
          onClick={() => {
            (window as any).osBrowser?.recordings?.showInFolder(rec.id);
            setShowPostRecordingToast(false);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-text-secondary hover:bg-surface-2 transition-colors border-r"
          style={{ borderColor: 'var(--color-border-1)' }}
        >
          <FolderOpen size={12} /> Show in folder
        </button>
        <button
          onClick={() => {
            setShowPostRecordingToast(false);
            setShowLibrary(true);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium hover:bg-surface-2 transition-colors border-r"
          style={{ color: '#EF4444', borderColor: 'var(--color-border-1)' }}
        >
          <Play size={12} /> Play
        </button>
        <button
          onClick={() => {
            setRenameValue(rec.title);
            setIsRenaming(true);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-text-secondary hover:bg-surface-2 transition-colors"
        >
          <Edit3 size={12} /> Rename
        </button>
      </div>

      <style>{`
        @keyframes toast-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PostRecordingToast;
