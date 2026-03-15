/**
 * CryptoService — End-to-end encryption for Civil Service Messenger
 *
 * Uses Web Crypto API (available in Electron's Chromium runtime):
 *   - ECDH P-256 for key agreement
 *   - AES-GCM 256-bit for message encryption
 *   - 12-byte random IV per message
 *
 * The Cloudflare Worker relay never sees plaintext — only encrypted payloads.
 */

const STORAGE_PREFIX = 'os-browser:crypto:';

/** Base64 helpers that work with Uint8Array ←→ string */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface PersistedKeyData {
  privateKey: JsonWebKey;
  publicKey: JsonWebKey;
}

interface PersistedSharedKeyData {
  sharedKey: JsonWebKey;
}

class CryptoServiceClass {
  /** ECDH key pairs indexed by conversationId */
  private keyPairs: Map<string, CryptoKeyPair> = new Map();

  /** Derived AES-GCM shared keys indexed by conversationId */
  private sharedKeys: Map<string, CryptoKey> = new Map();

  /**
   * Generate an ECDH key pair for a conversation.
   * Returns the public key as JWK so it can be sent to the other party.
   */
  async generateKeyPair(conversationId: string): Promise<JsonWebKey> {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true, // extractable — needed so we can persist / export
      ['deriveKey', 'deriveBits'],
    );

    this.keyPairs.set(conversationId, keyPair);

    const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    await this.persistKeys();

