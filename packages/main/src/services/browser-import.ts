import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getDatabase } from '../db/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DetectedBrowser {
  id: string;
  name: string;
  email: string;
  hasBookmarks: boolean;
  hasHistory: boolean;
  profilePath: string;
}

interface ImportResult {
  bookmarks: number;
  history: number;
}

interface ChromeBookmarkNode {
  type: 'folder' | 'url';
  name: string;
  url?: string;
  children?: ChromeBookmarkNode[];
}

// ---------------------------------------------------------------------------
// Browser base paths (Windows / Chromium-based)
// Each browser can have multiple profiles under "User Data/"
// ---------------------------------------------------------------------------

const BROWSER_BASES: Array<{ id: string; name: string; userDataFn: () => string }> = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    userDataFn: () => path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data'),
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    userDataFn: () => path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data'),
  },
  {
    id: 'brave',
    name: 'Brave Browser',
    userDataFn: () => path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware', 'Brave-Browser', 'User Data'),
  },
  {
    id: 'opera',
    name: 'Opera',
    userDataFn: () => path.join(process.env.APPDATA || '', 'Opera Software', 'Opera Stable'),
  },
];

/**
 * Read the profile display name and email from Chrome's Preferences JSON.
 * Priority: Google account name (gaia_name) > profile.name > folder name.
 * Also extracts the email for disambiguation.
 */
function getProfileInfo(profilePath: string, folderName: string): { name: string; email: string } {
  let name = folderName === 'Default' ? 'Default' : folderName.replace(/^Profile\s*/i, 'Profile ');
  let email = '';

  try {
    const prefsFile = path.join(profilePath, 'Preferences');
    if (!fs.existsSync(prefsFile)) return { name, email };

    const prefs = JSON.parse(fs.readFileSync(prefsFile, 'utf-8'));

    // Try Google account name first (most recognizable)
    const gaiaName = prefs?.profile?.gaia_name;
    if (gaiaName && typeof gaiaName === 'string' && gaiaName.trim()) {
      name = gaiaName.trim();
    } else {
      // Fall back to profile.name, but skip generic "Your Chrome" / "Person X"
      const profileName = prefs?.profile?.name;
      if (profileName && typeof profileName === 'string'
        && !profileName.startsWith('Your ') && !profileName.startsWith('Person ')) {
        name = profileName.trim();
      }
    }

    // Extract email from account_info array
    const accounts = prefs?.account_info;
    if (Array.isArray(accounts) && accounts.length > 0) {
      const acctEmail = accounts[0]?.email;
      if (acctEmail && typeof acctEmail === 'string') {
        email = acctEmail;
        // If name is still generic, use email username as name
        if (name === 'Default' || name.startsWith('Profile ')) {
          name = acctEmail.split('@')[0];
        }
      }
    }

    // Also try gaia_given_name for a shorter first name
    const givenName = prefs?.profile?.gaia_given_name;
    if (givenName && typeof givenName === 'string' && givenName.trim()
      && (name === 'Default' || name.startsWith('Profile '))) {
      name = givenName.trim();
    }
  } catch {}

  return { name, email };
}

/**
 * Scan a Chromium "User Data" directory for all profiles (Default, Profile 1, Profile 2, ...).
 */
function scanProfiles(userDataDir: string): Array<{ folderName: string; profilePath: string }> {
  const profiles: Array<{ folderName: string; profilePath: string }> = [];
  if (!fs.existsSync(userDataDir)) return profiles;

  try {
    const entries = fs.readdirSync(userDataDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Chrome profiles are "Default", "Profile 1", "Profile 2", etc.
      if (entry.name === 'Default' || /^Profile \d+$/i.test(entry.name)) {
        const profilePath = path.join(userDataDir, entry.name);
        profiles.push({ folderName: entry.name, profilePath });
      }
    }
  } catch {}

  return profiles;
}

/**
 * Find the bookmarks file in a profile directory.
 * Chrome recently renamed "Bookmarks" to "AccountBookmarks".
 */
