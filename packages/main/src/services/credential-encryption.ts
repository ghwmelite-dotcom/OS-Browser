import { safeStorage, app } from 'electron';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
let _cachedKey: Buffer | null = null;

const KEY_FILE = path.join(app.getPath('userData'), '.credential-key');

function getCredentialKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  // Try to load existing persisted key
  if (fs.existsSync(KEY_FILE)) {
    try {
      const encryptedKey = fs.readFileSync(KEY_FILE);
      const decrypted = safeStorage.decryptString(encryptedKey);
      _cachedKey = Buffer.from(decrypted, 'hex');
      return _cachedKey;
    } catch { /* key file unreadable — regenerate */ }
  }

  // Generate a new random key, encrypt with OS-level safeStorage, save to disk
  if (safeStorage.isEncryptionAvailable()) {
    const newKey = crypto.randomBytes(32);
    const encrypted = safeStorage.encryptString(newKey.toString('hex'));
    try {
      fs.writeFileSync(KEY_FILE, encrypted);
    } catch { /* non-critical — key will be re-generated next restart */ }
    _cachedKey = newKey;
  } else {
    // Fallback: deterministic key derived from machine info (less secure but consistent)
    _cachedKey = crypto.createHash('sha256')
      .update('os-browser-credential-key-v1' + require('os').hostname())
      .digest();
  }

  return _cachedKey;
}

export function encryptCredential(plaintext: string): string {
  const key = getCredentialKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptCredential(encryptedStr: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedStr.split(':');
  const key = getCredentialKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
