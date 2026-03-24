import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTabDrag } from '@/hooks/useTabDrag';

interface PinnedTabProps {
  id: string;
  favicon: string | null;
  title: string;
  isActive: boolean;
  isLoading?: boolean;
  isAudioPlaying?: boolean;
  isMuted?: boolean;
  accentColor: string;
  onSwitch: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const PINNED_TAB_WIDTH = 34;

export function PinnedTab({
  id,
  favicon,
  title,
  isActive,
  isLoading,
  isAudioPlaying,
  isMuted,
  accentColor,
  onSwitch,
  onContextMenu,
}: PinnedTabProps) {
  const { attributes: dragAttributes, listeners: dragListeners, setNodeRef: setDragRef, style: dragStyle, isDragging } = useTabDrag(id);
  const [isHovered, setIsHovered] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);

  // Mount animation
  useEffect(() => {
    const el = tabRef.current;
    if (!el) return;
    el.style.width = '0px';
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.transition = 'width 250ms ease-out, opacity 200ms ease-out';
      el.style.width = `${PINNED_TAB_WIDTH}px`;
      el.style.opacity = '1';
    });
  }, []);

  const bgActive = accentColor
    ? `${accentColor}1a`
    : 'var(--color-surface-1)';
  const borderActive = accentColor
    ? `${accentColor}59`
    : 'var(--color-border-1)';

  // Merge refs: tabRef for animation + setDragRef for @dnd-kit sortable
  const mergedRef = (node: HTMLDivElement | null) => {
    (tabRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    setDragRef(node);
  };

  return (
    <div
      ref={mergedRef}
      onClick={onSwitch}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...dragAttributes}
      {...dragListeners}
      className={`group relative flex items-center justify-center h-[34px] cursor-pointer overflow-hidden rounded-t-lg mx-[1px] ${isDragging ? 'border-dashed border border-white/20' : ''}`}
      style={{
        ...dragStyle,
        width: `${PINNED_TAB_WIDTH}px`,
        minWidth: `${PINNED_TAB_WIDTH}px`,
        background: isActive
          ? bgActive
          : isHovered
            ? 'var(--color-surface-2)'
            : 'transparent',
        borderTop: isActive
          ? `2px solid ${accentColor}`
          : '2px solid transparent',
        borderLeft: isActive
          ? `1px solid ${borderActive}`
          : '1px solid transparent',
        borderRight: isActive
          ? `1px solid ${borderActive}`
          : '1px solid transparent',
      }}
      role="tab"
      aria-selected={isActive}
      title={title}
      data-tab-id={id}
    >
      {/* Separator */}
      {!isActive && !isHovered && (
        <div className="absolute right-0 top-[8px] bottom-[8px] w-px bg-border-1/40" />
      )}

      {/* Favicon / spinner */}
      <div className="relative w-[16px] h-[16px] shrink-0 flex items-center justify-center">
        {isLoading ? (
          <div
            className="w-[14px] h-[14px] border-[1.5px] border-t-transparent rounded-full animate-spin"
            style={{ borderColor: accentColor, borderTopColor: 'transparent' }}
          />
        ) : favicon ? (
          <img src={favicon} alt="" className="w-4 h-4 rounded-[3px] object-cover" />
        ) : (
          <div
            className="w-[14px] h-[14px] rounded-[3px] flex items-center justify-center text-[8px] font-bold text-white"
            style={{ background: accentColor }}
          >
            {title.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Audio overlay */}
        {!isLoading && (isAudioPlaying || isMuted) && (
          <div className="absolute -bottom-1 -right-1 w-[12px] h-[12px] rounded-full flex items-center justify-center bg-surface-1 border border-border-1">
            {isMuted ? (
              <VolumeX size={8} className="text-text-muted" />
            ) : (
              <Volume2 size={8} className="text-text-secondary" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
