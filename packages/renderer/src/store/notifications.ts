import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type NotificationType = 'success' | 'info' | 'warning' | 'error' | 'chat' | 'call';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionLabel?: string;
  actionRoute?: string;
  actionData?: Record<string, string>;
  source?: string;
  icon?: string;
}

export interface NotificationState {
  notifications: AppNotification[];
  toastQueue: AppNotification[];
  currentToast: AppNotification | null;

  /* Actions */
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  dismissToast: () => void;

  /* Getters */
  unreadCount: () => number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'os-browser-notifications';
const MAX_NOTIFICATIONS = 100;
const TOAST_DURATION = 5_000; // ms
const TOAST_GAP = 300; // ms between consecutive toasts

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadFromStorage(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(notifications: AppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Toast timer management                                             */
/* ------------------------------------------------------------------ */

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function clearToastTimer() {
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}

function scheduleAutoDismiss() {
  clearToastTimer();
  toastTimer = setTimeout(() => {
    toastTimer = null;
    useNotificationStore.getState().dismissToast();
  }, TOAST_DURATION);
}

/** Pause auto-dismiss (called on hover). */
export function pauseToastTimer() {
  clearToastTimer();
}

/** Resume auto-dismiss (called on hover-out). */
export function resumeToastTimer() {
  const { currentToast } = useNotificationStore.getState();
  if (currentToast) {
    scheduleAutoDismiss();
  }
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useNotificationStore = create<NotificationState>((set, get) => {
  /** Pop the next toast from the queue after a short animation gap. */
  function showNextToast() {
    setTimeout(() => {
      const { toastQueue } = get();
      if (toastQueue.length === 0) return;

      const [next, ...rest] = toastQueue;
      set({ currentToast: next, toastQueue: rest });
      scheduleAutoDismiss();
    }, TOAST_GAP);
  }

  return {
    /* ---------- state ---------- */
    notifications: loadFromStorage(),
    toastQueue: [],
    currentToast: null,

    /* ---------- actions ---------- */

    addNotification(partial) {
      try {
        const notification: AppNotification = {
          ...partial,
          id: generateId(),
          timestamp: Date.now(),
          read: false,
        };

        set((state) => {
          const notifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
          saveToStorage(notifications);

          // If no toast is currently showing, show immediately
          if (!state.currentToast) {
            scheduleAutoDismiss();
            return {
              notifications,
              currentToast: notification,
              toastQueue: state.toastQueue,
            };
          }

          // Otherwise queue it
          return {
            notifications,
            toastQueue: [...state.toastQueue, notification],
          };
        });
      } catch (err) {
        console.warn('[Notifications] Failed to add notification:', err);
      }
    },

    markAsRead(id) {
      set((state) => {
        const notifications = state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        );
        saveToStorage(notifications);
        return { notifications };
      });
    },

    markAllAsRead() {
      set((state) => {
        const notifications = state.notifications.map((n) => ({ ...n, read: true }));
        saveToStorage(notifications);
        return { notifications };
      });
    },

    removeNotification(id) {
      set((state) => {
        const notifications = state.notifications.filter((n) => n.id !== id);
        saveToStorage(notifications);
        return { notifications };
      });
    },

    clearAll() {
      set({ notifications: [], toastQueue: [], currentToast: null });
      clearToastTimer();
      saveToStorage([]);
    },

    dismissToast() {
      clearToastTimer();
      set({ currentToast: null });
      showNextToast();
    },

    /* ---------- getters ---------- */

    unreadCount() {
      return get().notifications.filter((n) => !n.read).length;
    },
  };
});
