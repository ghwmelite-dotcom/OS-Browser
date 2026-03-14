import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { aiRoutes } from './routes/ai';
import { healthRoutes } from './routes/health';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';

type Variables = { deviceId: string };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS — desktop app, no origin restriction
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting on all API routes
app.use('/api/v1/*', rateLimitMiddleware);

// Device auth on AI routes
app.use('/api/v1/ai/*', authMiddleware);

// Routes
app.route('/api/v1', healthRoutes);
app.route('/api/v1/ai', aiRoutes);

export default app;
