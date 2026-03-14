import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

type Variables = { deviceId: string };

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

function getConfig(path: string): RateLimitConfig {
  if (path.includes('/register-device')) return { maxRequests: 5, windowMs: 3600000 };
  if (path.includes('/ai/search')) return { maxRequests: 10, windowMs: 60000 };
  if (path.includes('/ai/')) return { maxRequests: 30, windowMs: 60000 };
  return { maxRequests: 60, windowMs: 60000 };
}

export const rateLimitMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const deviceId = c.get('deviceId') as string | undefined;
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const identity = deviceId || ip;
  const path = new URL(c.req.url).pathname;
  const config = getConfig(path);

  const key = `rl:${identity}:${path.split('/').slice(0, 5).join('/')}`;
  const now = Date.now();

  const existing = await c.env.RATE_LIMITS.get(key, 'json') as { count: number; reset: number } | null;

  if (existing && now < existing.reset) {
    if (existing.count >= config.maxRequests) {
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(existing.reset));
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
    await c.env.RATE_LIMITS.put(key, JSON.stringify({
      count: existing.count + 1,
      reset: existing.reset,
    }), { expirationTtl: Math.ceil(config.windowMs / 1000) });
    c.header('X-RateLimit-Remaining', String(config.maxRequests - existing.count - 1));
  } else {
    await c.env.RATE_LIMITS.put(key, JSON.stringify({
      count: 1,
      reset: now + config.windowMs,
    }), { expirationTtl: Math.ceil(config.windowMs / 1000) });
    c.header('X-RateLimit-Remaining', String(config.maxRequests - 1));
  }

  await next();
});
