import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface TabProps {
  id: string;
  title: string;
  favicon?: string | null;
  isActive: boolean;
  isPinned: boolean;
  isLoading?: boolean;
  onSwitch: () => void;
  onClose: () => void;
}

export function Tab({ id, title, favicon, isActive, isPinned, isLoading, onSwitch, onClose }: TabProps) {
  const [isHovered, setIsHovered] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);

  // Smooth mount animation
  useEffect(() => {
    const el = tabRef.current;
    if (!el) return;
    el.style.maxWidth = '0px';
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.transition = 'max-width 200ms ease-out, opacity 150ms ease-out';
      el.style.maxWidth = isPinned ? '48px' : '240px';
      el.style.opacity = '1';
    });
  }, []);

  return (
    <div
      ref={tabRef}
      onClick={onSwitch}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative flex items-center h-full cursor-pointer overflow-hidden
        transition-all duration-150 ease-out
        ${isPinned ? 'w-12 justify-center px-1' : 'min-w-[120px] flex-1 px-3'}
        ${isActive
          ? 'bg-surface-1 z-10'
          : 'bg-transparent hover:bg-surface-2/40'
        }
      `}
      style={{
        maxWidth: isPinned ? '48px' : '240px',
      }}
      role="tab"
      aria-selected={isActive}
      title={title}
    >
      {/* Gold accent line at top of active tab */}
      {isActive && (
        <div
          className="absolute top-0 left-2 right-2 h-[1.5px] rounded-full bg-ghana-gold"
          style={{ opacity: 1 }}
        />
      )}

      {/* Left curved separator */}
      {isActive && (
        <>
          <div className="absolute -left-2 bottom-0 w-2 h-2 z-20">
            <svg width="8" height="8" viewBox="0 0 8 8" className="text-surface-1">
              <path d="M8 8 A8 8 0 0 0 0 0 L8 0 Z" fill="transparent" />
              <path d="M8 8 A8 8 0 0 0 0 0 L0 8 Z" fill="currentColor" />
            </svg>
          </div>
          <div className="absolute -right-2 bottom-0 w-2 h-2 z-20">
            <svg width="8" height="8" viewBox="0 0 8 8" className="text-surface-1">
              <path d="M0 8 A8 8 0 0 1 8 0 L0 0 Z" fill="transparent" />
              <path d="M0 8 A8 8 0 0 1 8 0 L8 8 Z" fill="currentColor" />
            </svg>
          </div>
        </>
      )}

      {/* Separator line between inactive tabs */}
      {!isActive && (
        <div className="absolute right-0 top-[6px] bottom-[6px] w-px bg-border-1 opacity-50" />
      )}

      {/* Favicon or loading spinner */}
      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
        {isLoading ? (
          <div className="w-3.5 h-3.5 border-[1.5px] border-ghana-gold border-t-transparent rounded-full animate-spin" />
        ) : favicon ? (
          <img src={favicon} alt="" className="w-4 h-4 rounded-[2px] object-cover" />
        ) : (
          <div className="w-3.5 h-3.5 rounded-[2px] bg-border-2/60" />
        )}
      </div>

      {/* Title with gradient fade-out */}
      {!isPinned && (
        <div className="flex-1 min-w-0 ml-2 relative overflow-hidden">
          <span
            className={`
              text-xs whitespace-nowrap block
              ${isActive ? 'text-text-primary font-medium' : 'text-text-secondary'}
            `}
          >
            {title}
          </span>
          {/* Gradient fade-out mask */}
          <div
            className={`
              absolute top-0 right-0 h-full w-8 pointer-events-none
              ${isActive
                ? 'bg-gradient-to-l from-surface-1 to-transparent'
                : isHovered
                  ? 'bg-gradient-to-l from-surface-2/40 to-transparent'
                  : 'bg-gradient-to-l from-bg to-transparent'
              }
            `}
          />
        </div>
      )}

      {/* Close button — fades in on hover */}
      {!isPinned && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={`
            w-[18px] h-[18px] flex items-center justify-center rounded-full shrink-0 ml-1
            transition-all duration-150 ease-out
            hover:bg-border-1 active:bg-border-2
            focus:outline-none focus:ring-1 focus:ring-ghana-gold/50
            ${isHovered || isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0'}
          `}
          aria-label={`Close ${title}`}
          tabIndex={isHovered || isActive ? 0 : -1}
        >
          <X size={10} className="text-text-muted" />
        </button>
      )}
    </div>
  );
}
