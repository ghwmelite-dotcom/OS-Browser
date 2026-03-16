/**
 * @deprecated GovChat uses Matrix homeserver for presence. This Durable Object is kept
 * for reference during migration and will be removed once GovChat is fully verified.
 */
import type { Env } from '../types';

interface PresenceRecord {
  userId: string;
  online: boolean;
  lastSeen: number;
  connectedRooms: string[];
}

export class UserPresence implements DurableObject {
  private storage: DurableObjectStorage;
  private subscribers: Map<string, WebSocket>; // userId -> socket for presence updates
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.storage = state.storage;
    this.subscribers = new Map();
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case '/online': {
          if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
          }
          const body = (await request.json()) as {
            userId: string;
            roomId?: string;
          };
          if (!body.userId || typeof body.userId !== 'string') {
            return Response.json({ error: 'userId is required' }, { status: 400 });
          }
          await this.setOnline(body.userId, body.roomId);
          return Response.json({ success: true });
        }

        case '/offline': {
          if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
          }
          const body = (await request.json()) as {
            userId: string;
            roomId?: string;
          };
          if (!body.userId || typeof body.userId !== 'string') {
            return Response.json({ error: 'userId is required' }, { status: 400 });
          }
          await this.setOffline(body.userId, body.roomId);
          return Response.json({ success: true });
        }

        case '/status': {
          const userId = url.searchParams.get('userId');
          if (!userId) {
            return Response.json({ error: 'userId query param required' }, { status: 400 });
          }
          const status = await this.getStatus(userId);
          return Response.json(status);
        }

        case '/online-users': {
          const users = await this.getOnlineUsers();
          return Response.json({ users });
        }

        case '/bulk-status': {
          if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
          }
          const body = (await request.json()) as { userIds: string[] };
          if (!Array.isArray(body.userIds)) {
            return Response.json({ error: 'userIds array required' }, { status: 400 });
          }
          const statuses: Record<string, PresenceRecord> = {};
          for (const uid of body.userIds.slice(0, 100)) {
            statuses[uid] = await this.getStatus(uid);
          }
          return Response.json({ statuses });
        }

        case '/subscribe': {
          return this.handleSubscribe(url);
        }

        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      return Response.json({ error: message }, { status: 500 });
    }
  }

  private handleSubscribe(url: URL): Response {
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();

    // Replace any existing subscription for this user
    const existing = this.subscribers.get(userId);
    if (existing) {
      try {
        existing.close(1000, 'Replaced');
      } catch {
        // Already closed
      }
    }

    this.subscribers.set(userId, server);

    server.addEventListener('close', () => {
      this.subscribers.delete(userId);
    });

    server.addEventListener('error', () => {
      this.subscribers.delete(userId);
    });

    // Send current online users list on connect
    this.getOnlineUsers().then((users) => {
      try {
        server.send(JSON.stringify({ type: 'presence_snapshot', users }));
      } catch {
        // Connection may have closed
      }
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async setOnline(userId: string, roomId?: string): Promise<void> {
    const record = await this.getStatus(userId);
    record.online = true;
    record.lastSeen = Date.now();
    if (roomId && !record.connectedRooms.includes(roomId)) {
      record.connectedRooms.push(roomId);
    }
    await this.storage.put(`presence:${userId}`, record);
    this.broadcastPresenceChange({ type: 'user_online', userId, lastSeen: record.lastSeen });
  }

  private async setOffline(userId: string, roomId?: string): Promise<void> {
    const record = await this.getStatus(userId);

    if (roomId) {
      record.connectedRooms = record.connectedRooms.filter((r) => r !== roomId);
    } else {
      record.connectedRooms = [];
    }

    // Only mark fully offline if no connected rooms remain
    if (record.connectedRooms.length === 0) {
      record.online = false;
    }

    record.lastSeen = Date.now();
    await this.storage.put(`presence:${userId}`, record);
    this.broadcastPresenceChange({
      type: record.online ? 'user_room_left' : 'user_offline',
      userId,
      lastSeen: record.lastSeen,
    });
  }

  async getStatus(userId: string): Promise<PresenceRecord> {
    const stored = await this.storage.get<PresenceRecord>(`presence:${userId}`);
    return (
      stored || {
        userId,
        online: false,
        lastSeen: 0,
        connectedRooms: [],
      }
    );
  }

  private async getOnlineUsers(): Promise<PresenceRecord[]> {
    const entries = await this.storage.list<PresenceRecord>({ prefix: 'presence:' });
    const online: PresenceRecord[] = [];
    for (const [, record] of entries) {
      if (record.online) {
        online.push(record);
      }
    }
    return online;
  }

  private broadcastPresenceChange(data: Record<string, unknown>): void {
    const payload = JSON.stringify(data);
    for (const [userId, socket] of this.subscribers) {
      try {
        socket.send(payload);
      } catch {
        this.subscribers.delete(userId);
      }
    }
  }
}
