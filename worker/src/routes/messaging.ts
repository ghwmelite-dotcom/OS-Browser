import { Hono } from 'hono';
import type { Env, Contact, Conversation, UserSession } from '../types';

type Variables = { deviceId: string };

export const messagingRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Helpers ────────────────────────────────────────────────────────────────

const GOV_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@.+\.gov\.gh$/i;

function generateVerificationCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1_000_000).padStart(6, '0');
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

function conversationKey(participantIds: string[]): string {
  return [...participantIds].sort().join(':');
}

async function getAuthenticatedUser(env: Env, request: Request): Promise<UserSession | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return env.SESSIONS.get(`msg-session:${token}`, 'json') as Promise<UserSession | null>;
}

// ─── Registration ───────────────────────────────────────────────────────────

messagingRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ email?: string; name?: string; department?: string }>();

  if (!body.email || typeof body.email !== 'string') {
    return c.json({ error: 'email is required' }, 400);
  }

  const email = body.email.trim().toLowerCase();

  if (!GOV_EMAIL_REGEX.test(email)) {
    return c.json({ error: 'Only .gov.gh email addresses are allowed' }, 400);
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    return c.json({ error: 'name is required (min 2 characters)' }, 400);
  }

  if (!body.department || typeof body.department !== 'string' || body.department.trim().length < 2) {
    return c.json({ error: 'department is required (min 2 characters)' }, 400);
  }

  // Check for existing pending verification (prevent spam)
  const existingCode = await c.env.SESSIONS.get(`verify:${email}`);
  if (existingCode) {
    return c.json(
      { error: 'A verification code was already sent. Please wait before requesting a new one.' },
      429
    );
  }

  const code = generateVerificationCode();

  // Store verification data with 10-minute TTL
  await c.env.SESSIONS.put(
    `verify:${email}`,
    JSON.stringify({
      code,
      name: body.name.trim(),
      department: body.department.trim(),
      createdAt: Date.now(),
    }),
    { expirationTtl: 600 }
  );

  // Store pending contact info for lookup after verification
  console.log(`[DEV] Verification code for ${email}: ${code}`);

  // In development, return the code. In production, send via email.
  const isDev = c.env.ENVIRONMENT !== 'production';

  return c.json({
    success: true,
    message: 'Verification code sent to your email',
    ...(isDev ? { devCode: code } : {}),
  });
});

// ─── Verification ───────────────────────────────────────────────────────────

messagingRoutes.post('/verify', async (c) => {
  const body = await c.req.json<{ email?: string; code?: string }>();

  if (!body.email || typeof body.email !== 'string') {
    return c.json({ error: 'email is required' }, 400);
  }

  if (!body.code || typeof body.code !== 'string') {
    return c.json({ error: 'code is required' }, 400);
  }

  const email = body.email.trim().toLowerCase();
  const stored = await c.env.SESSIONS.get(`verify:${email}`, 'json') as {
    code: string;
    name: string;
    department: string;
    createdAt: number;
  } | null;

  if (!stored) {
    return c.json({ error: 'No pending verification found. Please register again.' }, 400);
  }

  if (stored.code !== body.code.trim()) {
    return c.json({ error: 'Invalid verification code' }, 400);
  }

  // Verification successful — clean up the code
  await c.env.SESSIONS.delete(`verify:${email}`);

  // Generate stable userId from email
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(email));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const userId = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Generate session token
  const token = generateToken();

  // Create/update contact record
  const contact: Contact = {
    userId,
    email,
    name: stored.name,
    department: stored.department,
    registeredAt: Date.now(),
  };

  // Store contact persistently
  await c.env.MESSAGES.put(`contact:${userId}`, JSON.stringify(contact));

  // Also add to the contacts index
  const contactIndex = (await c.env.MESSAGES.get<string[]>('contacts:index', 'json')) || [];
  if (!contactIndex.includes(userId)) {
    contactIndex.push(userId);
    await c.env.MESSAGES.put('contacts:index', JSON.stringify(contactIndex));
  }

  // Store session (30-day TTL)
  const session: UserSession = {
    userId,
    email,
    name: stored.name,
    department: stored.department,
    token,
    createdAt: Date.now(),
  };

  await c.env.SESSIONS.put(`msg-session:${token}`, JSON.stringify(session), {
    expirationTtl: 60 * 60 * 24 * 30,
  });

  return c.json({ success: true, userId, token, name: stored.name, department: stored.department });
});

