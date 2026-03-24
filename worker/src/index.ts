import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { aiRoutes } from './routes/ai';
import { healthRoutes } from './routes/health';
import { messagingRoutes } from './routes/messaging';
import { downloadRoutes } from './routes/downloads';
import { govchatRoutes } from './routes/govchat';
import { exchangeRoutes } from './routes/exchange';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';

type Variables = { deviceId: string };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS — strict origin validation
// file:// is required for the Electron desktop app (renderer runs from local files).
// Missing Origin header is rejected to prevent non-browser tools from bypassing CORS.
app.use('*', cors({
  origin: (origin) => {
    // Reject requests with no Origin header — prevents curl/non-browser bypass
    if (!origin) return null;

    const allowed = [
      'https://govchat.askozzy.work',
      'https://osbrowser.askozzy.work',
      'https://m.osbrowser.askozzy.work', // Mobile PWA
      'file://',                    // Electron desktop app (packaged renderer)
      'http://localhost:5173',      // Vite dev server
      'http://localhost:4173',      // Vite preview server
      'http://localhost:5174',      // Mobile PWA dev server
    ];
    if (allowed.includes(origin)) return origin;
    // Allow Cloudflare Pages preview/production URLs
    if (origin.endsWith('.os-browser-mobile.pages.dev') || origin.endsWith('.os-browser.pages.dev')) return origin;
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// CSRF protection — require application/json or multipart/form-data Content-Type for
// state-changing requests. Browsers cannot send these from plain HTML forms, preventing
// cross-site form-based CSRF attacks.
app.use('*', async (c, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
    const contentType = c.req.header('content-type') || '';
    if (!contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return c.json({ error: 'Invalid content type' }, 415);
    }
  }
  await next();
});

// Rate limiting on all API routes — intentionally runs before auth middleware.
// IP-based rate limiting on public routes (downloads, health) is desired to prevent abuse.
// For authenticated routes (AI), the rate limiter provides an additional layer of DDoS protection.
app.use('/api/v1/*', rateLimitMiddleware);

// Device auth on AI routes
app.use('/api/v1/ai/*', authMiddleware);

// Routes
app.route('/api/v1', healthRoutes);
app.route('/api/v1/ai', aiRoutes);
app.route('/api/v1/messaging', messagingRoutes);
app.route('/api/v1/downloads', downloadRoutes);
app.route('/api/v1/govchat', govchatRoutes);
app.route('/api/v1/exchange', exchangeRoutes);

export default app;

// Durable Object exports
export { ChatRoom } from './durable-objects/ChatRoom';
export { UserPresence } from './durable-objects/UserPresence';
