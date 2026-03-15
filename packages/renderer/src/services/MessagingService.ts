/**
 * MessagingService — singleton WebSocket service for real-time messaging.
 *
 * Manages WebSocket connections per conversation, REST API calls, auth,
 * and automatic reconnection with exponential backoff.
 */

import type { Contact, Conversation, Message } from '@/store/messaging';

const WORKER_URL = 'https://os-browser-worker.ghwmelite.workers.dev';
const WS_URL = 'wss://os-browser-worker.ghwmelite.workers.dev';

const LS_KEY_USER_ID = 'ozzy_msg_userId';
const LS_KEY_TOKEN = 'ozzy_msg_token';
const LS_KEY_EMAIL = 'ozzy_msg_email';

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

type EventCallback = (data: unknown) => void;

interface ReconnectState {
  attempt: number;
  timer: ReturnType<typeof setTimeout> | null;
}

class MessagingServiceClass {
  private sockets: Map<string, WebSocket> = new Map();
  private userId: string | null = null;
  private token: string | null = null;
  private email: string | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectState: Map<string, ReconnectState> = new Map();

  constructor() {
    // Restore persisted credentials
    try {
      this.userId = localStorage.getItem(LS_KEY_USER_ID);
      this.token = localStorage.getItem(LS_KEY_TOKEN);
      this.email = localStorage.getItem(LS_KEY_EMAIL);
    } catch {
      // localStorage unavailable — stay unauthenticated
    }
  }

  /* ──────────────── Auth ──────────────── */

