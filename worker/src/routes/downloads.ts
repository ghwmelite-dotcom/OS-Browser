import { Hono } from 'hono';
import type { Env } from '../types';

export const downloadRoutes = new Hono<{ Bindings: Env }>();

// GET /api/v1/downloads/count — returns the current download count
downloadRoutes.get('/count', async (c) => {
  const count = await c.env.MESSAGES.get('download_count');
  return c.json({
    count: parseInt(count || '247', 10),
    lastUpdated: Date.now()
  });
});

// POST /api/v1/downloads/track — increment the download counter
// Called when someone clicks the download button
downloadRoutes.post('/track', async (c) => {
  const raw = await c.env.MESSAGES.get('download_count');
  const currentCount = parseInt(raw || '247', 10);
  const newCount = currentCount + 1;
  await c.env.MESSAGES.put('download_count', String(newCount));
  return c.json({ count: newCount });
});

// GET /api/v1/downloads/recent — returns recent download events for live feed
// Stores last 50 download events with timestamps and approximate location
downloadRoutes.get('/recent', async (c) => {
  const recent = await c.env.MESSAGES.get('download_recent', 'json') as any[] || [];
  return c.json({ recent });
});

// POST /api/v1/downloads/event — log a download event with metadata
downloadRoutes.post('/event', async (c) => {
  const body = await c.req.json<{ platform?: string }>().catch(() => ({}));
  const raw = await c.env.MESSAGES.get('download_count');
  const currentCount = parseInt(raw || '247', 10);
  const newCount = currentCount + 1;
  await c.env.MESSAGES.put('download_count', String(newCount));

  // Log recent event
  const recent = await c.env.MESSAGES.get('download_recent', 'json') as any[] || [];
  const event = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    platform: body.platform || 'windows',
    // Use CF headers for approximate region
    country: c.req.header('cf-ipcountry') || 'GH',
    city: c.req.header('cf-ipcity') || 'Accra',
  };
  recent.unshift(event);
  if (recent.length > 50) recent.length = 50;
  await c.env.MESSAGES.put('download_recent', JSON.stringify(recent));

  return c.json({ count: newCount, event });
});
