import { BrowserWindow } from 'electron';
import { getTabView } from '../tabs/TabWebContents';

// ── Types ────────────────────────────────────────────────────────
export interface MediaInfo {
  title: string;
  artist: string;
  artwork: string;
  favicon: string;
  domain: string;
  hasVideo: boolean;
  tabId: string;
}

interface ProgressInfo {
  currentTime: number;
  duration: number;
}

// ── State ────────────────────────────────────────────────────────
let mainWindowRef: BrowserWindow | null = null;
let pipSourceTabId: string | null = null;
let pipDismissIntent = false;
let progressInterval: NodeJS.Timeout | null = null;
let currentMediaState: MediaInfo | null = null;

// ── Init / Stop ──────────────────────────────────────────────────
export function initMediaSession(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;
}

export function stopMediaSession(): void {
  stopProgressPolling();
  mainWindowRef = null;
  pipSourceTabId = null;
  pipDismissIntent = false;
  currentMediaState = null;
}

// ── PiP State ────────────────────────────────────────────────────

export function getPipSourceTabId(): string | null {
  return pipSourceTabId;
}

export function getMediaState(): MediaInfo | null {
  return currentMediaState;
}

function broadcastPipState(active: boolean, sourceTabId: string | null): void {
  mainWindowRef?.webContents.send('media:pip-state-changed', { active, sourceTabId });
}

// ── Auto-PiP ─────────────────────────────────────────────────────
// Called when switching away from a tab. If the outgoing tab has a
// playing, unmuted video, enter PiP automatically.

export async function tryAutoPiP(outgoingTabId: string, isMuted: boolean): Promise<boolean> {
  if (isMuted) return false;

  const view = getTabView(outgoingTabId);
  if (!view) return false;

  try {
    const hasPlayingVideo: boolean = await view.webContents.executeJavaScript(`
      (() => {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (!v.paused && !v.ended && v.readyState > 2) return true;
        }
        return false;
      })()
    `);

    if (!hasPlayingVideo) return false;

    // Enter PiP
    await view.webContents.executeJavaScript(`
      (() => {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (!v.paused && !v.ended && v.readyState > 2) {
            v.requestPictureInPicture().catch(() => {});
            break;
          }
        }
      })()
    `);

    // Inject Media Session action handlers for skip controls
    await view.webContents.executeJavaScript(`
      (() => {
        if ('mediaSession' in navigator) {
          navigator.mediaSession.setActionHandler('previoustrack', () => {
            const v = document.querySelector('video');
            if (v) v.currentTime = Math.max(0, v.currentTime - 10);
          });
          navigator.mediaSession.setActionHandler('nexttrack', () => {
            const v = document.querySelector('video');
            if (v) v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
          });
        }
      })()
    `);

    pipSourceTabId = outgoingTabId;
    pipDismissIntent = false;
    broadcastPipState(true, outgoingTabId);

    return true;
  } catch {
    return false;
  }
}

// ── Auto-Exit PiP ────────────────────────────────────────────────
// Called when switching to a tab. If we're returning to the PiP
// source tab, exit PiP automatically.

export async function tryAutoExitPiP(incomingTabId: string): Promise<boolean> {
  if (!pipSourceTabId || pipSourceTabId !== incomingTabId) return false;

  const view = getTabView(incomingTabId);
  if (!view) return false;

  try {
    await view.webContents.executeJavaScript(`
      (() => {
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture().catch(() => {});
        }
      })()
    `);
  } catch {
    // webContents may be destroyed — that's fine
  }

  pipSourceTabId = null;
  pipDismissIntent = false;
  broadcastPipState(false, null);

  return true;
}

// ── Re-enter PiP ─────────────────────────────────────────────────
// For "Back to Video" button — re-enter PiP on the given tab.

export async function reEnterPiP(tabId: string): Promise<boolean> {
  const view = getTabView(tabId);
  if (!view) return false;

  try {
    const entered: boolean = await view.webContents.executeJavaScript(`
      (() => {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (!v.paused && !v.ended && v.readyState > 2) {
            v.requestPictureInPicture().catch(() => {});
            return true;
          }
        }
        return false;
      })()
    `);

    if (entered) {
      pipSourceTabId = tabId;
      pipDismissIntent = false;
      broadcastPipState(true, tabId);
    }
    return entered;
  } catch {
    return false;
  }
}

// ── Dismiss PiP ──────────────────────────────────────────────────

export function setPipDismissIntent(): void {
  pipDismissIntent = true;
}

export function getPipDismissIntent(): boolean {
  return pipDismissIntent;
}

