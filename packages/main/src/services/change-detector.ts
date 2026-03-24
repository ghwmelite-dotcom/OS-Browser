// ── Website Change Detector Service ───────────────────────────────────
// Watches URLs for content changes by periodically fetching and hashing.

import { BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getProfileDataDir } from './profile-manager';
import { computeDiff, DiffResult } from './text-diff';

// ── Types ──────────────────────────────────────────────────────────────
export interface WatchConfig {
  id: string;
  url: string;
  interval: number;       // milliseconds
  selector?: string;      // optional CSS selector to narrow scope
  title?: string;
  createdAt: string;
}

export type WatchStatus = 'unchanged' | 'changed' | 'error' | 'pending';

export interface WatchEntry extends WatchConfig {
  status: WatchStatus;
  lastChecked: string | null;
  lastHash: string | null;
  errorMessage?: string;
  unread: boolean;
}

interface Snapshot {
  hash: string;
  content: string;
  timestamp: string;
}

interface WatchStoredData {
  config: WatchConfig;
  status: WatchStatus;
  lastChecked: string | null;
  lastHash: string | null;
  errorMessage?: string;
  unread: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────
const MAX_SNAPSHOTS = 5;
const MAX_CONTENT_LENGTH = 500_000; // 500KB max per page

// ── State ──────────────────────────────────────────────────────────────
let watches = new Map<string, WatchEntry>();
let timers = new Map<string, ReturnType<typeof setInterval>>();
let mainWin: BrowserWindow | null = null;

// ── Storage Paths ──────────────────────────────────────────────────────
function getWatchlistDir(): string {
  return path.join(getProfileDataDir(), 'watchlist');
}

function getWatchDir(watchId: string): string {
  return path.join(getWatchlistDir(), watchId);
}

function getSnapshotsDir(watchId: string): string {
  return path.join(getWatchDir(watchId), 'snapshots');
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Persistence ────────────────────────────────────────────────────────
function saveWatchConfig(entry: WatchEntry): void {
  const dir = getWatchDir(entry.id);
  ensureDir(dir);

  const data: WatchStoredData = {
    config: {
      id: entry.id,
      url: entry.url,
      interval: entry.interval,
      selector: entry.selector,
      title: entry.title,
      createdAt: entry.createdAt,
    },
    status: entry.status,
    lastChecked: entry.lastChecked,
    lastHash: entry.lastHash,
    errorMessage: entry.errorMessage,
    unread: entry.unread,
  };

  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(data, null, 2));
}

function loadAllWatches(): Map<string, WatchEntry> {
  const result = new Map<string, WatchEntry>();
  const baseDir = getWatchlistDir();

  if (!fs.existsSync(baseDir)) return result;

  const dirs = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const dir of dirs) {
    const configPath = path.join(baseDir, dir.name, 'config.json');
    if (!fs.existsSync(configPath)) continue;

    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const data: WatchStoredData = JSON.parse(raw);
      const entry: WatchEntry = {
        ...data.config,
        status: data.status,
        lastChecked: data.lastChecked,
        lastHash: data.lastHash,
        errorMessage: data.errorMessage,
        unread: data.unread,
      };
      result.set(entry.id, entry);
    } catch {
      // Skip corrupt entries
    }
  }

  return result;
}

function saveSnapshot(watchId: string, content: string, hash: string): void {
  const dir = getSnapshotsDir(watchId);
  ensureDir(dir);

  const snapshot: Snapshot = {
    hash,
    content,
    timestamp: new Date().toISOString(),
  };

  const filename = `${Date.now()}.json`;
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(snapshot));

  // Prune old snapshots — keep only the latest MAX_SNAPSHOTS
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();

  for (let i = MAX_SNAPSHOTS; i < files.length; i++) {
    try { fs.unlinkSync(path.join(dir, files[i])); } catch { /* ignore */ }
  }
}

function getLatestSnapshots(watchId: string, count: number = 2): Snapshot[] {
  const dir = getSnapshotsDir(watchId);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, count);

  const snapshots: Snapshot[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      snapshots.push(JSON.parse(raw));
    } catch { /* skip */ }
  }

  return snapshots;
}

function saveDiff(watchId: string, diff: DiffResult): void {
  const dir = getWatchDir(watchId);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, 'latest-diff.json'), JSON.stringify(diff));
}

function loadDiff(watchId: string): DiffResult | null {
  const diffPath = path.join(getWatchDir(watchId), 'latest-diff.json');
  if (!fs.existsSync(diffPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(diffPath, 'utf-8'));
  } catch {
    return null;
  }
}

