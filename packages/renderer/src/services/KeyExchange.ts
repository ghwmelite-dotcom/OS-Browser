/**
 * KeyExchange — ECDH key exchange protocol for Civil Service Messenger
 *
 * Protocol flow:
 *   1. User A opens a conversation with User B
 *   2. User A generates an ECDH key pair and sends their public key
 *      via WebSocket: { type: 'key_exchange', conversationId, publicKey: JWK }
 *   3. User B receives the key, generates their own key pair, derives the
 *      shared AES-GCM key, and sends their public key back:
 *      { type: 'key_exchange_response', conversationId, publicKey: JWK }
 *   4. User A receives B's public key and derives the same shared key
 *   5. Both parties now have an identical AES-GCM-256 key — all subsequent
 *      messages are encrypted end-to-end
 *
 * Keys are persisted in localStorage so reopening a conversation does not
 * require a fresh exchange.
 *
 * If the other user is offline, the public key is queued and the exchange
 * completes when they connect and respond.
 */

import { CryptoService } from './CryptoService';

/** The shape of outbound WebSocket messages produced by this module. */
export interface KeyExchangeMessage {
  type: 'key_exchange' | 'key_exchange_response';
  conversationId: string;
  publicKey: JsonWebKey;
}

type WebSocketSendFn = (data: KeyExchangeMessage) => void;

/** Tracks conversations where we are still waiting for the other party's key. */
const pendingExchanges = new Set<string>();

class KeyExchangeClass {
  /**
   * Initiate a key exchange for a new conversation.
   *
   * If we already have a shared key (from a previous session), this is a
   * no-op. If we have a key pair but no shared key yet, we are already
   * waiting for a response — also a no-op.
   */
  async initiateExchange(
    conversationId: string,
    sendViaWebSocket: WebSocketSendFn,
  ): Promise<void> {
    // Already have a shared key — encryption ready
    if (CryptoService.hasSharedKey(conversationId)) {
      return;
    }

    // Already generated our key pair and waiting for the other side
    if (CryptoService.hasKeyPair(conversationId) && pendingExchanges.has(conversationId)) {
      // Resend our public key in case the first message was lost
      const publicKey = await CryptoService.getPublicKey(conversationId);
      if (publicKey) {
        sendViaWebSocket({
          type: 'key_exchange',
          conversationId,
          publicKey,
        });
      }
      return;
    }

    // Generate a fresh key pair
    const publicKey = await CryptoService.generateKeyPair(conversationId);

    pendingExchanges.add(conversationId);

    // Send our public key to the other user
    sendViaWebSocket({
      type: 'key_exchange',
      conversationId,
      publicKey,
    });
  }

  /**
   * Handle an incoming key exchange message from the other party.
   *
   * Two cases:
   *   a) We receive a `key_exchange` — we are User B.
   *      Generate our own key pair, derive the shared key, respond.
   *   b) We receive a `key_exchange_response` — we are User A.
   *      We already have our key pair; just derive the shared key.
   */
  async handleKeyExchange(
    conversationId: string,
    otherPublicKey: JsonWebKey,
    sendViaWebSocket: WebSocketSendFn,
    isResponse = false,
  ): Promise<void> {
    // If we already have the shared key, nothing to do
    if (CryptoService.hasSharedKey(conversationId)) {
      pendingExchanges.delete(conversationId);
      return;
    }

    if (isResponse) {
      // We are User A — we already have our key pair, just derive
      await CryptoService.deriveSharedKey(conversationId, otherPublicKey);
      pendingExchanges.delete(conversationId);
      console.info(
        `[KeyExchange] Shared key derived for conversation ${conversationId} (initiator side).`,
      );
      return;
    }

    // We are User B — generate our key pair, derive, then respond
    if (!CryptoService.hasKeyPair(conversationId)) {
      await CryptoService.generateKeyPair(conversationId);
    }

    await CryptoService.deriveSharedKey(conversationId, otherPublicKey);

    // Send our public key back
    const ourPublicKey = await CryptoService.getPublicKey(conversationId);
    if (ourPublicKey) {
      sendViaWebSocket({
        type: 'key_exchange_response',
        conversationId,
        publicKey: ourPublicKey,
      });
    }

    pendingExchanges.delete(conversationId);
    console.info(
      `[KeyExchange] Shared key derived for conversation ${conversationId} (responder side).`,
    );
  }

  /**
   * Check if end-to-end encryption is ready for a conversation.
   */
  isReady(conversationId: string): boolean {
    return CryptoService.hasSharedKey(conversationId);
  }

  /**
   * Check if a key exchange is currently in progress (waiting for response).
   */
  isPending(conversationId: string): boolean {
    return pendingExchanges.has(conversationId);
  }

  /**
   * Cancel a pending exchange (e.g., when the conversation is deleted).
   */
  cancelExchange(conversationId: string): void {
    pendingExchanges.delete(conversationId);
    CryptoService.clearKeys(conversationId);
  }

  /**
   * Load persisted keys on startup. If shared keys exist for any
   * conversation, encryption is immediately available without re-exchange.
   */
  async initialize(): Promise<void> {
    await CryptoService.loadPersistedKeys();
    console.info('[KeyExchange] Initialized — persisted keys loaded.');
  }
}

export const KeyExchange = new KeyExchangeClass();
