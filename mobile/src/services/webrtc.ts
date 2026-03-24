/* ================================================================
   WebRTC Calling Service — polling-based signaling via CF Worker
   ================================================================ */

const API_BASE = 'https://os-browser-worker.ghwmelite.workers.dev/api/v1';

// ── Types ──────────────────────────────────────────────────────────

export interface CallInfo {
  callId: string;
  peerId: string;
  peerName: string;
  isVideo: boolean;
  isIncoming: boolean;
  state: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  startedAt: number;
}

type CallEventCallback = (data: any) => void;

// ── Service ────────────────────────────────────────────────────────

class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCall: CallInfo | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private incomingPollInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<string, Set<CallEventCallback>> = new Map();
  private credentials: { accessToken: string; userId: string } | null = null;

  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // ── Credentials ──────────────────────────────────────────────────

  setCredentials(creds: { accessToken: string; userId: string }) {
    this.credentials = creds;
  }

  // ── Event emitter ────────────────────────────────────────────────

  on(event: string, cb: CallEventCallback): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => { this.listeners.get(event)?.delete(cb); };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error('[WebRTC] listener error', e); }
    });
  }

  // ── Auth header ──────────────────────────────────────────────────

  private getToken(): string {
    return localStorage.getItem('os_mobile_token') || '';
  }

  private authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.getToken()}`,
    };
  }

  // ── Outgoing call ────────────────────────────────────────────────

  async startCall(peerId: string, peerName: string, isVideo: boolean): Promise<void> {
    if (this.currentCall && this.currentCall.state !== 'idle' && this.currentCall.state !== 'ended') {
      throw new Error('Call already in progress');
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
      // 1. Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      this.emit('call:localStream', this.localStream);

      // 2. Create peer connection
      this.createPeerConnection();

      // 3. Add local tracks
      for (const track of this.localStream.getTracks()) {
        this.pc!.addTrack(track, this.localStream);
      }

      // 4. Create offer
      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);

      // 5. Send offer signal
      await this.sendSignal('offer', {
        sdp: offer.sdp,
        type: offer.type,
        isVideo,
        callerName: this.credentials?.userId || 'Unknown',
      });

      // 6. Start polling for answer
      this.startSignalPolling(callId);

    } catch (err: any) {
      console.error('[WebRTC] startCall error', err);
      this.endCall();
      throw err;
    }
  }

  // ── Accept incoming call ─────────────────────────────────────────

  async acceptCall(callId: string, offer: RTCSessionDescriptionInit, isVideo: boolean, peerId: string, peerName: string): Promise<void> {
    this.currentCall = {
      callId,
      peerId,
      peerName,
      isVideo,
      isIncoming: true,
      state: 'connected',
      startedAt: Date.now(),
    };

    this.emit('call:state', { ...this.currentCall });

    try {
      // 1. Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      this.emit('call:localStream', this.localStream);

      // 2. Create peer connection
      this.createPeerConnection();

      // 3. Set remote description (offer)
      await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));

      // 4. Add local tracks
      for (const track of this.localStream.getTracks()) {
        this.pc!.addTrack(track, this.localStream);
      }

      // 5. Create and set answer
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);

      // 6. Send answer signal
      await this.sendSignal('answer', {
        sdp: answer.sdp,
        type: answer.type,
      });

      // 7. Start polling for ICE candidates / hangup
      this.startSignalPolling(callId);

    } catch (err: any) {
      console.error('[WebRTC] acceptCall error', err);
      this.endCall();
      throw err;
    }
  }

  // ── End call ─────────────────────────────────────────────────────

  endCall(): void {
    // Send hangup signal (best-effort)
    if (this.currentCall && this.currentCall.state !== 'ended' && this.currentCall.state !== 'idle') {
      this.sendSignal('hangup', {}).catch(() => {});
    }

    this.stopSignalPolling();

    // Close peer connection
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    // Stop local media
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) track.stop();
      this.localStream = null;
    }

    this.remoteStream = null;

    if (this.currentCall) {
      this.currentCall.state = 'ended';
      this.emit('call:state', { ...this.currentCall });
    }

    // Reset after brief delay (so UI can show "ended" state)
    setTimeout(() => {
      this.currentCall = null;
      this.emit('call:state', null);
    }, 2000);
  }

  // ── Media controls ───────────────────────────────────────────────

  toggleMute(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const muted = !audioTrack.enabled;
      this.emit('call:muted', muted);
      return muted;
    }
    return false;
  }

  toggleCamera(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const off = !videoTrack.enabled;
      this.emit('call:cameraOff', off);
      return off;
    }
    return false;
  }

  // ── Incoming call polling ────────────────────────────────────────

  startIncomingCallPolling(): void {
    if (this.incomingPollInterval) return;

    const poll = async () => {
      if (this.currentCall && this.currentCall.state !== 'idle' && this.currentCall.state !== 'ended') {
        return; // Don't poll when already in a call
      }

      try {
        const res = await fetch(`${API_BASE}/govchat/calls/incoming`, {
          headers: this.authHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data && data.callId && data.offer) {
          this.currentCall = {
            callId: data.callId,
            peerId: data.callerId || data.peerId || '',
            peerName: data.callerName || data.peerName || 'Unknown',
            isVideo: data.isVideo || data.offer?.isVideo || false,
            isIncoming: true,
            state: 'ringing',
            startedAt: Date.now(),
          };

          this.emit('call:incoming', {
            callId: data.callId,
            peerId: this.currentCall.peerId,
            peerName: this.currentCall.peerName,
            isVideo: this.currentCall.isVideo,
            offer: {
              sdp: data.offer.sdp,
              type: data.offer.type,
            },
          });
          this.emit('call:state', { ...this.currentCall });
        }
      } catch {
        // Silently fail — will retry next interval
      }
    };

    poll();
    this.incomingPollInterval = setInterval(poll, 10000);
  }

  stopIncomingCallPolling(): void {
    if (this.incomingPollInterval) {
      clearInterval(this.incomingPollInterval);
      this.incomingPollInterval = null;
    }
  }

  // ── Private: signal polling during a call ────────────────────────

  private startSignalPolling(callId: string): void {
    this.stopSignalPolling();

    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/govchat/calls/poll?callId=${encodeURIComponent(callId)}`, {
          headers: this.authHeaders(),
        });
        if (!res.ok) return;
        const signals = await res.json();
        if (!Array.isArray(signals)) return;

        for (const signal of signals) {
          await this.handleSignal(signal);
        }
      } catch {
        // Will retry next tick
      }
    }, 1000);
  }

  private stopSignalPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async handleSignal(signal: any): Promise<void> {
    if (!this.pc || !this.currentCall) return;

    switch (signal.type) {
      case 'answer': {
        if (this.pc.signalingState === 'have-local-offer') {
          await this.pc.setRemoteDescription(new RTCSessionDescription({
            sdp: signal.payload.sdp,
            type: signal.payload.type,
          }));
          this.currentCall.state = 'connected';
          this.currentCall.startedAt = Date.now();
          this.emit('call:state', { ...this.currentCall });
        }
        break;
      }
      case 'ice-candidate': {
        if (signal.payload.candidate) {
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(signal.payload));
          } catch { /* ignore invalid candidates */ }
        }
        break;
      }
      case 'hangup': {
        this.endCall();
        break;
      }
    }
  }

  // ── Private: send signal ─────────────────────────────────────────

  private async sendSignal(type: string, payload: any): Promise<void> {
    if (!this.currentCall) return;

    await fetch(`${API_BASE}/govchat/calls/signal`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        callId: this.currentCall.callId,
        peerId: this.currentCall.peerId,
        type,
        payload,
      }),
    });
  }

  // ── Private: create peer connection ──────────────────────────────

  private createPeerConnection(): void {
    this.pc = new RTCPeerConnection({ iceServers: this.iceServers });

    // Remote stream
    this.remoteStream = new MediaStream();

    this.pc.ontrack = (event) => {
      for (const track of event.streams[0]?.getTracks() || []) {
        this.remoteStream!.addTrack(track);
      }
      this.emit('call:remoteStream', this.remoteStream);
    };

    // ICE candidates — send to peer
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal('ice-candidate', event.candidate.toJSON()).catch(() => {});
      }
    };

    // Connection state changes
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (state === 'connected' && this.currentCall) {
        this.currentCall.state = 'connected';
        this.emit('call:state', { ...this.currentCall });
      } else if (state === 'disconnected' || state === 'failed') {
        this.endCall();
      }
    };
  }

  // ── Accessors ────────────────────────────────────────────────────

  get call(): CallInfo | null {
    return this.currentCall;
  }

  get localMediaStream(): MediaStream | null {
    return this.localStream;
  }

  get remoteMediaStream(): MediaStream | null {
    return this.remoteStream;
  }
}

export const webRTCService = new WebRTCService();
