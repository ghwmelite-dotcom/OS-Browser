import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { aiRoutes } from './routes/ai';
import { healthRoutes } from './routes/health';
import { messagingRoutes } from './routes/messaging';
import { downloadRoutes } from './routes/downloads';
import { govchatRoutes } from './routes/govchat';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';

type Variables = { deviceId: string };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS — restrict to known origins (desktop app, local dev, deployed sites)
app.use('*', cors({
  origin: (origin) => {
    const allowed = ['https://govchat.askozzy.work', 'https://osbrowser.askozzy.work', 'file://', 'http://localhost:5173', 'http://localhost:4173'];
    if (!origin || allowed.includes(origin)) return origin || '*';
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

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

export default app;

// Durable Object exports
export { ChatRoom } from './durable-objects/ChatRoom';
export { UserPresence } from './durable-objects/UserPresence';
