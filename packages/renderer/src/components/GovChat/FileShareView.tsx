import React, { useCallback, useRef, useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Image,
  Film,
  Music,
  File as FileIcon,
  Trash2,
  Send,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { useGovChatStore } from '@/store/govchat';
import type { ClassificationLevel } from '@/types/govchat';
import { CLASSIFICATION_COLORS } from '@/types/govchat';

interface FileShareViewProps {
  roomId: string;
  onClose: () => void;
}

interface SelectedFile {
  id: string;
  file: File;
  preview: string | null; // data URL for images
  progress: number; // 0-100
  error: string | null;
  uploading: boolean;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'text/plain',
  'text/csv',
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document'))
    return FileText;
  return FileIcon;
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Spreadsheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'Presentation';
  if (mimeType.includes('text')) return 'Text';
  return 'File';
}

const CLASSIFICATION_OPTIONS: ClassificationLevel[] = ['UNCLASSIFIED', 'OFFICIAL', 'SENSITIVE', 'SECRET'];

export const FileShareView: React.FC<FileShareViewProps> = ({ roomId, onClose }) => {
  const { rooms, sendFileMessage } = useGovChatStore();
  const room = rooms.find(r => r.roomId === roomId);
  const roomClassification = room?.classification ?? 'OFFICIAL';

  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [classification, setClassification] = useState<ClassificationLevel>(roomClassification);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return `File exceeds 50MB limit (${formatSize(file.size)})`;
    if (ALLOWED_TYPES.length > 0 && !ALLOWED_TYPES.includes(file.type) && file.type !== '') {
      return `File type "${file.type || 'unknown'}" is not allowed`;
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const entries: SelectedFile[] = fileArray.map(file => {
      const error = validateFile(file);
      let preview: string | null = null;

      if (!error && file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        preview,
        progress: 0,
        error,
        uploading: false,
      };
    });

    setFiles(prev => [...prev, ...entries]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleSend = async () => {
    const validFiles = files.filter(f => !f.error);
    if (validFiles.length === 0) return;

    setIsSending(true);

    for (let i = 0; i < validFiles.length; i++) {
      const entry = validFiles[i];
      setFiles(prev =>
        prev.map(f => (f.id === entry.id ? { ...f, uploading: true, progress: 10 } : f)),
      );

      // Simulate progress
      const progressInterval = setInterval(() => {
        setFiles(prev =>
          prev.map(f =>
            f.id === entry.id && f.progress < 90
              ? { ...f, progress: f.progress + 15 }
              : f,
          ),
        );
      }, 200);

      try {
        await sendFileMessage(roomId, entry.file, classification);
        clearInterval(progressInterval);
        setFiles(prev =>
          prev.map(f => (f.id === entry.id ? { ...f, progress: 100, uploading: false } : f)),
        );
      } catch {
        clearInterval(progressInterval);
        setFiles(prev =>
          prev.map(f =>
            f.id === entry.id ? { ...f, error: 'Upload failed', uploading: false } : f,
          ),
        );
      }
    }

    setIsSending(false);

    // Close after a brief delay to show 100% completion
    setTimeout(onClose, 600);
  };

  const validCount = files.filter(f => !f.error).length;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl shadow-xl"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border-1)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Share Files
        </h3>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/10"
        >
          <X className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* Drop zone */}
      <div className="p-4">
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors"
          style={{
            borderColor: isDragOver ? '#006B3F' : 'var(--color-border-1)',
            backgroundColor: isDragOver ? 'rgba(0, 107, 63, 0.08)' : 'transparent',
          }}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload
            className="h-8 w-8"
            style={{ color: isDragOver ? '#006B3F' : 'var(--color-text-muted)' }}
          />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Drop files here or click to browse
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
            Max 50MB per file. Images, documents, audio, video.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED_TYPES.join(',')}
          onChange={e => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div
          className="max-h-52 overflow-y-auto border-t px-4 py-2"
          style={{ borderColor: 'var(--color-border-1)' }}
        >
          {files.map(entry => {
            const Icon = getFileIcon(entry.file.type);
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2"
                style={{
                  backgroundColor: entry.error ? 'rgba(206, 17, 38, 0.06)' : 'transparent',
                }}
              >
                {/* Preview or icon */}
                {entry.preview ? (
                  <img
                    src={entry.preview}
                    alt={entry.file.name}
                    className="h-10 w-10 flex-shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: 'var(--color-surface-1)' }}
                  >
                    <Icon className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {entry.file.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {formatSize(entry.file.size)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {getFileTypeLabel(entry.file.type)}
                    </span>
                  </div>

                  {/* Error */}
                  {entry.error && (
                    <div className="mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-500">{entry.error}</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  {entry.uploading && (
                    <div
                      className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: 'var(--color-surface-1)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${entry.progress}%`,
                          backgroundColor: '#006B3F',
                        }}
                      />
                    </div>
                  )}

                  {entry.progress === 100 && !entry.uploading && !entry.error && (
                    <span className="text-xs" style={{ color: '#006B3F' }}>
                      Sent
                    </span>
                  )}
                </div>

                {/* Remove */}
                {!entry.uploading && entry.progress !== 100 && (
                  <button
                    onClick={() => removeFile(entry.id)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-red-500/20"
                    title="Remove file"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between border-t px-4 py-3"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        {/* Classification selector */}
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={classification}
            onChange={e => setClassification(e.target.value as ClassificationLevel)}
            className="rounded-md border bg-transparent px-2 py-1 text-xs font-medium outline-none"
            style={{
              borderColor: CLASSIFICATION_COLORS[classification],
              color: CLASSIFICATION_COLORS[classification],
            }}
          >
            {CLASSIFICATION_OPTIONS.map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={validCount === 0 || isSending}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40"
          style={{ backgroundColor: '#006B3F' }}
        >
          <Send className="h-4 w-4" />
          {isSending ? 'Sending...' : `Send ${validCount > 0 ? `(${validCount})` : ''}`}
        </button>
      </div>
    </div>
  );
};

export default FileShareView;
