import type { ClassificationLevel, GovChatMessage } from '@/types/govchat';
import { DEFAULT_RETENTION_DAYS } from '@/types/govchat';
import { useGovChatStore } from '@/store/govchat';

/* ------------------------------------------------------------------ */
/*  RetentionService — singleton                                      */
/*  Enforces message retention policies based on classification level  */
/* ------------------------------------------------------------------ */

const CHECK_INTERVAL_MS = 3_600_000; // 1 hour

class RetentionServiceClass {
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  /* ---- Lifecycle ---- */

  /** Start periodic retention enforcement (every hour). */
  start(): void {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(
      () => this.enforceRetention(),
      CHECK_INTERVAL_MS,
    );
    // Run once immediately on start
    this.enforceRetention();
  }

  /** Stop periodic checks. */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /* ---- Enforcement ---- */

  /**
   * Iterate through all stored messages and remove any that have
   * exceeded their retention period.
   */
  private enforceRetention(): void {
    const store = useGovChatStore.getState();
    const allMessages = store.messages ?? {};

    for (const [roomId, messages] of Object.entries(allMessages)) {
      const expired = messages.filter((m) => this.isExpired(m));

      if (expired.length === 0) continue;

      for (const message of expired) {
        console.info(
          `[RetentionService] Removing expired ${message.classification} message ${message.eventId} ` +
            `(sent ${new Date(message.timestamp).toISOString()}, ` +
            `retention ${DEFAULT_RETENTION_DAYS[message.classification]}d)`,
        );
      }

      // Remove expired messages from the store
      const kept = messages.filter((m) => !this.isExpired(m));
      useGovChatStore.setState((state) => ({
        messages: { ...state.messages, [roomId]: kept },
      }));
    }
  }

  /* ---- Query helpers ---- */

  /** Returns `true` when the message has exceeded its retention window. */
  isExpired(message: GovChatMessage): boolean {
    const retentionDays = DEFAULT_RETENTION_DAYS[message.classification];
    const expiresAt =
      message.timestamp + retentionDays * 24 * 60 * 60 * 1000;
    return Date.now() > expiresAt;
  }

  /** Human-readable retention metadata for a classification level. */
  getRetentionInfo(classification: ClassificationLevel): {
    days: number;
    label: string;
  } {
    const days = DEFAULT_RETENTION_DAYS[classification];
    const years = Math.round(days / 365);
    return {
      days,
      label: years === 1 ? '1 year' : `${years} years`,
    };
  }

  /** Number of days remaining before a message expires. Negative = overdue. */
  getDaysRemaining(message: GovChatMessage): number {
    const retentionDays = DEFAULT_RETENTION_DAYS[message.classification];
    const expiresAt =
      message.timestamp + retentionDays * 24 * 60 * 60 * 1000;
    return Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
  }
}

export const RetentionService = new RetentionServiceClass();