  async register(
    email: string,
    name: string,
    department: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${WORKER_URL}/api/v1/messaging/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, department }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error ?? 'Registration failed' };
      }
      this.email = email;
      return { success: true, message: data.message ?? 'Verification code sent' };
    } catch (err) {
      return { success: false, message: 'Network error — please try again' };
    }
  }

  async verify(
    email: string,
    code: string,
  ): Promise<{ success: boolean; userId: string; token: string; message?: string }> {
    try {
      const res = await fetch(`${WORKER_URL}/api/v1/messaging/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, userId: '', token: '', message: data.error ?? 'Verification failed' };
      }
      const { userId, token } = data;
      this.setCredentials(userId, token);
      this.email = email;
      try {
        localStorage.setItem(LS_KEY_EMAIL, email);
      } catch { /* noop */ }
      return { success: true, userId, token };
    } catch {
      return { success: false, userId: '', token: '', message: 'Network error — please try again' };
    }
  }

  setCredentials(userId: string, token: string): void {
    this.userId = userId;
    this.token = token;
    try {
      localStorage.setItem(LS_KEY_USER_ID, userId);
      localStorage.setItem(LS_KEY_TOKEN, token);
    } catch { /* noop */ }
  }

  clearCredentials(): void {
    this.userId = null;
    this.token = null;
    this.email = null;
    try {
      localStorage.removeItem(LS_KEY_USER_ID);
      localStorage.removeItem(LS_KEY_TOKEN);
      localStorage.removeItem(LS_KEY_EMAIL);
    } catch { /* noop */ }
    this.disconnectAll();
  }

  get isAuthenticated(): boolean {
    return !!(this.userId && this.token);
  }

  get currentUserId(): string | null {
    return this.userId;
  }

  get currentEmail(): string | null {
    return this.email;
  }

  /* ──────────────── REST API ──────────────── */

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  async getContacts(): Promise<Contact[]> {
    try {
      const res = await fetch(`${WORKER_URL}/api/v1/messaging/contacts`, {
        headers: this.authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch contacts');
      const data = await res.json();
      return data.contacts ?? data;
    } catch (err) {
      this.emit('error', { message: 'Failed to load contacts' });
      return [];
    }
  }

  async getConversations(): Promise<Conversation[]> {
    try {
      const res = await fetch(`${WORKER_URL}/api/v1/messaging/conversations`, {
        headers: this.authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = await res.json();
      return data.conversations ?? data;
    } catch (err) {
      this.emit('error', { message: 'Failed to load conversations' });
      return [];
    }
  }

  async createConversation(participantIds: string[]): Promise<{ conversationId: string }> {
    try {
      const res = await fetch(`${WORKER_URL}/api/v1/messaging/conversations`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ participantIds }),
      });
      if (!res.ok) throw new Error('Failed to create conversation');
      return await res.json();
    } catch (err) {
      this.emit('error', { message: 'Failed to create conversation' });
      return { conversationId: '' };
    }
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const res = await fetch(
        `${WORKER_URL}/api/v1/messaging/conversations/${conversationId}/messages`,
        { headers: this.authHeaders() },
      );
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      return data.messages ?? data;
    } catch (err) {
      this.emit('error', { message: 'Failed to load messages' });
      return [];
    }
  }

  /* ──────────────── WebSocket ──────────────── */

  connectToConversation(conversationId: string): void {
    if (this.sockets.has(conversationId)) return;
    if (!this.userId || !this.token) {
      this.emit('error', { message: 'Not authenticated' });
      return;
    }

    this.emit('connecting', { conversationId });

    const url = `${WS_URL}/api/v1/messaging/ws/${conversationId}?userId=${encodeURIComponent(this.userId)}&token=${encodeURIComponent(this.token)}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.emit('error', { message: `Failed to open WebSocket for ${conversationId}` });
      this.scheduleReconnect(conversationId);
      return;
    }

    this.sockets.set(conversationId, ws);

    ws.onopen = () => {
      // Reset reconnect counter on successful connect
      this.reconnectState.delete(conversationId);
      this.emit('connected', { conversationId });
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(typeof event.data === 'string' ? event.data : '');
        this.handleWsMessage(conversationId, payload);
      } catch {
        // ignore unparseable frames
      }
    };

    ws.onerror = () => {
      this.emit('error', { message: `WebSocket error on ${conversationId}` });
    };

    ws.onclose = () => {
      this.sockets.delete(conversationId);
      this.emit('disconnected', { conversationId });
      this.scheduleReconnect(conversationId);
    };
  }

  private handleWsMessage(conversationId: string, payload: { type: string; [key: string]: unknown }): void {
    switch (payload.type) {
      case 'new_message':
        this.emit('message:received', { conversationId, message: payload.message ?? payload });
        break;
      case 'typing':
        this.emit('typing', { conversationId, userId: payload.userId });
        break;
      case 'read_receipt':
        this.emit('read_receipt', { conversationId, messageId: payload.messageId, userId: payload.userId });
        break;
      case 'user_online':
        this.emit('user_online', { userId: payload.userId });
        break;
      case 'user_offline':
        this.emit('user_offline', { userId: payload.userId });
        break;
      case 'history':
        this.emit('history', { conversationId, messages: payload.messages });
        break;
      default:
        break;
    }
  }

  disconnectFromConversation(conversationId: string): void {
    const ws = this.sockets.get(conversationId);
    if (ws) {
      ws.onclose = null; // prevent reconnect
      ws.close();
      this.sockets.delete(conversationId);
    }
    // Cancel pending reconnect
    const state = this.reconnectState.get(conversationId);
    if (state?.timer) clearTimeout(state.timer);
    this.reconnectState.delete(conversationId);
  }

  disconnectAll(): void {
    for (const id of [...this.sockets.keys()]) {
      this.disconnectFromConversation(id);
    }
  }

  /* ──────────────── Send via WebSocket ──────────────── */

  sendMessage(conversationId: string, text: string, encryptedText?: string): void {
    const ws = this.sockets.get(conversationId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      this.emit('error', { message: 'Not connected — message will be retried' });
      return;
    }
    ws.send(
      JSON.stringify({
        type: 'new_message',
        text,
        ...(encryptedText ? { encryptedText } : {}),
        senderId: this.userId,
        timestamp: Date.now(),
      }),
    );
  }

  sendTyping(conversationId: string): void {
    const ws = this.sockets.get(conversationId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'typing', userId: this.userId }));
  }

  sendReadReceipt(conversationId: string, messageId: string): void {
    const ws = this.sockets.get(conversationId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'read_receipt', messageId, userId: this.userId }));
  }

  /* ──────────────── Event system ──────────────── */

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch {
        // Don't let a bad listener break the service
      }
    });
  }

  /* ──────────────── Connection status ──────────────── */

  isConnected(conversationId: string): boolean {
    const ws = this.sockets.get(conversationId);
    return ws?.readyState === WebSocket.OPEN;
  }

  get connectedConversations(): string[] {
    return [...this.sockets.entries()]
      .filter(([, ws]) => ws.readyState === WebSocket.OPEN)
      .map(([id]) => id);
  }

  /* ──────────────── Reconnect ──────────────── */

  private scheduleReconnect(conversationId: string): void {
    if (!this.isAuthenticated) return;

    const current = this.reconnectState.get(conversationId) ?? { attempt: 0, timer: null };
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, current.attempt), RECONNECT_MAX_MS);

    current.attempt += 1;
    current.timer = setTimeout(() => {
      this.sockets.delete(conversationId); // ensure stale entry is gone
      this.connectToConversation(conversationId);
    }, delay);

    this.reconnectState.set(conversationId, current);
  }
}

export const MessagingService = new MessagingServiceClass();
