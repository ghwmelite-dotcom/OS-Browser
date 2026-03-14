import React from 'react';
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
  return (
    <div
      onClick={onSwitch}
      className={`
        group relative flex items-center gap-2 h-[36px] cursor-pointer border-r border-border-1 transition-colors
        ${isPinned ? 'w-10 justify-center px-1' : 'min-w-[120px] max-w-[200px] px-3'}
        ${isActive ? 'bg-surface-2 border-t-2 border-t-ghana-gold' : 'bg-surface-1 border-t-2 border-t-transparent hover:bg-surface-2/50'}
      `}
      role="tab"
      aria-selected={isActive}
      title={title}
    >
      {/* Favicon or loading spinner */}
      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
        {isLoading ? (
          <div className="w-3 h-3 border-2 border-ghana-gold border-t-transparent rounded-full animate-spin" />
        ) : favicon ? (
          <img src={favicon} alt="" className="w-4 h-4 rounded-sm" />
        ) : (
          <div className="w-3 h-3 rounded-sm bg-border-2" />
        )}
      </div>

      {/* Title (hidden for pinned tabs) */}
      {!isPinned && (
        <span className="text-xs truncate flex-1 text-text-primary">
          {title}
        </span>
      )}

      {/* Close button */}
      {!isPinned && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 focus:outline-none focus:opacity-100 focus:ring-1 focus:ring-ghana-gold"
          aria-label={`Close ${title}`}
        >
          <X size={12} className="text-text-muted" />
        </button>
      )}
    </div>
  );
}
