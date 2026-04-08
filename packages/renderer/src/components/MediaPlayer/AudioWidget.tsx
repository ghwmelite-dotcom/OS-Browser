import React, { useEffect, useRef, useState } from 'react';
import { useMediaPlayerStore, initMediaPlayerListeners } from '@/store/media-player';
import { AudioPopover } from './AudioPopover';

export function AudioWidget() {
  const mediaInfo = useMediaPlayerStore((s) => s.mediaInfo);
  const isPopoverOpen = useMediaPlayerStore((s) => s.isPopoverOpen);
  const togglePopover = useMediaPlayerStore((s) => s.togglePopover);
  const setPopoverOpen = useMediaPlayerStore((s) => s.setPopoverOpen);
  const widgetRef = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const cleanups = initMediaPlayerListeners();
    return () => cleanups.forEach((c) => c());
  }, []);

  useEffect(() => {
    if (mediaInfo) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      setPopoverOpen(false);
    }
  }, [mediaInfo, setPopoverOpen]);

  useEffect(() => {
    if (!isPopoverOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-media-popover]') && !target.closest('[data-media-widget]')) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isPopoverOpen, setPopoverOpen]);

  if (!mediaInfo) return null;

  return (
    <>
      <button
        ref={widgetRef}
        data-media-widget
        onClick={togglePopover}
        className="relative flex items-center justify-center rounded-lg transition-all duration-200 ease-out hover:bg-white/10"
        style={{
          width: 40,
          height: 40,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 200ms ease-out, transform 200ms ease-out, background 150ms',
        }}
        title={mediaInfo.title || 'Media playing'}
        aria-label="Media player controls"
      >
        {mediaInfo.favicon ? (
          <img src={mediaInfo.favicon} alt="" className="w-4 h-4 rounded-[3px] object-cover" />
        ) : (
          <div
            className="w-4 h-4 rounded-[3px] flex items-center justify-center text-[8px] font-bold text-white"
            style={{ background: '#D4A017' }}
          >
            {(mediaInfo.title || 'M').charAt(0).toUpperCase()}
          </div>
        )}

        <div className="absolute bottom-[2px] right-[2px] flex items-end gap-[1px]">
          <span className="media-bar" style={{ animationDelay: '0ms' }} />
          <span className="media-bar" style={{ animationDelay: '150ms' }} />
          <span className="media-bar" style={{ animationDelay: '300ms' }} />
        </div>

        <style>{`
          @keyframes media-bar-bounce {
            0%, 100% { height: 3px; }
            50% { height: 8px; }
          }
          .media-bar {
            width: 2px;
            height: 3px;
            background: #D4A017;
            border-radius: 1px;
            animation: media-bar-bounce 0.8s ease-in-out infinite;
          }
        `}</style>
      </button>

      {isPopoverOpen && widgetRef.current && (
        <AudioPopover anchorEl={widgetRef.current} />
      )}
    </>
  );
}