// ─── Contacts ───────────────────────────────────────────────────────────────

messagingRoutes.get('/contacts', async (c) => {
  const user = await getAuthenticatedUser(c.env, c.req.raw);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const contactIndex = (await c.env.MESSAGES.get<string[]>('contacts:index', 'json')) || [];

  const contacts: Contact[] = [];
  for (const cid of contactIndex) {
    const contact = await c.env.MESSAGES.get<Contact>(`contact:${cid}`, 'json');
    if (contact && contact.userId !== user.userId) {
      contacts.push(contact);
    }
  }

  // Get presence info
  const presenceId = c.env.USER_PRESENCE.idFromName('global');
  const presenceStub = c.env.USER_PRESENCE.get(presenceId);

  try {
    const presenceRes = await presenceStub.fetch(
      new Request('https://presence/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: contacts.map((ct) => ct.userId) }),
      })
    );
    const presenceData = (await presenceRes.json()) as {
      statuses: Record<string, { online: boolean; lastSeen: number }>;
    };

    const enriched = contacts.map((ct) => ({
      ...ct,
      online: presenceData.statuses[ct.userId]?.online || false,
      lastSeen: presenceData.statuses[ct.userId]?.lastSeen || 0,
    }));

    return c.json({ contacts: enriched });
  } catch {
    // If presence lookup fails, return contacts without presence data
    return c.json({ contacts });
  }
});

// ─── Conversations ──────────────────────────────────────────────────────────

messagingRoutes.post('/conversations', async (c) => {
  const user = await getAuthenticatedUser(c.env, c.req.raw);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{ participantIds?: string[] }>();

  if (!Array.isArray(body.participantIds) || body.participantIds.length < 1) {
    return c.json({ error: 'participantIds must be a non-empty array' }, 400);
  }

  // Ensure the current user is included
  const participantIds = [...new Set([user.userId, ...body.participantIds])];

  if (participantIds.length < 2) {
    return c.json({ error: 'A conversation requires at least 2 participants' }, 400);
  }

  if (participantIds.length > 10) {
    return c.json({ error: 'Maximum 10 participants per conversation' }, 400);
  }

  // Validate all participants exist
  for (const pid of participantIds) {
    if (pid === user.userId) continue;
    const contact = await c.env.MESSAGES.get(`contact:${pid}`);
    if (!contact) {
      return c.json({ error: `Participant ${pid} not found` }, 400);
    }
  }

  const convKey = conversationKey(participantIds);

  // Check if conversation already exists
  const existingId = await c.env.MESSAGES.get(`conv-key:${convKey}`);
  if (existingId) {
    const existing = await c.env.MESSAGES.get<Conversation>(`conv:${existingId}`, 'json');
    if (existing) {
      return c.json({ conversation: existing });
    }
  }

  // Create new conversation
  const conversationId = crypto.randomUUID();
  const conversation: Conversation = {
    id: conversationId,
    participantIds,
    createdAt: Date.now(),
    lastMessageAt: Date.now(),
  };

  await c.env.MESSAGES.put(`conv:${conversationId}`, JSON.stringify(conversation));
  await c.env.MESSAGES.put(`conv-key:${convKey}`, conversationId);

  // Add conversation to each participant's conversation list
  for (const pid of participantIds) {
    const userConvs =
      (await c.env.MESSAGES.get<string[]>(`user-convs:${pid}`, 'json')) || [];
    if (!userConvs.includes(conversationId)) {
      userConvs.push(conversationId);
      await c.env.MESSAGES.put(`user-convs:${pid}`, JSON.stringify(userConvs));
    }
  }

  return c.json({ conversation }, 201);
});

messagingRoutes.get('/conversations', async (c) => {
  const user = await getAuthenticatedUser(c.env, c.req.raw);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userConvIds =
    (await c.env.MESSAGES.get<string[]>(`user-convs:${user.userId}`, 'json')) || [];

  const conversations: Conversation[] = [];
  for (const cid of userConvIds) {
    const conv = await c.env.MESSAGES.get<Conversation>(`conv:${cid}`, 'json');
    if (conv) {
      conversations.push(conv);
    }
  }

  // Sort by most recent activity
  conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

  return c.json({ conversations });
});

