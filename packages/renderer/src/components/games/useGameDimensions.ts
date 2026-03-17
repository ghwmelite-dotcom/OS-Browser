import { useState, useEffect, RefObject } from 'react';

/**
 * Custom hook for responsive canvas/game sizing.
 * Uses ResizeObserver to track the container and returns dimensions
 * that fit within it while maintaining the given aspect ratio.
 * Handles DPI scaling via window.devicePixelRatio.
 */
export function useGameDimensions(
  containerRef: RefObject<HTMLDivElement | null>,
  aspectRatio?: number,
): { width: number; height: number } {
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Available CSS pixels (integer)
      let w = Math.floor(rect.width);
      let h = Math.floor(rect.height);

      if (aspectRatio && aspectRatio > 0) {
        // Fit within container while maintaining aspect ratio
        const containerRatio = w / h;
        if (containerRatio > aspectRatio) {
          // Container is wider — constrain by height
          w = Math.floor(h * aspectRatio);
        } else {
          // Container is taller — constrain by width
          h = Math.floor(w / aspectRatio);
        }
      }

      // Round to even numbers for clean rendering
      w = Math.floor(w / 2) * 2;
      h = Math.floor(h / 2) * 2;

      setDims({ width: w, height: h });
    };

    const observer = new ResizeObserver(update);
    observer.observe(el);

    // Initial measure
    update();

    return () => observer.disconnect();
  }, [containerRef, aspectRatio]);

  return dims;
}
