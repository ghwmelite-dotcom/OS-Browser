/* ================================================================
   Full-screen Call UI — video / voice overlay
   ================================================================ */

import { h } from '../utils/dom';
import { webRTCService, CallInfo } from '../services/webrtc';

let overlay: HTMLElement | null = null;
let durationTimer: ReturnType<typeof setInterval> | null = null;
let ringtoneCtx: AudioContext | null = null;
let ringtoneOsc: OscillatorNode | null = null;
let ringtoneGain: GainNode | null = null;
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let pendingIncomingData: any = null;

// Clean up subscriptions
const unsubs: (() => void)[] = [];

// ── Ringtone (Web Audio oscillator) ────────────────────────────────

function startRingtone() {
  stopRingtone();
  try {
    ringtoneCtx = new AudioContext();
    ringtoneGain = ringtoneCtx.createGain();
    ringtoneGain.gain.value = 0;
    ringtoneGain.connect(ringtoneCtx.destination);

    ringtoneOsc = ringtoneCtx.createOscillator();
    ringtoneOsc.type = 'sine';
    ringtoneOsc.frequency.value = 440;
    ringtoneOsc.connect(ringtoneGain);
    ringtoneOsc.start();

    // Pattern: 0.8s on, 1.2s off
    let on = true;
    ringtoneGain.gain.value = 0.15;
    ringtoneInterval = setInterval(() => {
      if (!ringtoneGain) return;
      on = !on;
      ringtoneGain.gain.value = on ? 0.15 : 0;
    }, on ? 800 : 1200);

    // More precise timing
    clearInterval(ringtoneInterval);
    const cycle = () => {
      if (!ringtoneGain) return;
      ringtoneGain.gain.value = 0.15;
      setTimeout(() => {
        if (ringtoneGain) ringtoneGain.gain.value = 0;
        setTimeout(cycle, 1200);
      }, 800);
    };
    cycle();
  } catch {
    // Audio not available — silent
  }
}

function stopRingtone() {
  if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
  if (ringtoneOsc) { try { ringtoneOsc.stop(); } catch {} ringtoneOsc = null; }
  if (ringtoneGain) { ringtoneGain = null; }
  if (ringtoneCtx) { try { ringtoneCtx.close(); } catch {} ringtoneCtx = null; }
}

// ── Duration formatter ─────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── Initial for avatar ─────────────────────────────────────────────

function getInitial(name: string): string {
  if (!name) return '?';
  const clean = name.replace(/^@/, '').replace(/:.*$/, '').replace('staff_', '');
  return clean.charAt(0).toUpperCase();
}

function getDisplayName(name: string): string {
  if (!name) return 'Unknown';
  return name.replace(/^@/, '').replace(/:.*$/, '').replace('staff_', '');
}

// ── Show call overlay ──────────────────────────────────────────────

export function showCallView(): void {
  if (overlay) return;

  overlay = h('div', { className: 'call-overlay' });
  document.body.appendChild(overlay);

  // Subscribe to events
  unsubs.push(webRTCService.on('call:state', (info: CallInfo | null) => renderState(info)));
  unsubs.push(webRTCService.on('call:localStream', (stream: MediaStream) => attachLocalVideo(stream)));
  unsubs.push(webRTCService.on('call:remoteStream', (stream: MediaStream) => attachRemoteVideo(stream)));
  unsubs.push(webRTCService.on('call:muted', () => updateControls()));
  unsubs.push(webRTCService.on('call:cameraOff', () => updateControls()));

  // Render initial state
  const call = webRTCService.call;
  if (call) {
    renderState(call);
  } else if (pendingIncomingData) {
    // Show ringing for pending incoming
    renderState({
      callId: pendingIncomingData.callId,
      peerId: pendingIncomingData.peerId,
      peerName: pendingIncomingData.peerName,
      isVideo: pendingIncomingData.isVideo,
      isIncoming: true,
      state: 'ringing',
      startedAt: Date.now(),
    } as CallInfo);
  }
}

