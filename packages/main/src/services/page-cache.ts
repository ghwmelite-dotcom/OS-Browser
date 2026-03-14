import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AD_BLOCK_WHITELIST, PAGE_CACHE_LIMIT_MB } from '@os-browser/shared';

const CACHE_DIR = path.join(app.getPath('userData'), 'page-cache');

function ensureCacheDir(): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 32);
}

function isGovPortal(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return AD_BLOCK_WHITELIST.some(pattern => {
      if (pattern.startsWith('*.')) return hostname.endsWith(pattern.slice(1));
      return hostname === pattern;
    });
  } catch { return false; }
}

export function cachePage(url: string, html: string, title: string): void {
  ensureCacheDir();
  const hash = hashUrl(url);
  const htmlPath = path.join(CACHE_DIR, `${hash}.html`);
  const metaPath = path.join(CACHE_DIR, `${hash}.meta.json`);

  fs.writeFileSync(htmlPath, html, 'utf-8');
  fs.writeFileSync(metaPath, JSON.stringify({
    url,
    title,
    cached_at: new Date().toISOString(),
    size: Buffer.byteLength(html, 'utf-8'),
    is_gov: isGovPortal(url),
  }));

  // Run eviction if needed
  evictIfNeeded();
}

export function getCachedPage(url: string): { html: string; meta: any } | null {
  const hash = hashUrl(url);
  const htmlPath = path.join(CACHE_DIR, `${hash}.html`);
  const metaPath = path.join(CACHE_DIR, `${hash}.meta.json`);

  if (!fs.existsSync(htmlPath) || !fs.existsSync(metaPath)) return null;

  try {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    return { html, meta };
  } catch { return null; }
}

function evictIfNeeded(): void {
  ensureCacheDir();
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.meta.json'));

  let totalSize = 0;
  const entries: { hash: string; size: number; cached_at: string; is_gov: boolean }[] = [];

  for (const file of files) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8'));
      const hash = file.replace('.meta.json', '');
      entries.push({ hash, size: meta.size || 0, cached_at: meta.cached_at, is_gov: meta.is_gov || false });
      totalSize += meta.size || 0;
    } catch { continue; }
  }

  const limitBytes = PAGE_CACHE_LIMIT_MB * 1024 * 1024;
  if (totalSize <= limitBytes) return;

  // Sort by age (oldest first), but never evict gov portals
  const evictable = entries.filter(e => !e.is_gov).sort((a, b) =>
    new Date(a.cached_at).getTime() - new Date(b.cached_at).getTime()
  );

  for (const entry of evictable) {
    if (totalSize <= limitBytes) break;
    try {
      fs.unlinkSync(path.join(CACHE_DIR, `${entry.hash}.html`));
      fs.unlinkSync(path.join(CACHE_DIR, `${entry.hash}.meta.json`));
      totalSize -= entry.size;
    } catch { continue; }
  }
}

export function getCacheStats(): { totalFiles: number; totalSizeMB: number } {
  ensureCacheDir();
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.html'));
  let totalSize = 0;
  for (const file of files) {
    try {
      totalSize += fs.statSync(path.join(CACHE_DIR, file)).size;
    } catch { continue; }
  }
  return { totalFiles: files.length, totalSizeMB: Math.round(totalSize / 1024 / 1024 * 10) / 10 };
}
