import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export interface Profile {
  id: string;
  name: string;
  color: string;
  pinHash: string;
  createdAt: string;
  avatarUrl?: string;
  unreadCount?: number;
}

export interface ProfilePublic {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  avatarUrl?: string;
  unreadCount?: number;
}

const PIN_LENGTH = 4;

let profiles: Profile[] = [];
let activeProfileId: string | null = null;

function getProfilesPath(): string {
  return path.join(app.getPath('userData'), 'profiles.json');
}

function getProfileDir(profileId: string): string {
  return path.join(app.getPath('userData'), 'profiles', profileId);
}

function loadProfilesFromDisk(): void {
  const p = getProfilesPath();
  if (fs.existsSync(p)) {
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      const data = JSON.parse(raw);
      profiles = data.profiles || [];
      activeProfileId = data.activeProfileId || null;
    } catch {
      profiles = [];
      activeProfileId = null;
    }
  }
}

function saveProfilesToDisk(): void {
  const p = getProfilesPath();
  try {
    const tempPath = p + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify({
      profiles,
      activeProfileId,
    }, null, 2), 'utf-8');
    fs.renameSync(tempPath, p);
  } catch (err) {
    console.error('[ProfileManager] Failed to save profiles:', err);
  }
}

/**
 * Hash a PIN with PBKDF2 + random salt (100k iterations, SHA-512).
 * Returns "salt:hash" format. If a salt is provided (re-hashing), it is reused.
 */
function hashPin(pin: string, salt?: string): string {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, useSalt, 100000, 64, 'sha512').toString('hex');
  return `${useSalt}:${hash}`;
}

/**
 * Verify a PIN against a stored hash. Supports both:
 *  - New PBKDF2 format: "salt:hash"
 *  - Legacy SHA-256 format: 64-char hex string (no colon)
 * Returns true if the PIN matches.
 */
