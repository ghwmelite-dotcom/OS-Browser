import { Hono } from 'hono';
import type { Env, InviteCode, GovChatSession } from '../types';

type Variables = { deviceId: string };

export const govchatRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I,O,0,1 to avoid confusion
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function getAuthenticatedSession(
  env: Env,
  request: Request,
): Promise<GovChatSession | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const session = await env.SESSIONS.get(`govchat-session:${token}`, 'json');
  return session as GovChatSession | null;
}

async function requireAdmin(
  env: Env,
  request: Request,
): Promise<GovChatSession | Response> {
  const session = await getAuthenticatedSession(env, request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (session.role !== 'admin' && session.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Forbidden: admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return session;
}

// ---------------------------------------------------------------------------
// POST /invite-codes/generate — Admin generates an invite code
// ---------------------------------------------------------------------------

govchatRoutes.post('/invite-codes/generate', async (c) => {
  const adminResult = await requireAdmin(c.env, c.req.raw);
  if (adminResult instanceof Response) return adminResult;
  const admin = adminResult;

  const body = await c.req.json<{
    department: string;
    ministry: string;
    maxUses?: number;
    expiresInHours?: number;
  }>();

  if (!body.department || !body.ministry) {
    return c.json({ error: 'department and ministry are required' }, 400);
  }

  const code = generateInviteCode();
  const now = Date.now();
  const expiresInHours = body.expiresInHours ?? 72;
  const expiresAt = now + expiresInHours * 60 * 60 * 1000;

  const inviteCode: InviteCode = {
    code,
    createdBy: admin.userId,
    createdAt: now,
    expiresAt,
    maxUses: body.maxUses ?? 1,
    usedCount: 0,
    department: body.department,
    ministry: body.ministry,
    isRevoked: false,
  };

  await c.env.INVITE_CODES.put(`invite:${code}`, JSON.stringify(inviteCode), {
    expirationTtl: Math.max(Math.ceil((expiresAt - now) / 1000), 60),
  });

  return c.json({ success: true, code, expiresAt });
});

// ---------------------------------------------------------------------------
// POST /auth/redeem-invite — User redeems invite code with staff ID
// ---------------------------------------------------------------------------

govchatRoutes.post('/auth/redeem-invite', async (c) => {
  const body = await c.req.json<{
    code: string;
    staffId: string;
    displayName: string;
  }>();

  if (!body.code || !body.staffId || !body.displayName) {
    return c.json({ error: 'code, staffId, and displayName are required' }, 400);
  }

  // Validate staffId format
  if (!/^[a-zA-Z0-9._-]+$/.test(body.staffId)) {
    return c.json(
      { error: 'Invalid staff ID format. Use only letters, numbers, dots, hyphens, and underscores.' },
      400,
    );
  }

  const stored = await c.env.INVITE_CODES.get(`invite:${body.code}`, 'json');
  if (!stored) {
    return c.json({ error: 'Invalid or expired invite code' }, 404);
  }

  const invite = stored as InviteCode;

  if (invite.isRevoked) {
    return c.json({ error: 'This invite code has been revoked' }, 403);
  }

  if (Date.now() > invite.expiresAt) {
    return c.json({ error: 'This invite code has expired' }, 410);
  }

  if (invite.usedCount >= invite.maxUses) {
    return c.json({ error: 'This invite code has reached its maximum uses' }, 410);
  }

  // Claim-based idempotency guard against race conditions on KV eventual consistency.
  // Write a unique claim key for this staff+code pair. If it already exists, reject as duplicate.
  const claimKey = `invite-claim:${body.code}:${body.staffId}`;
  const existingClaim = await c.env.INVITE_CODES.get(claimKey);
  if (existingClaim) {
    return c.json({ error: 'This invite code has already been redeemed by this staff ID' }, 409);
  }

  // Write the claim key with a short TTL (5 minutes) to act as a lock
  await c.env.INVITE_CODES.put(claimKey, JSON.stringify({ claimedAt: Date.now() }), {
    expirationTtl: 300, // 5 minutes
  });

  // Re-read the invite code to get the freshest usedCount before incrementing
  const freshStored = await c.env.INVITE_CODES.get(`invite:${invite.code}`, 'json');
  const freshInvite = (freshStored as InviteCode) ?? invite;

  if (freshInvite.usedCount >= freshInvite.maxUses) {
    // Clean up the claim since we can't actually proceed
    await c.env.INVITE_CODES.delete(claimKey);
    return c.json({ error: 'This invite code has reached its maximum uses' }, 410);
  }

  // Increment usage atomically with updated count
  freshInvite.usedCount += 1;
  const remainingTtl = Math.max(Math.ceil((freshInvite.expiresAt - Date.now()) / 1000), 60);
  await c.env.INVITE_CODES.put(`invite:${freshInvite.code}`, JSON.stringify(freshInvite), {
    expirationTtl: remainingTtl,
  });

  // Create session
  const token = generateToken();
  const deviceId = `GOVCHAT_${generateToken().slice(0, 12).toUpperCase()}`;
  const userId = `@${body.staffId}:gov.gh`;

  const session: GovChatSession = {
    userId,
    staffId: body.staffId,
    displayName: body.displayName,
    department: freshInvite.department,
    ministry: freshInvite.ministry,
    token,
    homeserverUrl: c.env.MATRIX_HOMESERVER_URL || 'https://matrix.org',
    deviceId,
    createdAt: Date.now(),
    role: 'user',
  };

  // Store session with 7-day TTL
  await c.env.SESSIONS.put(`govchat-session:${token}`, JSON.stringify(session), {
    expirationTtl: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  return c.json({
    success: true,
    userId,
    accessToken: token,
    homeserverUrl: session.homeserverUrl,
    staffId: body.staffId,
    deviceId,
  });
});

// ---------------------------------------------------------------------------
// GET /invite-codes — Admin lists all codes
// ---------------------------------------------------------------------------

govchatRoutes.get('/invite-codes', async (c) => {
  const adminResult = await requireAdmin(c.env, c.req.raw);
  if (adminResult instanceof Response) return adminResult;

  const list = await c.env.INVITE_CODES.list({ prefix: 'invite:' });
  const codes: InviteCode[] = [];

  for (const key of list.keys) {
    const data = await c.env.INVITE_CODES.get(key.name, 'json');
    if (data) {
      codes.push(data as InviteCode);
    }
  }

  return c.json({ codes });
});

// ---------------------------------------------------------------------------
// DELETE /invite-codes/:code — Admin revokes a code
// ---------------------------------------------------------------------------

govchatRoutes.delete('/invite-codes/:code', async (c) => {
  const adminResult = await requireAdmin(c.env, c.req.raw);
  if (adminResult instanceof Response) return adminResult;

  const code = c.req.param('code');
  const stored = await c.env.INVITE_CODES.get(`invite:${code}`, 'json');

  if (!stored) {
    return c.json({ error: 'Invite code not found' }, 404);
  }

  const invite = stored as InviteCode;
  invite.isRevoked = true;

  const remainingTtl = Math.max(Math.ceil((invite.expiresAt - Date.now()) / 1000), 60);
  await c.env.INVITE_CODES.put(`invite:${code}`, JSON.stringify(invite), {
    expirationTtl: remainingTtl,
  });

  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// GET /auth/me — Get current user info from token
// ---------------------------------------------------------------------------

govchatRoutes.get('/auth/me', async (c) => {
  const session = await getAuthenticatedSession(c.env, c.req.raw);

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({
    userId: session.userId,
    staffId: session.staffId,
    displayName: session.displayName,
    department: session.department,
    ministry: session.ministry,
    homeserverUrl: session.homeserverUrl,
    deviceId: session.deviceId,
    role: session.role,
    createdAt: session.createdAt,
  });
});