// ── Content Extraction ─────────────────────────────────────────────────
function stripHtml(html: string): string {
  // Remove script and style tags with content
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function extractBySelector(html: string, selector: string): string {
  // Simple regex extraction for id and class selectors
  // Handles: #id, .class, tag
  if (selector.startsWith('#')) {
    const id = selector.slice(1);
    const regex = new RegExp(`<[^>]+id=["']${escapeRegex(id)}["'][^>]*>([\\s\\S]*?)(?=<\\/[a-z]+>\\s*(?:<[^>]+id=|$))`, 'i');
    const match = html.match(regex);
    if (match) return match[0];
  } else if (selector.startsWith('.')) {
    const className = selector.slice(1);
    const regex = new RegExp(`<[^>]+class=["'][^"']*\\b${escapeRegex(className)}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/`, 'i');
    const match = html.match(regex);
    if (match) return match[0];
  } else {
    // Tag selector
    const regex = new RegExp(`<${escapeRegex(selector)}[^>]*>[\\s\\S]*?<\\/${escapeRegex(selector)}>`, 'i');
    const match = html.match(regex);
    if (match) return match[0];
  }

  // If selector matching fails, return full HTML
  return html;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hashContent(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function generateWatchId(url: string): string {
  return crypto.createHash('md5').update(url + Date.now()).digest('hex').slice(0, 12);
}

// ── Background Check ───────────────────────────────────────────────────
async function checkUrl(watchId: string): Promise<void> {
  const entry = watches.get(watchId);
  if (!entry) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(entry.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OzzySurf-OS-Browser/1.0 ChangeDetector',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let html = await response.text();
    if (html.length > MAX_CONTENT_LENGTH) {
      html = html.slice(0, MAX_CONTENT_LENGTH);
    }

    // Extract content by selector if provided
    let content = entry.selector ? extractBySelector(html, entry.selector) : html;
    const cleanedText = stripHtml(content);
    const newHash = hashContent(cleanedText);

    const previousHash = entry.lastHash;

    // Save snapshot
    saveSnapshot(watchId, cleanedText, newHash);

    // Update entry
    entry.lastChecked = new Date().toISOString();
    entry.lastHash = newHash;
    entry.errorMessage = undefined;

    if (previousHash && previousHash !== newHash) {
      // Content changed!
      entry.status = 'changed';
      entry.unread = true;

      // Compute diff from previous snapshot
      const snapshots = getLatestSnapshots(watchId, 2);
      if (snapshots.length >= 2) {
        const diff = computeDiff(snapshots[1].content, snapshots[0].content);
        saveDiff(watchId, diff);
      }

      // Notify renderer
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send('watcher:change-detected', {
          id: entry.id,
          url: entry.url,
          title: entry.title || entry.url,
          summary: `Content changed`,
        });
      }
    } else if (!previousHash) {
      // First check — baseline
      entry.status = 'unchanged';
    } else {
      entry.status = 'unchanged';
    }

    watches.set(watchId, entry);
    saveWatchConfig(entry);
  } catch (err: any) {
    entry.status = 'error';
    entry.lastChecked = new Date().toISOString();
    entry.errorMessage = err.message || 'Unknown error';
    watches.set(watchId, entry);
    saveWatchConfig(entry);
  }
}

// ── Timer Management ───────────────────────────────────────────────────
function startTimer(watchId: string): void {
  const entry = watches.get(watchId);
  if (!entry) return;

  // Clear existing timer
  stopTimer(watchId);

  // Do an initial check after a short delay
  setTimeout(() => checkUrl(watchId), 5_000);

  // Set recurring interval
  const timer = setInterval(() => checkUrl(watchId), entry.interval);
  timers.set(watchId, timer);
}

function stopTimer(watchId: string): void {
  const timer = timers.get(watchId);
  if (timer) {
    clearInterval(timer);
    timers.delete(watchId);
  }
}

function stopAllTimers(): void {
  for (const [id] of timers) {
    stopTimer(id);
  }
}

// ── Public API ─────────────────────────────────────────────────────────
export function addWatch(
  url: string,
  interval: number,
  selector?: string,
  title?: string,
): WatchEntry {
  const id = generateWatchId(url);

  const entry: WatchEntry = {
    id,
    url,
    interval,
    selector,
    title,
    createdAt: new Date().toISOString(),
    status: 'pending',
    lastChecked: null,
    lastHash: null,
    unread: false,
  };

  watches.set(id, entry);
  saveWatchConfig(entry);
  startTimer(id);

  return entry;
}

export function removeWatch(watchId: string): boolean {
  const entry = watches.get(watchId);
  if (!entry) return false;

  stopTimer(watchId);
  watches.delete(watchId);

  // Remove storage
  const dir = getWatchDir(watchId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  return true;
}

export function listWatches(): WatchEntry[] {
  return Array.from(watches.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getWatchDiff(watchId: string): DiffResult | null {
  return loadDiff(watchId);
}

export function forceCheck(watchId: string): Promise<void> {
  return checkUrl(watchId);
}

export function markRead(watchId: string): void {
  const entry = watches.get(watchId);
  if (!entry) return;
  entry.unread = false;
  if (entry.status === 'changed') {
    entry.status = 'unchanged';
  }
  watches.set(watchId, entry);
  saveWatchConfig(entry);
}

export function updateWatchConfig(
  watchId: string,
  config: { interval?: number; selector?: string; title?: string },
): WatchEntry | null {
  const entry = watches.get(watchId);
  if (!entry) return null;

  if (config.interval !== undefined) entry.interval = config.interval;
  if (config.selector !== undefined) entry.selector = config.selector;
  if (config.title !== undefined) entry.title = config.title;

  watches.set(watchId, entry);
  saveWatchConfig(entry);

  // Restart timer if interval changed
  if (config.interval !== undefined) {
    startTimer(watchId);
  }

  return entry;
}

export function getUnreadCount(): number {
  let count = 0;
  for (const entry of watches.values()) {
    if (entry.unread) count++;
  }
  return count;
}

// ── Initialization / Shutdown ──────────────────────────────────────────
export function initChangeDetector(win: BrowserWindow): void {
  mainWin = win;

  // Load saved watches from disk
  watches = loadAllWatches();

  // Start timers for all watches
  for (const [id] of watches) {
    startTimer(id);
  }

  console.log(`[ChangeDetector] Initialized with ${watches.size} watched URLs`);
}

export function shutdownChangeDetector(): void {
  stopAllTimers();
  mainWin = null;
  console.log('[ChangeDetector] All timers stopped');
}
