import { app, WebContents } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getProfileDataDir } from './profile-manager';

// ── Types ────────────────────────────────────────────────────────────
export interface VaultEntryMetadata {
  id: string;
  url: string;
  title: string;
  timestamp: string;
  pageAction: 'pre-submit' | 'post-submit' | 'manual';
  sha256Hash: string;
}

export interface VaultEntry extends VaultEntryMetadata {
  thumbnailPath: string;
}

// ── Gov Site Allowlist ───────────────────────────────────────────────
const GOV_CAPTURE_DOMAINS = [
  'gra.gov.gh', 'gifmis.gov.gh', 'ppa.gov.gh', 'ohcs.gov.gh',
  'ghanapostgps.com', 'nia.gov.gh', 'nhis.gov.gh', 'dvla.gov.gh',
  'ssnit.org.gh', 'bost.gov.gh', 'cocobod.gh', 'ghanatenders.gov.gh',
  'eprocurement.gov.gh', 'controller.gov.gh', 'mint.gov.gh',
];

export function isGovCaptureDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return GOV_CAPTURE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────
function getVaultDir(): string {
  return path.join(getProfileDataDir(), 'vault');
}

function getMonthDir(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return path.join(getVaultDir(), `${yyyy}-${mm}`);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

// ── Capture ──────────────────────────────────────────────────────────
export async function captureCurrentPage(
  webContents: WebContents,
  metadata: { url: string; title: string; pageAction: 'pre-submit' | 'post-submit' | 'manual' },
): Promise<VaultEntry> {
  const id = crypto.randomUUID();
  const monthDir = getMonthDir();
  ensureDir(monthDir);

  // Capture screenshot
  const image = await webContents.capturePage();
  const pngBuffer = image.toPNG();

  // SHA-256 hash for tamper evidence
  const sha256Hash = crypto.createHash('sha256').update(pngBuffer).digest('hex');

  // Write image
  const imagePath = path.join(monthDir, `${id}.png`);
  fs.writeFileSync(imagePath, pngBuffer);

  // Write metadata
  const entry: VaultEntryMetadata = {
    id,
    url: metadata.url,
    title: metadata.title,
    timestamp: new Date().toISOString(),
    pageAction: metadata.pageAction,
    sha256Hash,
  };

  const metaPath = path.join(monthDir, `${id}.json`);
  fs.writeFileSync(metaPath, JSON.stringify(entry, null, 2), 'utf-8');

  return {
    ...entry,
    thumbnailPath: imagePath,
  };
}

// ── List Entries ─────────────────────────────────────────────────────
export function listVaultEntries(
  search?: string,
  dateRange?: { from?: string; to?: string },
): VaultEntry[] {
  const vaultDir = getVaultDir();
  if (!fs.existsSync(vaultDir)) return [];

  const entries: VaultEntry[] = [];

  // Read all month directories
  let monthDirs: string[];
  try {
    monthDirs = fs.readdirSync(vaultDir).filter(d => {
      const fullPath = path.join(vaultDir, d);
      return fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{2}$/.test(d);
    });
  } catch {
    return [];
  }

  for (const monthDir of monthDirs) {
    const dirPath = path.join(vaultDir, monthDir);
    let files: string[];
    try {
      files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    } catch {
      continue;
    }

    for (const file of files) {
      try {
        const metaPath = path.join(dirPath, file);
        const raw = fs.readFileSync(metaPath, 'utf-8');
        const meta: VaultEntryMetadata = JSON.parse(raw);

        // Date range filter
        if (dateRange?.from && meta.timestamp < dateRange.from) continue;
        if (dateRange?.to && meta.timestamp > dateRange.to) continue;

        // Search filter — match on url or title
        if (search) {
          const q = search.toLowerCase();
          const matchUrl = meta.url.toLowerCase().includes(q);
          const matchTitle = meta.title.toLowerCase().includes(q);
          if (!matchUrl && !matchTitle) continue;
        }

        const imagePath = path.join(dirPath, `${meta.id}.png`);
        entries.push({
          ...meta,
          thumbnailPath: fs.existsSync(imagePath) ? imagePath : '',
        });
      } catch {
        // Skip corrupted entries
      }
    }
  }

  // Sort reverse chronological
  entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return entries;
}

// ── Get Image ────────────────────────────────────────────────────────
export function getVaultImage(id: string): string | null {
  const vaultDir = getVaultDir();
  if (!fs.existsSync(vaultDir)) return null;

  // Search across month directories
  let monthDirs: string[];
  try {
    monthDirs = fs.readdirSync(vaultDir).filter(d => {
      const fullPath = path.join(vaultDir, d);
      return fs.statSync(fullPath).isDirectory();
    });
  } catch {
    return null;
  }

  for (const monthDir of monthDirs) {
    const imagePath = path.join(vaultDir, monthDir, `${id}.png`);
    if (fs.existsSync(imagePath)) {
      const buffer = fs.readFileSync(imagePath);
      return buffer.toString('base64');
    }
  }

  return null;
}

// ── Delete Entry ─────────────────────────────────────────────────────
export function deleteVaultEntry(id: string): boolean {
  const vaultDir = getVaultDir();
  if (!fs.existsSync(vaultDir)) return false;

  let monthDirs: string[];
  try {
    monthDirs = fs.readdirSync(vaultDir).filter(d => {
      const fullPath = path.join(vaultDir, d);
      return fs.statSync(fullPath).isDirectory();
    });
  } catch {
    return false;
  }

  for (const monthDir of monthDirs) {
    const dirPath = path.join(vaultDir, monthDir);
    const imagePath = path.join(dirPath, `${id}.png`);
    const metaPath = path.join(dirPath, `${id}.json`);

    if (fs.existsSync(metaPath)) {
      try { fs.unlinkSync(metaPath); } catch {}
      try { fs.unlinkSync(imagePath); } catch {}
      return true;
    }
  }

  return false;
}

// ── Stats ────────────────────────────────────────────────────────────
export function getVaultStats(): { totalCaptures: number } {
  const entries = listVaultEntries();
  return { totalCaptures: entries.length };
}
