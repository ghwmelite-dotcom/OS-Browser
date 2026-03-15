import React, { useState, useEffect } from 'react';
import { Download, X, CheckCircle } from 'lucide-react';

interface DownloadItem {
  id: string;
  filename: string;
  progress: number;
  state: 'downloading' | 'completed' | 'error';
}

export function DownloadBar() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Listen for download events from main process
    const onStarted = (data: any) => {
      setDownloads(prev => [...prev, {
        id: data.id, filename: data.filename, progress: 0, state: 'downloading'
      }]);
      setVisible(true);
    };
    const onProgress = (data: any) => {
      setDownloads(prev => prev.map(d =>
        d.id === data.id ? { ...d, progress: Math.round((data.receivedBytes / data.totalBytes) * 100) } : d
      ));
    };
    const onComplete = (data: any) => {
      setDownloads(prev => prev.map(d =>
        d.id === data.id ? { ...d, state: data.state === 'completed' ? 'completed' : 'error', progress: 100 } : d
      ));
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setDownloads(prev => {
          const next = prev.filter(d => d.id !== data.id);
          if (next.length === 0) setVisible(false);
          return next;
        });
      }, 5000);
    };

    // These would be wired to Electron IPC in a full implementation
    // For now, we'll listen for custom events
    const handleStart = (e: any) => onStarted(e.detail);
    const handleProgress = (e: any) => onProgress(e.detail);
    const handleDone = (e: any) => onComplete(e.detail);

    window.addEventListener('download:started', handleStart);
    window.addEventListener('download:progress', handleProgress);
    window.addEventListener('download:complete', handleDone);

    return () => {
      window.removeEventListener('download:started', handleStart);
      window.removeEventListener('download:progress', handleProgress);
      window.removeEventListener('download:complete', handleDone);
    };
  }, []);

  if (!visible || downloads.length === 0) return null;

  return (
    <div className="border-t px-3 py-2 flex items-center gap-3 shrink-0"
      style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
      <Download size={14} style={{ color: 'var(--color-accent)' }} />
      <div className="flex-1 flex items-center gap-2 overflow-x-auto">
        {downloads.map(dl => (
          <div key={dl.id} className="flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] shrink-0"
            style={{ background: 'var(--color-surface-2)' }}>
            {dl.state === 'completed' ? (
              <CheckCircle size={12} style={{ color: 'var(--color-accent-green)' }} />
            ) : (
              <div className="w-3 h-3 border-[1.5px] border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
            )}
            <span className="text-text-primary truncate max-w-[120px]">{dl.filename}</span>
            {dl.state === 'downloading' && (
              <span className="text-text-muted">{dl.progress}%</span>
            )}
          </div>
        ))}
      </div>
      <button onClick={() => setVisible(false)}
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-2">
        <X size={12} className="text-text-muted" />
      </button>
    </div>
  );
}
