import React from 'react';

interface TabPreviewProps {
  tab: { title: string; url: string; favicon_path: string | null };
  position: { top: number; left: number };
}

export function TabPreview({ tab, position }: TabPreviewProps) {
  const { title, url, favicon_path } = tab;
  const isInternalUrl = url === 'os-browser://newtab' || url.startsWith('os-browser://');

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        maxWidth: '300px',
        minWidth: '180px',
      }}
    >
      <div
        className="rounded-lg border px-3 py-2.5 text-left"
        style={{
          background: 'var(--color-surface-1)',
          borderColor: 'var(--color-border-1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Title row with favicon */}
        <div className="flex items-center gap-2">
          {favicon_path ? (
            <img
              src={favicon_path}
              alt=""
              className="w-4 h-4 rounded-[2px] object-cover shrink-0"
            />
          ) : (
            <div className="w-4 h-4 rounded-[2px] bg-white/10 shrink-0 flex items-center justify-center text-[8px] font-bold text-text-muted">
              {title.charAt(0).toUpperCase()}
            </div>
          )}
          <p
            className="text-[12px] font-medium text-text-primary leading-snug"
            style={{ wordBreak: 'break-word' }}
          >
            {title}
          </p>
        </div>

        {/* URL */}
        {url && !isInternalUrl && (
          <p className="text-[11px] text-text-muted mt-1 truncate pl-6">
            {url.length > 60 ? url.slice(0, 60) + '...' : url}
          </p>
        )}
      </div>
    </div>
  );
}
