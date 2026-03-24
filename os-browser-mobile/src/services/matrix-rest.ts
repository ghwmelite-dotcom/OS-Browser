/**
 * Lightweight Matrix REST client for React Native.
 * Uses direct HTTP calls instead of matrix-js-sdk to avoid Node.js dependencies.
 */

const WORKER_URL = 'https://os-browser-worker.ghwmelite.workers.dev';

export interface MatrixCredentials {
  userId: string;
  accessToken: string; // Worker session token
  matrixToken: string; // Matrix access token for Synapse
  homeserverUrl: string;
  staffId: string;
  deviceId: string;
  displayName?: string;
  department?: string;
  ministry?: string;
  role?: string;
}

export interface MatrixRoom {
  roomId: string;
  name: string;
  isDirect: boolean;
  lastMessage?: string;
  lastMessageTs?: number;
  lastSenderId?: string;
  unreadCount: number;
  members: string[];
}

export interface MatrixMessage {
  eventId: string;
  roomId: string;
  senderId: string;
  senderName: string;
  type: 'text' | 'image' | 'file' | 'system';
  body: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'failed';
}

// ── Auth ─────────────────────────────────────────────────────────────────

/** Login with staffId — returns credentials if user exists on the server */
export async function loginWithStaffId(
  staffId: string,
  displayName: string,
): Promise<MatrixCredentials | null> {
  try {
    const res = await fetch(`${WORKER_URL}/api/v1/govchat/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, displayName }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (!data.accessToken) return null;

    return {
      userId: data.userId,
      accessToken: data.accessToken,
      matrixToken: data.matrixToken || data.accessToken,
      homeserverUrl: data.homeserverUrl || 'https://govchat.askozzy.work',
      staffId: data.staffId || staffId,
      deviceId: data.deviceId || `mobile_${Date.now()}`,
      displayName: data.displayName || displayName,
      department: data.department,
      ministry: data.ministry,
      role: data.role,
    };
  } catch {
    return null;
  }
}

/** Redeem invite code for new users */
export async function redeemInviteCode(
  code: string,
  staffId: string,
  displayName: string,
): Promise<MatrixCredentials | null> {
  try {
    const res = await fetch(`${WORKER_URL}/api/v1/govchat/auth/redeem-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, staffId, displayName }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (!data.accessToken) return null;

    return {
      userId: data.userId,
      accessToken: data.accessToken,
      matrixToken: data.matrixToken || data.accessToken,
      homeserverUrl: data.homeserverUrl || 'https://govchat.askozzy.work',
      staffId: data.staffId || staffId,
      deviceId: data.deviceId || `mobile_${Date.now()}`,
      displayName: data.displayName || displayName,
    };
  } catch {
    return null;
  }
}

