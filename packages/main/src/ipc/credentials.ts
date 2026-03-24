import { ipcMain, net } from 'electron';
import { getDatabase } from '../db/database';
import { encryptCredential, decryptCredential } from '../services/credential-encryption';
import { registerTOTPHandlers, generateTOTP, getTimeRemaining } from '../services/totp';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';

// ── Secure GovChat credential storage (encrypted at rest via AES-256-GCM) ──
// Replaces plaintext localStorage in the renderer for Matrix access tokens.
const GOVCHAT_CRED_FILE = path.join(app.getPath('userData'), '.govchat-credentials');

function saveGovChatCredentials(credentials: Record<string, unknown>): void {
  try {
    const encrypted = encryptCredential(JSON.stringify(credentials));
    fs.writeFileSync(GOVCHAT_CRED_FILE, encrypted, 'utf8');
  } catch {
    // Non-critical — credentials will live only in memory this session
  }
}

function loadGovChatCredentials(): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(GOVCHAT_CRED_FILE)) return null;
    const encrypted = fs.readFileSync(GOVCHAT_CRED_FILE, 'utf8');
    if (!encrypted) return null;
    const decrypted = decryptCredential(encrypted);
    const parsed = JSON.parse(decrypted);
    if (parsed && typeof parsed.userId === 'string' && typeof parsed.accessToken === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function clearGovChatCredentials(): void {
  try {
    if (fs.existsSync(GOVCHAT_CRED_FILE)) {
      fs.unlinkSync(GOVCHAT_CRED_FILE);
    }
  } catch {
    // silent
  }
}

export function registerCredentialHandlers(): void {
  // ── Secure GovChat credential IPC ──
  ipcMain.handle('govchat:store-credentials', (_event, credentials: Record<string, unknown>) => {
    saveGovChatCredentials(credentials);
    return { success: true };
  });

  ipcMain.handle('govchat:load-credentials', () => {
    return loadGovChatCredentials();
  });

  ipcMain.handle('govchat:clear-credentials', () => {
    clearGovChatCredentials();
    return { success: true };
  });
  ipcMain.handle('credential:save', (_event, data: { url_pattern: string; username: string; password: string; display_name?: string }) => {
    if (!data || typeof data.url_pattern !== 'string' || typeof data.username !== 'string' || typeof data.password !== 'string') {
      return { success: false, error: 'Invalid credential data' };
    }
    if (data.url_pattern.length > 2048 || data.username.length > 512 || data.password.length > 1024) {
      return { success: false, error: 'Input too long' };
    }
    if (data.display_name && (typeof data.display_name !== 'string' || data.display_name.length > 256)) {
      return { success: false, error: 'Display name too long' };
    }
    try {
      const db = getDatabase();
      const usernameEnc = encryptCredential(data.username);
      const passwordEnc = encryptCredential(data.password);
      const result = db.prepare(
        'INSERT INTO credentials (url_pattern, username_encrypted, password_encrypted, display_name, last_used_at) VALUES (?, ?, ?, ?, datetime("now"))'
      ).run(data.url_pattern, usernameEnc, passwordEnc, data.display_name || null);
      return { success: true, id: result.lastInsertRowid };
    } catch (err: any) {
      console.error('[Credentials] Save failed:', err.message);
      return { success: false, error: 'Failed to save credential' };
    }
  });

  ipcMain.handle('credential:get', (_event, url: string) => {
    if (typeof url !== 'string' || url.length > 4096) return [];
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM credentials ORDER BY last_used_at DESC').all() as any[];

    // Find matching credentials by URL pattern
    const matches = rows.filter((row: any) => {
      try {
        const pattern = row.url_pattern;
        const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return url.includes(pattern) || new RegExp('^' + escaped + '$').test(url);
      } catch {
        return url.includes(row.url_pattern);
      }
    });

    return matches.map((row: any) => ({
      id: row.id,
      url_pattern: row.url_pattern,
      username: decryptCredential(row.username_encrypted),
      display_name: row.display_name,
      last_used_at: row.last_used_at,
    }));
  });

  ipcMain.handle('credential:delete', (_event, id: number) => {
    if (typeof id !== 'number' || id < 1) return;
    const db = getDatabase();
    db.prepare('DELETE FROM credentials WHERE id = ?').run(id);
  });

  ipcMain.handle('credential:list', () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT id, url_pattern, display_name, last_used_at, created_at FROM credentials ORDER BY last_used_at DESC').all();
    return rows;
  });

  ipcMain.handle('credential:fill', (_event, id: number) => {
    if (typeof id !== 'number' || id < 1) return { success: false, error: 'Invalid credential ID' };
    try {
      const db = getDatabase();
      const row = db.prepare('SELECT * FROM credentials WHERE id = ?').get(id) as any;
      if (!row) return { success: false, error: 'Credential not found' };

      db.prepare('UPDATE credentials SET last_used_at = datetime("now") WHERE id = ?').run(id);

      return {
        success: true,
        username: decryptCredential(row.username_encrypted),
        password: decryptCredential(row.password_encrypted),
      };
    } catch (err: any) {
      console.error('[Credentials] Fill failed:', err.message);
      return { success: false, error: 'Failed to retrieve credential' };
    }
  });

  // ── TOTP credential storage ──
  ipcMain.handle('credential:save-totp', (_event, id: number, totpSecret: string) => {
    if (typeof id !== 'number' || id < 1) return { success: false };
    if (typeof totpSecret !== 'string' || totpSecret.length < 1 || totpSecret.length > 512) return { success: false };
    const db = getDatabase();
    const encrypted = encryptCredential(totpSecret);
    db.prepare('UPDATE credentials SET totp_secret_encrypted = ? WHERE id = ?').run(encrypted, id);
    return { success: true };
  });

  ipcMain.handle('credential:get-totp', (_event, id: number) => {
    if (typeof id !== 'number' || id < 1) return null;
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM credentials WHERE id = ?').get(id) as any;
    if (!row || !row.totp_secret_encrypted) return null;

    try {
      const secret = decryptCredential(row.totp_secret_encrypted);
      const code = generateTOTP(secret);
      const timeRemaining = getTimeRemaining();
      return { code, timeRemaining, secret };
    } catch {
      return null;
    }
  });

  // ── Breach check via Have I Been Pwned k-Anonymity API ──
  ipcMain.handle('credential:check-breach', async (_event, password: string) => {
    if (typeof password !== 'string' || password.length < 1) return { breached: false, count: 0 };

    try {
      const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1.slice(0, 5);
      const suffix = sha1.slice(5);

      const response = await new Promise<string>((resolve, reject) => {
        const request = net.request(`https://api.pwnedpasswords.com/range/${prefix}`);
        const timeout = setTimeout(() => { try { request.abort(); } catch {} }, 5000);
        let body = '';
        request.on('response', (res) => {
          res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          res.on('end', () => { clearTimeout(timeout); resolve(body); });
          res.on('error', (err) => { clearTimeout(timeout); reject(err); });
        });
        request.on('error', (err) => { clearTimeout(timeout); reject(err); });
        request.end();
      });

      const lines = response.split('\n');
      for (const line of lines) {
        const [hashSuffix, countStr] = line.trim().split(':');
        if (hashSuffix === suffix) {
          return { breached: true, count: parseInt(countStr) || 1 };
        }
      }
      return { breached: false, count: 0 };
    } catch {
      return { breached: false, count: 0, error: 'Failed to check' };
    }
  });

  // ── Password vault encryption via AES-256-GCM ──
  // Infrastructure for migrating renderer-side Base64 password storage to
  // proper encryption. The renderer can call these to encrypt/decrypt passwords
  // using the same AES-256-GCM key used for credentials.
  ipcMain.handle('password:encrypt', (_event, plaintext: string) => {
    if (typeof plaintext !== 'string' || plaintext.length > 4096) return { success: false, error: 'Invalid input' };
    try {
      return { success: true, data: encryptCredential(plaintext) };
    } catch {
      return { success: false, error: 'Encryption failed' };
    }
  });

  ipcMain.handle('password:decrypt', (_event, encrypted: string) => {
    if (typeof encrypted !== 'string' || encrypted.length > 8192) return { success: false, error: 'Invalid input' };
    try {
      return { success: true, data: decryptCredential(encrypted) };
    } catch {
      return { success: false, error: 'Decryption failed' };
    }
  });

  // ── Register TOTP IPC handlers ──
  registerTOTPHandlers();
}
