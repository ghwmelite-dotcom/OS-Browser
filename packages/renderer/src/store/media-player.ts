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