// ── Metadata Extraction ──────────────────────────────────────────

export async function extractMediaMetadata(tabId: string): Promise<MediaInfo | null> {
  const view = getTabView(tabId);
  if (!view) return null;

  try {
    const raw = await view.webContents.executeJavaScript(`
      (() => {
        const md = navigator.mediaSession?.metadata;
        const videos = document.querySelectorAll('video');
        let hasVideo = false;
        for (const v of videos) {
          if (!v.paused && !v.ended && v.readyState > 2) { hasVideo = true; break; }
        }

        // Artwork: prefer Media Session, fall back to og:image
        let artwork = '';
        if (md?.artwork?.length) {
          artwork = md.artwork[0].src;
        } else {
          const ogImg = document.querySelector('meta[property="og:image"]');
          if (ogImg) artwork = ogImg.getAttribute('content') || '';
        }

        // Favicon
        let favicon = '';
        const iconLink = document.querySelector('link[rel~="icon"]') || document.querySelector('link[rel="shortcut icon"]');
        if (iconLink) favicon = iconLink.href;
        if (!favicon) favicon = location.origin + '/favicon.ico';

        return {
          title: md?.title || document.title || '',
          artist: md?.artist || '',
          artwork: artwork,
          favicon: favicon,
          domain: location.hostname,
          hasVideo: hasVideo,
        };
      })()
    `);

    const info: MediaInfo = {
      title: raw.title || '',
      artist: raw.artist || '',
      artwork: raw.artwork || '',
      favicon: raw.favicon || '',
      domain: raw.domain || '',
      hasVideo: !!raw.hasVideo,
      tabId,
    };

    currentMediaState = info;
    mainWindowRef?.webContents.send('media:metadata-updated', info);
    return info;
  } catch {
    return null;
  }
}

// ── Clear Media State ────────────────────────────────────────────

export function clearMediaState(tabId: string): void {
  if (currentMediaState?.tabId === tabId) {
    currentMediaState = null;
    mainWindowRef?.webContents.send('media:metadata-updated', null);
  }

  // If PiP was from this tab, exit PiP state
  if (pipSourceTabId === tabId) {
    pipSourceTabId = null;
    pipDismissIntent = false;
    broadcastPipState(false, null);
  }

  stopProgressPolling();
}

// ── Media Controls ───────────────────────────────────────────────

export async function mediaPlayPause(tabId: string): Promise<void> {
  const view = getTabView(tabId);
  if (!view) return;

  try {
    await view.webContents.executeJavaScript(`
      (() => {
        const media = document.querySelector('video') || document.querySelector('audio');
        if (!media) return;
        if (media.paused) { media.play().catch(() => {}); }
        else { media.pause(); }
      })()
    `);
  } catch {
    // webContents may be destroyed
  }
}

export async function mediaSkipForward(tabId: string, seconds = 10): Promise<void> {
  const view = getTabView(tabId);
  if (!view) return;

  try {
    await view.webContents.executeJavaScript(`
      (() => {
        const media = document.querySelector('video') || document.querySelector('audio');
        if (media) media.currentTime = Math.min(media.duration || Infinity, media.currentTime + ${seconds});
      })()
    `);
  } catch {
    // webContents may be destroyed
  }
}

export async function mediaSkipBackward(tabId: string, seconds = 10): Promise<void> {
  const view = getTabView(tabId);
  if (!view) return;

  try {
    await view.webContents.executeJavaScript(`
      (() => {
        const media = document.querySelector('video') || document.querySelector('audio');
        if (media) media.currentTime = Math.max(0, media.currentTime - ${seconds});
      })()
    `);
  } catch {
    // webContents may be destroyed
  }
}

// ── Progress Polling ─────────────────────────────────────────────

export function startProgressPolling(tabId: string): void {
  stopProgressPolling();

  progressInterval = setInterval(async () => {
    const view = getTabView(tabId);
    if (!view) {
      stopProgressPolling();
      return;
    }

    try {
      const progress: ProgressInfo = await view.webContents.executeJavaScript(`
        (() => {
          const media = document.querySelector('video') || document.querySelector('audio');
          if (!media) return { currentTime: 0, duration: 0 };
          return { currentTime: media.currentTime || 0, duration: media.duration || 0 };
        })()
      `);

      mainWindowRef?.webContents.send('media:progress-updated', progress);
    } catch {
      // webContents may be destroyed — stop polling
      stopProgressPolling();
    }
  }, 1000);
}

export function stopProgressPolling(): void {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}
