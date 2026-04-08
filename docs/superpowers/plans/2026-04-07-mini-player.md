# Arc-Style Mini Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic picture-in-picture video pop-out on tab switch, a sidebar audio controller at the bottom of the Kente icon rail, and a PiP-to-audio fallback that keeps audio alive when the PiP window is dismissed.

**Architecture:** A main-process `MediaSessionManager` service handles PiP state tracking, auto-PiP triggering, metadata extraction, and progress polling. The renderer gets a new Zustand store (`media-player.ts`) and two new components (`AudioWidget.tsx`, `AudioPopover.tsx`) mounted at the bottom of the existing `IconRail`. IPC channels carry metadata and progress between processes.

**Tech Stack:** Electron (WebContentsView, executeJavaScript), React 18, Zustand, TypeScript, Tailwind CSS, Lucide React icons

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `packages/main/src/services/MediaSessionManager.ts` | PiP state tracking, auto-PiP logic, metadata extraction, progress polling |
| `packages/renderer/src/store/media-player.ts` | Zustand store for media state (activeMediaTabId, mediaInfo, isPlaying, progress) |
| `packages/renderer/src/components/MediaPlayer/AudioWidget.tsx` | Icon rail widget (40x40, favicon + animated bars) |
| `packages/renderer/src/components/MediaPlayer/AudioPopover.tsx` | Expanded popover (280px, controls + track info + progress) |

### Modified Files

| File | Changes |
|------|---------|
| `packages/shared/src/ipc-channels.ts` | New IPC channel constants for media |
| `packages/preload/src/index.ts` | New `media` bridge object with control methods and event listeners |
| `packages/main/src/ipc/tabs.ts` | Auto-PiP in TAB_SWITCH, metadata extraction in media events, media control handlers, progress polling |
| `packages/main/src/tabs/TabManager.ts` | Extended mediaInfo storage alongside audioPlaying map |
| `packages/renderer/src/components/KenteSystem/IconRail.tsx` | Mount AudioWidget between feature icons and settings gear |

---

## Task 1: IPC Channels & Preload Bridge

**Files:**
- Modify: `packages/shared/src/ipc-channels.ts`
- Modify: `packages/preload/src/index.ts`

- [ ] **Step 1: Add media IPC channel constants**

In `packages/shared/src/ipc-channels.ts`, add after the `GROUP_DELETE` line (line 30):

```ts
  MEDIA_PLAY_PAUSE: 'media:play-pause',
  MEDIA_SKIP_FORWARD: 'media:skip-forward',
  MEDIA_SKIP_BACKWARD: 'media:skip-backward',
  MEDIA_GET_STATE: 'media:get-state',
  MEDIA_START_PROGRESS: 'media:start-progress',
  MEDIA_STOP_PROGRESS: 'media:stop-progress',
```

- [ ] **Step 2: Add media preload bridge**

In `packages/preload/src/index.ts`, after the `memorySaver` object closing brace, add a new `media` object:

```ts
  media: {
    playPause: (tabId: string) => ipcRenderer.invoke(IPC.MEDIA_PLAY_PAUSE, tabId),
    skipForward: (tabId: string) => ipcRenderer.invoke(IPC.MEDIA_SKIP_FORWARD, tabId),
    skipBackward: (tabId: string) => ipcRenderer.invoke(IPC.MEDIA_SKIP_BACKWARD, tabId),
    getState: () => ipcRenderer.invoke(IPC.MEDIA_GET_STATE),
    startProgress: (tabId: string) => ipcRenderer.invoke(IPC.MEDIA_START_PROGRESS, tabId),
    stopProgress: () => ipcRenderer.invoke(IPC.MEDIA_STOP_PROGRESS),
    onMetadataUpdated: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('media:metadata-updated', listener);
      return () => ipcRenderer.removeListener('media:metadata-updated', listener);
    },
    onProgressUpdated: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('media:progress-updated', listener);
      return () => ipcRenderer.removeListener('media:progress-updated', listener);
    },
    onPipStateChanged: (callback: (data: any) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('media:pip-state-changed', listener);
      return () => ipcRenderer.removeListener('media:pip-state-changed', listener);
    },
  },
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/ipc-channels.ts packages/preload/src/index.ts
git commit -m "feat: media IPC channels and preload bridge for Mini Player"
```

