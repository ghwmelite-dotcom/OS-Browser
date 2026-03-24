import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { STICKER_PACKS } from './stickerRegistry';
import type { StickerDef } from './stickerRegistry';
import { GhanaExpressionSticker } from './GhanaExpressions';
import { AdinkraVibeSticker } from './AdinkraVibes';
import { GhanaLifeSticker } from './GhanaLife';

/* ─────────── Sticker Picker Panel ─────────── */
/* Slide-up panel with 3 pack tabs at top, 5-column grid.
   Tap a sticker to send immediately. */

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSticker: (packId: string, stickerId: string, altText: string) => void;
}

function renderStickerThumb(packId: string, stickerId: string, size: number) {
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

export function StickerPicker({ isOpen, onClose, onSendSticker }: StickerPickerProps) {
  const [activePackId, setActivePackId] = useState(STICKER_PACKS[0].id);
  const gridRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activePack = STICKER_PACKS.find(p => p.id === activePackId) ?? STICKER_PACKS[0];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Delay to avoid closing immediately from the toggle click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, onClose]);

  // Reset scroll when switching packs
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = 0;
    }
  }, [activePackId]);

  const handleStickerClick = useCallback(
    (sticker: StickerDef) => {
      onSendSticker(sticker.packId, sticker.id, sticker.altText);
      onClose();
    },
    [onSendSticker, onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        maxHeight: 340,
        background: 'var(--color-surface-1)',
        borderTop: '1px solid var(--color-border-1)',
        borderRadius: '14px 14px 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'stickerPickerSlideUp 0.2s ease-out',
        zIndex: 50,
      }}
    >
      {/* Header with tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--color-border-1)',
          padding: '0 4px',
          flexShrink: 0,
        }}
      >
        {STICKER_PACKS.map(pack => (
          <button
            key={pack.id}
            onClick={() => setActivePackId(pack.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '10px 6px',
              background: 'none',
              border: 'none',
              borderBottom: pack.id === activePackId
                ? '2px solid #D4A017'
                : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              opacity: pack.id === activePackId ? 1 : 0.55,
            }}
            title={pack.name}
          >
            <span style={{ fontSize: 16 }}>{pack.icon}</span>
            <span
              style={{
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                fontSize: 10.5,
                fontWeight: pack.id === activePackId ? 700 : 500,
                color: pack.id === activePackId
                  ? '#D4A017'
                  : 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {pack.name}
            </span>
          </button>
        ))}

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            padding: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}
          title="Close sticker picker"
          aria-label="Close sticker picker"
        >
          <X size={14} />
        </button>
      </div>

      {/* Sticker grid — 5 columns */}
      <div
        ref={gridRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 6,
          alignContent: 'start',
        }}
      >
        {activePack.stickers.map(sticker => (
          <button
            key={sticker.id}
            onClick={() => handleStickerClick(sticker)}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              borderRadius: 10,
              transition: 'background 0.12s ease, transform 0.12s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = 'var(--color-surface-2)';
              el.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = 'none';
              el.style.transform = 'scale(1)';
            }}
            title={sticker.label}
            aria-label={sticker.altText}
          >
            {renderStickerThumb(sticker.packId, sticker.id, 56)}
          </button>
        ))}
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes stickerPickerSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
