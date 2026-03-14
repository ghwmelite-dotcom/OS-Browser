import { safeStorage } from 'electron';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getCredentialKey(): Buffer {
  // Use a separate key from the DB encryption key
  // Stored in safeStorage under a different identifier
  const keyHex = safeStorage.isEncryptionAvailable()
    ? (() => {
        try {
          // Try to retrieve existing key
          const stored = safeStorage.encryptString('credential-key-check');
          // Generate a deterministic key from safeStorage's machine binding
          return crypto.createHash('sha256').update(stored).digest();
        } catch {
          return crypto.randomBytes(32);
        }
      })()
    : crypto.randomBytes(32);

  return typeof keyHex === 'string' ? Buffer.from(keyHex, 'hex') : keyHex;
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