/** Public signup — no invite code, just name + email */
export async function publicSignup(
  name: string,
  email: string,
): Promise<MatrixCredentials | null> {
  try {
    const res = await fetch(`${WORKER_URL}/api/v1/govchat/auth/public-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.error || `HTTP ${res.status}`);
    }
    const data = await res.json();

    if (!data.accessToken) return null;

    return {
      userId: data.userId,
      accessToken: data.accessToken,
      matrixToken: data.matrixToken || data.accessToken,
      homeserverUrl: data.homeserverUrl || 'https://govchat.askozzy.work',
      staffId: data.staffId || email,
      deviceId: data.deviceId || `mobile_${Date.now()}`,
      displayName: name,
      department: 'Public',
      ministry: 'Public',
      role: 'public',
    };
  } catch {
    return null;
  }
}

/** Fetch user profile from worker */
export async function fetchUserProfile(
  accessToken: string,
): Promise<{ displayName?: string; department?: string; ministry?: string; role?: string } | null> {
  try {
    const res = await fetch(`${WORKER_URL}/api/v1/govchat/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Rooms ────────────────────────────────────────────────────────────────

/** Fetch joined rooms from Matrix */
export async function fetchRooms(creds: MatrixCredentials): Promise<MatrixRoom[]> {
  try {
    const token = creds.matrixToken || creds.accessToken;
    const res = await fetch(
      `${creds.homeserverUrl}/_matrix/client/v3/joined_rooms`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const roomIds: string[] = data.joined_rooms || [];

    // Fetch room details in parallel
    const rooms = await Promise.all(
      roomIds.map(async (roomId) => {
        const room = await fetchRoomDetails(creds, roomId);
        return room;
      }),
    );

    return rooms
      .filter((r): r is MatrixRoom => r !== null)
      .sort((a, b) => (b.lastMessageTs || 0) - (a.lastMessageTs || 0));
  } catch {
    return [];
  }
}

async function fetchRoomDetails(
  creds: MatrixCredentials,
  roomId: string,
): Promise<MatrixRoom | null> {
  try {
    const token = creds.matrixToken || creds.accessToken;
    const base = creds.homeserverUrl;

    // Fetch room state for name and members
    const [nameRes, membersRes] = await Promise.all([
      fetch(`${base}/_matrix/client/v3/rooms/${roomId}/state/m.room.name`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null),
      fetch(`${base}/_matrix/client/v3/rooms/${roomId}/members?membership=join`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null),
    ]);

    let name = roomId;
    if (nameRes?.ok) {
      const nameData = await nameRes.json();
      name = nameData.name || roomId;
    }

    const members: string[] = [];
    let isDirect = false;
    if (membersRes?.ok) {
      const memberData = await membersRes.json();
      const chunks = memberData.chunk || [];
      for (const m of chunks) {
        if (m.state_key) members.push(m.state_key);
      }
      isDirect = members.length <= 2;

      // For DMs, use the other person's name
      if (isDirect && name === roomId) {
        const other = members.find((m) => m !== creds.userId);
        if (other) {
          name = other.replace(/@([^:]+):.*/, '$1');
        }
      }
    }

    // Fetch last message
    const msgsRes = await fetch(
      `${base}/_matrix/client/v3/rooms/${roomId}/messages?dir=b&limit=1&filter=${encodeURIComponent(JSON.stringify({ types: ['m.room.message'] }))}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).catch(() => null);

    let lastMessage: string | undefined;
    let lastMessageTs: number | undefined;
    let lastSenderId: string | undefined;

    if (msgsRes?.ok) {
      const msgsData = await msgsRes.json();
      const chunk = msgsData.chunk?.[0];
      if (chunk) {
        lastMessage = chunk.content?.body || '';
        lastMessageTs = chunk.origin_server_ts;
        lastSenderId = chunk.sender;
      }
    }

    return {
      roomId,
      name,
      isDirect,
      lastMessage,
      lastMessageTs,
      lastSenderId,
      unreadCount: 0,
      members,
    };
  } catch {
    return null;
  }
}

// ── Messages ─────────────────────────────────────────────────────────────

/** Fetch recent messages for a room */
export async function fetchMessages(
  creds: MatrixCredentials,
  roomId: string,
  limit: number = 50,
): Promise<MatrixMessage[]> {
  try {
    const token = creds.matrixToken || creds.accessToken;
    const filter = JSON.stringify({ types: ['m.room.message'] });
    const res = await fetch(
      `${creds.homeserverUrl}/_matrix/client/v3/rooms/${roomId}/messages?dir=b&limit=${limit}&filter=${encodeURIComponent(filter)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return [];

    const data = await res.json();
    const events = data.chunk || [];

    return events
      .map((e: any): MatrixMessage => ({
        eventId: e.event_id,
        roomId,
        senderId: e.sender,
        senderName: e.sender?.replace(/@([^:]+):.*/, '$1') || 'Unknown',
        type: e.content?.msgtype === 'm.image' ? 'image' : 'text',
        body: e.content?.body || '',
        timestamp: e.origin_server_ts || 0,
        status: 'sent',
      }))
      .reverse(); // Oldest first
  } catch {
    return [];
  }
}

/** Send a text message via raw Matrix API */
export async function sendMessage(
  creds: MatrixCredentials,
  roomId: string,
  body: string,
): Promise<string | null> {
  try {
    const token = creds.matrixToken || creds.accessToken;
    const txnId = `m${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    const res = await fetch(
      `${creds.homeserverUrl}/_matrix/client/v3/rooms/${roomId}/send/m.room.message/${txnId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          msgtype: 'm.text',
          body,
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.event_id || null;
  } catch {
    return null;
  }
}

// ── Sync (lightweight polling) ───────────────────────────────────────────

let syncToken: string | null = null;
let syncAbort: AbortController | null = null;

/** Start long-polling sync. Calls onMessage for each new message. */
export function startSync(
  creds: MatrixCredentials,
  onMessage: (msg: MatrixMessage) => void,
  onRoomUpdate: () => void,
): () => void {
  let running = true;

  const poll = async () => {
    while (running) {
      try {
        syncAbort = new AbortController();
        const token = creds.matrixToken || creds.accessToken;
        const params = new URLSearchParams({
          timeout: '15000',
          filter: JSON.stringify({
            room: {
              timeline: { limit: 10, types: ['m.room.message'] },
              state: { types: [] },
              ephemeral: { types: [] },
            },
            presence: { types: [] },
          }),
        });
        if (syncToken) params.set('since', syncToken);

        const res = await fetch(
          `${creds.homeserverUrl}/_matrix/client/v3/sync?${params}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: syncAbort.signal,
          },
        );

        if (!res.ok) {
          // Wait before retrying
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        const data = await res.json();
        syncToken = data.next_batch || syncToken;

        // Process new messages from joined rooms
        const joinedRooms = data.rooms?.join || {};
        let hasNewMessages = false;

        for (const [roomId, roomData] of Object.entries(joinedRooms)) {
          const events = (roomData as any)?.timeline?.events || [];
          for (const e of events) {
            if (e.type === 'm.room.message' && e.sender !== creds.userId) {
              hasNewMessages = true;
              onMessage({
                eventId: e.event_id,
                roomId,
                senderId: e.sender,
                senderName: e.sender?.replace(/@([^:]+):.*/, '$1') || 'Unknown',
                type: e.content?.msgtype === 'm.image' ? 'image' : 'text',
                body: e.content?.body || '',
                timestamp: e.origin_server_ts || Date.now(),
                status: 'sent',
              });
            }
          }
        }

        // Check for new rooms (invites)
        const invitedRooms = data.rooms?.invite || {};
        for (const [roomId] of Object.entries(invitedRooms)) {
          // Auto-join invites
          try {
            await fetch(
              `${creds.homeserverUrl}/_matrix/client/v3/join/${encodeURIComponent(roomId)}`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: '{}',
              },
            );
            hasNewMessages = true;
          } catch {}
        }

        if (hasNewMessages) onRoomUpdate();
      } catch (err: any) {
        if (err?.name === 'AbortError') break;
        // Wait before retrying on network error
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };

  poll();

  return () => {
    running = false;
    syncAbort?.abort();
  };
}

export function stopSync(): void {
  syncAbort?.abort();
}