function verifyPinHash(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) {
    // Legacy SHA-256 hash (no colon separator) — verify with old method
    const legacyHash = crypto.createHash('sha256').update(pin).digest('hex');
    if (legacyHash.length !== stored.length) return false;
    return crypto.timingSafeEqual(Buffer.from(legacyHash), Buffer.from(stored));
  }
  const computed = crypto.pbkdf2Sync(pin, salt, 100000, 64, 'sha512').toString('hex');
  if (computed.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

/**
 * Check if a stored hash is in the legacy SHA-256 format (needs migration).
 */
function isLegacyHash(stored: string): boolean {
  return !stored.includes(':');
}

function toPublic(p: Profile): ProfilePublic {
  return { id: p.id, name: p.name, color: p.color, createdAt: p.createdAt, avatarUrl: p.avatarUrl, unreadCount: p.unreadCount || 0 };
}

/**
 * Migration: on first run after update, if profiles.json doesn't exist but
 * database.json does exist in userData root, create a "Default" profile and
 * MOVE the existing database.json into the new profile's directory.
 */
export function migrateExistingData(): void {
  const profilesPath = getProfilesPath();
  const userDataDir = app.getPath('userData');
  const legacyDbPath = path.join(userDataDir, 'database.json');

  // If profiles.json already exists, no migration needed
  if (fs.existsSync(profilesPath)) return;

  // If there's no legacy database.json, nothing to migrate
  if (!fs.existsSync(legacyDbPath)) return;

  console.log('[ProfileManager] Migrating existing data to default profile...');

  const id = crypto.randomUUID();
  // Default profile with random PIN (logged for first-time setup)
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  const defaultProfile: Profile = {
    id,
    name: 'Default',
    color: '#D4A017',
    pinHash: hashPin(pin),
    createdAt: new Date().toISOString(),
  };
  console.log('[Profile] Default profile created with PIN:', pin);

  const profileDir = getProfileDir(id);
  fs.mkdirSync(profileDir, { recursive: true });

  // Move database.json to profile directory
  try {
    fs.copyFileSync(legacyDbPath, path.join(profileDir, 'database.json'));
    // Also copy backup if exists
    if (fs.existsSync(legacyDbPath + '.bak')) {
      fs.copyFileSync(legacyDbPath + '.bak', path.join(profileDir, 'database.json.bak'));
    }
    // Remove legacy files after successful copy
    fs.unlinkSync(legacyDbPath);
    if (fs.existsSync(legacyDbPath + '.bak')) {
      fs.unlinkSync(legacyDbPath + '.bak');
    }
  } catch (err) {
    console.error('[ProfileManager] Migration copy failed:', err);
  }

  profiles = [defaultProfile];
  activeProfileId = id;
  saveProfilesToDisk();

  console.log('[ProfileManager] Migration complete. Default profile created with id:', id);
}

export function initProfileManager(): void {
  // Run migration first
  migrateExistingData();
  // Load profiles
  loadProfilesFromDisk();
  // Always clear active profile on startup — forces the launcher to show
  // and require PIN entry every time the browser opens (security for shared devices)
  activeProfileId = null;
}

export function listProfiles(): ProfilePublic[] {
  return profiles.map(toPublic);
}

export function createProfile(name: string, color: string, pin: string): ProfilePublic {
  if (!name || name.trim().length === 0) {
    throw new Error('Profile name is required');
  }
  if (!pin || pin.length !== PIN_LENGTH || !/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }

  const id = crypto.randomUUID();
  const profile: Profile = {
    id,
    name: name.trim(),
    color,
    pinHash: hashPin(pin),
    createdAt: new Date().toISOString(),
  };

  // Create profile data directory
  const profileDir = getProfileDir(id);
  fs.mkdirSync(profileDir, { recursive: true });

  profiles.push(profile);
  saveProfilesToDisk();

  return toPublic(profile);
}

export function verifyPin(profileId: string, pin: string): boolean {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return false;
  const valid = verifyPinHash(pin, profile.pinHash);
  // Migrate legacy SHA-256 hash to PBKDF2 on successful verification
  if (valid && isLegacyHash(profile.pinHash)) {
    profile.pinHash = hashPin(pin);
    saveProfilesToDisk();
  }
  return valid;
}

export function deleteProfile(profileId: string, pin: string): boolean {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return false;
  if (!verifyPinHash(pin, profile.pinHash)) return false;

  // Don't allow deleting the last profile
  if (profiles.length <= 1) return false;

  // Remove profile directory
  const profileDir = getProfileDir(profileId);
  try {
    fs.rmSync(profileDir, { recursive: true, force: true });
  } catch (err) {
    console.error('[ProfileManager] Failed to delete profile dir:', err);
  }

  profiles = profiles.filter(p => p.id !== profileId);

  // If the deleted profile was active, clear active
  if (activeProfileId === profileId) {
    activeProfileId = null;
  }

  saveProfilesToDisk();
  return true;
}

export function switchProfile(profileId: string): boolean {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return false;

  activeProfileId = profileId;
  saveProfilesToDisk();
  return true;
}

export function getActiveProfileId(): string | null {
  return activeProfileId;
}

export function getActiveProfile(): ProfilePublic | null {
  if (!activeProfileId) return null;
  const profile = profiles.find(p => p.id === activeProfileId);
  return profile ? toPublic(profile) : null;
}

export function getProfileDataDir(profileId?: string): string {
  const id = profileId || activeProfileId;
  if (!id) return app.getPath('userData');
  return getProfileDir(id);
}

export function getProfileCount(): number {
  return profiles.length;
}

export function updateProfileAvatar(profileId: string, avatarUrl: string): boolean {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return false;
  profile.avatarUrl = avatarUrl;
  saveProfilesToDisk();
  return true;
}

export function updateProfileUnreadCount(profileId: string, count: number): boolean {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return false;
  profile.unreadCount = count;
  saveProfilesToDisk();
  return true;
}

export function updateProfileName(profileId: string, name: string): boolean {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return false;
  profile.name = name.trim();
  saveProfilesToDisk();
  return true;
}
