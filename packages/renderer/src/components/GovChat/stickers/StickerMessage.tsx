import React, { useState, useCallback } from 'react';
import { lookupSticker } from './stickerRegistry';
import { GhanaExpressionSticker } from './GhanaExpressions';
import { AdinkraVibeSticker } from './AdinkraVibes';
import { GhanaLifeSticker } from './GhanaLife';

/* ─────────── Sticker Message Renderer ─────────── */
/* Renders a sticker at 120x120 in the message stream.
   No bubble background — the sticker floats on its own.
   Tap to see a 200x200 preview overlay. */

interface StickerMessageProps {
  packId: string;
  stickerId: string;
  altText?: string;
}

function renderSticker(packId: string, stickerId: string, size: number) {
  switch (packId) {
    case 'ghana-expressions':
      return <GhanaExpressionSticker stickerId={stickerId} size={size} />;
    case 'adinkra-vibes':
      return <AdinkraVibeSticker stickerId={stickerId} size={size} />;
    case 'ghana-life':
      return <GhanaLifeSticker stickerId={stickerId} size={size} />;
    default:
      return null;
  }
}

export function StickerMessage({ packId, stickerId, altText }: StickerMessageProps) {
  const [showPreview, setShowPreview] = useState(false);
  const def = lookupSticker(packId, stickerId);

  const handleClick = useCallback(() => {
    setShowPreview(true);
  }, []);

  const closePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  const rendered = renderSticker(packId, stickerId, 120);

  if (!rendered) {
    // Fallback: show alt text
    return (
      <div
        style={{
          padding: '8px 14px',
          borderRadius: 12,
          background: 'var(--color-surface-2)',
          color: 'var(--color-text-primary)',
          fontSize: 13,
          fontStyle: 'italic',
        }}
      >
        [Sticker: {altText || def?.label || stickerId}]
      </div>
    );
  }

  return (
    <>
      {/* Sticker in chat — 120x120, no bubble */}
      <button
        onClick={handleClick}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          transition: 'transform 0.15s ease-out',
          lineHeight: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        }}
        title={altText || def?.label || stickerId}
        aria-label={altText || def?.label || stickerId}
      >
        {rendered}
      </button>

      {/* Preview overlay — 200x200 */}
      {showPreview && (
        <div
          onClick={closePreview}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer',
            animation: 'stickerFadeIn 0.15s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'stickerScaleIn 0.2s ease-out',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {renderSticker(packId, stickerId, 200)}
            <span
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                opacity: 0.9,
              }}
            >
              {def?.label || altText || stickerId}
            </span>
          </div>
        </div>
      )}

      {/* Animation keyframes (injected once) */}
      <style>{`
        @keyframes stickerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes stickerScaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
