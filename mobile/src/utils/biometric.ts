/**
 * WebAuthn Biometric Authentication Utility
 *
 * Wraps the Web Authentication API for fingerprint / Face ID login
 * in the OS Browser Mini mobile PWA. All functions are safe to call
 * on any device — they return false / null when biometrics are
 * unavailable or the user cancels.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BiometricData {
  credentialId: string;
  publicKey: string;
  staffId: string;
  displayName: string;
  userType: 'staff' | 'public' | 'guest';
  createdAt: string;
}

interface BiometricUser {
  staffId: string;
  displayName: string;
  userType: 'staff' | 'public' | 'guest';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'os_mobile_biometric';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function getStoredData(): BiometricData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BiometricData;
  } catch {
    return null;
  }
}

function randomChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Check if the device supports biometric / WebAuthn platform authentication. */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (err) {
    console.error('[biometric] availability check failed', err);
    return false;
  }
}

/** Check if there is a stored biometric credential for any user. */
export function hasBiometricCredential(): boolean {
  return getStoredData() !== null;
}

/** Get the user identity linked to the stored biometric credential. */
export function getBiometricUser(): BiometricUser | null {
  const data = getStoredData();
  if (!data) return null;
  return {
    staffId: data.staffId,
    displayName: data.displayName,
    userType: data.userType,
  };
}

/**
 * Register a new biometric credential after a successful login.
 * Returns `true` on success, `false` on failure or user cancellation.
 */
export async function registerBiometric(
  userId: string,
  staffId: string,
  displayName: string,
  userType: 'staff' | 'public' | 'guest',
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();

    const credential = (await navigator.credentials.create({
      publicKey: {
        rp: {
          name: 'OS Browser Mini',
          id: location.hostname,
        },
        user: {
          id: encoder.encode(staffId),
          name: staffId,
          displayName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60_000,
        challenge: randomChallenge() as BufferSource,
      },
    })) as PublicKeyCredential | null;

    if (!credential) return false;

    const response = credential.response as AuthenticatorAttestationResponse;

    const biometricData: BiometricData = {
      credentialId: bufferToBase64url(credential.rawId),
      publicKey: bufferToBase64url(response.getPublicKey?.() ?? new ArrayBuffer(0)),
      staffId,
      displayName,
      userType,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(biometricData));
    return true;
  } catch (err) {
    console.error('[biometric] registration failed', err);
    return false;
  }
}

/**
 * Authenticate using the stored biometric credential.
 * Returns the linked user info on success, or `null` on failure / cancellation.
 */
export async function authenticateBiometric(): Promise<BiometricUser | null> {
  try {
    const stored = getStoredData();
    if (!stored) return null;

    const credentialId = base64urlToBuffer(stored.credentialId);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        allowCredentials: [
          {
            id: credentialId,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60_000,
        challenge: randomChallenge() as BufferSource,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) return null;

    return {
      staffId: stored.staffId,
      displayName: stored.displayName,
      userType: stored.userType,
    };
  } catch (err) {
    console.error('[biometric] authentication failed', err);
    return null;
  }
}

/** Remove stored biometric credential. */
export function removeBiometric(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('[biometric] removal failed', err);
  }
}