    return publicJwk;
  }

  /**
   * Import the remote user's ECDH public key and derive a shared AES-GCM-256
   * key via Diffie-Hellman key agreement.
   */
  async deriveSharedKey(
    conversationId: string,
    otherPublicKey: JsonWebKey,
  ): Promise<void> {
    const keyPair = this.keyPairs.get(conversationId);
    if (!keyPair) {
      throw new Error(
        `[CryptoService] No key pair found for conversation ${conversationId}. Call generateKeyPair first.`,
      );
    }

    // Import the other party's public key
    const importedPublic = await crypto.subtle.importKey(
      'jwk',
      otherPublicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    );

    // Derive a shared AES-GCM 256-bit key
    const sharedKey = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: importedPublic },
      keyPair.privateKey,
      { name: 'AES-GCM', length: 256 },
      true, // extractable for persistence
      ['encrypt', 'decrypt'],
    );

    this.sharedKeys.set(conversationId, sharedKey);
    await this.persistKeys();
  }

  /**
   * Encrypt a plaintext message for a conversation.
   * Returns base64-encoded ciphertext and IV (both safe for JSON transport).
   */
  async encrypt(
    conversationId: string,
    plaintext: string,
  ): Promise<{ ciphertext: string; iv: string }> {
    const sharedKey = this.sharedKeys.get(conversationId);
    if (!sharedKey) {
      throw new Error(
        `[CryptoService] No shared key for conversation ${conversationId}. Complete key exchange first.`,
      );
    }

    // 12-byte random IV — unique per message, never reuse with the same key
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encoded = new TextEncoder().encode(plaintext);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as any },
      sharedKey,
      encoded,
    );

    return {
      ciphertext: uint8ToBase64(new Uint8Array(ciphertextBuffer)),
      iv: uint8ToBase64(iv),
    };
  }

  /**
   * Decrypt a ciphertext message using the shared AES-GCM key.
   */
  async decrypt(
    conversationId: string,
    ciphertext: string,
    iv: string,
  ): Promise<string> {
    const sharedKey = this.sharedKeys.get(conversationId);
    if (!sharedKey) {
      throw new Error(
        `[CryptoService] No shared key for conversation ${conversationId}. Complete key exchange first.`,
      );
    }

    const ciphertextBytes = base64ToUint8(ciphertext);
    const ivBytes = base64ToUint8(iv);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes as any },
      sharedKey,
      ciphertextBytes as any,
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  /**
   * Export the public key for a conversation as JWK.
   * Returns null if no key pair exists yet.
   */
  async getPublicKey(conversationId: string): Promise<JsonWebKey | null> {
    const keyPair = this.keyPairs.get(conversationId);
    if (!keyPair) return null;
    return crypto.subtle.exportKey('jwk', keyPair.publicKey);
  }

  /**
   * Check whether encryption is ready (shared key derived) for a conversation.
   */
  hasSharedKey(conversationId: string): boolean {
    return this.sharedKeys.has(conversationId);
  }

  /**
   * Check whether we have generated a key pair for a conversation
   * (key exchange may still be in progress).
   */
  hasKeyPair(conversationId: string): boolean {
    return this.keyPairs.has(conversationId);
  }

  /**
   * Persist all key material to localStorage.
   *
   * In production this should use Electron's safeStorage API via IPC
   * for OS-level encryption of the stored keys. For now we fall back
   * to localStorage with a console warning.
   */
  async persistKeys(): Promise<void> {
    try {
      // Persist ECDH key pairs
      for (const [conversationId, keyPair] of this.keyPairs.entries()) {
        const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
        const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
        const data: PersistedKeyData = { privateKey: privateJwk, publicKey: publicJwk };
        localStorage.setItem(
          `${STORAGE_PREFIX}keypair:${conversationId}`,
          JSON.stringify(data),
        );
      }

      // Persist derived shared keys
      for (const [conversationId, sharedKey] of this.sharedKeys.entries()) {
        const jwk = await crypto.subtle.exportKey('jwk', sharedKey);
        const data: PersistedSharedKeyData = { sharedKey: jwk };
        localStorage.setItem(
          `${STORAGE_PREFIX}shared:${conversationId}`,
          JSON.stringify(data),
        );
      }
    } catch (err) {
      console.warn(
        '[CryptoService] Failed to persist keys. Keys will be lost on restart.',
        err,
      );
    }
  }

  /**
   * Load previously persisted keys from localStorage.
   * Call this once on app startup.
   */
  async loadPersistedKeys(): Promise<void> {
    try {
      const len = localStorage.length;

      for (let i = 0; i < len; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(STORAGE_PREFIX)) continue;

        const raw = localStorage.getItem(key);
        if (!raw) continue;

        // Restore ECDH key pairs
        if (key.startsWith(`${STORAGE_PREFIX}keypair:`)) {
          const conversationId = key.slice(`${STORAGE_PREFIX}keypair:`.length);
          const data: PersistedKeyData = JSON.parse(raw);

          const privateKey = await crypto.subtle.importKey(
            'jwk',
            data.privateKey,
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits'],
          );
          const publicKey = await crypto.subtle.importKey(
            'jwk',
            data.publicKey,
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            [],
          );

          this.keyPairs.set(conversationId, { privateKey, publicKey });
        }

        // Restore shared AES-GCM keys
        if (key.startsWith(`${STORAGE_PREFIX}shared:`)) {
          const conversationId = key.slice(`${STORAGE_PREFIX}shared:`.length);
          const data: PersistedSharedKeyData = JSON.parse(raw);

          const sharedKey = await crypto.subtle.importKey(
            'jwk',
            data.sharedKey,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt'],
          );

          this.sharedKeys.set(conversationId, sharedKey);
        }
      }

      if (this.keyPairs.size > 0 || this.sharedKeys.size > 0) {
        console.info(
          `[CryptoService] Loaded ${this.keyPairs.size} key pair(s) and ${this.sharedKeys.size} shared key(s) from storage.`,
        );
      }
    } catch (err) {
      console.warn('[CryptoService] Failed to load persisted keys.', err);
    }
  }

  /**
   * Clear all cryptographic material for a conversation.
   * Call when a conversation is deleted.
   */
  clearKeys(conversationId: string): void {
    this.keyPairs.delete(conversationId);
    this.sharedKeys.delete(conversationId);

    try {
      localStorage.removeItem(`${STORAGE_PREFIX}keypair:${conversationId}`);
      localStorage.removeItem(`${STORAGE_PREFIX}shared:${conversationId}`);
    } catch {
      // storage may be unavailable
    }
  }

  /**
   * Clear ALL keys (full reset). Use with caution.
   */
  clearAll(): void {
    this.keyPairs.clear();
    this.sharedKeys.clear();

    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          toRemove.push(key);
        }
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // storage may be unavailable
    }
  }
}

export const CryptoService = new CryptoServiceClass();