---

## Task 2: MediaSessionManager — Core Service

**Files:**
- Create: `packages/main/src/services/MediaSessionManager.ts`

- [ ] **Step 1: Create the MediaSessionManager service**

```ts
// packages/main/src/services/MediaSessionManager.ts

import { BrowserWindow } from 'electron';
import { getTabView } from '../tabs/TabWebContents';

// ── Types ─────────────────────────────────────────────────────
export interface MediaInfo {
  tabId: string;
  title: string;
  artist: string;
  artwork: string | null;
  favicon: string | null;
  domain: string;
  hasVideo: boolean;
}

export interface MediaProgress {
  currentTime: number;
  duration: number;
}

// ── State ─────────────────────────────────────────────────────
let mainWindowRef: BrowserWindow | null = null;
let pipSourceTabId: string | null = null;
let pipDismissIntent: 'return' | 'dismiss' = 'dismiss';
let activeMediaTabId: string | null = null;
let currentMediaInfo: MediaInfo | null = null;
let progressInterval: NodeJS.Timeout | null = null;

// ── Init ──────────────────────────────────────────────────────
export function initMediaSession(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;
}

// ── Auto-PiP ─────────────────────────────────────────────────
export async function tryAutoPiP(outgoingTabId: string, isMuted: boolean): Promise<void> {
  if (!mainWindowRef || isMuted) return;

  const view = getTabView(outgoingTabId);
  if (!view || view.webContents.isDestroyed()) return;

  try {
    const result = await view.webContents.executeJavaScript(`
      (() => {
        const video = document.querySelector('video');
        if (!video || video.paused || video.ended || video.duration === 0) return { hasVideo: false };
        if (document.pictureInPictureElement) return { hasVideo: true, alreadyPiP: true };
        return { hasVideo: true, alreadyPiP: false };
      })()
    `);

    if (!result.hasVideo) return;
    if (result.alreadyPiP) {
      pipSourceTabId = outgoingTabId;
      return;
    }

    // Enter PiP
    await view.webContents.executeJavaScript(`
      (async () => {
        const video = document.querySelector('video');
        if (video && !video.paused) {
          await video.requestPictureInPicture();

          // Inject Media Session handlers for enhanced PiP controls
          if ('mediaSession' in navigator) {
            try {
              navigator.mediaSession.setActionHandler('seekbackward', () => { video.currentTime = Math.max(0, video.currentTime - 15); });
              navigator.mediaSession.setActionHandler('seekforward', () => { video.currentTime = Math.min(video.duration, video.currentTime + 15); });
            } catch {}
          }

          // Listen for PiP exit
          video.addEventListener('leavepictureinpicture', () => {
            // Notify main process that PiP ended
            // Audio continues playing — the video is NOT paused
          }, { once: true });
        }
      })()
    `);

    pipSourceTabId = outgoingTabId;
    pipDismissIntent = 'dismiss';

    if (mainWindowRef) {
      mainWindowRef.webContents.send('media:pip-state-changed', {
        active: true,
        sourceTabId: outgoingTabId,
      });
    }
  } catch {}
}

// ── Auto-exit PiP when returning to source tab ───────────────
export async function tryAutoExitPiP(incomingTabId: string): Promise<void> {
  if (!pipSourceTabId || pipSourceTabId !== incomingTabId) return;

  const view = getTabView(incomingTabId);
  if (!view || view.webContents.isDestroyed()) return;

  pipDismissIntent = 'return';

  try {
    await view.webContents.executeJavaScript(`
      (async () => {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
      })()
    `);
  } catch {}

  pipSourceTabId = null;
  pipDismissIntent = 'dismiss';

  if (mainWindowRef) {
    mainWindowRef.webContents.send('media:pip-state-changed', {
      active: false,
      sourceTabId: null,
    });
  }
}

// ── Re-enter PiP (from "Back to Video" button) ──────────────
export async function reEnterPiP(tabId: string): Promise<boolean> {
  const view = getTabView(tabId);
  if (!view || view.webContents.isDestroyed()) return false;

  try {
    const result = await view.webContents.executeJavaScript(`
      (async () => {
        const video = document.querySelector('video');
        if (!video || video.paused) return false;
        await video.requestPictureInPicture();
        return true;
      })()
    `);

    if (result) {
      pipSourceTabId = tabId;
      pipDismissIntent = 'dismiss';
      if (mainWindowRef) {
        mainWindowRef.webContents.send('media:pip-state-changed', {
          active: true,
          sourceTabId: tabId,
        });
      }
    }
    return result;
  } catch {
    return false;
  }
}

// ── Metadata extraction ──────────────────────────────────────
export async function extractMediaMetadata(tabId: string): Promise<MediaInfo | null> {
  const view = getTabView(tabId);
  if (!view || view.webContents.isDestroyed()) return null;

  try {
    const meta = await view.webContents.executeJavaScript(`
      (() => {
        const ms = navigator.mediaSession?.metadata;
        const video = document.querySelector('video');
        const audio = document.querySelector('audio');
        let domain = '';
        try { domain = window.location.hostname; } catch {}
        return {
          title: ms?.title || document.title || '',
          artist: ms?.artist || '',
          artwork: ms?.artwork?.[0]?.src || null,
          domain,
          hasVideo: !!(video && !video.paused && video.duration > 0),
        };
      })()
    `);

    const tab = require('../tabs/TabManager');
    // Get favicon from the database
    const { getDatabase } = require('../db/database');
    const db = getDatabase();
    const tabRow = db.prepare('SELECT favicon_path FROM tabs WHERE id = ?').get(tabId) as any;

    currentMediaInfo = {
      tabId,
      title: meta.title,
      artist: meta.artist,
      artwork: meta.artwork,
      favicon: tabRow?.favicon_path || null,
      domain: meta.domain,
      hasVideo: meta.hasVideo,
    };
    activeMediaTabId = tabId;

    if (mainWindowRef) {
      mainWindowRef.webContents.send('media:metadata-updated', currentMediaInfo);
    }

    return currentMediaInfo;
  } catch {
    return null;
  }
}

// ── Media cleared (tab stopped playing) ──────────────────────
export function clearMediaState(tabId: string): void {
  if (activeMediaTabId === tabId) {
    activeMediaTabId = null;
    currentMediaInfo = null;
    stopProgressPolling();

    if (mainWindowRef) {
      mainWindowRef.webContents.send('media:metadata-updated', null);
    }
  }

  if (pipSourceTabId === tabId) {
    pipSourceTabId = null;
    if (mainWindowRef) {
      mainWindowRef.webContents.send('media:pip-state-changed', {
        active: false,
        sourceTabId: null,
      });
    }
  }
}

// ── Media controls ───────────────────────────────────────────
export async function mediaPlayPause(tabId: string): Promise<void> {
  const view = getTabView(tabId);
  if (!view || view.webContents.isDestroyed()) return;

  try {
    await view.webContents.executeJavaScript(`
      (() => {
        const media = document.querySelector('video') || document.querySelector('audio');
        if (media) {
          if (media.paused) media.play();
          else media.pause();
        }
      })()
    `);
  } catch {}
}

export async function mediaSkipForward(tabId: string): Promise<void> {
  const view = getTabView(tabId);
  if (!view || view.webContents.isDestroyed()) return;

  try {
    await view.webContents.executeJavaScript(`
      (() => {
        const media = document.querySelector('video') || document.querySelector('audio');
        if (media) media.currentTime = Math.min(media.duration || Infinity, media.currentTime + 15);
      })()
    `);
  } catch {}
}

export async function mediaSkipBackward(tabId: string): Promise<void> {
  const view = getTabView(tabId);
  if (!view || view.webContents.isDestroyed()) return;

  try {
    await view.webContents.executeJavaScript(`
      (() => {
        const media = document.querySelector('video') || document.querySelector('audio');
        if (media) media.currentTime = Math.max(0, media.currentTime - 15);
      })()
    `);
  } catch {}
}

// ── Progress polling ─────────────────────────────────────────
export function startProgressPolling(tabId: string): void {
  stopProgressPolling();

  progressInterval = setInterval(async () => {
    const view = getTabView(tabId);
    if (!view || view.webContents.isDestroyed()) {
      stopProgressPolling();
      return;
    }

    try {
      const progress = await view.webContents.executeJavaScript(`
        (() => {
          const media = document.querySelector('video') || document.querySelector('audio');
          if (!media) return null;
          return { currentTime: media.currentTime || 0, duration: media.duration || 0 };
        })()
      `);

      if (progress && mainWindowRef) {
        mainWindowRef.webContents.send('media:progress-updated', progress);
      }
    } catch {}
  }, 1000);
}

export function stopProgressPolling(): void {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

// ── Queries ──────────────────────────────────────────────────
export function getMediaState(): {
  activeMediaTabId: string | null;
  mediaInfo: MediaInfo | null;
  pipActive: boolean;
  pipSourceTabId: string | null;
} {
  return {
    activeMediaTabId,
    mediaInfo: currentMediaInfo,
    pipActive: pipSourceTabId !== null,
    pipSourceTabId,
  };
}

export function getPipSourceTabId(): string | null {
  return pipSourceTabId;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/main/src/services/MediaSessionManager.ts
git commit -m "feat: MediaSessionManager — PiP state, metadata extraction, media controls, progress polling"
```

