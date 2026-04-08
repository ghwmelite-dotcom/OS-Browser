import React from 'react';
import { DragOverlay } from '@dnd-kit/core';

interface TabDragOverlayProps {
  activeTab: { id: string; title: string; favicon: string | null } | null;
  accentColor: string;
  isDetaching?: boolean;
}

export function TabDragOverlay({ activeTab, accentColor, isDetaching }: TabDragOverlayProps) {
  if (!activeTab) return null;

  return (
    <DragOverlay dropAnimation={null}>
      <div
        className="flex items-center gap-2 h-[34px] rounded-lg px-3 border"
        style={{
          width: 200,
          background: 'var(--color-surface-1)',
          opacity: 0.9,
          borderColor: accentColor,
          boxShadow: isDetaching ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 24px -4px rgba(0, 0, 0, 0.3)',
          transform: isDetaching ? 'scale(1.05)' : undefined,
          transition: 'transform 150ms ease-out, box-shadow 150ms ease-out',
        }}
      >
        {/* Favicon */}
        <div className="w-[16px] h-[16px] shrink-0 flex items-center justify-center">
          {activeTab.favicon ? (
            <img src={activeTab.favicon} alt="" className="w-4 h-4 rounded-[3px] object-cover" />
          ) : (
            <div
              className="w-[14px] h-[14px] rounded-[3px] flex items-center justify-center text-[8px] font-bold text-white"
              style={{ background: accentColor }}
            >
              {activeTab.title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Title */}
        <span className="text-[12px] text-text-primary font-medium truncate flex-1 min-w-0">
          {activeTab.title}
        </span>
      </div>
    </DragOverlay>
  );
}
