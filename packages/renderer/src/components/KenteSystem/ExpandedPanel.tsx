import React, { useRef, useEffect, useState } from 'react';
import { PanelLeftClose } from 'lucide-react';
import type { FeatureDefinition } from '@/features/registry';

interface ExpandedPanelProps {
  feature: FeatureDefinition;
  width: number;
  onClose: () => void;
}

/**
 * ExpandedPanel — slides open to the right of the IconRail.
 *
 * Header: 36px — colored dot + feature name + close button.
 * Content: scrollable area rendering the feature's panelComponent.
 * Animation: slide-in from left, 250ms ease-out.
 */
export function ExpandedPanel({ feature, width, onClose }: ExpandedPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [isResizing, setIsResizing] = useState(false);

  // Trigger slide-in animation on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setVisible(true);
    });
  }, []);

  // Update width when feature changes
  useEffect(() => {
    setCurrentWidth(width);
  }, [width]);

  // Drag-to-resize handler
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = currentWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(320, Math.min(startWidth + delta, window.innerWidth - 100));
      setCurrentWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const PanelContent = feature.surfaces.sidebar?.panelComponent;

  return (
    <div
      ref={panelRef}
      style={{
        width: currentWidth,
        minWidth: 320,
        maxWidth: 'min(900px, calc(100vw - 48px))',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface-1)',
        borderRight: '1px solid var(--color-border-1)',
        height: '100%',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        // Slide-in animation
        transform: visible ? 'translateX(0)' : 'translateX(-100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 250ms ease-out, opacity 200ms ease-out',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: '1px solid var(--color-border-1)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {/* Colored dot — feature's stripColor */}
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: feature.stripColor,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {feature.name}
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 4,
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            transition: 'background 150ms ease, color 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-2)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      {/* Panel Content */}
      <div
        className="kente-panel-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          wordBreak: 'break-word',
        }}
      >
        {PanelContent ? (
          <PanelContent
            width={currentWidth}
            stripColor={feature.stripColor}
            onClose={onClose}
          />
        ) : (
          <div
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 12,
              textAlign: 'center',
              paddingTop: 24,
            }}
          >
            No panel content available for {feature.name}.
          </div>
        )}
      </div>

      {/* Resize handle — right edge */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: 'col-resize',
          background: isResizing ? 'var(--color-border-1)' : 'transparent',
          transition: 'background 150ms ease',
          zIndex: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-border-1)'; }}
        onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = 'transparent'; }}
      />

      <style>{`
        .kente-panel-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .kente-panel-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .kente-panel-scroll::-webkit-scrollbar-thumb {
          background: var(--color-border-2);
          border-radius: 3px;
        }
        .kente-panel-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}

export default ExpandedPanel;
