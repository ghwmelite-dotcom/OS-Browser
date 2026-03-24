import React, { useEffect, useState, useRef } from 'react';
import {
  Play,
  Trash2,
  Edit3,
  FolderOpen,
  ExternalLink,
  X,
  Video,
  Clock,
  HardDrive,
  Check,
} from 'lucide-react';
import { useRecorderStore, SavedRecording } from '../../store/recorder';
import type { SidebarPanelProps } from '../../features/registry';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

/** Video player modal */
function VideoPlayerModal({ recording, onClose }: { recording: SavedRecording; onClose: () => void }) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await (window as any).osBrowser?.recordings?.get(recording.id);
        if (!cancelled && result?.success && result.videoData) {
          const blob = new Blob(
            [Uint8Array.from(atob(result.videoData), c => c.charCodeAt(0))],
            { type: recording.mimeType || 'video/webm' }
          );
          setVideoSrc(URL.createObjectURL(blob));
        }
      } catch {
        // fail silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (videoSrc) URL.revokeObjectURL(videoSrc);
    };
  }, [recording.id]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="relative w-full max-w-3xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-surface-1)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
          <h3 className="text-[14px] font-bold text-text-primary truncate flex-1 mr-3">{recording.title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-2 transition-colors">
            <X size={16} className="text-text-secondary" />
          </button>
        </div>

        {/* Video */}
        <div className="aspect-video bg-black flex items-center justify-center">
          {loading ? (
            <div className="text-text-muted text-sm">Loading...</div>
          ) : videoSrc ? (
            <video src={videoSrc} controls autoPlay className="w-full h-full" />
          ) : (
            <div className="text-text-muted text-sm">Could not load recording</div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-4 px-5 py-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-1"><Clock size={12} />{formatDuration(recording.duration)}</span>
          <span className="flex items-center gap-1"><HardDrive size={12} />{formatFileSize(recording.fileSize)}</span>
          <span>{formatDate(recording.createdAt)}</span>
          <span className="uppercase">{recording.quality}</span>
          {recording.hasMic && <span>+ Mic</span>}
        </div>
      </div>
    </div>
  );
}

/** Single recording card */
function RecordingCard({ recording }: { recording: SavedRecording }) {
  const { deleteRecording, renameRecording, loadRecordings } = useRecorderStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(recording.title);
  const [showPlayer, setShowPlayer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) inputRef.current.focus();
  }, [isRenaming]);

  const handleRename = async () => {
    if (renameValue.trim() && renameValue.trim() !== recording.title) {
      await renameRecording(recording.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    await deleteRecording(recording.id);
    setConfirmDelete(false);
  };

  return (
    <>
      <div className="group rounded-xl border p-3 transition-all hover:shadow-md"
        style={{
          background: 'var(--color-surface-2)',
          borderColor: 'var(--color-border-1)',
        }}>
        {/* Thumbnail / Play area */}
        <button
          onClick={() => setShowPlayer(true)}
          className="w-full aspect-video rounded-lg mb-3 flex items-center justify-center relative overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: 'rgba(239,68,68,0.9)' }}>
            <Play size={20} className="text-white ml-0.5" fill="white" />
          </div>
          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono text-white"
            style={{ background: 'rgba(0,0,0,0.7)' }}>
            {formatDuration(recording.duration)}
          </div>
        </button>

        {/* Title */}
        {isRenaming ? (
          <div className="flex items-center gap-1.5 mb-2">
            <input
              ref={inputRef}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setIsRenaming(false); setRenameValue(recording.title); }
              }}
              onBlur={handleRename}
              className="flex-1 px-2 py-1 rounded text-[13px] outline-none border"
              style={{ background: 'var(--color-surface-3)', borderColor: 'var(--color-border-2)', color: 'var(--color-text-primary)' }}
            />
            <button onClick={handleRename}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-3 transition-colors">
              <Check size={14} style={{ color: '#22C55E' }} />
            </button>
          </div>
        ) : (
          <h4 className="text-[13px] font-semibold text-text-primary truncate mb-1">{recording.title}</h4>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-[10px] text-text-muted mb-2.5">
          <span>{formatDate(recording.createdAt)}</span>
          <span>{formatFileSize(recording.fileSize)}</span>
          <span className="uppercase">{recording.quality}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={() => setShowPlayer(true)} title="Play"
            className="flex-1 h-7 rounded-lg flex items-center justify-center gap-1 text-[11px] font-medium transition-colors hover:bg-surface-3"
            style={{ color: '#EF4444' }}>
            <Play size={12} /> Play
          </button>
          <button onClick={() => { setRenameValue(recording.title); setIsRenaming(true); }} title="Rename"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-surface-3 text-text-muted hover:text-text-secondary">
            <Edit3 size={12} />
          </button>
          <button onClick={() => (window as any).osBrowser?.recordings?.showInFolder(recording.id)} title="Show in folder"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-surface-3 text-text-muted hover:text-text-secondary">
            <FolderOpen size={12} />
          </button>
          <button onClick={() => (window as any).osBrowser?.recordings?.openExternal(recording.id)} title="Open in system player"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-surface-3 text-text-muted hover:text-text-secondary">
            <ExternalLink size={12} />
          </button>
          {confirmDelete ? (
            <button onClick={handleDelete} title="Confirm delete"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-white"
              style={{ background: '#EF4444' }}>
              <Check size={12} />
            </button>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Delete"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-surface-3 text-text-muted hover:text-red-400">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {showPlayer && <VideoPlayerModal recording={recording} onClose={() => setShowPlayer(false)} />}
    </>
  );
}

/** Main recordings library sidebar panel */
export const RecordingsLibrary: React.FC<SidebarPanelProps> = ({ onClose }) => {
  const { savedRecordings, loadRecordings } = useRecorderStore();

  useEffect(() => {
    loadRecordings();
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-surface-1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--color-border-1)' }}>
        <div className="flex items-center gap-2">
          <Video size={16} style={{ color: '#EF4444' }} />
          <h2 className="text-[14px] font-bold text-text-primary">Recordings</h2>
          {savedRecordings.length > 0 && (
            <span className="text-[11px] text-text-muted">({savedRecordings.length})</span>
          )}
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-2 transition-colors">
          <X size={14} className="text-text-secondary" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {savedRecordings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'var(--color-surface-2)' }}>
              <Video size={28} className="text-text-muted" />
            </div>
            <h3 className="text-[14px] font-semibold text-text-primary mb-1">No recordings yet</h3>
            <p className="text-[12px] text-text-muted max-w-[200px]">
              Start recording your screen to see your recordings here.
            </p>
          </div>
        ) : (
          savedRecordings.map(recording => (
            <RecordingCard key={recording.id} recording={recording} />
          ))
        )}
      </div>
    </div>
  );
};

export default RecordingsLibrary;