// ─── Message History via REST ───────────────────────────────────────────────

messagingRoutes.get('/conversations/:id/messages', async (c) => {
  const user = await getAuthenticatedUser(c.env, c.req.raw);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const conversationId = c.req.param('id');
  const conv = await c.env.MESSAGES.get<Conversation>(`conv:${conversationId}`, 'json');

  if (!conv) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  if (!conv.participantIds.includes(user.userId)) {
    return c.json({ error: 'You are not a participant of this conversation' }, 403);
  }

  // Fetch messages from the ChatRoom Durable Object
  const roomId = c.env.CHAT_ROOM.idFromName(conversationId);
  const room = c.env.CHAT_ROOM.get(roomId);

  const before = c.req.query('before') || '';
  const limit = c.req.query('limit') || '50';
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  params.set('limit', limit);

  const res = await room.fetch(
    new Request(`https://room/messages?${params.toString()}`, { method: 'GET' })
  );

  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
});

// ─── WebSocket Upgrade ──────────────────────────────────────────────────────

messagingRoutes.get('/ws/:conversationId', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }

  const userId = c.req.query('userId');
  const token = c.req.query('token');

  if (!userId || !token) {
    return c.json({ error: 'userId and token query parameters are required' }, 400);
  }

  // Validate token
  const session = await c.env.SESSIONS.get<UserSession>(`msg-session:${token}`, 'json');
  if (!session || session.userId !== userId) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }

  const conversationId = c.req.param('conversationId');

  // Validate user is participant of this conversation
  const conv = await c.env.MESSAGES.get<Conversation>(`conv:${conversationId}`, 'json');
  if (!conv) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  if (!conv.participantIds.includes(userId)) {
    return c.json({ error: 'You are not a participant of this conversation' }, 403);
  }

  // Connect to ChatRoom Durable Object
  const roomId = c.env.CHAT_ROOM.idFromName(conversationId);
  const room = c.env.CHAT_ROOM.get(roomId);

  const wsUrl = new URL(`https://room/websocket?userId=${encodeURIComponent(userId)}`);
  const res = await room.fetch(new Request(wsUrl.toString(), { headers: c.req.raw.headers }));

  // Update user presence
  const presenceId = c.env.USER_PRESENCE.idFromName('global');
  const presence = c.env.USER_PRESENCE.get(presenceId);
  await presence.fetch(
    new Request('https://presence/online', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roomId: conversationId }),
    })
  );

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
    webSocket: (res as any).webSocket,
  });
});

// ─── Presence Subscription ─────────────────────────────────────────────────

messagingRoutes.get('/presence/subscribe', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }

  const userId = c.req.query('userId');
  const token = c.req.query('token');

  if (!userId || !token) {
    return c.json({ error: 'userId and token query parameters are required' }, 400);
  }

  const session = await c.env.SESSIONS.get<UserSession>(`msg-session:${token}`, 'json');
  if (!session || session.userId !== userId) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }

  const presenceId = c.env.USER_PRESENCE.idFromName('global');
  const presence = c.env.USER_PRESENCE.get(presenceId);

  const res = await presence.fetch(
    new Request(`https://presence/subscribe?userId=${encodeURIComponent(userId)}`, {
      headers: c.req.raw.headers,
    })
  );

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
    webSocket: (res as any).webSocket,
  });
});

// ─── User Status ────────────────────────────────────────────────────────────

messagingRoutes.get('/presence/status', async (c) => {
  const user = await getAuthenticatedUser(c.env, c.req.raw);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const targetUserId = c.req.query('userId');
  if (!targetUserId) {
    return c.json({ error: 'userId query parameter required' }, 400);
  }

  const presenceId = c.env.USER_PRESENCE.idFromName('global');
  const presence = c.env.USER_PRESENCE.get(presenceId);

  const res = await presence.fetch(
    new Request(`https://presence/status?userId=${encodeURIComponent(targetUserId)}`)
  );

  const data = await res.json();
  return c.json(data);
});
