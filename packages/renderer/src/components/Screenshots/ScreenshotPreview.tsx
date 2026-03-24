import React, { useEffect, useState } from 'react';
import { Check, Download, X } from 'lucide-react';

interface ScreenshotPreviewProps {
  dataUrl: string;
  onSave: () => void;
  onDismiss: () => void;
}

export function ScreenshotPreview({ dataUrl, onSave, onDismiss }: ScreenshotPreviewProps) {
  const [copied, setCopied] = useState(true); // starts as "copied" since we copy on capture

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 99998,
      width: 280,
      borderRadius: 14,
      overflow: 'hidden',
      background: 'var(--color-surface-1)',
      border: '1px solid var(--color-border-1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      animation: 'fadeUp 0.3s ease-out',
    }}>
      {/* Thumbnail */}
      <div style={{
        width: '100%',
        height: 140,
        overflow: 'hidden',
        borderBottom: '1px solid var(--color-border-1)',
        background: 'var(--color-surface-2)',
      }}>
        <img
          src={dataUrl}
          alt="Screenshot"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check size={14} style={{ color: '#22C55E' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {copied ? 'Copied to clipboard' : 'Screenshot captured'}
          </span>
        </div>

        <button
          onClick={onSave}
          title="Save to file"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--color-accent)', border: 'none',
            cursor: 'pointer', color: '#fff',
          }}
        >
          <Download size={14} />
        </button>

        <button
          onClick={onDismiss}
          title="Dismiss"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)',
            cursor: 'pointer', color: 'var(--color-text-muted)',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
