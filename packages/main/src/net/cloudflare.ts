import { safeStorage, app } from 'electron';
import fs from 'fs';
import path from 'path';

const API_BASE = 'https://os-browser-api.workers.dev';

function getTokenPath(): string {
  return path.join(app.getPath('userData'), '.device-token');
}

function getDeviceToken(): string | null {
  const tokenPath = getTokenPath();
  if (fs.existsSync(tokenPath) && safeStorage.isEncryptionAvailable()) {
    const encrypted = fs.readFileSync(tokenPath);
    return safeStorage.decryptString(encrypted);
  }
  return null;
}

function saveDeviceToken(token: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token);
    fs.writeFileSync(getTokenPath(), encrypted);
  }
}

export async function ensureDeviceRegistered(): Promise<string> {
  let token = getDeviceToken();
  if (token) return token;

  const response = await fetch(`${API_BASE}/api/v1/register-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_version: app.getVersion() }),
  });

  if (!response.ok) throw new Error('Device registration failed');
  const data = await response.json() as any;
  token = data.device_token;
  saveDeviceToken(token!);
  return token!;
}

export async function aiRequest(endpoint: string, body: Record<string, any>): Promise<any> {
  const token = await ensureDeviceRegistered();

  const response = await fetch(`${API_BASE}/api/v1/ai/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((err as any).error || `AI request failed: ${response.status}`);
  }

  // Check if streaming response
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    return response; // Return raw response for streaming
  }

  return response.json();
}