function findBookmarksFile(profilePath: string): string | null {
  // Check both names — newer Chrome uses AccountBookmarks
  for (const name of ['Bookmarks', 'AccountBookmarks']) {
    const fp = path.join(profilePath, name);
    if (fs.existsSync(fp)) return fp;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export function detectBrowsers(): DetectedBrowser[] {
  const results: DetectedBrowser[] = [];

  for (const browser of BROWSER_BASES) {
    try {
      const userDataDir = browser.userDataFn();

      // Opera doesn't use the multi-profile "User Data" structure
      if (browser.id === 'opera') {
        if (!fs.existsSync(userDataDir)) continue;
        const hasBookmarks = !!findBookmarksFile(userDataDir);
        const hasHistory = fs.existsSync(path.join(userDataDir, 'History'));
        if (hasBookmarks || hasHistory) {
          results.push({
            id: 'opera',
            name: 'Opera',
            email: '',
            hasBookmarks,
            hasHistory,
            profilePath: userDataDir,
          });
        }
        continue;
      }

      // Scan all Chromium profiles
      const profiles = scanProfiles(userDataDir);
      for (const prof of profiles) {
        const hasBookmarks = !!findBookmarksFile(prof.profilePath);
        const historyFile = path.join(prof.profilePath, 'History');
        const hasHistory = fs.existsSync(historyFile);

        if (!hasBookmarks && !hasHistory) continue;

        const info = getProfileInfo(prof.profilePath, prof.folderName);

        results.push({
          id: `${browser.id}:${prof.folderName}`,
          name: info.name,
          email: info.email,
          hasBookmarks,
          hasHistory,
          profilePath: prof.profilePath,
        });
      }
    } catch {
      // Skip inaccessible browser profiles
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Import orchestrator
// ---------------------------------------------------------------------------

export async function importFromBrowser(browserId: string): Promise<ImportResult> {
  const browsers = detectBrowsers();
  const browser = browsers.find((b) => b.id === browserId);

  if (!browser) {
    throw new Error(`Browser "${browserId}" not found or has no importable data.`);
  }

  let bookmarksImported = 0;
  let historyImported = 0;

  if (browser.hasBookmarks) {
    try {
      bookmarksImported = importBookmarks(browser.profilePath);
    } catch (err) {
      console.error(`[browser-import] Failed to import bookmarks from ${browser.name}:`, err);
    }
  }

  if (browser.hasHistory) {
    try {
      historyImported = importHistory(browser.profilePath);
    } catch (err) {
      console.error(`[browser-import] Failed to import history from ${browser.name}:`, err);
    }
  }

  return { bookmarks: bookmarksImported, history: historyImported };
}

// ---------------------------------------------------------------------------
// Bookmark import
// ---------------------------------------------------------------------------

function importBookmarks(profilePath: string): number {
  const bookmarksFile = findBookmarksFile(profilePath);
  if (!bookmarksFile) {
    console.log('[browser-import] No bookmarks file found in', profilePath);
    return 0;
  }
  console.log('[browser-import] Reading bookmarks from:', bookmarksFile);
  const raw = fs.readFileSync(bookmarksFile, 'utf-8');
  const data = JSON.parse(raw);

  const db = getDatabase();
  let imported = 0;

  const roots = data?.roots;
  if (!roots) {
    console.log('[browser-import] No roots found in Bookmarks JSON');
    return 0;
  }

  // Process bookmark_bar and other roots
  const rootSections: Array<{ key: string; label: string }> = [
    { key: 'bookmark_bar', label: 'Bookmarks Bar' },
    { key: 'other', label: 'Other Bookmarks' },
    { key: 'synced', label: 'Synced Bookmarks' },
  ];

  for (const section of rootSections) {
    const root = roots[section.key];
    if (!root?.children?.length) continue;

    const count = walkBookmarkTree(db, root.children, null);
    console.log(`[browser-import] ${section.label}: imported ${count} bookmarks`);
    imported += count;
  }

  // Verify bookmarks were persisted by reading back
  const verification = db.prepare('SELECT * FROM bookmarks').all();
  console.log(`[browser-import] Verification: ${verification.length} bookmarks in database after import`);

  return imported;
}

/**
 * Recursively walk the Chromium bookmark tree, creating folders and bookmarks
 * in the OS Browser database.
 */
function walkBookmarkTree(
  db: ReturnType<typeof getDatabase>,
  nodes: ChromeBookmarkNode[],
  parentFolderId: number | null,
): number {
  let count = 0;

  for (const node of nodes) {
    try {
      if (node.type === 'folder') {
        // Create the folder
        const folderPosition =
          (db.prepare('SELECT MAX(position) as max FROM bookmark_folders').get() as any)?.max + 1 || 0;

        const folderResult = db
          .prepare('INSERT INTO bookmark_folders (name, parent_id, position) VALUES (?, ?, ?)')
          .run(node.name, parentFolderId, folderPosition);

        const folderId = folderResult.lastInsertRowid;

        // Recurse into children
        if (node.children?.length) {
          count += walkBookmarkTree(db, node.children, folderId);
        }
      } else if (node.type === 'url' && node.url) {
        // Skip duplicates: check if this URL already exists
        const existing = db.prepare('SELECT id FROM bookmarks WHERE url = ? LIMIT 1').get(node.url);
        if (existing) continue;

        // Determine next position
        const position =
          (db.prepare('SELECT MAX(position) as max FROM bookmarks').get() as any)?.max + 1 || 0;

        // Build favicon URL from domain
        let faviconUrl: string | null = null;
        try {
          const domain = new URL(node.url).hostname;
          faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
          // Invalid URL — skip favicon
        }

        db.prepare(
          'INSERT INTO bookmarks (url, title, folder_id, position, favicon_path, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(
          node.url,
          node.name || node.url,
          parentFolderId,
          position,
          faviconUrl,
          new Date().toISOString(),
        );

        count++;
      }
    } catch (err) {
      console.error(`[browser-import] Skipping bookmark node "${node.name}":`, err);
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// History import
// ---------------------------------------------------------------------------

function importHistory(profilePath: string): number {
  const historyFile = path.join(profilePath, 'History');

  // Chrome locks the History SQLite file while running.
  // Copy it to a temp location first, then read the copy.
  const tempDir = app.getPath('temp');
  const tempCopy = path.join(tempDir, `ozzysurf-import-history-${Date.now()}.db`);

  try {
    fs.copyFileSync(historyFile, tempCopy);
  } catch (err) {
    console.error('[browser-import] Could not copy History file (browser may be locked):', err);
    return 0;
  }

  let imported = 0;

  try {
    // better-sqlite3 is a native module — use require()
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3');
    const sourceDb = new Database(tempCopy, { readonly: true, fileMustExist: true });

    const rows = sourceDb
      .prepare('SELECT url, title, visit_count, last_visit_time FROM urls ORDER BY last_visit_time DESC LIMIT 500')
      .all() as Array<{ url: string; title: string; visit_count: number; last_visit_time: number }>;

    sourceDb.close();

    const db = getDatabase();

    for (const row of rows) {
      try {
        // Skip empty or internal URLs
        if (!row.url || row.url.startsWith('chrome://') || row.url.startsWith('chrome-extension://')) {
          continue;
        }

        // Convert Chrome timestamp (microseconds since Jan 1 1601) to JS Date
        const lastVisited = chromeTimeToDate(row.last_visit_time);

        // Check for duplicate (url is UNIQUE in history table)
        const existing = db.prepare('SELECT id FROM history WHERE url = ? LIMIT 1').get(row.url);
        if (existing) continue;

        const now = new Date().toISOString();

        db.prepare(
          'INSERT INTO history (url, title, visit_count, last_visited_at, created_at) VALUES (?, ?, ?, ?, ?)',
        ).run(
          row.url,
          row.title || row.url,
          row.visit_count || 1,
          lastVisited.toISOString(),
          now,
        );

        imported++;
      } catch (err) {
        console.error(`[browser-import] Skipping history entry "${row.url}":`, err);
      }
    }
  } catch (err) {
    console.error('[browser-import] Failed to read History SQLite file:', err);
  } finally {
    // Clean up temp file
    try {
      fs.unlinkSync(tempCopy);
    } catch {
      // Non-critical cleanup failure
    }
  }

  return imported;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Chrome stores timestamps as microseconds since January 1, 1601 (Windows FILETIME epoch).
 * Convert to a JavaScript Date.
 */
function chromeTimeToDate(chromeTime: number): Date {
  // Microseconds between 1601-01-01 and 1970-01-01 (Unix epoch)
  const EPOCH_DIFF_MICROSECONDS = 11644473600000000;
  const unixMicroseconds = chromeTime - EPOCH_DIFF_MICROSECONDS;
  return new Date(unixMicroseconds / 1000);
}
