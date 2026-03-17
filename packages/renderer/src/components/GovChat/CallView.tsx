/**
 * CallView — Full-screen overlay for active/incoming calls.
 *
 * States:
 *   calling   — outgoing, awaiting answer
 *   ringing   — incoming, accept / reject
 *   connected — full call UI with media streams
 *   ended     — brief "call ended" before cleanup
 *
 * Uses WebRTCService singleton for all call logic.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, User,
} from 'lucide-react';
import { WebRTCService } from '@/services/WebRTCService';
import type { CallInfo } from '@/services/WebRTCService';

/* ─────────── helpers ─────────── */

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ─────────── ringtone via Web Audio API ─────────── */

let ringtoneCtx: AudioContext | null = null;
let ringtoneOsc: OscillatorNode | null = null;
let ringtoneGain: GainNode | null = null;
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;

function startRingtone(): void {
  try {
    ringtoneCtx = new AudioContext();
    ringtoneOsc = ringtoneCtx.createOscillator();
    ringtoneGain = ringtoneCtx.createGain();

    ringtoneOsc.type = 'sine';
    ringtoneOsc.frequency.value = 440;
    ringtoneGain.gain.value = 0;

    ringtoneOsc.connect(ringtoneGain);
    ringtoneGain.connect(ringtoneCtx.destination);
    ringtoneOsc.start();

    // Pulse: 0.8s on, 1.2s off
    let on = true;
    ringtoneGain.gain.value = 0.15;
    ringtoneInterval = setInterval(() => {
      if (ringtoneGain) {
        on = !on;
        ringtoneGain.gain.value = on ? 0.15 : 0;
      }
    }, 1000);
  } catch {
    // Audio API not available
  }
}

function stopRingtone(): void {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneOsc) {
    try { ringtoneOsc.stop(); } catch { /* noop */ }
    ringtoneOsc = null;
  }
  if (ringtoneCtx) {
    try { ringtoneCtx.close(); } catch { /* noop */ }
    ringtoneCtx = null;
  }
  ringtoneGain = null;
}

/* ─────────── CallView component ─────────── */

