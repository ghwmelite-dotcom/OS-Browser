import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

type Variables = { deviceId: string };

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing device token' }, 401);
  }

  const token = authHeader.slice(7);
  const deviceData = await c.env.SESSIONS.get(`device:${token}`, 'json') as any;

  if (!deviceData) {
    return c.json({ error: 'Invalid or revoked device token' }, 401);
  }

  if (deviceData.suspended) {
    return c.json({ error: 'Device suspended due to abuse' }, 403);
  }

  c.set('deviceId', deviceData.id);
  await next();
});
