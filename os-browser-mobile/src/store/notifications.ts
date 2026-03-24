import { create } from 'zustand';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'message' | 'info' | 'success' | 'warning';
  timestamp: number;
  roomId?: string;
  senderId?: string;
}

interface NotificationState {
  // Badge count for GovChat tab
  unreadChatCount: number;

  // Toast notification queue
  toasts: InAppNotification[];

  // Actions
  incrementUnread: () => void;
  clearUnread: () => void;
  showToast: (notification: Omit<InAppNotification, 'id' | 'timestamp'>) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadChatCount: 0,
  toasts: [],

  incrementUnread: () => set((s) => ({ unreadChatCount: s.unreadChatCount + 1 })),
  clearUnread: () => set({ unreadChatCount: 0 }),

  showToast: (notification) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        {
          ...notification,
          id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
        },
      ].slice(-5), // Keep max 5 toasts
    })),

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clearAllToasts: () => set({ toasts: [] }),
}));
