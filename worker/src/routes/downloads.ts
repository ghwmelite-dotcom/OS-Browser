import { Hono } from 'hono';
import type { Env } from '../types';

export const downloadRoutes = new Hono<{ Bindings: Env }>();

// ── Milestone definitions ──
const MILESTONES = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

const MILESTONE_NAMES: Record<number, { name: string; level: string }> = {
  500: { name: 'First 500', level: 'bronze' },
  1000: { name: 'One Thousand Strong', level: 'silver' },
  2500: { name: 'Community Rising', level: 'gold' },
  5000: { name: 'Five Thousand', level: 'gold' },
  10000: { name: 'Ten Thousand', level: 'platinum' },
  25000: { name: 'Quarter Century', level: 'diamond' },
  50000: { name: 'Fifty Thousand', level: 'star' },
  100000: { name: 'One Hundred Thousand', level: 'blackstar' },
};

function getLastMilestone(count: number): number {
  let last = 0;
  for (const m of MILESTONES) {
    if (count >= m) last = m;
  }
  return last;
}

function getNextMilestone(count: number): number | null {
  for (const m of MILESTONES) {
    if (count < m) return m;
  }
  return null;
}

function getMilestoneProgress(count: number): number {
  const last = getLastMilestone(count);
  const next = getNextMilestone(count);
  if (!next) return 100;
  const range = next - last;
  const progress = count - last;
  return Math.round((progress / range) * 100);
}

// GET /api/v1/downloads/count — returns the current download count with milestone info
downloadRoutes.get('/count', async (c) => {
  const count = parseInt((await c.env.MESSAGES.get('download_count')) || '247', 10);
  const lastMilestone = getLastMilestone(count);
  const nextMilestone = getNextMilestone(count);
  const progress = getMilestoneProgress(count);

  // Check if a milestone was just reached (within last 60 seconds)
  let milestoneJustReached = false;
  if (lastMilestone > 0) {
    const milestoneEvent = await c.env.MESSAGES.get(`milestone:${lastMilestone}`);
    if (milestoneEvent) {
      const data = JSON.parse(milestoneEvent);
      milestoneJustReached = Date.now() - data.timestamp < 60_000;
    }
  }

  return c.json({
    count,
    lastUpdated: Date.now(),
    nextMilestone,
    lastMilestone: lastMilestone > 0 ? lastMilestone : null,
    lastMilestoneInfo: lastMilestone > 0 ? MILESTONE_NAMES[lastMilestone] : null,
    progress,
    milestoneJustReached,
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
  const recent = (await c.env.MESSAGES.get('download_recent', 'json')) as any[] || [];
  return c.json({ recent });
});

// POST /api/v1/downloads/event — log a download event with metadata
downloadRoutes.post('/event', async (c) => {
  const body = await c.req.json<{ platform?: string }>().catch(() => ({}));
  const raw = await c.env.MESSAGES.get('download_count');
  const currentCount = parseInt(raw || '247', 10);
  const newCount = currentCount + 1;
  await c.env.MESSAGES.put('download_count', String(newCount));

  // Check if the new count crosses a milestone
  let milestoneReached: { count: number; name: string; level: string } | null = null;
  for (const m of MILESTONES) {
    if (currentCount < m && newCount >= m) {
      // Milestone just crossed
      const info = MILESTONE_NAMES[m];
      milestoneReached = { count: m, name: info.name, level: info.level };
      await c.env.MESSAGES.put(
        `milestone:${m}`,
        JSON.stringify({ timestamp: Date.now(), count: m, name: info.name, level: info.level }),
      );
      break;
    }
  }

  // Log recent event
  const recent = (await c.env.MESSAGES.get('download_recent', 'json')) as any[] || [];
  const event = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    platform: body.platform || 'windows',
    country: c.req.header('cf-ipcountry') || 'GH',
    city: c.req.header('cf-ipcity') || 'Accra',
  };
  recent.unshift(event);
  if (recent.length > 50) recent.length = 50;
  await c.env.MESSAGES.put('download_recent', JSON.stringify(recent));

  return c.json({ count: newCount, event, milestoneReached });
});

// GET /api/v1/downloads/milestones — returns all achieved milestones with timestamps
downloadRoutes.get('/milestones', async (c) => {
  const achieved: Array<{ milestone: number; name: string; level: string; timestamp: number }> = [];

  for (const m of MILESTONES) {
    const raw = await c.env.MESSAGES.get(`milestone:${m}`);
    if (raw) {
      const data = JSON.parse(raw);
      achieved.push({
        milestone: m,
        name: data.name,
        level: data.level,
        timestamp: data.timestamp,
      });
    }
  }

  return c.json({ milestones: achieved });
});
