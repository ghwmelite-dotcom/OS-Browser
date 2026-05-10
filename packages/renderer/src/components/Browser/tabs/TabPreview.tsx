import React from 'react';

interface TabPreviewProps {
  tab: { title: string; url: string; favicon_path: string | null };
  position: { top: number; left: number };
}

// Native WebContentsView (Chromium) renders ABOVE the renderer DOM, so any
// preview that extends below this y position will be hidden by the page.
// CHROME_TOP in TabWebContents.ts is 171; we leave a small safety margin.
const CHROME_BOTTOM_LIMIT_Y = 168;

export function TabPreview({ tab, position }: TabPreviewProps) {
  const { title, url, favicon_path } = tab;
  const isInternalUrl = url === 'os-browser://newtab' || url.startsWith('os-browser://');

  // Clamp the top so the preview never extends below the chrome boundary.
  // We also cap our content height to ~80px so it can't push past either.
  const PREVIEW_MAX_HEIGHT = 80;
  const safeTop = Math.min(position.top, CHROME_BOTTOM_LIMIT_Y - PREVIEW_MAX_HEIGHT);

  // Truncate values to a single visual line each — keeps the tooltip flat.
  const displayTitle = title.length > 50 ? title.slice(0, 50) + '…' : title;
  const displayUrl = url.length > 55 ? url.slice(0, 55) + '…' : url;

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        top: safeTop,
        left: position.left,
        transform: 'translateX(-50%)',
        maxWidth: '320px',
        minWidth: '200px',
        maxHeight: PREVIEW_MAX_HEIGHT,
        overflow: 'hidden',
      }}
    >
      <div
        className="rounded-lg border px-3 py-2 text-left"
        style={{
          background: 'var(--color-surface-1)',
          borderColor: 'var(--color-border-1)',
          boxShadow: '0 12px 28px -8px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.12)',
        }}
      >
        {/* Title row with favicon — single line, truncated */}
        <div className="flex items-center gap-2 min-w-0">
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
            className="text-[12px] font-medium text-text-primary truncate"
            title={title}
          >
            {displayTitle}
          </p>
        </div>

        {/* URL — single line, truncated */}
        {url && !isInternalUrl && (
          <p className="text-[11px] text-text-muted mt-1 truncate pl-6">
            {displayUrl}
          </p>
        )}
      </div>
    </div>
  );
}
