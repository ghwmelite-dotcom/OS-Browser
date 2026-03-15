import React, { useState } from 'react';
import { BookOpen, X, ZoomIn, ZoomOut, Type } from 'lucide-react';

interface ReadingModeProps {
  isActive: boolean;
  content: string;
  title: string;
  url: string;
  onClose: () => void;
}

export function ReadingMode({ isActive, content, title, url, onClose }: ReadingModeProps) {
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b backdrop-blur-xl"
        style={{ background: 'var(--glass-bg)', borderColor: 'var(--color-border-1)' }}>
        <div className="flex items-center gap-3">
          <BookOpen size={16} style={{ color: 'var(--color-accent)' }} />
          <span className="text-[13px] font-medium text-text-primary">Reading Mode</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFontSize(s => Math.max(12, s - 2))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2" title="Decrease font">
            <ZoomOut size={14} className="text-text-muted" />
          </button>
          <span className="text-[11px] text-text-muted w-8 text-center">{fontSize}</span>
          <button onClick={() => setFontSize(s => Math.min(32, s + 2))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2" title="Increase font">
            <ZoomIn size={14} className="text-text-muted" />
          </button>
          <div className="w-px h-4 mx-1" style={{ background: 'var(--color-border-1)' }} />
          <button onClick={() => setFontFamily(f => f === 'serif' ? 'sans' : 'serif')}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2" title="Toggle font">
            <Type size={14} className="text-text-muted" />
          </button>
          <div className="w-px h-4 mx-1" style={{ background: 'var(--color-border-1)' }} />
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2" title="Exit Reading Mode">
            <X size={14} className="text-text-muted" />
          </button>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-[680px] mx-auto px-6 py-12">
        <h1 className="text-text-primary font-bold mb-4" style={{ fontSize: `${fontSize + 8}px`, fontFamily: fontFamily === 'serif' ? '"Bookman Old Style", Georgia, serif' : 'system-ui, sans-serif' }}>
          {title || 'Untitled'}
        </h1>
        <p className="text-[12px] text-text-muted mb-8">{url}</p>
        <div
          className="text-text-secondary leading-relaxed"
          style={{
            fontSize: `${fontSize}px`,
            fontFamily: fontFamily === 'serif' ? '"Bookman Old Style", Georgia, serif' : 'system-ui, sans-serif',
            lineHeight: 1.8,
          }}
        >
          {content ? (
            content.split('\n').filter(p => p.trim()).map((para, i) => (
              <p key={i} className="mb-4">{para}</p>
            ))
          ) : (
            <div className="text-center py-12 text-text-muted">
              <BookOpen size={32} className="mx-auto mb-3" />
              <p className="text-[14px]">Reading mode extracts the main content from the page.</p>
              <p className="text-[12px] mt-2">This feature works best with articles and text-heavy pages.</p>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
