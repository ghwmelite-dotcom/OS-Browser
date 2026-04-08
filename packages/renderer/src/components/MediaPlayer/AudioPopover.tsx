import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ArrowLeft, Tv } from 'lucide-react';
import { useMediaPlayerStore } from '@/store/media-player';
import { useTabsStore } from '@/store/tabs';

interface AudioPopoverProps {
  anchorEl: HTMLElement;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioPopover({ anchorEl }: AudioPopoverProps) {
  const mediaInfo = useMediaPlayerStore((s) => s.mediaInfo);
  const progress = useMediaPlayerStore((s) => s.progress);
  const pipActive = useMediaPlayerStore((s) => s.pipActive);
  const switchTab = useTabsStore((s) => s.switchTab);
  const tabs = useTabsStore((s) => s.tabs);

  if (!mediaInfo) return null;

  const rect = anchorEl.getBoundingClientRect();
  const mediaTab = tabs.find((t) => t.id === mediaInfo.tabId);
  const isPlaying = mediaTab?.is_audio_playing;
  const isMuted = mediaTab?.is_muted;
  const progressPercent = progress && progress.duration > 0
    ? (progress.currentTime / progress.duration) * 100
    : 0;

  const handlePlayPause = () => window.osBrowser?.media?.playPause(mediaInfo.tabId);
  const handleSkipForward = () => window.osBrowser?.media?.skipForward(mediaInfo.tabId);
  const handleSkipBackward = () => window.osBrowser?.media?.skipBackward(mediaInfo.tabId);
  const handleMuteToggle = () => {
    if (isMuted) {
      window.osBrowser?.tabs?.unmute(mediaInfo.tabId);
    } else {
      window.osBrowser?.tabs?.mute(mediaInfo.tabId);
    }
  };
  const handleBackToTab = () => {
    switchTab(mediaInfo.tabId);
    useMediaPlayerStore.getState().setPopoverOpen(false);
  };
  const handleBackToVideo = () => {
    window.osBrowser?.media?.reEnterPiP?.(mediaInfo.tabId);
  };

  return (
    <div
      data-media-popover
      className="fixed z-[200] rounded-xl border shadow-2xl"
      style={{
        left: rect.right + 8,
        bottom: window.innerHeight - rect.bottom,
        width: 280,
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
      }}
    >
      {/* Track info */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {mediaInfo.favicon ? (
          <img src={mediaInfo.favicon} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-sm font-bold text-text-muted shrink-0">
            {(mediaInfo.title || 'M').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text-primary truncate leading-tight">
            {mediaInfo.title || 'Unknown'}
          </p>
          {mediaInfo.artist ? (
            <p className="text-[11px] text-text-muted truncate">{mediaInfo.artist}</p>
          ) : (
            <p className="text-[11px] text-text-muted truncate">{mediaInfo.domain}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-1">
        <div className="relative w-full h-[3px] rounded-full" style={{ background: 'var(--color-border-1)' }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%`, background: '#D4A017' }}
          />
        </div>
        {progress && progress.duration > 0 && (
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-text-muted">{formatTime(progress.currentTime)}</span>
            <span className="text-[10px] text-text-muted">{formatTime(progress.duration)}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-2">
        <button
          onClick={handleSkipBackward}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          title="Rewind 15s"
        >
          <SkipBack size={16} className="text-text-secondary" />
        </button>
        <button
          onClick={handlePlayPause}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          style={{ background: 'rgba(212,160,23,0.15)' }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={20} className="text-text-primary" fill="currentColor" />
          ) : (
            <Play size={20} className="text-text-primary" fill="currentColor" />
          )}
        </button>
        <button
          onClick={handleSkipForward}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          title="Skip forward 15s"
        >
          <SkipForward size={16} className="text-text-secondary" />
        </button>
      </div>

      {/* Secondary row */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <button
          onClick={handleMuteToggle}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX size={14} className="text-text-muted" />
          ) : (
            <Volume2 size={14} className="text-text-secondary" />
          )}
        </button>

        <div className="flex items-center gap-2">
          {mediaInfo.hasVideo && !pipActive && (
            <button
              onClick={handleBackToVideo}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium text-text-secondary hover:bg-white/10 transition-colors"
              title="Re-open picture-in-picture"
            >
              <Tv size={12} />
              Back to Video
            </button>
          )}

          <button
            onClick={handleBackToTab}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium text-text-secondary hover:bg-white/10 transition-colors"
            title="Switch to media tab"
          >
            <ArrowLeft size={12} />
            Back to Tab
          </button>
        </div>
      </div>
    </div>
  );
}