---

## Task 3: Wire MediaSessionManager into IPC Handlers

**Files:**
- Modify: `packages/main/src/ipc/tabs.ts:1-10,181-224,1379-1386`

- [ ] **Step 1: Import MediaSessionManager at top of tabs.ts**

At the top of `packages/main/src/ipc/tabs.ts`, add to the imports:

```ts
import {
  initMediaSession,
  tryAutoPiP,
  tryAutoExitPiP,
  extractMediaMetadata,
  clearMediaState,
  mediaPlayPause,
  mediaSkipForward,
  mediaSkipBackward,
  startProgressPolling,
  stopProgressPolling,
  getMediaState,
  reEnterPiP,
} from '../services/MediaSessionManager';
```

- [ ] **Step 2: Initialize MediaSessionManager**

Inside `registerTabHandlers()`, after the `broadcastState` setup (around line 144), add:

```ts
  // Initialize media session manager
  initMediaSession(mainWindow);
```

- [ ] **Step 3: Add auto-PiP to TAB_SWITCH handler**

In the `TAB_SWITCH` handler (line 181), add auto-PiP logic **before** the `tabManager.activateTab(id)` call. Find the line `const wasSuspended = isTabSuspended(id);` and add before it:

```ts
    // Auto-PiP: if outgoing tab has playing video, pop it into PiP
    const currentActive = tabManager.getActiveTab();
    if (currentActive && currentActive.id !== id) {
      await tryAutoPiP(currentActive.id, !!currentActive.is_muted);
    }

    // Auto-exit PiP if switching back to PiP source tab
    await tryAutoExitPiP(id);
```

