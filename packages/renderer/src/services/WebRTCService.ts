/**
 * WebRTC Service for GovChat 1:1 Video/Audio Calling
 *
 * Manages peer connections, media streams, and call signaling via the
 * Cloudflare Worker REST API. Uses polling for signal exchange since
 * Matrix sync is not yet reliable due to CSP constraints.
 */
import type { GovChatCredentials } from '@/types/govchat';
import { API_BASE_URL } from '@/lib/api-config';
import { useNotificationStore } from '@/store/notifications';

type CallEventCallback = (data: unknown) => void;

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const WORKER_URL = API_BASE_URL;

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export interface CallInfo {
  callId: string;
  peerId: string;
  peerName: string;
  isVideo: boolean;
  isIncoming: boolean;
  state: CallState;
  startedAt: number;
}

class WebRTCServiceClass {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCall: CallInfo | null = null;
  private listeners = new Map<string, Set<CallEventCallback>>();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private incomingPollInterval: ReturnType<typeof setInterval> | null = null;
  private credentials: GovChatCredentials | null = null;

  // ── Event emitter ──

  on(event: string, cb: CallEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => {
      this.listeners.get(event)?.delete(cb);
    };
  }

  private emit(event: string, data: unknown): void {
    const cbs = this.listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[WebRTC] Error in ${event} listener:`, err);
        }
      }
    }
  }

  // ── Credentials ──

  setCredentials(creds: GovChatCredentials): void {
    this.credentials = creds;
  }

  // ── Accessors ──

  get call(): CallInfo | null {
    return this.currentCall;
  }

  get localMediaStream(): MediaStream | null {
    return this.localStream;
  }

  get remoteMediaStream(): MediaStream | null {
    return this.remoteStream;
  }

  // ── Start an outgoing call ──

  async startCall(peerId: string, peerName: string, isVideo: boolean): Promise<void> {
    if (this.currentCall) {
      console.warn('[WebRTC] Already in a call');
      return;
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.currentCall = {
      callId,
      peerId,
      peerName,
      isVideo,
      isIncoming: false,
      state: 'calling',
      startedAt: Date.now(),
    };
    this.emit('call:state', { ...this.currentCall });

    try {
      // Acquire local media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
      });
      this.emit('call:localStream', this.localStream);

      // Create peer connection
      this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      this.setupPeerConnection();

      // Add local tracks to connection
      for (const track of this.localStream.getTracks()) {
        this.pc.addTrack(track, this.localStream);
      }

      // Create and set local offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Send offer via worker signaling
      await this.sendSignal(peerId, callId, 'offer', {
        sdp: offer.sdp,
        type: offer.type,
        isVideo,
        callerName: this.credentials?.staffId ?? 'Unknown',
      });

      // Poll for answer
      this.startPolling(callId);
    } catch (err) {
      console.error('[WebRTC] Failed to start call:', err);
      this.cleanup();
      throw err;
    }
  }

  // ── Accept an incoming call ──

  async acceptCall(
    callId: string,
    offer: RTCSessionDescriptionInit,
    isVideo: boolean,
  ): Promise<void> {
    if (!this.currentCall || this.currentCall.callId !== callId) return;

    this.currentCall.state = 'connected';
    this.emit('call:state', { ...this.currentCall });

    try {
      // Acquire local media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
      });
      this.emit('call:localStream', this.localStream);

      // Create peer connection
      this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      this.setupPeerConnection();

      // Add local tracks
      for (const track of this.localStream.getTracks()) {
        this.pc.addTrack(track, this.localStream);
      }

      // Set remote description (the offer)
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and set local answer
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      // Send answer to caller
      await this.sendSignal(this.currentCall.peerId, callId, 'answer', {
        sdp: answer.sdp,
        type: answer.type,
      });

      // Start polling for ICE candidates and hangup
      this.startPolling(callId);
    } catch (err) {
      console.error('[WebRTC] Failed to accept call:', err);
      this.cleanup();
      throw err;
    }
  }

  // ── End / reject a call ──

  endCall(): void {
    if (this.currentCall) {
      this.sendSignal(
        this.currentCall.peerId,
        this.currentCall.callId,
        'hangup',
        {},
      ).catch(() => {});
      this.currentCall.state = 'ended';
      this.emit('call:state', { ...this.currentCall });
    }
    this.cleanup();
  }

  // ── Media toggles ──

  toggleMute(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled; // true = muted
    }
    return false;
  }

  toggleCamera(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return !videoTrack.enabled; // true = camera off
    }
    return false;
  }

  // ── Incoming call polling (called once after login) ──

  startIncomingCallPolling(): void {
    this.stopIncomingCallPolling();
    this.incomingPollInterval = setInterval(async () => {
      if (!this.credentials || this.currentCall) return;
      try {
        const res = await fetch(`${WORKER_URL}/api/v1/govchat/calls/incoming`, {
          headers: { Authorization: `Bearer ${this.credentials.accessToken}` },
        });
        if (!res.ok) return;
        const { call } = (await res.json()) as {
          call: {
            callId: string;
            callerId: string;
            callerName: string;
            isVideo: boolean;
            offer: RTCSessionDescriptionInit;
          } | null;
        };
        if (call) {
          this.currentCall = {
            callId: call.callId,
            peerId: call.callerId,
            peerName: call.callerName,
            isVideo: call.isVideo,
            isIncoming: true,
            state: 'ringing',
            startedAt: Date.now(),
          };
          this.emit('call:incoming', {
            ...this.currentCall,
            offer: call.offer,
          });
          this.emit('call:state', { ...this.currentCall });

          useNotificationStore.getState().addNotification({
            type: 'call',
            title: `Incoming call from ${call.callerName}`,
            message: call.isVideo ? 'Video call' : 'Audio call',
            source: 'govchat',
            icon: '\u{1F4DE}',
            actionLabel: 'Answer',
            actionRoute: 'govchat',
          });
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 10000);
  }

  stopIncomingCallPolling(): void {
    if (this.incomingPollInterval) {
      clearInterval(this.incomingPollInterval);
      this.incomingPollInterval = null;
    }
  }

  // ── Private: peer connection event handlers ──

  private setupPeerConnection(): void {
    if (!this.pc) return;

    this.pc.ontrack = (event) => {
      this.remoteStream = event.streams[0] ?? new MediaStream([event.track]);
      this.emit('call:remoteStream', this.remoteStream);
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.currentCall) {
        this.sendSignal(
          this.currentCall.peerId,
          this.currentCall.callId,
          'ice-candidate',
          event.candidate.toJSON(),
        ).catch(() => {});
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (state === 'connected' && this.currentCall) {
        this.currentCall.state = 'connected';
        this.emit('call:state', { ...this.currentCall });
      } else if (state === 'failed' || state === 'disconnected') {
        this.endCall();
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc?.iceConnectionState === 'failed') {
        this.endCall();
      }
    };
  }

  // ── Private: send signaling data via worker API ──

  private async sendSignal(
    peerId: string,
    callId: string,
    type: string,
    data: unknown,
  ): Promise<void> {
    if (!this.credentials) return;
    const res = await fetch(`${WORKER_URL}/api/v1/govchat/calls/signal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.credentials.accessToken}`,
      },
      body: JSON.stringify({ peerId, callId, type, data }),
    });
    if (!res.ok) {
      console.warn(`[WebRTC] Signal send failed: ${res.status}`);
    }
  }

  // ── Private: poll for signals addressed to this call ──

  private startPolling(callId: string): void {
    this.stopPolling();
    this.pollInterval = setInterval(async () => {
      if (!this.credentials) return;
      try {
        const res = await fetch(
          `${WORKER_URL}/api/v1/govchat/calls/poll?callId=${callId}`,
          {
            headers: { Authorization: `Bearer ${this.credentials.accessToken}` },
          },
        );
        if (!res.ok) return;
        const { signals } = (await res.json()) as {
          signals: Array<{ type: string; data: Record<string, unknown> }>;
        };
        for (const signal of signals) {
          await this.handleSignal(signal);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 1000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // ── Private: handle an incoming signal ──

  private async handleSignal(signal: {
    type: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    try {
      if (signal.type === 'answer' && this.pc) {
        await this.pc.setRemoteDescription(
          new RTCSessionDescription(signal.data as unknown as RTCSessionDescriptionInit),
        );
        if (this.currentCall) {
          this.currentCall.state = 'connected';
          this.emit('call:state', { ...this.currentCall });
        }
      } else if (signal.type === 'ice-candidate' && this.pc) {
        await this.pc.addIceCandidate(
          new RTCIceCandidate(signal.data as unknown as RTCIceCandidateInit),
        );
      } else if (signal.type === 'hangup') {
        this.endCall();
      }
    } catch (err) {
      console.error('[WebRTC] Error handling signal:', signal.type, err);
    }
  }

  // ── Private: full cleanup ──

  private cleanup(): void {
    this.stopPolling();
    this.stopIncomingCallPolling();
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
    this.remoteStream = null;
    this.pc?.close();
    this.pc = null;
    this.currentCall = null;
    this.emit('call:state', null);
    this.emit('call:localStream', null);
    this.emit('call:remoteStream', null);
  }
}

export const WebRTCService = new WebRTCServiceClass();
