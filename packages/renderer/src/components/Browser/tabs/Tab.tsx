import React, { useRef, useEffect, useState, useMemo } from 'react';
import { X, Volume2, VolumeX, Zap } from 'lucide-react';
import { useTabsStore } from '@/store/tabs';
import { useTabDrag } from '@/hooks/useTabDrag';
import { TabPreview } from './TabPreview';

interface TabProps {
  id: string;
  title: string;
  favicon: string | null;
  url: string;
  isActive: boolean;
  isPinned: boolean;
  isLoading?: boolean;
  isAudioPlaying?: boolean;
  isMuted?: boolean;
  isSelected?: boolean;
  isSuspended?: boolean;
  lifecycleState?: 'active' | 'throttled' | 'frozen' | 'discarded';
  groupColor?: string | null;
  isNextToActive?: boolean;
  isPrevToActive?: boolean;
  index: number;
  tabCount: number;
  containerWidth: number;
  overrideWidth?: number | null;
  onSwitch: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

// Edge-style tab color palette -- each tab gets a unique tint
const TAB_COLORS = [
  { bg: 'rgba(212,160,23,0.10)', border: 'rgba(212,160,23,0.35)', accent: '#D4A017' },   // Gold
  { bg: 'rgba(0,107,63,0.10)', border: 'rgba(0,107,63,0.35)', accent: '#006B3F' },       // Green
  { bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.35)', accent: '#3B82F6' },   // Blue
  { bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.35)', accent: '#A855F7' },   // Purple
  { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.30)', accent: '#EF4444' },     // Red
  { bg: 'rgba(20,184,166,0.10)', border: 'rgba(20,184,166,0.35)', accent: '#14B8A6' },   // Teal
  { bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.35)', accent: '#F97316' },   // Orange
  { bg: 'rgba(236,72,153,0.10)', border: 'rgba(236,72,153,0.30)', accent: '#EC4899' },   // Pink
];

function getTabColor(index: number) {
  return TAB_COLORS[index % TAB_COLORS.length];
}

// Chrome-style tab width: fills available space, shrinks as tabs increase
const MIN_TAB_WIDTH = 60;
const MAX_TAB_WIDTH = 280;
const PINNED_TAB_WIDTH = 34;
const NEW_TAB_BTN_WIDTH = 36;

function calcTabWidth(tabCount: number, pinnedCount: number, containerWidth: number): number {
  const unpinnedCount = tabCount - pinnedCount;
  if (unpinnedCount <= 0) return MAX_TAB_WIDTH;
  const availableWidth = containerWidth - (pinnedCount * PINNED_TAB_WIDTH) - NEW_TAB_BTN_WIDTH;
  const width = Math.floor(availableWidth / unpinnedCount);
  return Math.max(MIN_TAB_WIDTH, Math.min(MAX_TAB_WIDTH, width));
}

export { TAB_COLORS, getTabColor, calcTabWidth, MIN_TAB_WIDTH, MAX_TAB_WIDTH, PINNED_TAB_WIDTH, NEW_TAB_BTN_WIDTH };

export function Tab({
  id,
  title,
  favicon,
  url,
  isActive,
  isPinned,
  isLoading,
  isAudioPlaying,
  isMuted,
  isSelected,
  isSuspended,
  lifecycleState,
  groupColor,
  isNextToActive,
  isPrevToActive,
  index,
  tabCount,
  containerWidth,
  overrideWidth,
  onSwitch,
  onClose,
  onContextMenu,
}: TabProps) {
  const muteTab = useTabsStore((s) => s.muteTab);
  const unmuteTab = useTabsStore((s) => s.unmuteTab);
  const { attributes: dragAttributes, listeners: dragListeners, setNodeRef: setDragRef, style: dragStyle, isDragging } = useTabDrag(id);

  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [previewPos, setPreviewPos] = useState<{ top: number; left: number } | null>(null);
  const tabRef = useRef<HTMLDivElement>(null);
  const color = useMemo(() => getTabColor(index), [index]);
  const dynamicWidth = useMemo(
    () => {
      if (overrideWidth && !isPinned) return overrideWidth;
      return isPinned ? PINNED_TAB_WIDTH : calcTabWidth(tabCount, 0, containerWidth);
    },
    [tabCount, containerWidth, isPinned, overrideWidth],
  );
  const isCompact = dynamicWidth < 100;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isClosing) return;
    setIsClosing(true);
    const el = tabRef.current;
    if (el) {
      el.style.transition = 'width 200ms ease-out, opacity 150ms ease-out, margin 200ms ease-out, padding 200ms ease-out';
      el.style.width = '0px';
      el.style.opacity = '0';
      el.style.paddingLeft = '0px';
      el.style.paddingRight = '0px';
      el.style.marginRight = '0px';
      el.style.overflow = 'hidden';
    }
    setTimeout(() => onClose(), 200);
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted) {
      unmuteTab(id);
    } else {
      muteTab(id);
    }
  };

  // Smooth mount animation
  useEffect(() => {
    const el = tabRef.current;
    if (!el) return;
    el.style.width = '0px';
    el.style.opacity = '0';
    el.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      el.style.transition = 'width 250ms ease-out, opacity 200ms ease-out';
      el.style.width = `${dynamicWidth}px`;
      el.style.opacity = '1';
      setTimeout(() => {
        if (el) el.style.overflow = '';
      }, 260);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show audio indicator between title and close button
  const showAudioIndicator = !isPinned && !isCompact && (isAudioPlaying || isMuted);

  // Merge refs: tabRef for internal logic + setDragRef for @dnd-kit sortable
  const mergedRef = (node: HTMLDivElement | null) => {
    (tabRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    setDragRef(node);
  };

  return (
    <div
      ref={mergedRef}
      onClick={onSwitch}
      onContextMenu={onContextMenu}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        const timer = setTimeout(() => {
          if (tabRef.current) {
            const rect = tabRef.current.getBoundingClientRect();
            setPreviewPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
          }
          setShowPreview(true);
        }, 400);
        (tabRef.current as any).__hoverTimer = timer;
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowPreview(false);
        setPreviewPos(null);
        clearTimeout((tabRef.current as any)?.__hoverTimer);
      }}
      {...dragAttributes}
      {...dragListeners}
      className={`
        group relative flex items-center h-[34px] cursor-pointer
        transition-all duration-200 ease-out
        ${isPinned ? 'justify-center px-1' : isCompact ? 'px-1.5 gap-1' : 'px-3 gap-2.5'}
        ${isClosing ? 'tab-closing' : ''}
        ${isSelected ? 'ring-1 ring-white/20 ring-inset' : ''}
        ${isDragging ? 'opacity-50' : ''}
      `}
      style={{
        ...dragStyle,
        width: `${dynamicWidth}px`,
        minWidth: isPinned ? `${PINNED_TAB_WIDTH}px` : `${MIN_TAB_WIDTH}px`,
        maxWidth: `${MAX_TAB_WIDTH}px`,
        background: isActive ? color.bg : isHovered ? 'var(--color-surface-2)' : 'transparent',
        borderTop: isActive ? `2px solid ${color.accent}` : '2px solid transparent',
        borderLeft: isActive ? `1px solid ${color.border}` : '1px solid transparent',
        borderRight: isActive ? `1px solid ${color.border}` : '1px solid transparent',
        borderBottom: isActive ? 'none' : groupColor ? `2px solid ${groupColor}` : '2px solid transparent',
        clipPath: isPinned ? 'none' : 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 100%, 0% 100%)',
        marginRight: isPinned ? undefined : '-16px',
        zIndex: isActive ? 3 : isHovered ? 2 : 1,
      }}
      role="tab"
      aria-selected={isActive}
      title={title}
      data-tab-id={id}
    >
      {/* Separator between inactive tabs — hide when adjacent to active or hovered */}
      {!isActive && !isHovered && !isNextToActive && !isPrevToActive && (
        <div className="absolute right-0 top-[8px] bottom-[8px] w-px bg-border-1/40" />
      )}

      {/* Active tab bottom cover — connects tab to content area */}
      {isActive && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: 'var(--color-bg)', zIndex: 4 }}
        />
      )}

      {/* Favicon or loading spinner */}
      <div className="relative w-[16px] h-[16px] shrink-0 flex items-center justify-center" style={{
        opacity: lifecycleState === 'discarded' ? 0.4
          : lifecycleState === 'frozen' ? 0.6
          : isSuspended ? 0.5
          : 1
      }}>
        {isLoading ? (
          <div
            className="w-[14px] h-[14px] border-[1.5px] border-t-transparent rounded-full animate-spin"
            style={{ borderColor: color.accent, borderTopColor: 'transparent' }}
          />
        ) : favicon ? (
          <img src={favicon} alt="" className="w-4 h-4 rounded-[3px] object-cover" />
        ) : (
          <div
            className="w-[14px] h-[14px] rounded-[3px] flex items-center justify-center text-[8px] font-bold text-white"
            style={{ background: color.accent }}
          >
            {title.charAt(0).toUpperCase()}
          </div>
        )}
        {lifecycleState === 'frozen' && (
          <div style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 10, height: 10, borderRadius: '50%',
            background: '#60A5FA',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '6px', lineHeight: 1,
          }}>
            ❄
          </div>
        )}
        {(lifecycleState === 'discarded' || (isSuspended && lifecycleState !== 'frozen')) && (
          <div style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 10, height: 10, borderRadius: '50%',
            background: '#3B82F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={6} fill="#fff" color="#fff" />
          </div>
        )}
      </div>

      {/* Title -- hidden when tab is too compact */}
      {!isPinned && !isCompact && (
        <div className="flex-1 min-w-0 relative overflow-hidden">
          <span
            className={`
              text-[12px] whitespace-nowrap block leading-tight
              ${isActive ? 'text-text-primary font-semibold' : 'text-text-secondary font-medium'}
            `}
          >
            {title}
          </span>
          {/* Gradient fade-out mask */}
          <div
            className="absolute top-0 right-0 h-full w-10 pointer-events-none"
            style={{
              background: isActive
                ? `linear-gradient(to left, ${color.bg}, transparent)`
                : isHovered
                  ? 'linear-gradient(to left, var(--color-surface-2), transparent)'
                  : 'linear-gradient(to left, var(--color-bg), transparent)',
            }}
          />
        </div>
      )}

      {/* Audio indicator */}
      {showAudioIndicator && (
        <button
          onClick={handleMuteToggle}
          className="w-[18px] h-[18px] flex items-center justify-center rounded shrink-0 hover:bg-white/10 transition-colors duration-100"
          aria-label={isMuted ? `Unmute ${title}` : `Mute ${title}`}
          title={isMuted ? 'Unmute tab' : 'Mute tab'}
        >
          {isMuted ? (
            <VolumeX size={14} className="text-text-muted" />
          ) : (
            <Volume2 size={14} className="text-text-secondary" />
          )}
        </button>
      )}

      {/* Close button -- always visible normally, hover-only when compact */}
      {!isPinned && (
        <button
          onClick={handleClose}
          className={`
            w-[20px] h-[20px] flex items-center justify-center rounded shrink-0
            transition-all duration-100
            hover:bg-[rgba(255,255,255,0.1)] active:bg-[rgba(255,255,255,0.15)]
            focus:outline-none
            ${isCompact
              ? (isHovered ? 'opacity-80' : 'opacity-0 w-0 overflow-hidden')
              : (isHovered || isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0')
            }
          `}
          aria-label={`Close ${title}`}
          tabIndex={isHovered || isActive ? 0 : -1}
        >
          <X size={11} className="text-text-muted" />
        </button>
      )}

      {/* Tab preview tooltip -- fixed position, centered below tab */}
      {showPreview && !isPinned && previewPos && (
        <TabPreview
          tab={{ title, url, favicon_path: favicon }}
          position={previewPos}
        />
      )}
    </div>
  );
}
