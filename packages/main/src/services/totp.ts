import crypto from 'crypto';
import { ipcMain } from 'electron';

// ── RFC 4648 Base32 Decode ──────────────────────────────────────────
function base32Decode(encoded: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = encoded.replace(/[=\s]/g, '').toUpperCase();
  const bits: number[] = [];
  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits.push(
      (val >> 4) & 1,
      (val >> 3) & 1,
      (val >> 2) & 1,
      (val >> 1) & 1,
      val & 1,
    );
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = bits.slice(i * 8, i * 8 + 8).reduce((acc, bit, j) => acc | (bit << (7 - j)), 0);
  }
  return bytes;
}

// ── RFC 6238 TOTP Generation ────────────────────────────────────────
export function generateTOTP(secret: string, timeStep: number = 30, digits: number = 6): string {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);

  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter & 0xFFFFFFFF, 4);

  // HMAC-SHA1 with decoded base32 secret
  const decodedSecret = Buffer.from(base32Decode(secret));
  const hmac = crypto.createHmac('sha1', decodedSecret).update(counterBuffer).digest();

  // Dynamic truncation per RFC 4226
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % Math.pow(10, digits);

  return code.toString().padStart(digits, '0');
}

// ── Time Remaining in Current Window ────────────────────────────────
export function getTimeRemaining(timeStep: number = 30): number {
  return timeStep - (Math.floor(Date.now() / 1000) % timeStep);
}

// ── Parse otpauth:// URI ────────────────────────────────────────────
export function parseOTPAuthURI(
  uri: string,
): { issuer: string; account: string; secret: string; period?: number; digits?: number } | null {
  try {
    if (!uri.startsWith('otpauth://totp/')) return null;

    const url = new URL(uri);
    const label = decodeURIComponent(url.pathname.slice(1)); // strip leading /
    const secret = url.searchParams.get('secret');
    if (!secret) return null;

    const periodStr = url.searchParams.get('period');
    const digitsStr = url.searchParams.get('digits');

    let issuer = url.searchParams.get('issuer') || '';
    let account = label;

    // Label format can be "Issuer:account" or just "account"
    if (label.includes(':')) {
      const parts = label.split(':');
      if (!issuer) issuer = parts[0].trim();
      account = parts.slice(1).join(':').trim();
    }

    return {
      issuer,
      account,
      secret: secret.toUpperCase(),
      period: periodStr ? parseInt(periodStr) : undefined,
      digits: digitsStr ? parseInt(digitsStr) : undefined,
    };
  } catch {
    return null;
  }
}

// ── Backup Codes ────────────────────────────────────────────────────
export function generateBackupCodes(count: number = 10): string[] {
  return Array.from({ length: count }, () => {
    const bytes = crypto.randomBytes(4);
    return bytes.readUInt32BE(0).toString().slice(0, 8).padStart(8, '0');
  });
}

// ── IPC Handler Registration ────────────────────────────────────────
export function registerTOTPHandlers(): void {
  ipcMain.handle('totp:generate', (_event, secret: string) => {
    if (typeof secret !== 'string' || secret.length < 1) {
      return { code: '000000', timeRemaining: 30 };
    }
    try {
      const code = generateTOTP(secret);
      const timeRemaining = getTimeRemaining();
      return { code, timeRemaining };
    } catch {
      return { code: '000000', timeRemaining: 30 };
    }
  });

  ipcMain.handle('totp:parse-uri', (_event, uri: string) => {
    if (typeof uri !== 'string') return null;
    return parseOTPAuthURI(uri);
  });

  ipcMain.handle('totp:generate-backup-codes', () => {
    return generateBackupCodes();
  });
}