- [ ] **Step 4: Enhance media event listeners**

In `setupViewEvents()`, update the audio indicator handlers (lines 1379-1386):

```ts
  // ── Audio indicator + media metadata extraction ─────────────────
  wc.on('media-started-playing', () => {
    _tabManager.setAudioPlaying(tabId, true);
    // Extract metadata for the media player widget
    extractMediaMetadata(tabId);
  });

  wc.on('media-paused', () => {
    _tabManager.setAudioPlaying(tabId, false);
    clearMediaState(tabId);
  });
```

- [ ] **Step 5: Register media control IPC handlers**

Inside `registerTabHandlers()`, after the existing memory-saver handlers (around line 171), add:

```ts
  // ── Media controls ──────────────────────────────────────────────
  ipcMain.handle(IPC.MEDIA_PLAY_PAUSE, (_e, tabId: string) => mediaPlayPause(tabId));
  ipcMain.handle(IPC.MEDIA_SKIP_FORWARD, (_e, tabId: string) => mediaSkipForward(tabId));
  ipcMain.handle(IPC.MEDIA_SKIP_BACKWARD, (_e, tabId: string) => mediaSkipBackward(tabId));
  ipcMain.handle(IPC.MEDIA_GET_STATE, () => getMediaState());
  ipcMain.handle(IPC.MEDIA_START_PROGRESS, (_e, tabId: string) => startProgressPolling(tabId));
  ipcMain.handle(IPC.MEDIA_STOP_PROGRESS, () => stopProgressPolling());
  ipcMain.handle('media:re-enter-pip', (_e, tabId: string) => reEnterPiP(tabId));
```

