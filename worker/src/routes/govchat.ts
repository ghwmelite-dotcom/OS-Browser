import { Hono } from 'hono';
import type { Env, InviteCode, GovChatSession, CodeRequest } from '../types';

type Variables = { deviceId: string };

interface DirectoryUser {
  userId: string;
  staffId: string;
  displayName: string;
  department: string;
  ministry: string;
  role: string;
  isOnline: boolean;
}

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

  // Register user on Synapse homeserver via shared-secret registration
  const homeserverUrl = c.env.MATRIX_HOMESERVER_URL || 'https://govchat.askozzy.work';
  const serverName = new URL(homeserverUrl).hostname;
  const matrixUserId = `@${body.staffId}:${serverName}`;
  let matrixAccessToken = '';
  let matrixDeviceId = '';

  try {
    // Generate HMAC for shared-secret registration
    const registrationSecret = c.env.SYNAPSE_REGISTRATION_SECRET;
    if (registrationSecret) {
      // Step 1: Get a nonce from the server
      const nonceRes = await fetch(`${homeserverUrl}/_synapse/admin/v1/register`, {
        method: 'GET',
      });
      const nonceData = await nonceRes.json() as { nonce: string };
      const nonce = nonceData.nonce;

      // Step 2: Compute HMAC
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(registrationSecret),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign'],
      );

      // HMAC message: nonce + NUL + username + NUL + password + NUL + "notadmin"
      const password = `GovChat_${generateToken().slice(0, 16)}`;
      const hmacMessage = `${nonce}\x00${body.staffId}\x00${password}\x00notadmin`;
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(hmacMessage));
      const mac = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Step 3: Register the user
      const regRes = await fetch(`${homeserverUrl}/_synapse/admin/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nonce,
          username: body.staffId,
          displayname: body.displayName,
          password,
          admin: false,
          mac,
        }),
      });

      if (regRes.ok) {
        const regData = await regRes.json() as {
          user_id: string;
          access_token: string;
          device_id: string;
        };
        matrixAccessToken = regData.access_token;
        matrixDeviceId = regData.device_id;
      } else {
        const errBody = await regRes.text();
        // User may already exist — try logging in instead
        if (errBody.includes('User ID already taken')) {
          const loginRes = await fetch(`${homeserverUrl}/_matrix/client/v3/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'm.login.password',
              identifier: { type: 'm.id.user', user: body.staffId },
              password,
            }),
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json() as {
              user_id: string;
              access_token: string;
              device_id: string;
            };
            matrixAccessToken = loginData.access_token;
            matrixDeviceId = loginData.device_id;
          }
        }
      }
    }
  } catch (err) {
    // Synapse registration failed — continue with local-only credentials
    console.error('Synapse registration error:', err);
  }

  // Create session — use Matrix credentials if available, fallback to local
  const token = matrixAccessToken || generateToken();
  const deviceId = matrixDeviceId || `GOVCHAT_${generateToken().slice(0, 12).toUpperCase()}`;
  const userId = matrixAccessToken ? matrixUserId : `@${body.staffId}:gov.gh`;

  // Check if user already has an existing session with elevated role
  let existingRole: GovChatSession['role'] = 'user';
  const existingSessions = await c.env.SESSIONS.list({ prefix: 'govchat-session:' });
  for (const key of existingSessions.keys) {
    const existing = await c.env.SESSIONS.get(key.name, 'json') as GovChatSession | null;
    if (existing && existing.staffId === body.staffId && (existing.role === 'admin' || existing.role === 'superadmin')) {
      existingRole = existing.role;
      break;
    }
  }

  const session: GovChatSession = {
    userId,
    staffId: body.staffId,
    displayName: body.displayName,
    department: freshInvite.department,
    ministry: freshInvite.ministry,
    token,
    homeserverUrl,
    deviceId,
    createdAt: Date.now(),
    role: existingRole,
  };

  // Store session with 7-day TTL
  await c.env.SESSIONS.put(`govchat-session:${token}`, JSON.stringify(session), {
    expirationTtl: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  return c.json({
    success: true,
    userId,
    accessToken: token,
    homeserverUrl,
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

// ---------------------------------------------------------------------------
// GET /users — Superadmin lists all user sessions
// ---------------------------------------------------------------------------

govchatRoutes.get('/users', async (c) => {
  const admin = await requireAdmin(c.env, c.req.raw);
  if (admin instanceof Response) return admin;
  if (admin.role !== 'superadmin') {
    return c.json({ error: 'Only superadmins can manage users' }, 403);
  }

  const list = await c.env.SESSIONS.list({ prefix: 'govchat-session:' });
  const users: GovChatSession[] = [];

  for (const key of list.keys) {
    const data = await c.env.SESSIONS.get(key.name, 'json');
    if (data) {
      const session = data as GovChatSession;
      users.push({
        userId: session.userId,
        staffId: session.staffId,
        displayName: session.displayName,
        department: session.department,
        ministry: session.ministry,
        token: '', // Never expose tokens
        homeserverUrl: session.homeserverUrl,
        deviceId: session.deviceId,
        createdAt: session.createdAt,
        role: session.role,
      });
    }
  }

  return c.json({ users });
});

// ---------------------------------------------------------------------------
// PUT /users/:staffId/role — Superadmin promotes/demotes a user
// ---------------------------------------------------------------------------

govchatRoutes.put('/users/:staffId/role', async (c) => {
  const admin = await requireAdmin(c.env, c.req.raw);
  if (admin instanceof Response) return admin;
  if (admin.role !== 'superadmin') {
    return c.json({ error: 'Only superadmins can change user roles' }, 403);
  }

  const targetStaffId = c.req.param('staffId');
  const body = await c.req.json<{ role: 'user' | 'admin' | 'superadmin' | 'public' }>();

  if (!body.role || !['user', 'admin', 'superadmin', 'public'].includes(body.role)) {
    return c.json({ error: 'Invalid role. Must be: user, admin, superadmin, or public' }, 400);
  }

  // Find the user's session key
  const list = await c.env.SESSIONS.list({ prefix: 'govchat-session:' });
  let found = false;

  for (const key of list.keys) {
    const data = await c.env.SESSIONS.get(key.name, 'json');
    if (data) {
      const session = data as GovChatSession;
      if (session.staffId === targetStaffId) {
        session.role = body.role;
        await c.env.SESSIONS.put(key.name, JSON.stringify(session));
        found = true;
        break;
      }
    }
  }

  if (!found) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ success: true, staffId: targetStaffId, role: body.role });
});

// ---------------------------------------------------------------------------
// GET /users/directory — Public user directory for authenticated users
// ---------------------------------------------------------------------------

govchatRoutes.get('/users/directory', async (c) => {
  const session = await getAuthenticatedSession(c.env, c.req.raw);
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const list = await c.env.SESSIONS.list({ prefix: 'govchat-session:' });
  const users: DirectoryUser[] = [];

  for (const key of list.keys) {
    const data = await c.env.SESSIONS.get(key.name, 'json') as GovChatSession | null;
    if (!data) continue;
    // Skip the requesting user
    if (data.staffId === session.staffId) continue;
    // Public users can only see other public users
    if (session.role === 'public' && data.role !== 'public') continue;
    // Government users can see everyone
    users.push({
      userId: data.userId,
      staffId: data.staffId,
      displayName: data.displayName,
      department: data.department,
      ministry: data.ministry,
      role: data.role,
      isOnline: (Date.now() - data.createdAt) < 7 * 24 * 60 * 60 * 1000,
    });
  }

  // Sort by ministry, then name
  users.sort((a, b) => {
    if (a.ministry !== b.ministry) return a.ministry.localeCompare(b.ministry);
    return a.displayName.localeCompare(b.displayName);
  });

  return c.json({ users, total: users.length });
});

// ---------------------------------------------------------------------------
// POST /code-requests — Submit a code request (public, no auth)
// ---------------------------------------------------------------------------

govchatRoutes.post('/code-requests', async (c) => {
  const body = await c.req.json<{
    name: string;
    email: string;
    department: string;
    ministry: string;
    reason: string;
  }>();

  if (!body.name || !body.email || !body.department || !body.ministry || !body.reason) {
    return c.json({ error: 'name, email, department, ministry, and reason are all required' }, 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return c.json({ error: 'Invalid email format' }, 400);
  }

  const now = Date.now();
  const randomChars = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) =>
    'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36],
  ).join('');
  const id = `req_${now}_${randomChars}`;

  const request: CodeRequest = {
    id,
    name: body.name,
    email: body.email,
    department: body.department,
    ministry: body.ministry,
    reason: body.reason,
    status: 'pending',
    createdAt: now,
  };

  await c.env.INVITE_CODES.put(`code-request:${id}`, JSON.stringify(request));

  return c.json({
    success: true,
    requestId: id,
    message: 'Your request has been submitted. You will receive your invite code once approved.',
  });
});

// ---------------------------------------------------------------------------
// GET /code-requests — Admin lists all code requests
// ---------------------------------------------------------------------------

govchatRoutes.get('/code-requests', async (c) => {
  const adminResult = await requireAdmin(c.env, c.req.raw);
  if (adminResult instanceof Response) return adminResult;

  const list = await c.env.INVITE_CODES.list({ prefix: 'code-request:' });
  const requests: CodeRequest[] = [];

  for (const key of list.keys) {
    const data = await c.env.INVITE_CODES.get(key.name, 'json');
    if (data) {
      requests.push(data as CodeRequest);
    }
  }

  // Sort by createdAt descending (newest first)
  requests.sort((a, b) => b.createdAt - a.createdAt);

  return c.json({ requests });
});

// ---------------------------------------------------------------------------
// GET /code-requests/count — Get pending request count
// ---------------------------------------------------------------------------

govchatRoutes.get('/code-requests/count', async (c) => {
  const adminResult = await requireAdmin(c.env, c.req.raw);
  if (adminResult instanceof Response) return adminResult;

  const list = await c.env.INVITE_CODES.list({ prefix: 'code-request:' });
  let count = 0;

  for (const key of list.keys) {
    const data = await c.env.INVITE_CODES.get(key.name, 'json');
    if (data) {
      const req = data as CodeRequest;
      if (req.status === 'pending') {
        count++;
      }
    }
  }

  return c.json({ count });
});

// ---------------------------------------------------------------------------
// PUT /code-requests/:id/approve — Admin approves a request
// ---------------------------------------------------------------------------

govchatRoutes.put('/code-requests/:id/approve', async (c) => {
  const adminResult = await requireAdmin(c.env, c.req.raw);
  if (adminResult instanceof Response) return adminResult;
  const admin = adminResult;

  const id = c.req.param('id');
  const stored = await c.env.INVITE_CODES.get(`code-request:${id}`, 'json');

  if (!stored) {
    return c.json({ error: 'Code request not found' }, 404);
  }

  const request = stored as CodeRequest;

  if (request.status !== 'pending') {
    return c.json({ error: `Request has already been ${request.status}` }, 400);
  }

  // Generate an invite code for the requester
  const code = generateInviteCode();
  const now = Date.now();
  const expiresAt = now + 168 * 60 * 60 * 1000; // 7 days

  const inviteCode: InviteCode = {
    code,
    createdBy: admin.userId,
    createdAt: now,
    expiresAt,
    maxUses: 1,
    usedCount: 0,
    department: request.department,
    ministry: request.ministry,
    isRevoked: false,
  };

  await c.env.INVITE_CODES.put(`invite:${code}`, JSON.stringify(inviteCode), {
    expirationTtl: Math.max(Math.ceil((expiresAt - now) / 1000), 60),
  });

  // Update the request
  request.status = 'approved';
  request.reviewedBy = admin.userId;
  request.reviewedAt = now;
  request.generatedCode = code;

  await c.env.INVITE_CODES.put(`code-request:${id}`, JSON.stringify(request));

  return c.json({ success: true, code });
});

// ---------------------------------------------------------------------------
// PUT /code-requests/:id/reject — Admin rejects a request
// ---------------------------------------------------------------------------

govchatRoutes.put('/code-requests/:id/reject', async (c) => {
  const adminResult = await requireAdmin(c.env, c.req.raw);
  if (adminResult instanceof Response) return adminResult;
  const admin = adminResult;

  const id = c.req.param('id');
  const stored = await c.env.INVITE_CODES.get(`code-request:${id}`, 'json');

  if (!stored) {
    return c.json({ error: 'Code request not found' }, 404);
  }

  const request = stored as CodeRequest;

  if (request.status !== 'pending') {
    return c.json({ error: `Request has already been ${request.status}` }, 400);
  }

  const body = await c.req.json<{ reason?: string }>().catch(() => ({ reason: undefined }));

  request.status = 'rejected';
  request.reviewedBy = admin.userId;
  request.reviewedAt = Date.now();
  request.rejectionReason = body.reason;

  await c.env.INVITE_CODES.put(`code-request:${id}`, JSON.stringify(request));

  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /auth/public-signup — Public user registration (no invite code)
// ---------------------------------------------------------------------------

govchatRoutes.post('/auth/public-signup', async (c) => {
  const body = await c.req.json<{ name: string; email: string }>();

  if (!body.name || !body.email) {
    return c.json({ error: 'name and email are required' }, 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return c.json({ error: 'Invalid email format' }, 400);
  }

  // Block .gov.gh emails — those should use invite codes
  if (body.email.toLowerCase().endsWith('.gov.gh')) {
    return c.json(
      { error: 'Government email addresses (.gov.gh) must register using an invite code' },
      400,
    );
  }

  // Derive a username from the email (sanitize for Matrix user ID)
  const username = body.email.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();

  // Register on Synapse homeserver via shared-secret registration
  const homeserverUrl = c.env.MATRIX_HOMESERVER_URL || 'https://govchat.askozzy.work';
  const serverName = new URL(homeserverUrl).hostname;
  const matrixUserId = `@${username}:${serverName}`;
  let matrixAccessToken = '';
  let matrixDeviceId = '';

  try {
    const registrationSecret = c.env.SYNAPSE_REGISTRATION_SECRET;
    if (registrationSecret) {
      // Step 1: Get a nonce from the server
      const nonceRes = await fetch(`${homeserverUrl}/_synapse/admin/v1/register`, {
        method: 'GET',
      });
      const nonceData = (await nonceRes.json()) as { nonce: string };
      const nonce = nonceData.nonce;

      // Step 2: Compute HMAC
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(registrationSecret),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign'],
      );

      const password = `GovChat_${generateToken().slice(0, 16)}`;
      const hmacMessage = `${nonce}\x00${username}\x00${password}\x00notadmin`;
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(hmacMessage));
      const mac = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Step 3: Register the user
      const regRes = await fetch(`${homeserverUrl}/_synapse/admin/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nonce,
          username,
          displayname: body.name,
          password,
          admin: false,
          mac,
        }),
      });

      if (regRes.ok) {
        const regData = (await regRes.json()) as {
          user_id: string;
          access_token: string;
          device_id: string;
        };
        matrixAccessToken = regData.access_token;
        matrixDeviceId = regData.device_id;
      } else {
        const errBody = await regRes.text();
        // User may already exist — try logging in instead
        if (errBody.includes('User ID already taken')) {
          const loginRes = await fetch(`${homeserverUrl}/_matrix/client/v3/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'm.login.password',
              identifier: { type: 'm.id.user', user: username },
              password,
            }),
          });
          if (loginRes.ok) {
            const loginData = (await loginRes.json()) as {
              user_id: string;
              access_token: string;
              device_id: string;
            };
            matrixAccessToken = loginData.access_token;
            matrixDeviceId = loginData.device_id;
          }
        }
      }
    }
  } catch (err) {
    console.error('Synapse registration error:', err);
  }

  // Create session with role 'public'
  const token = matrixAccessToken || generateToken();
  const deviceId = matrixDeviceId || `GOVCHAT_${generateToken().slice(0, 12).toUpperCase()}`;
  const userId = matrixAccessToken ? matrixUserId : `@${username}:gov.gh`;

  const session: GovChatSession = {
    userId,
    staffId: body.email,
    displayName: body.name,
    department: 'Public',
    ministry: 'Public',
    token,
    homeserverUrl,
    deviceId,
    createdAt: Date.now(),
    role: 'public',
  };

  // Store session with 30-day TTL
  await c.env.SESSIONS.put(`govchat-session:${token}`, JSON.stringify(session), {
    expirationTtl: 30 * 24 * 60 * 60, // 30 days in seconds
  });

  return c.json({
    success: true,
    userId,
    accessToken: token,
    homeserverUrl,
    staffId: body.email,
    deviceId,
  });
});
