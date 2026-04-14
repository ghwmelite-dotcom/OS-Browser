import { BrowserWindow } from 'electron';
import { getTabView, enterPiPMode, exitPiPMode, getPipTabId } from '../tabs/TabWebContents';

function execWithTimeout(wc: any, code: string, timeoutMs = 3000): Promise<any> {
  return Promise.race([
    wc.executeJavaScript(code),
    new Promise((_, reject) => setTimeout(() => reject(new Error('executeJavaScript timeout')), timeoutMs)),
  ]);
}

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
// playing video (muted or not), enter PiP automatically.

export async function tryAutoPiP(outgoingTabId: string): Promise<boolean> {
  if (!mainWindowRef) return false;

  const view = getTabView(outgoingTabId);
  if (!view || view.webContents.isDestroyed()) return false;

  try {
    // Check if the outgoing tab has a playing video
    const hasPlayingVideo: boolean = await execWithTimeout(view.webContents,`
      (() => {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (!v.paused && !v.ended && v.readyState > 2) return true;
        }
        return false;
      })()
    `);

    if (!hasPlayingVideo) return false;

    // Native Electron PiP: resize the view to a floating mini window
    const success = enterPiPMode(outgoingTabId, mainWindowRef);
    if (!success) return false;

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
  if (!mainWindowRef) return false;

  // Exit native PiP — restore the view to normal size (showTabView will handle it)
  exitPiPMode(mainWindowRef);

  pipSourceTabId = null;
  pipDismissIntent = false;
  broadcastPipState(false, null);

  return true;
}

// ── Re-enter PiP ─────────────────────────────────────────────────
// For "Back to Video" button — re-enter PiP on the given tab.

export async function reEnterPiP(tabId: string): Promise<boolean> {
  if (!mainWindowRef) return false;

  const success = enterPiPMode(tabId, mainWindowRef);
  if (success) {
    pipSourceTabId = tabId;
    pipDismissIntent = false;
    broadcastPipState(true, tabId);
  }
  return success;
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
    const raw = await execWithTimeout(view.webContents,`
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
    await execWithTimeout(view.webContents,`
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
    await execWithTimeout(view.webContents,`
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
    await execWithTimeout(view.webContents,`
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
      const progress: ProgressInfo = await execWithTimeout(view.webContents,`
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