- [ ] **Step 6: Commit**

```bash
git add packages/main/src/ipc/tabs.ts
git commit -m "feat: auto-PiP on tab switch, media control IPC handlers, metadata extraction on play"
```

---

## Task 4: Media Player Zustand Store

**Files:**
- Create: `packages/renderer/src/store/media-player.ts`

- [ ] **Step 1: Create the media player store**

```ts
// packages/renderer/src/store/media-player.ts

import { create } from 'zustand';

export interface MediaInfo {
  tabId: string;
  title: string;
  artist: string;
  artwork: string | null;
  favicon: string | null;
  domain: string;
  hasVideo: boolean;
}

export interface MediaProgress {
  currentTime: number;
  duration: number;
}

interface MediaPlayerState {
  mediaInfo: MediaInfo | null;
  progress: MediaProgress | null;
  isPopoverOpen: boolean;
  pipActive: boolean;
  pipSourceTabId: string | null;

  setMediaInfo: (info: MediaInfo | null) => void;
  setProgress: (progress: MediaProgress | null) => void;
  setPopoverOpen: (open: boolean) => void;
  togglePopover: () => void;
  setPipState: (active: boolean, sourceTabId: string | null) => void;
}

export const useMediaPlayerStore = create<MediaPlayerState>((set, get) => ({
  mediaInfo: null,
  progress: null,
  isPopoverOpen: false,
  pipActive: false,
  pipSourceTabId: null,

  setMediaInfo: (info) => set({ mediaInfo: info }),
  setProgress: (progress) => set({ progress }),
  setPopoverOpen: (open) => {
    set({ isPopoverOpen: open });
    const { mediaInfo } = get();
    if (open && mediaInfo) {
      window.osBrowser?.media?.startProgress(mediaInfo.tabId);
    } else {
      window.osBrowser?.media?.stopProgress();
      set({ progress: null });
    }
  },
  togglePopover: () => {
    const { isPopoverOpen } = get();
    get().setPopoverOpen(!isPopoverOpen);
  },
  setPipState: (active, sourceTabId) => set({ pipActive: active, pipSourceTabId: sourceTabId }),
}));

// ── IPC Listeners (call once on app mount) ───────────────────
export function initMediaPlayerListeners(): (() => void)[] {
  const cleanups: (() => void)[] = [];

  try {
    if (window.osBrowser?.media?.onMetadataUpdated) {
      cleanups.push(window.osBrowser.media.onMetadataUpdated((data: MediaInfo | null) => {
        useMediaPlayerStore.getState().setMediaInfo(data);
      }));
    }

    if (window.osBrowser?.media?.onProgressUpdated) {
      cleanups.push(window.osBrowser.media.onProgressUpdated((data: MediaProgress) => {
        useMediaPlayerStore.getState().setProgress(data);
      }));
    }

    if (window.osBrowser?.media?.onPipStateChanged) {
      cleanups.push(window.osBrowser.media.onPipStateChanged((data: { active: boolean; sourceTabId: string | null }) => {
        useMediaPlayerStore.getState().setPipState(data.active, data.sourceTabId);
      }));
    }
  } catch {}

  return cleanups;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/renderer/src/store/media-player.ts
git commit -m "feat: media player Zustand store with IPC listeners"
```

---

## Task 5: AudioWidget — Icon Rail Widget

**Files:**
- Create: `packages/renderer/src/components/MediaPlayer/AudioWidget.tsx`

- [ ] **Step 1: Create the AudioWidget component**