export function hideCallView(): void {
  stopRingtone();
  stopDurationTimer();
  for (const unsub of unsubs) unsub();
  unsubs.length = 0;
  pendingIncomingData = null;
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

export function setIncomingCallData(data: any): void {
  pendingIncomingData = data;
}

// ── Internal refs for connected state ──────────────────────────────

let localVideoEl: HTMLVideoElement | null = null;
let remoteVideoEl: HTMLVideoElement | null = null;
let controlsContainer: HTMLElement | null = null;
let muteBtn: HTMLButtonElement | null = null;
let cameraBtn: HTMLButtonElement | null = null;
let isMuted = false;
let isCameraOff = false;

function stopDurationTimer() {
  if (durationTimer) { clearInterval(durationTimer); durationTimer = null; }
}

// ── Render different states ────────────────────────────────────────

function renderState(info: CallInfo | null): void {
  if (!overlay) return;
  if (!info) { hideCallView(); return; }

  switch (info.state) {
    case 'calling': renderCalling(info); break;
    case 'ringing': renderRinging(info); break;
    case 'connected': renderConnected(info); break;
    case 'ended': renderEnded(info); break;
    default: break;
  }
}

// ── CALLING (outgoing) ─────────────────────────────────────────────

function renderCalling(info: CallInfo): void {
  if (!overlay) return;
  stopRingtone();
  stopDurationTimer();

  overlay.innerHTML = '';

  const avatar = h('div', { className: 'call-avatar call-avatar--pulse' }, getInitial(info.peerName));
  const name = h('div', { className: 'call-name' }, getDisplayName(info.peerName));
  const status = h('div', { className: 'call-status' }, info.isVideo ? 'Video calling\u2026' : 'Calling\u2026');

  const endBtn = h('button', {
    className: 'call-btn call-btn--end',
    onClick: () => { webRTCService.endCall(); hideCallView(); },
    'aria-label': 'End call',
  });
  endBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 11.94 11.94 0 003.74.6 2 2 0 012 2v3.5a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 013 4.18 2 2 0 015 2h3.5a2 2 0 012 1.72 11.94 11.94 0 00.6 3.74 2 2 0 01-.45 2.11L9.38 10.84a16 16 0 001.3 2.47z"/></svg>`;

  const controls = h('div', { className: 'call-controls' }, endBtn);

  overlay.appendChild(avatar);
  overlay.appendChild(name);
  overlay.appendChild(status);
  overlay.appendChild(controls);
}

// ── RINGING (incoming) ─────────────────────────────────────────────

function renderRinging(info: CallInfo): void {
  if (!overlay) return;
  stopDurationTimer();
  startRingtone();

  overlay.innerHTML = '';

  const avatar = h('div', { className: 'call-avatar call-avatar--ring' }, getInitial(info.peerName));
  const name = h('div', { className: 'call-name' }, getDisplayName(info.peerName));
  const status = h('div', { className: 'call-status' }, info.isVideo ? 'Incoming video call' : 'Incoming call');

  const acceptBtn = h('button', {
    className: 'call-btn call-btn--accept',
    onClick: async () => {
      stopRingtone();
      const data = pendingIncomingData;
      if (data && data.offer) {
        try {
          await webRTCService.acceptCall(
            data.callId,
            data.offer,
            data.isVideo || false,
            data.peerId,
            data.peerName,
          );
        } catch (err) {
          console.error('[CallView] accept error', err);
          hideCallView();
        }
      }
    },
    'aria-label': 'Accept call',
  });
  acceptBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.1 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>`;

  const rejectBtn = h('button', {
    className: 'call-btn call-btn--end',
    onClick: () => { stopRingtone(); webRTCService.endCall(); hideCallView(); },
    'aria-label': 'Reject call',
  });
  rejectBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  const actions = h('div', { className: 'call-incoming-actions' }, acceptBtn, rejectBtn);

  overlay.appendChild(avatar);
  overlay.appendChild(name);
  overlay.appendChild(status);
  overlay.appendChild(actions);
}

// ── CONNECTED ──────────────────────────────────────────────────────

function renderConnected(info: CallInfo): void {
  if (!overlay) return;
  stopRingtone();
  stopDurationTimer();
  isMuted = false;
  isCameraOff = false;

  overlay.innerHTML = '';

  // Remote video (full-screen, behind everything)
  remoteVideoEl = document.createElement('video');
  remoteVideoEl.className = 'call-remote-video';
  remoteVideoEl.autoplay = true;
  remoteVideoEl.playsInline = true;
  remoteVideoEl.setAttribute('playsinline', '');
  overlay.appendChild(remoteVideoEl);

  // If remote stream already available
  const rs = webRTCService.remoteMediaStream;
  if (rs) remoteVideoEl.srcObject = rs;

  // Center content (shown when audio-only or remote video not ready)
  const centerContent = h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '5',
      position: 'relative',
    },
  });

  const avatar = h('div', { className: 'call-avatar' }, getInitial(info.peerName));
  const name = h('div', { className: 'call-name' }, getDisplayName(info.peerName));

  // Audio waveform (for audio-only)
  const waveform = h('div', { className: 'call-waveform' });
  for (let i = 0; i < 5; i++) {
    const bar = h('div', { className: 'call-waveform-bar' });
    bar.style.animationDelay = `${i * 0.15}s`;
    waveform.appendChild(bar);
  }

  // Duration
  const durationEl = h('div', { className: 'call-duration' }, '00:00');
  durationTimer = setInterval(() => {
    if (info.startedAt) {
      durationEl.textContent = formatDuration(Date.now() - info.startedAt);
    }
  }, 1000);

  if (!info.isVideo) {
    centerContent.appendChild(avatar);
    centerContent.appendChild(name);
    centerContent.appendChild(waveform);
  } else {
    centerContent.appendChild(name);
  }
  centerContent.appendChild(durationEl);
  overlay.appendChild(centerContent);

  // Local video PiP
  if (info.isVideo) {
    localVideoEl = document.createElement('video');
    localVideoEl.className = 'call-local-video';
    localVideoEl.autoplay = true;
    localVideoEl.playsInline = true;
    localVideoEl.setAttribute('playsinline', '');
    localVideoEl.muted = true;
    overlay.appendChild(localVideoEl);

    const ls = webRTCService.localMediaStream;
    if (ls) localVideoEl.srcObject = ls;
  }

  // Control buttons
  muteBtn = h('button', {
    className: 'call-btn call-btn--mute',
    onClick: () => { isMuted = webRTCService.toggleMute(); updateControls(); },
    'aria-label': 'Toggle mute',
  }) as HTMLButtonElement;
  muteBtn.innerHTML = micIcon(false);

  cameraBtn = h('button', {
    className: `call-btn call-btn--camera`,
    onClick: () => { isCameraOff = webRTCService.toggleCamera(); updateControls(); },
    'aria-label': 'Toggle camera',
    style: { display: info.isVideo ? 'flex' : 'none' },
  }) as HTMLButtonElement;
  cameraBtn.innerHTML = cameraIcon(false);

  const endBtn = h('button', {
    className: 'call-btn call-btn--end',
    onClick: () => { webRTCService.endCall(); hideCallView(); },
    'aria-label': 'End call',
  });
  endBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 11.94 11.94 0 003.74.6 2 2 0 012 2v3.5a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 013 4.18 2 2 0 015 2h3.5a2 2 0 012 1.72 11.94 11.94 0 00.6 3.74 2 2 0 01-.45 2.11L9.38 10.84a16 16 0 001.3 2.47z"/></svg>`;

  controlsContainer = h('div', { className: 'call-controls' }, muteBtn, endBtn, cameraBtn);
  overlay.appendChild(controlsContainer);
}

// ── ENDED ──────────────────────────────────────────────────────────

function renderEnded(info: CallInfo): void {
  if (!overlay) return;
  stopRingtone();
  stopDurationTimer();

  overlay.innerHTML = '';

  const avatar = h('div', { className: 'call-avatar' }, getInitial(info.peerName));
  const text = h('div', { className: 'call-status', style: { marginTop: '16px', fontSize: '18px', color: '#fff' } }, 'Call ended');

  overlay.appendChild(avatar);
  overlay.appendChild(text);

  setTimeout(() => hideCallView(), 1500);
}

// ── Attach streams to video elements ───────────────────────────────

function attachLocalVideo(stream: MediaStream) {
  if (localVideoEl) localVideoEl.srcObject = stream;
}

function attachRemoteVideo(stream: MediaStream) {
  if (remoteVideoEl) remoteVideoEl.srcObject = stream;
}

// ── Update control button states ───────────────────────────────────

function updateControls() {
  if (muteBtn) {
    muteBtn.className = `call-btn call-btn--mute${isMuted ? ' active' : ''}`;
    muteBtn.innerHTML = micIcon(isMuted);
  }
  if (cameraBtn) {
    cameraBtn.className = `call-btn call-btn--camera${isCameraOff ? ' active' : ''}`;
    cameraBtn.innerHTML = cameraIcon(isCameraOff);
  }
}

// ── SVG icons ──────────────────────────────────────────────────────

function micIcon(muted: boolean): string {
  if (muted) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/><path d="M19 12a7 7 0 01-.11 1.23"/></svg>`;
  }
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
}

function cameraIcon(off: boolean): string {
  if (off) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3l2-3h6l2 3h3a2 2 0 012 2v9.34"/></svg>`;
  }
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
}
