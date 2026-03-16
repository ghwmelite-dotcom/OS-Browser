import type { GovChatMessage, ClassificationLevel } from '@/types/govchat';

class GovChatNotificationServiceClass {
  private permission: NotificationPermission = 'default';
  private enabled = true;
  private soundEnabled = true;

  /** Initialize — request notification permission */
  async initialize(): Promise<void> {
    if (!('Notification' in window)) return;
    this.permission = Notification.permission;
    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }
  }

  /** Show notification for a new message */
  notify(message: GovChatMessage, roomName: string): void {
    if (!this.enabled || this.permission !== 'granted') return;

    // Classification-based content redaction
    // SENSITIVE and SECRET messages: don't show message body in notification
    const body = this.getNotificationBody(message);
    const title = this.getNotificationTitle(message, roomName);

    const notification = new Notification(title, {
      body,
      icon: '/icons/govchat-icon.png',
      tag: `govchat-${message.roomId}`,
      silent: !this.soundEnabled,
    });

    // Click notification → focus app and select room
    notification.onclick = () => {
      window.focus();
      // Import store dynamically to avoid circular deps
      import('@/store/govchat').then(({ useGovChatStore }) => {
        useGovChatStore.getState().selectRoom(message.roomId);
      });
      notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }

  private getNotificationTitle(message: GovChatMessage, roomName: string): string {
    return `${message.senderName} — ${roomName}`;
  }

  private getNotificationBody(message: GovChatMessage): string {
    // Redact body for sensitive classifications
    if (message.classification === 'SECRET') {
      return '[SECRET] New message received';
    }
    if (message.classification === 'SENSITIVE') {
      return '[SENSITIVE] New message received';
    }
    // For voice notes, files, etc.
    if (message.type === 'voice') return '\u{1F3A4} Voice note';
    if (message.type === 'file') return '\u{1F4CE} File shared';
    if (message.type === 'image') return '\u{1F4F7} Image shared';
    // Truncate long messages
    return message.body.length > 100 ? message.body.slice(0, 100) + '...' : message.body;
  }

  // Settings
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setSoundEnabled(soundEnabled: boolean): void {
    this.soundEnabled = soundEnabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const GovChatNotificationService = new GovChatNotificationServiceClass();
