import { safeStorage } from 'electron';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
let _cachedKey: Buffer | null = null;

function getCredentialKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  // Generate a deterministic key from a fixed seed encrypted by safeStorage
  const seed = 'os-browser-credential-key-v1';
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(seed);
    _cachedKey = crypto.createHash('sha256').update(encrypted).digest();
  } else {
    // Fallback: use a fixed key derived from machine info (less secure but consistent)
    _cachedKey = crypto.createHash('sha256').update(seed + require('os').hostname()).digest();
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
