import type { Env, Message } from '../types';

const MAX_MESSAGES_PER_CONVERSATION = 500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_SENDS = 60;
const MAX_MESSAGE_LENGTH = 4_000;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class ChatRoom implements DurableObject {
  private storage: DurableObjectStorage;
  private sessions: Map<string, WebSocket>;
  private env: Env;
  private rateLimits: Map<string, RateLimitEntry>;

  constructor(state: DurableObjectState, env: Env) {
    this.storage = state.storage;
    this.sessions = new Map();
    this.env = env;
    this.rateLimits = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/websocket') {
        return this.handleWebSocket(url);
      }

      if (url.pathname === '/messages' && request.method === 'GET') {
        const before = url.searchParams.get('before');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
        const history = await this.getHistory();

        let filtered = history;
        if (before) {
          const beforeTs = parseInt(before, 10);
          filtered = history.filter((m) => m.timestamp < beforeTs);
        }

        const page = filtered.slice(-limit);
        return Response.json({ messages: page, total: history.length });
      }

      if (url.pathname === '/info' && request.method === 'GET') {
        const history = await this.getHistory();
        return Response.json({
          messageCount: history.length,
          connectedUsers: Array.from(this.sessions.keys()),
        });
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      return Response.json({ error: message }, { status: 500 });
    }
  }

  private handleWebSocket(url: URL): Response {
    const userId = url.searchParams.get('userId');
    if (!userId || userId.length < 1 || userId.length > 128) {
      return Response.json({ error: 'Invalid or missing userId parameter' }, { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();

    // Close any existing connection for this user (only one session per user per room)
    const existing = this.sessions.get(userId);
    if (existing) {
      try {
        existing.close(1000, 'Replaced by new connection');
      } catch {
        // Already closed
      }
    }

    this.sessions.set(userId, server);

    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleMessage(userId, data, server);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process message';
        server.send(JSON.stringify({ type: 'error', error: message }));
      }
    });

    server.addEventListener('close', () => {
      this.sessions.delete(userId);
      this.rateLimits.delete(userId);
      this.broadcast({ type: 'user_offline', userId, timestamp: Date.now() });
    });

    server.addEventListener('error', () => {
      this.sessions.delete(userId);
      this.rateLimits.delete(userId);
    });

    // Send history and notify peers asynchronously (don't block the upgrade)
    this.sendInitialData(userId, server);

    return new Response(null, { status: 101, webSocket: client });
  }

  private async sendInitialData(userId: string, server: WebSocket): Promise<void> {
    try {
      const history = await this.getHistory();
      const recent = history.slice(-50);
      server.send(
        JSON.stringify({
          type: 'history',
          messages: recent,
          total: history.length,
          hasMore: history.length > 50,
        })
      );

      // Notify others that this user is online
      this.broadcast(
        { type: 'user_online', userId, timestamp: Date.now() },
        userId
      );
    } catch {
      // Connection may have closed before we could send
    }
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(userId);

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      this.rateLimits.set(userId, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= RATE_LIMIT_MAX_SENDS) {
      return false;
    }

    entry.count++;
    return true;
  }

  private async handleMessage(
    senderId: string,
    data: Record<string, unknown>,
    senderSocket: WebSocket
  ): Promise<void> {
    const type = data.type;

    if (typeof type !== 'string') {
      senderSocket.send(
        JSON.stringify({ type: 'error', error: 'Missing message type' })
      );
      return;
    }

    switch (type) {
      case 'message':
        await this.handleChatMessage(senderId, data, senderSocket);
        break;

      case 'typing':
        this.broadcast(
          { type: 'typing', userId: senderId, timestamp: Date.now() },
          senderId
        );
        break;

      case 'stop_typing':
        this.broadcast(
          { type: 'stop_typing', userId: senderId, timestamp: Date.now() },
          senderId
        );
        break;

      case 'read_receipt':
        await this.handleReadReceipt(senderId, data);
        break;

      case 'ping':
        senderSocket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      case 'load_more': {
        const before = typeof data.before === 'number' ? data.before : Date.now();
        const limit = Math.min(
          typeof data.limit === 'number' ? data.limit : 50,
          100
        );
        const history = await this.getHistory();
        const older = history.filter((m) => m.timestamp < before).slice(-limit);
        senderSocket.send(
          JSON.stringify({ type: 'history', messages: older, hasMore: older.length === limit })
        );
        break;
      }

      default:
        senderSocket.send(
          JSON.stringify({ type: 'error', error: `Unknown message type: ${type}` })
        );
    }
  }

  private async handleChatMessage(
    senderId: string,
    data: Record<string, unknown>,
    senderSocket: WebSocket
  ): Promise<void> {
    // Rate limit check
    if (!this.checkRateLimit(senderId)) {
      senderSocket.send(
        JSON.stringify({
          type: 'error',
          error: 'Rate limit exceeded. Max 60 messages per minute.',
          code: 'RATE_LIMIT',
        })
      );
      return;
    }

    // Validate text
    const text = data.text;
    if (typeof text !== 'string' || text.trim().length === 0) {
      senderSocket.send(
        JSON.stringify({ type: 'error', error: 'Message text is required and must be non-empty' })
      );
      return;
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      senderSocket.send(
        JSON.stringify({
          type: 'error',
          error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
        })
      );
      return;
    }

    // Validate optional encrypted payload
    const isEncrypted = data.isEncrypted === true;
    const encryptedText =
      isEncrypted && typeof data.encryptedText === 'string'
        ? data.encryptedText
        : undefined;

    if (isEncrypted && !encryptedText) {
      senderSocket.send(
        JSON.stringify({
          type: 'error',
          error: 'encryptedText is required when isEncrypted is true',
        })
      );
      return;
    }

    const message: Message = {
      id: crypto.randomUUID(),
      senderId,
      text: isEncrypted ? '[Encrypted]' : text.trim(),
      timestamp: Date.now(),
      status: 'delivered',
      isEncrypted,
      ...(encryptedText ? { encryptedText } : {}),
    };

    // Persist
    const messages = await this.getHistory();
    messages.push(message);

    // Enforce maximum stored messages
    if (messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      messages.splice(0, messages.length - MAX_MESSAGES_PER_CONVERSATION);
    }

    await this.storage.put('messages', messages);

    // Acknowledge to sender
    senderSocket.send(
      JSON.stringify({ type: 'message_ack', messageId: message.id, timestamp: message.timestamp })
    );

    // Broadcast to all (including sender, so their UI confirms delivery)
    this.broadcast({ type: 'new_message', message });
  }

  private async handleReadReceipt(
    senderId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const messageId = data.messageId;
    if (typeof messageId !== 'string') return;

    const messages = await this.getHistory();
    const msg = messages.find((m) => m.id === messageId);
    if (msg && msg.senderId !== senderId && msg.status !== 'read') {
      msg.status = 'read';
      await this.storage.put('messages', messages);
    }

    this.broadcast({
      type: 'read_receipt',
      messageId,
      userId: senderId,
      timestamp: Date.now(),
    });
  }

  private broadcast(data: Record<string, unknown>, excludeUserId?: string): void {
    const payload = JSON.stringify(data);
    for (const [userId, socket] of this.sessions) {
      if (userId !== excludeUserId) {
        try {
          socket.send(payload);
        } catch {
          this.sessions.delete(userId);
        }
      }
    }
  }

  private async getHistory(): Promise<Message[]> {
    return (await this.storage.get<Message[]>('messages')) || [];
  }
}