```tsx
// packages/renderer/src/components/MediaPlayer/AudioWidget.tsx

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

  // Init IPC listeners on mount
  useEffect(() => {
    const cleanups = initMediaPlayerListeners();
    return () => cleanups.forEach((c) => c());
  }, []);

  // Animate in/out
  useEffect(() => {
    if (mediaInfo) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      setPopoverOpen(false);
    }
  }, [mediaInfo, setPopoverOpen]);

  // Close popover on click outside
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
        {/* Favicon */}
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

        {/* Animated sound bars */}
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

      {/* Popover */}
      {isPopoverOpen && widgetRef.current && (
        <AudioPopover anchorEl={widgetRef.current} />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/renderer/src/components/MediaPlayer/AudioWidget.tsx
git commit -m "feat: AudioWidget — icon rail media widget with animated sound bars"
```

---

## Task 6: AudioPopover — Expanded Controls

**Files:**
- Create: `packages/renderer/src/components/MediaPlayer/AudioPopover.tsx`

- [ ] **Step 1: Create the AudioPopover component**

```tsx
// packages/renderer/src/components/MediaPlayer/AudioPopover.tsx

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
    (window.osBrowser as any)?.media?.reEnterPiP?.(mediaInfo.tabId);
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
          {/* Back to Video — only when PiP was dismissed but audio continues */}
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
```

- [ ] **Step 2: Add reEnterPiP to the preload bridge**

In `packages/preload/src/index.ts`, inside the `media` object, add:

```ts
    reEnterPiP: (tabId: string) => ipcRenderer.invoke('media:re-enter-pip', tabId),
```

- [ ] **Step 3: Commit**

```bash
git add packages/renderer/src/components/MediaPlayer/AudioPopover.tsx packages/preload/src/index.ts
git commit -m "feat: AudioPopover — track info, progress bar, play/pause/skip controls, back-to-video"
```

---

## Task 7: Mount AudioWidget in IconRail

**Files:**
- Modify: `packages/renderer/src/components/KenteSystem/IconRail.tsx:408-525`

- [ ] **Step 1: Import AudioWidget**

At the top of `IconRail.tsx`, add:

```tsx
import { AudioWidget } from '@/components/MediaPlayer/AudioWidget';
```

- [ ] **Step 2: Add AudioWidget between feature icons and settings gear**

In the `IconRail` component (line 435-525), insert the `AudioWidget` between the scrollable icon list and the settings gear. Find the closing `</div>` of the scrollable area (line 487) and the settings `<div>` (line 490). Between them, add:

```tsx
      {/* Media player widget — appears when any tab plays audio */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        <AudioWidget />
      </div>
```

- [ ] **Step 3: Commit**

```bash
git add packages/renderer/src/components/KenteSystem/IconRail.tsx
git commit -m "feat: mount AudioWidget at bottom of icon rail for persistent media controls"
```

---

## Task 8: Build Verification & Polish

**Files:**
- All modified files

- [ ] **Step 1: Build the project**

Run: `cd "C:/Users/USER/OneDrive - Smart Workplace/Desktop/Projects/OzzySurf-OS Browser" && npm run build 2>&1 | tail -30`

Fix any TypeScript errors that arise.

- [ ] **Step 2: Verify auto-PiP behavior**

Start the app with `npm run dev`. Test:
- Open YouTube, play a video
- Switch to another tab
- Floating PiP window should appear automatically
- Switch back to the YouTube tab — PiP should auto-close

- [ ] **Step 3: Verify audio widget**

- Play audio on any tab (YouTube, Spotify, etc.)
- Switch away from that tab
- Audio widget should appear at bottom of icon rail with animated bars
- Click widget to open popover
- Verify play/pause, skip forward/backward, mute toggle work
- Click "Back to Tab" — should switch to the media tab

- [ ] **Step 4: Verify PiP-to-audio fallback**

- Play a YouTube video, switch tabs (PiP appears)
- Close the PiP window via X button
- Audio should continue playing
- Audio widget popover should show "Back to Video" button
- Click "Back to Video" — PiP should re-open

- [ ] **Step 5: Verify muted tab exemption**

- Mute a tab playing video via the tab's mute button
- Switch away from that tab
- PiP should NOT activate (muted tab exemption)

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "fix: Mini Player integration polish"
```
