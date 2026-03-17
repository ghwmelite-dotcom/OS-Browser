/**
 * MatrixClientService — singleton service wrapping matrix-js-sdk.
 *
 * Handles invite-code authentication via the worker API, Matrix client
 * initialization, E2E encryption setup (Olm/Megolm), and event bridging
 * so the Zustand store can subscribe to simple callbacks.
 *
 * Gracefully degrades when matrix-js-sdk or the homeserver is unavailable.
 */

import type {
  GovChatCredentials,
  GovChatMessage,
  ChatRoom,
  GovUser,
  ClassificationLevel,
  MessageReaction,
  FileAttachment,
  VoiceNote,
  MessageType,
  MessageStatus,
} from '@/types/govchat';
import { DEFAULT_RETENTION_DAYS } from '@/types/govchat';

type EventCallback = (data: unknown) => void;

const WORKER_URL = 'https://os-browser-worker.ghwmelite.workers.dev';
const STORAGE_KEY = 'govchat_credentials';

// Default homeserver for government deployment
const DEFAULT_HOMESERVER = 'https://govchat.askozzy.work';

// Lazy-loaded SDK reference
let matrixSdk: typeof import('matrix-js-sdk') | null = null;
let sdkLoadAttempted = false;

/**
 * Attempt to dynamically import matrix-js-sdk. Safe to call multiple times;
 * only performs the import once.
 */
async function loadMatrixSdk(): Promise<typeof import('matrix-js-sdk') | null> {
  if (matrixSdk) return matrixSdk;
  if (sdkLoadAttempted) return null;
  sdkLoadAttempted = true;
  try {
    matrixSdk = await import('matrix-js-sdk');
    return matrixSdk;
  } catch {
    console.warn('[MatrixClientService] matrix-js-sdk is not available — Matrix features disabled.');
    return null;
  }
}

class MatrixClientServiceClass {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null; // MatrixClient instance
  private listeners = new Map<string, Set<EventCallback>>();
  private _credentials: GovChatCredentials | null = null;
  private _isInitialized = false;
  private _isSyncing = false;

  /* ──────────────── Public Getters ──────────────── */

  get isAuthenticated(): boolean {
    return !!(this._credentials?.accessToken && this._credentials?.userId);
  }

