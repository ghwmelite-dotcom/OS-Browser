# Arc-Style Mini Player — Design Spec

**Date**: 2026-04-07
**Status**: Approved
**Approach**: Core Experience (auto-PiP + sidebar audio player + PiP-to-audio fallback)

---

## Overview

Add a dual-component media multitasking system to the OS Browser Desktop: a **floating picture-in-picture video window** that automatically activates when users navigate away from tabs playing video, and a **sidebar audio controller** at the bottom of the Kente icon rail for persistent media controls. The two are connected by a PiP-to-audio fallback — dismissing the video window keeps audio alive with sidebar controls.

---

## Component 1: Auto-PiP — Automatic Video Pop-out on Tab Switch

### Detection & Trigger

In the `TAB_SWITCH` IPC handler (`packages/main/src/ipc/tabs.ts`), before deactivating the current tab, check if it has a playing video:

- Execute JavaScript on the outgoing tab's webContents: query for a `<video>` that is not paused, has `duration > 0`, and the tab is not muted (`is_muted !== 1`)
- If a playing video is found, call `video.requestPictureInPicture()` on it
- The PiP window is a native OS-level always-on-top window managed by Chromium's PiP API
- Track the source tab ID via `pipSourceTabId` variable in the main process

### Enhanced PiP Controls

After entering PiP, inject Media Session action handlers via `executeJavaScript`:

- `seekbackward` (rewind 15s)
- `seekforward` (skip forward 15s)
- `previoustrack` and `nexttrack` (when site supports them)

These handlers appear as buttons in the native PiP overlay. Sites that set their own Media Session handlers (YouTube, Spotify) get their native controls automatically.

### Return to Tab

- When the user switches to the PiP source tab manually, auto-exit PiP via `document.exitPictureInPicture()`
- Track a `pipDismissIntent` flag to distinguish "return to tab" from "dismiss PiP"

### Muted Tab Exemption

If the tab is muted (`is_muted === 1`), skip auto-PiP entirely.

### Auto-Exit on Navigate Back

When the user activates the PiP source tab (via tab click, Ctrl+number, etc.), automatically exit PiP since the user is now looking at the video directly.

---

## Component 2: Sidebar Audio Player — Icon Rail Widget & Popover

### Icon Rail Widget (Always Visible)

- Renders at the **bottom** of `IconRail.tsx`, appears only when any tab has `is_audio_playing: true`
- Displays: tab's favicon (16x16) with animated sound bars overlay
- Size: 40x40px, centered in the 48px rail, matching existing icon rail button styling
- Click toggles the popover open/closed. Click-outside closes the popover.
- Slide-up animation on appear (200ms ease-out), slide-down on disappear

### Popover Controls (Expands on Click)

- Positioned: anchored to the widget, expands **rightward** from the icon rail
- Width: 280px, rounded corners, shadow, matches existing panel styling (surface-1 bg, border-1 border)
- Contents top to bottom:
  1. **Track info row**: Favicon + page title (truncated) + site domain in muted text
  2. **Progress bar**: Thin horizontal bar showing `currentTime / duration` (if available)
  3. **Control row**: Skip back 15s | Play/Pause | Skip forward 15s
  4. **Secondary row**: Mute toggle | "Back to tab" button (switches to media tab)
  5. **"Back to Video" button**: Shown only when PiP was dismissed but audio continues — re-triggers PiP

### Media Metadata Extraction

When `media-started-playing` fires in the main process:

- Extract via `executeJavaScript` on the media tab's webContents:
  - `document.title` for page name
  - `navigator.mediaSession.metadata?.title`, `.artist`, `.artwork` if the site provides Media Session metadata
  - Favicon already in tab state
- Store as `mediaInfo` object in the main process MediaSessionManager
- Broadcast to renderer alongside existing `audioPlaying` state

### Progress Tracking

- When the audio popover is open, start a 1-second polling interval on the main process
- Read `video.currentTime` and `video.duration` (or `audio.currentTime`/`audio.duration`) via `executeJavaScript`
- Send progress updates to renderer via IPC
- Stop polling when popover closes to avoid overhead

---

## Component 3: PiP-to-Audio Fallback

### Closing PiP Keeps Audio Alive

- When the PiP window's X button is clicked, `leavepictureinpicture` event fires
- The video continues playing in the background tab — PiP just closes
- The sidebar audio widget stays visible (tab still playing audio)
- The popover shows a "Back to Video" button that re-triggers `video.requestPictureInPicture()`

### Distinguishing Close vs Return

PiP can end two ways — dismiss (X button) or return (navigate to source tab):

- Set `pipDismissIntent = 'return'` when the user switches to the PiP source tab
- Set `pipDismissIntent = 'dismiss'` as default
- In the `leavepictureinpicture` handler:
  - If `intent === 'return'`: switch to source tab, clear PiP state
  - If `intent === 'dismiss'`: keep audio playing, clear PiP state but keep mediaInfo active

### Complete User Flow

```
User watches YouTube -> switches tab
    |
Auto-PiP activates (floating video window)
Sidebar audio widget appears (icon rail, bottom)
    |
User clicks X on PiP window
    |
PiP closes, video audio continues in background
Sidebar widget stays, popover shows "Back to Video" button
    |
User clicks "Back to Video"
    |
PiP re-opens with the video
    |
User switches to the video tab directly
    |
PiP auto-closes, browser shows video tab
Sidebar widget disappears (tab is active, no need)
```

### Edge Cases

- **Tab closed while PiP active**: PiP auto-closes (webContents destroyed), widget disappears
- **Multiple video tabs**: Only one PiP at a time (Chromium enforces). Audio widget shows the most recently playing tab.
- **Tab navigates away from video**: PiP closes naturally (video element removed). Widget disappears when `media-paused` fires.
- **User mutes tab**: PiP stays open, widget shows muted state with toggle

---

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `packages/main/src/services/MediaSessionManager.ts` | PiP state tracking, metadata extraction, progress polling, auto-PiP logic |
| `packages/renderer/src/components/MediaPlayer/AudioWidget.tsx` | Icon rail widget (40x40, favicon + animated bars) |
| `packages/renderer/src/components/MediaPlayer/AudioPopover.tsx` | Expanded popover (280px, controls + track info) |
| `packages/renderer/src/store/media-player.ts` | Zustand store for media state (activeMediaTabId, mediaInfo, isPlaying, progress) |

### Modified Files

| File | Changes |
|------|---------|
| `packages/main/src/ipc/tabs.ts` | Auto-PiP in TAB_SWITCH, metadata extraction on media events, progress polling handlers, PiP exit on return-to-tab |
| `packages/main/src/tabs/TabManager.ts` | Extended mediaInfo storage (title, artist, artwork, duration) alongside audioPlaying map |
| `packages/shared/src/ipc-channels.ts` | New channels: MEDIA_METADATA, MEDIA_PROGRESS, MEDIA_CONTROL, PIP_STATE |
| `packages/preload/src/index.ts` | New bridge methods for media control, metadata events, progress updates |
| `packages/renderer/src/components/KenteSystem/IconRail.tsx` | Mount AudioWidget at bottom of icon rail |

### Unchanged

- Existing `tab:pip` manual toggle (kept as fallback for Alt+P shortcut)
- Tab strip audio indicators (Volume2/VolumeX icons in Tab.tsx)
- Tab mute/unmute functionality
- Memory Saver / Tab Lifecycle (audio-playing tabs already exempt from suspension)