export function CallView() {
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [pipPosition, setPipPosition] = useState({ x: 16, y: 16 });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedAtRef = useRef<number>(0);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  // ── Subscribe to WebRTC events ──

  useEffect(() => {
    const unsubState = WebRTCService.on('call:state', (data) => {
      const info = data as CallInfo | null;
      setCallInfo(info ? { ...info } : null);

      if (info?.state === 'connected' && connectedAtRef.current === 0) {
        connectedAtRef.current = Date.now();
      }
      if (!info) {
        connectedAtRef.current = 0;
        setDuration(0);
        setIsMuted(false);
        setIsCameraOff(false);
      }
    });

    const unsubIncoming = WebRTCService.on('call:incoming', (data) => {
      const incoming = data as CallInfo & { offer: RTCSessionDescriptionInit };
      setIncomingOffer(incoming.offer);
    });

    const unsubLocal = WebRTCService.on('call:localStream', (data) => {
      const stream = data as MediaStream | null;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    });

    const unsubRemote = WebRTCService.on('call:remoteStream', (data) => {
      const stream = data as MediaStream | null;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    });

    return () => {
      unsubState();
      unsubIncoming();
      unsubLocal();
      unsubRemote();
    };
  }, []);

  // ── Duration timer ──

  useEffect(() => {
    if (callInfo?.state === 'connected') {
      durationRef.current = setInterval(() => {
        if (connectedAtRef.current > 0) {
          setDuration(Math.floor((Date.now() - connectedAtRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    }
    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    };
  }, [callInfo?.state]);

  // ── Ringtone for incoming calls ──

  useEffect(() => {
    if (callInfo?.state === 'ringing' && callInfo.isIncoming) {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [callInfo?.state, callInfo?.isIncoming]);

  // ── Handlers ──

  const handleAccept = useCallback(async () => {
    if (!callInfo || !incomingOffer) return;
    try {
      await WebRTCService.acceptCall(callInfo.callId, incomingOffer, callInfo.isVideo);
      setIncomingOffer(null);
    } catch (err) {
      console.error('[CallView] Failed to accept:', err);
    }
  }, [callInfo, incomingOffer]);

  const handleReject = useCallback(() => {
    WebRTCService.endCall();
    setIncomingOffer(null);
  }, []);

  const handleEndCall = useCallback(() => {
    WebRTCService.endCall();
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = WebRTCService.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleToggleCamera = useCallback(() => {
    const off = WebRTCService.toggleCamera();
    setIsCameraOff(off);
  }, []);

  // ── PiP drag ──

  const handlePipMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pipPosition.x,
      startPosY: pipPosition.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      setPipPosition({
        x: Math.max(0, dragRef.current.startPosX + dx),
        y: Math.max(0, dragRef.current.startPosY + dy),
      });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [pipPosition]);

  // ── Don't render if no active call ──

  if (!callInfo) return null;

  const { state, peerName, isVideo, isIncoming } = callInfo;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* ── Ringing (incoming) ── */}
      {state === 'ringing' && isIncoming && (
        <div className="flex flex-col items-center gap-6 animate-fadeIn">
          {/* Caller avatar */}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #D4A017, #006B3F)',
              animation: 'gcCallPulse 2s ease-in-out infinite',
            }}
          >
            {getInitials(peerName)}
          </div>

          <div className="text-center">
            <p className="text-white text-lg font-semibold">{peerName}</p>
            <p className="text-white/60 text-sm mt-1">
              {isVideo ? 'Video call' : 'Audio call'}...
            </p>
          </div>

          {/* Accept / Reject buttons */}
          <div className="flex items-center gap-8 mt-4">
            <button
              onClick={handleReject}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{ background: '#CE1126' }}
              title="Reject"
            >
              <PhoneOff size={22} className="text-white" />
            </button>
            <button
              onClick={handleAccept}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{ background: '#006B3F' }}
              title="Accept"
            >
              <Phone size={22} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Calling (outgoing) ── */}
      {state === 'calling' && (
        <div className="flex flex-col items-center gap-6 animate-fadeIn">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #D4A017, #006B3F)',
              animation: 'gcCallPulse 2s ease-in-out infinite',
            }}
          >
            {getInitials(peerName)}
          </div>

          <div className="text-center">
            <p className="text-white text-lg font-semibold">{peerName}</p>
            <p className="text-white/60 text-sm mt-1">Calling...</p>
          </div>

          {/* Local video preview (if video call) */}
          {isVideo && (
            <div
              className="w-48 h-36 rounded-xl overflow-hidden border-2"
              style={{ borderColor: 'rgba(212, 160, 23, 0.4)' }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
          )}

          <button
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full flex items-center justify-center mt-4 transition-transform hover:scale-110"
            style={{ background: '#CE1126' }}
            title="End call"
          >
            <PhoneOff size={22} className="text-white" />
          </button>
        </div>
      )}

      {/* ── Connected ── */}
      {state === 'connected' && (
        <div className="flex flex-col items-center w-full h-full relative">
          {/* Remote video / audio avatar */}
          <div className="flex-1 w-full flex items-center justify-center relative">
            {isVideo ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
                style={{ maxHeight: '100%' }}
              />
            ) : (
              /* Audio-only: large avatar with waveform */
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                  style={{ background: 'linear-gradient(135deg, #D4A017, #006B3F)' }}
                >
                  {getInitials(peerName)}
                </div>
                {/* Waveform animation */}
                <div className="flex items-end gap-1 h-8">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full"
                      style={{
                        background: '#D4A017',
                        animation: `gcWaveform 1.2s ease-in-out ${i * 0.15}s infinite`,
                        height: 8,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Local PiP video (draggable) */}
            {isVideo && (
              <div
                className="absolute rounded-xl overflow-hidden border-2 cursor-move shadow-lg"
                style={{
                  width: 140,
                  height: 105,
                  bottom: pipPosition.y,
                  right: pipPosition.x,
                  borderColor: 'rgba(212, 160, 23, 0.5)',
                  zIndex: 10,
                }}
                onMouseDown={handlePipMouseDown}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {isCameraOff && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                  >
                    <VideoOff size={20} className="text-white/60" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info + controls bar */}
          <div
            className="w-full px-6 py-4 flex flex-col items-center gap-3 shrink-0"
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Peer name + duration */}
            <div className="flex items-center gap-4">
              <span className="text-white text-sm font-semibold">{peerName}</span>
              <span
                className="text-xs font-mono px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(212, 160, 23, 0.2)', color: '#D4A017' }}
              >
                {formatDuration(duration)}
              </span>
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-4">
              {/* Mute toggle */}
              <button
                onClick={handleToggleMute}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: isMuted ? '#CE1126' : 'rgba(255, 255, 255, 0.15)',
                }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <MicOff size={18} className="text-white" />
                ) : (
                  <Mic size={18} className="text-white" />
                )}
              </button>

              {/* Camera toggle (video calls only) */}
              {isVideo && (
                <button
                  onClick={handleToggleCamera}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: isCameraOff ? '#CE1126' : 'rgba(255, 255, 255, 0.15)',
                  }}
                  title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {isCameraOff ? (
                    <VideoOff size={18} className="text-white" />
                  ) : (
                    <Video size={18} className="text-white" />
                  )}
                </button>
              )}

              {/* End call */}
              <button
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{ background: '#CE1126' }}
                title="End call"
              >
                <PhoneOff size={22} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Animations ── */}
      <style>{`
        @keyframes gcCallPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212, 160, 23, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(212, 160, 23, 0); }
        }
        @keyframes gcWaveform {
          0%, 100% { height: 8px; }
          50% { height: 24px; }
        }
        .animate-fadeIn {
          animation: gcFadeIn 0.3s ease-out;
        }
        @keyframes gcFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
