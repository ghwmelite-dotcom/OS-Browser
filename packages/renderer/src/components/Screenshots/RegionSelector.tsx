import React, { useState, useCallback, useEffect, useRef } from 'react';

interface RegionSelectorProps {
  onSelect: (rect: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
}

export function RegionSelector({ onSelect, onCancel }: RegionSelectorProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [current, setCurrent] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate the selection rectangle
  const rect = {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDrawing(true);
    setStart({ x: e.clientX, y: e.clientY });
    setCurrent({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDrawing) {
      setCurrent({ x: e.clientX, y: e.clientY });
    }
  }, [isDrawing]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && rect.width > 10 && rect.height > 10) {
      // Need to translate screen coordinates to the tab content area
      // The tab content starts below the browser chrome (title bar + tab bar + nav bar + bookmarks bar)
      // We pass raw screen coordinates — the main process will handle the offset
      onSelect(rect);
    }
    setIsDrawing(false);
  }, [isDrawing, rect, onSelect]);

  // Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        cursor: 'crosshair',
        // Dim the entire screen
        background: isDrawing ? 'transparent' : 'rgba(0,0,0,0.4)',
      }}
    >
      {/* Dim overlay with cutout for selected region */}
      {isDrawing && rect.width > 0 && rect.height > 0 && (
        <>
          {/* Dark overlay with CSS clip-path cutout */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            clipPath: `polygon(
              0% 0%, 0% 100%,
              ${rect.x}px 100%, ${rect.x}px ${rect.y}px,
              ${rect.x + rect.width}px ${rect.y}px, ${rect.x + rect.width}px ${rect.y + rect.height}px,
              ${rect.x}px ${rect.y + rect.height}px, ${rect.x}px 100%,
              100% 100%, 100% 0%
            )`,
          }} />

          {/* Selection border */}
          <div style={{
            position: 'absolute',
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            border: '2px solid #D4A017',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 0 12px rgba(212,160,23,0.3)',
            pointerEvents: 'none',
          }} />

          {/* Dimension label */}
          <div style={{
            position: 'absolute',
            left: rect.x + rect.width / 2,
            top: rect.y + rect.height + 8,
            transform: 'translateX(-50%)',
            background: '#D4A017',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {Math.round(rect.width)} x {Math.round(rect.height)}
          </div>
        </>
      )}

      {/* Instruction text when not drawing */}
      {!isDrawing && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#fff',
          fontSize: 16,
          fontWeight: 500,
          textAlign: 'center',
          pointerEvents: 'none',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>+</div>
          Drag to select a region
          <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>Press Escape to cancel</div>
        </div>
      )}
    </div>
  );
}
