import React, { useRef, useEffect, useState, useMemo } from 'react';
import { X } from 'lucide-react';

interface TabProps {
  id: string;
  title: string;
  favicon?: string | null;
  url?: string;
  isActive: boolean;
  isPinned: boolean;
  isLoading?: boolean;
  index?: number;
  tabCount?: number;
  containerWidth?: number;
  onSwitch: () => void;
  onClose: () => void;
}

// Edge-style tab color palette — each tab gets a unique tint
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

// Chrome-style tab width: fills available space, shrinks as tabs increase, min 60px
const MIN_TAB_WIDTH = 60;
const MAX_TAB_WIDTH = 280;
const PINNED_TAB_WIDTH = 52;
const NEW_TAB_BTN_WIDTH = 36;

function calcTabWidth(tabCount: number, pinnedCount: number, containerWidth: number): number {
  const unpinnedCount = tabCount - pinnedCount;
  if (unpinnedCount <= 0) return MAX_TAB_WIDTH;
  const availableWidth = containerWidth - (pinnedCount * PINNED_TAB_WIDTH) - NEW_TAB_BTN_WIDTH;
  const width = Math.floor(availableWidth / unpinnedCount);
  return Math.max(MIN_TAB_WIDTH, Math.min(MAX_TAB_WIDTH, width));
}

export function Tab({ id, title, favicon, url, isActive, isPinned, isLoading, index = 0, tabCount = 1, containerWidth = 800, onSwitch, onClose }: TabProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [previewPos, setPreviewPos] = useState<{ top: number; left: number } | null>(null);
  const tabRef = useRef<HTMLDivElement>(null);
  const color = useMemo(() => getTabColor(index), [index]);
  const dynamicWidth = useMemo(() => isPinned ? PINNED_TAB_WIDTH : calcTabWidth(tabCount, 0, containerWidth), [tabCount, containerWidth, isPinned]);
  const isCompact = dynamicWidth < 100;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => onClose(), 150);
  };

  // Smooth mount animation
  useEffect(() => {
    const el = tabRef.current;
    if (!el) return;
    el.style.width = '0px';
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.transition = 'width 250ms ease-out, opacity 200ms ease-out';
      el.style.width = `${dynamicWidth}px`;
      el.style.opacity = '1';
    });
  }, []);

  return (
    <div
      ref={tabRef}
      onClick={onSwitch}
      onMouseEnter={() => {
        setIsHovered(true);
        const timer = setTimeout(() => {
          if (tabRef.current) {
            const rect = tabRef.current.getBoundingClientRect();
            setPreviewPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
          }
          setShowPreview(true);
        }, 600);
        (tabRef.current as any).__hoverTimer = timer;
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowPreview(false);
        setPreviewPos(null);
        clearTimeout((tabRef.current as any)?.__hoverTimer);
      }}
      className={`
        group relative flex items-center h-[34px] cursor-pointer overflow-hidden
        transition-all duration-200 ease-out rounded-t-lg mx-[1px]
        ${isPinned ? 'justify-center px-1' : isCompact ? 'px-1.5 gap-1' : 'px-3 gap-2.5'}
        ${isClosing ? 'tab-closing' : ''}
      `}
      style={{
        width: `${dynamicWidth}px`,
        minWidth: isPinned ? `${PINNED_TAB_WIDTH}px` : `${MIN_TAB_WIDTH}px`,
        maxWidth: `${MAX_TAB_WIDTH}px`,
        background: isActive ? color.bg : isHovered ? 'var(--color-surface-2)' : 'transparent',
        borderTop: isActive ? `2px solid ${color.accent}` : '2px solid transparent',
        borderLeft: isActive ? `1px solid ${color.border}` : '1px solid transparent',
        borderRight: isActive ? `1px solid ${color.border}` : '1px solid transparent',
      }}
      role="tab"
      aria-selected={isActive}
      title={title}
    >
      {/* Separator between inactive tabs */}
      {!isActive && !isHovered && (
        <div className="absolute right-0 top-[8px] bottom-[8px] w-px bg-border-1/40" />
      )}

      {/* Favicon or loading spinner */}
      <div className="w-[16px] h-[16px] shrink-0 flex items-center justify-center">
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
      </div>

      {/* Title — hidden when tab is too compact */}
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

      {/* Close button — always visible normally, hover-only when compact */}
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

      {/* Tab preview tooltip — fixed position, centered below tab */}
      {showPreview && !isPinned && previewPos && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: previewPos.top,
            left: previewPos.left,
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
            <p className="text-[12px] font-medium text-text-primary leading-snug" style={{ wordBreak: 'break-word' }}>{title}</p>
            {url && url !== 'os-browser://newtab' && (
              <p className="text-[11px] text-text-muted mt-1 truncate">
                {url.length > 60 ? url.slice(0, 60) + '...' : url}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
