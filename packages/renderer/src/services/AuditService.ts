/**
 * AuditService — Metadata-only audit trail for GovChat
 *
 * Logs compliance events (message sent, room created, device verified, etc.)
 * without EVER capturing message content. This is a compliance feature,
 * not a surveillance tool.
 *
 * Entries are persisted to localStorage and capped at 10,000 (FIFO eviction).
 */

export type AuditEventType =
  | 'message_sent'
  | 'message_read'
  | 'room_created'
  | 'room_joined'
  | 'room_left'
  | 'classification_changed'
  | 'file_shared'
  | 'file_downloaded'
  | 'voice_note_sent'
  | 'device_verified'
  | 'session_revoked'
  | 'key_backup_created'
  | 'key_backup_restored'
  | 'login'
  | 'logout'
  | 'invite_code_redeemed'
  | 'retention_enforced';

export interface AuditEntry {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  userId: string;
  roomId?: string;
  /** Non-sensitive metadata only — NEVER includes message content. */
  metadata: Record<string, string | number | boolean>;
}

class AuditServiceClass {
  private entries: AuditEntry[] = [];
  private maxEntries = 10_000;
  private storageKey = 'govchat_audit_log';

  /* ────────────────────────────────────────────────────────────────────────
   * Lifecycle
   * ──────────────────────────────────────────────────────────────────────── */

  /** Load persisted entries from localStorage. Call once on app startup. */
  initialize(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed: AuditEntry[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.entries = parsed;
          console.info(
            `[AuditService] Loaded ${this.entries.length} audit entries from storage.`,
          );
        }
      }
    } catch (err) {
      console.warn('[AuditService] Failed to load audit log from storage.', err);
      this.entries = [];
    }
  }

  /* ────────────────────────────────────────────────────────────────────────
   * Write
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Log an audit event.
   *
   * @param eventType - The type of event being logged.
   * @param userId    - The acting user's ID.
   * @param metadata  - Non-sensitive key-value metadata (e.g. file size, classification level).
   * @param roomId    - Optional room/channel the event relates to.
   */
  log(
    eventType: AuditEventType,
    userId: string,
    metadata: Record<string, string | number | boolean> = {},
    roomId?: string,
  ): void {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      eventType,
      userId,
      roomId,
      metadata,
    };

    this.entries.push(entry);

    // FIFO eviction when exceeding cap
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(this.entries.length - this.maxEntries);
    }

    this.persist();

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[AuditService]', eventType, { userId, roomId, metadata });
    }
  }

  /* ────────────────────────────────────────────────────────────────────────
   * Query
   * ──────────────────────────────────────────────────────────────────────── */

  /** Get entries filtered by event type, newest first. */
  getByType(eventType: AuditEventType, limit = 100): AuditEntry[] {
    return this.entries
      .filter((e) => e.eventType === eventType)
      .slice(-limit)
      .reverse();
  }

  /** Get entries filtered by room ID, newest first. */
  getByRoom(roomId: string, limit = 100): AuditEntry[] {
    return this.entries
      .filter((e) => e.roomId === roomId)
      .slice(-limit)
      .reverse();
  }

  /** Get entries filtered by user ID, newest first. */
  getByUser(userId: string, limit = 100): AuditEntry[] {
    return this.entries
      .filter((e) => e.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /** Get the most recent entries, newest first. */
  getRecent(limit = 50): AuditEntry[] {
    return this.entries.slice(-limit).reverse();
  }

  /* ────────────────────────────────────────────────────────────────────────
   * Export / Admin
   * ──────────────────────────────────────────────────────────────────────── */

  /** Export the full audit log as formatted JSON (for compliance export). */
  exportAsJson(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /** Clear all audit entries. Intended for admin use only. */
  clear(): void {
    this.entries = [];
    this.persist();
    console.info('[AuditService] Audit log cleared.');
  }

  /** Total number of entries currently stored. */
  get count(): number {
    return this.entries.length;
  }

  /* ────────────────────────────────────────────────────────────────────────
   * Persistence
   * ──────────────────────────────────────────────────────────────────────── */

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
    } catch (err) {
      console.warn('[AuditService] Failed to persist audit log.', err);
    }
  }
}

export const AuditService = new AuditServiceClass();