  get credentials(): GovChatCredentials | null {
    return this._credentials;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get isSyncing(): boolean {
    return this._isSyncing;
  }

  get currentUserId(): string | null {
    return this._credentials?.userId ?? null;
  }

  /* ──────────────── Event Emitter ──────────────── */

  /**
   * Subscribe to a service event.
   * Returns an unsubscribe function for convenient cleanup.
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch {
        // Never let a listener error break the service
      }
    });
  }

  /* ──────────────── Auth — Invite Code Redemption ──────────────── */

  /**
   * Redeem an invite code via the worker API.
   * On success, stores credentials locally and initializes the Matrix client.
   */
  async redeemInviteCode(
    code: string,
    staffId: string,
    displayName: string,
  ): Promise<GovChatCredentials> {
    try {
      const res = await fetch(`${WORKER_URL}/api/v1/govchat/auth/redeem-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, staffId, displayName }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
        const message = (errBody as { error?: string }).error ?? `HTTP ${res.status}`;
        this.emit('error', { message: `Invite redemption failed: ${message}` });
        throw new Error(message);
      }

      const data = await res.json();
      const credentials: GovChatCredentials = {
        userId: data.userId,
        accessToken: data.accessToken,
        homeserverUrl: data.homeserverUrl ?? DEFAULT_HOMESERVER,
        staffId: data.staffId ?? staffId,
        deviceId: data.deviceId,
      };

      // Persist credentials
      this._credentials = credentials;
      this.storeCredentials(credentials);

      // Initialize the Matrix client with fresh credentials
      await this.initializeClient(credentials);

      return credentials;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invite redemption failed';
      this.emit('error', { message });
      throw err;
    }
  }

  /**
   * Re-initialize from existing credentials (e.g. on app restart).
   */
  async loginWithCredentials(credentials: GovChatCredentials): Promise<void> {
    try {
      this._credentials = credentials;
      this.storeCredentials(credentials);
      await this.initializeClient(credentials);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      this.emit('error', { message });
      // Don't re-throw — caller can check isInitialized
    }
  }

  /* ──────────────── Client Initialization ──────────────── */

  private async initializeClient(credentials: GovChatCredentials): Promise<void> {
    const sdk = await loadMatrixSdk();
    if (!sdk) {
      console.warn('[MatrixClientService] Cannot initialize — matrix-js-sdk unavailable.');
      this.emit('error', { message: 'Matrix SDK not available. Chat features are disabled.' });
      return;
    }

    // Tear down any existing client
    if (this.client) {
      try {
        this.client.stopClient();
      } catch {
        // Ignore teardown errors
      }
      this.client = null;
    }

    try {
      this.client = sdk.createClient({
        baseUrl: credentials.homeserverUrl || DEFAULT_HOMESERVER,
        accessToken: credentials.accessToken,
        userId: credentials.userId,
        deviceId: credentials.deviceId,
      });

      // Initialize E2E encryption with Rust crypto backend
      try {
        await this.client.initRustCrypto();
        console.info('[MatrixClientService] Rust E2E encryption initialized.');
      } catch (cryptoErr) {
        console.warn('[MatrixClientService] Rust crypto init failed, trying legacy:', cryptoErr);
        // Fallback to legacy Olm crypto
        try {
          await this.client.initCrypto();
          console.info('[MatrixClientService] Legacy E2E encryption initialized.');
        } catch (olmErr) {
          console.warn('[MatrixClientService] All crypto init failed. Messages will be unencrypted:', olmErr);
        }
      }

      // Bind Matrix events before starting sync
      this.bindMatrixEvents();

      // Start sync
      try {
        await this.client.startClient({ initialSyncLimit: 20 });
      } catch (syncErr) {
        console.warn('[MatrixClientService] startClient failed, continuing anyway:', syncErr);
      }
      this._isInitialized = true;
    } catch (err) {
      console.error('[MatrixClientService] Client initialization failed:', err);
      this.emit('error', {
        message: 'Failed to connect to Matrix homeserver.',
      });
      this._isInitialized = false;
    }
  }

  /**
   * Initialize Olm/Megolm crypto. If Olm WASM is not available we continue
   * without E2E — messages will be sent unencrypted.
   */
  private async initializeCrypto(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.initCrypto();
      console.info('[MatrixClientService] E2E encryption initialized.');
    } catch (err) {
      console.warn(
        '[MatrixClientService] Crypto init failed (Olm may not be loaded). Continuing without E2E.',
        err,
      );
    }
  }

  /* ──────────────── Matrix Event Handlers ──────────────── */

  private bindMatrixEvents(): void {
    if (!this.client) return;

    // Room timeline — new messages
    this.client.on('Room.timeline', (event: any, room: any) => {
      try {
        if (event.getType() !== 'm.room.message') return;

        const content = event.getContent();
        const message = this.matrixEventToMessage(event, room);
        if (message) {
          this.emit('message', { roomId: room.roomId, message });
        }
      } catch {
        // Silently ignore malformed events
      }
    });

    // Read receipts
    this.client.on('Room.receipt', (event: any, room: any) => {
      try {
        const content = event.getContent();
        // Receipt events contain { eventId: { 'm.read': { userId: { ts } } } }
        for (const eventId of Object.keys(content)) {
          const readers = content[eventId]?.['m.read'] ?? {};
          for (const userId of Object.keys(readers)) {
            this.emit('receipt', { roomId: room.roomId, eventId, userId });
          }
        }
      } catch {
        // Ignore malformed receipts
      }
    });

    // Typing indicators
    this.client.on('RoomMember.typing', (_event: any, member: any) => {
      try {
        const room = this.client.getRoom(member.roomId);
        if (!room) return;
        const typingMembers = room.getMembers().filter((m: any) => m.typing);
        const userIds = typingMembers.map((m: any) => m.userId);
        this.emit('typing', { roomId: member.roomId, userIds });
      } catch {
        // Ignore
      }
    });

    // Room added/updated
    this.client.on('Room', (room: any) => {
      try {
        const chatRoom = this.matrixRoomToChatRoom(room);
        if (chatRoom) {
          this.emit('room', { room: chatRoom });
        }
      } catch {
        // Ignore
      }
    });

    // Room state changes (name, topic, membership, etc.)
    this.client.on('Room.name', (room: any) => {
      try {
        const chatRoom = this.matrixRoomToChatRoom(room);
        if (chatRoom) {
          this.emit('room:update', { room: chatRoom });
        }
      } catch {
        // Ignore
      }
    });

    // Sync state
    this.client.on('sync', (state: string, _prevState: string | null) => {
      const wasSyncing = this._isSyncing;
      this._isSyncing = state === 'SYNCING' || state === 'PREPARED';
      this.emit('sync', { state });

      if (state === 'ERROR') {
        this.emit('error', { message: 'Matrix sync error — retrying.' });
      }
    });
  }

  /* ──────────────── Room Operations ──────────────── */

  async getRooms(): Promise<ChatRoom[]> {
    if (!this.client) return [];
    try {
      const rooms = this.client.getRooms() ?? [];
      return rooms
        .map((r: any) => this.matrixRoomToChatRoom(r))
        .filter(Boolean) as ChatRoom[];
    } catch (err) {
      this.emit('error', { message: 'Failed to fetch rooms.' });
      return [];
    }
  }

  async createDirectRoom(userId: string): Promise<string> {
    if (!this.client) {
      this.emit('error', { message: 'Matrix client not initialized.' });
      return '';
    }
    try {
      const result = await this.client.createRoom({
        is_direct: true,
        invite: [userId],
        preset: 'trusted_private_chat',
        initial_state: [
          {
            type: 'm.room.encryption',
            state_key: '',
            content: { algorithm: 'm.megolm.v1.aes-sha2' },
          },
        ],
      });
      return result.room_id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create direct room';
      this.emit('error', { message });
      return '';
    }
  }

  async createGroupRoom(
    name: string,
    userIds: string[],
    classification: ClassificationLevel = 'OFFICIAL',
  ): Promise<string> {
    if (!this.client) {
      this.emit('error', { message: 'Matrix client not initialized.' });
      return '';
    }
    try {
      const retentionDays = DEFAULT_RETENTION_DAYS[classification];
      const result = await this.client.createRoom({
        name,
        invite: userIds,
        preset: 'private_chat',
        initial_state: [
          {
            type: 'm.room.encryption',
            state_key: '',
            content: { algorithm: 'm.megolm.v1.aes-sha2' },
          },
          {
            type: 'gh.gov.classification',
            state_key: '',
            content: { level: classification },
          },
          {
            type: 'm.room.retention',
            state_key: '',
            content: { max_lifetime: retentionDays * 86400 * 1000 },
          },
        ],
      });
      return result.room_id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create group room';
      this.emit('error', { message });
      return '';
    }
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.leave(roomId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave room';
      this.emit('error', { message });
    }
  }

  /* ──────────────── Message Operations ──────────────── */

  async sendMessage(roomId: string, body: string): Promise<void> {
    if (!this.client) {
      this.emit('error', { message: 'Matrix client not initialized.' });
      return;
    }
    try {
      await this.client.sendEvent(roomId, 'm.room.message', {
        msgtype: 'm.text',
        body,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      this.emit('error', { message });
    }
  }

  async sendFileMessage(roomId: string, file: File): Promise<void> {
    if (!this.client) {
      this.emit('error', { message: 'Matrix client not initialized.' });
      return;
    }
    try {
      const uploadResponse = await this.client.uploadContent(file, {
        name: file.name,
        type: file.type,
      });
      const contentUri =
        typeof uploadResponse === 'string'
          ? uploadResponse
          : uploadResponse?.content_uri ?? uploadResponse?.uri;

      if (!contentUri) throw new Error('Upload returned no content URI');

      const isImage = file.type.startsWith('image/');
      await this.client.sendEvent(roomId, 'm.room.message', {
        msgtype: isImage ? 'm.image' : 'm.file',
        body: file.name,
        url: contentUri,
        info: {
          mimetype: file.type,
          size: file.size,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send file';
      this.emit('error', { message });
    }
  }

  async sendVoiceNote(
    roomId: string,
    blob: Blob,
    duration: number,
    waveform: number[],
  ): Promise<void> {
    if (!this.client) {
      this.emit('error', { message: 'Matrix client not initialized.' });
      return;
    }
    try {
      const uploadResponse = await this.client.uploadContent(blob, {
        name: 'voice-note.ogg',
        type: blob.type || 'audio/ogg',
      });
      const contentUri =
        typeof uploadResponse === 'string'
          ? uploadResponse
          : uploadResponse?.content_uri ?? uploadResponse?.uri;

      if (!contentUri) throw new Error('Upload returned no content URI');

      await this.client.sendEvent(roomId, 'm.room.message', {
        msgtype: 'm.audio',
        body: 'Voice message',
        url: contentUri,
        info: {
          mimetype: blob.type || 'audio/ogg',
          size: blob.size,
          duration: Math.round(duration * 1000), // Matrix uses milliseconds
        },
        'org.matrix.msc3245.voice': {},
        'org.matrix.msc1767.audio': {
          duration: Math.round(duration * 1000),
          waveform: waveform.map((v) => Math.round(v * 1024)),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send voice note';
      this.emit('error', { message });
    }
  }

  async addReaction(roomId: string, eventId: string, emoji: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.sendEvent(roomId, 'm.reaction', {
        'm.relates_to': {
          rel_type: 'm.annotation',
          event_id: eventId,
          key: emoji,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add reaction';
      this.emit('error', { message });
    }
  }

  async removeReaction(roomId: string, eventId: string, emoji: string): Promise<void> {
    if (!this.client) return;
    try {
      // Find the reaction event to redact
      const room = this.client.getRoom(roomId);
      if (!room) return;

      const timeline = room.getLiveTimeline().getEvents();
      const reactionEvent = timeline.find(
        (ev: any) =>
          ev.getType() === 'm.reaction' &&
          ev.getSender() === this._credentials?.userId &&
          ev.getContent()?.['m.relates_to']?.event_id === eventId &&
          ev.getContent()?.['m.relates_to']?.key === emoji,
      );

      if (reactionEvent) {
        await this.client.redactEvent(roomId, reactionEvent.getId());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove reaction';
      this.emit('error', { message });
    }
  }

  async sendReply(roomId: string, body: string, replyToEventId: string): Promise<void> {
    if (!this.client) {
      this.emit('error', { message: 'Matrix client not initialized.' });
      return;
    }
    try {
      // Fetch the original event for the fallback
      const room = this.client.getRoom(roomId);
      const originalEvent = room
        ?.getLiveTimeline()
        .getEvents()
        .find((ev: any) => ev.getId() === replyToEventId);

      const originalBody = originalEvent?.getContent()?.body ?? '';
      const originalSender = originalEvent?.getSender() ?? '';

      // Matrix rich reply format
      const fallbackHtml = `<mx-reply><blockquote><a href="https://matrix.to/#/${roomId}/${replyToEventId}">In reply to</a> <a href="https://matrix.to/#/${originalSender}">${originalSender}</a><br/>${originalBody}</blockquote></mx-reply>${body}`;
      const fallbackText = `> <${originalSender}> ${originalBody}\n\n${body}`;

      await this.client.sendEvent(roomId, 'm.room.message', {
        msgtype: 'm.text',
        body: fallbackText,
        format: 'org.matrix.custom.html',
        formatted_body: fallbackHtml,
        'm.relates_to': {
          'm.in_reply_to': {
            event_id: replyToEventId,
          },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reply';
      this.emit('error', { message });
    }
  }

  /* ──────────────── Read Receipts ──────────────── */

  async markRoomAsRead(roomId: string): Promise<void> {
    if (!this.client) return;
    try {
      const room = this.client.getRoom(roomId);
      if (!room) return;

      const timeline = room.getLiveTimeline().getEvents();
      const lastEvent = timeline[timeline.length - 1];
      if (lastEvent) {
        await this.client.sendReadReceipt(lastEvent);
      }
    } catch (err) {
      // Non-critical — silently ignore
      console.warn('[MatrixClientService] Failed to send read receipt:', err);
    }
  }

  /* ──────────────── Typing ──────────────── */

  async sendTyping(roomId: string, isTyping: boolean): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.sendTyping(roomId, isTyping, isTyping ? 30_000 : undefined);
    } catch {
      // Non-critical
    }
  }

  /* ──────────────── Presence ──────────────── */

  async setPresence(online: boolean): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setPresence({
        presence: online ? 'online' : 'offline',
      });
    } catch {
      // Non-critical
    }
  }

  /* ──────────────── Credential Storage ──────────────── */

  /**
   * Load credentials persisted in localStorage.
   * Returns null if none exist or localStorage is unavailable.
   */
  loadStoredCredentials(): GovChatCredentials | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.userId === 'string' &&
        typeof parsed.accessToken === 'string'
      ) {
        this._credentials = parsed as GovChatCredentials;
        return this._credentials;
      }
      return null;
    } catch {
      return null;
    }
  }

  private storeCredentials(credentials: GovChatCredentials): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    } catch {
      // localStorage unavailable — credentials live only in memory
    }
  }

  /**
   * Clear all stored credentials, stop the Matrix client, and reset state.
   */
  clearCredentials(): void {
    this._credentials = null;
    this._isInitialized = false;
    this._isSyncing = false;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }

    if (this.client) {
      try {
        this.client.stopClient();
      } catch {
        // Ignore teardown errors
      }
      this.client = null;
    }
  }

  /* ──────────────── Cleanup ──────────────── */

  /**
   * Full teardown — stop sync, clear listeners, reset all state.
   * Call this when the app is being destroyed or the user logs out.
   */
  async destroy(): Promise<void> {
    if (this.client) {
      try {
        this.client.stopClient();
      } catch {
        // Ignore
      }
      this.client = null;
    }

    this.listeners.clear();
    this._credentials = null;
    this._isInitialized = false;
    this._isSyncing = false;
  }

  /* ──────────────── Conversion Helpers ──────────────── */

  /**
   * Convert a Matrix timeline event into our GovChatMessage shape.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private matrixEventToMessage(event: any, room: any): GovChatMessage | null {
    try {
      const content = event.getContent();
      const sender = event.getSender();
      const member = room.getMember(sender);

      // Determine message type
      let type: MessageType = 'text';
      let file: FileAttachment | undefined;
      let voiceNote: VoiceNote | undefined;

      const msgtype: string = content.msgtype ?? '';

      if (msgtype === 'm.image') {
        type = 'image';
        file = {
          name: content.body ?? 'image',
          mimeType: content.info?.mimetype ?? 'image/png',
          size: content.info?.size ?? 0,
          url: content.url ?? '',
          thumbnailUrl: content.info?.thumbnail_url,
        };
      } else if (msgtype === 'm.file') {
        type = 'file';
        file = {
          name: content.body ?? 'file',
          mimeType: content.info?.mimetype ?? 'application/octet-stream',
          size: content.info?.size ?? 0,
          url: content.url ?? '',
        };
      } else if (msgtype === 'm.audio') {
        // Check if it's a voice note (MSC3245)
        if (content['org.matrix.msc3245.voice'] !== undefined) {
          type = 'voice';
          const audioInfo = content['org.matrix.msc1767.audio'] ?? {};
          voiceNote = {
            duration: (audioInfo.duration ?? content.info?.duration ?? 0) / 1000,
            waveform: (audioInfo.waveform ?? []).map((v: number) => v / 1024),
            url: content.url ?? '',
            mimeType: content.info?.mimetype ?? 'audio/ogg',
          };
        } else {
          type = 'file';
          file = {
            name: content.body ?? 'audio',
            mimeType: content.info?.mimetype ?? 'audio/ogg',
            size: content.info?.size ?? 0,
            url: content.url ?? '',
          };
        }
      }

      // Build reactions from aggregated annotations
      const reactions: MessageReaction[] = [];
      try {
        const relations = event.getRelations?.('m.annotation') ?? [];
        const reactionMap = new Map<string, string[]>();
        for (const rel of relations) {
          const key = rel.getContent()?.['m.relates_to']?.key;
          if (key) {
            const existing = reactionMap.get(key) ?? [];
            existing.push(rel.getSender());
            reactionMap.set(key, existing);
          }
        }
        for (const [key, senders] of reactionMap) {
          reactions.push({ key, senders });
        }
      } catch {
        // Reactions may not be available
      }

      // Reply detection
      let replyTo: GovChatMessage['replyTo'];
      const inReplyTo = content['m.relates_to']?.['m.in_reply_to']?.event_id;
      if (inReplyTo) {
        const replyEvent = room
          .getLiveTimeline()
          .getEvents()
          .find((ev: any) => ev.getId() === inReplyTo);
        if (replyEvent) {
          const replySender = replyEvent.getSender();
          const replyMember = room.getMember(replySender);
          replyTo = {
            eventId: inReplyTo,
            senderId: replySender,
            senderName: replyMember?.name ?? replySender,
            body: (replyEvent.getContent()?.body ?? '').slice(0, 200),
          };
        }
      }

      // Classification from room state
      let classification: ClassificationLevel = 'OFFICIAL';
      try {
        const classEvent = room.currentState.getStateEvents('gh.gov.classification', '');
        if (classEvent) {
          classification = classEvent.getContent()?.level ?? 'OFFICIAL';
        }
      } catch {
        // Default to OFFICIAL
      }

      // Mentions
      const mentions: string[] = [];
      const mentionData = content['m.mentions'];
      if (mentionData?.user_ids && Array.isArray(mentionData.user_ids)) {
        mentions.push(...mentionData.user_ids);
      }

      return {
        eventId: event.getId(),
        roomId: room.roomId,
        senderId: sender,
        senderName: member?.name ?? sender,
        type,
        body: content.body ?? '',
        timestamp: event.getTs(),
        status: 'sent' as MessageStatus,
        isEncrypted: event.isEncrypted?.() ?? false,
        classification,
        reactions,
        replyTo,
        threadRootId: content['m.relates_to']?.event_id,
        editedAt: content['m.new_content'] ? event.getTs() : undefined,
        file,
        voiceNote,
        mentions,
      };
    } catch {
      return null;
    }
  }

  /**
   * Convert a Matrix Room object into our ChatRoom shape.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private matrixRoomToChatRoom(room: any): ChatRoom | null {
    try {
      const members: GovUser[] = (room.getJoinedMembers?.() ?? []).map((m: any) => ({
        userId: m.userId,
        staffId: m.userId, // Will be enriched by the store
        displayName: m.name ?? m.userId,
        department: '',
        ministry: '',
        role: 'user' as const,
        isOnline: false,
        lastSeen: null,
      }));

      // Classification
      let classification: ClassificationLevel = 'OFFICIAL';
      try {
        const classEvent = room.currentState?.getStateEvents('gh.gov.classification', '');
        if (classEvent) {
          classification = classEvent.getContent()?.level ?? 'OFFICIAL';
        }
      } catch {
        // Default
      }

      // Encryption check
      let isEncrypted = false;
      try {
        const encEvent = room.currentState?.getStateEvents('m.room.encryption', '');
        isEncrypted = !!encEvent;
      } catch {
        // Default
      }

      // Direct chat detection
      const isDirect = room.getDMInviter?.() !== undefined || members.length <= 2;

      // Last message
      let lastMessage: GovChatMessage | null = null;
      try {
        const timeline = room.getLiveTimeline()?.getEvents() ?? [];
        for (let i = timeline.length - 1; i >= 0; i--) {
          if (timeline[i].getType() === 'm.room.message') {
            lastMessage = this.matrixEventToMessage(timeline[i], room);
            break;
          }
        }
      } catch {
        // No timeline available
      }

      // Unread count
      let unreadCount = 0;
      try {
        const notifCounts = room.getUnreadNotificationCount?.('total');
        unreadCount = typeof notifCounts === 'number' ? notifCounts : 0;
      } catch {
        // Default
      }

      // Retention
      let retentionDays = DEFAULT_RETENTION_DAYS[classification];
      try {
        const retEvent = room.currentState?.getStateEvents('m.room.retention', '');
        if (retEvent) {
          const maxLifetime = retEvent.getContent()?.max_lifetime;
          if (typeof maxLifetime === 'number') {
            retentionDays = Math.round(maxLifetime / (86400 * 1000));
          }
        }
      } catch {
        // Default
      }

      return {
        roomId: room.roomId,
        name: room.name || 'Unnamed Room',
        topic: room.currentState?.getStateEvents('m.room.topic', '')?.getContent()?.topic,
        isDirect,
        isEncrypted,
        classification,
        members,
        lastMessage,
        unreadCount,
        isPinned: false, // Managed locally by the store
        retentionDays,
        avatarUrl: room.getAvatarUrl?.() ?? undefined,
        createdAt: room.currentState?.getStateEvents('m.room.create', '')?.getTs?.() ?? 0,
      };
    } catch {
      return null;
    }
  }
}

export const MatrixClientService = new MatrixClientServiceClass();
