import { useNotificationStore } from '@/store/notifications';

/**
 * Bridge between the notification store and Electron's native notifications.
 * Call `initDesktopNotifications()` once on app startup.
 */
export function initDesktopNotifications(): void {
  const store = useNotificationStore;

  // Subscribe to new notifications and send desktop notifications for important ones
  store.subscribe((state, prevState) => {
    // Check if a new notification was added
    if (state.notifications.length > prevState.notifications.length) {
      const newest = state.notifications[0]; // newest is first
      if (!newest) return;

      // Only send desktop notifications for important types
      const desktopTypes = ['chat', 'call', 'warning', 'error'];
      if (desktopTypes.includes(newest.type) || newest.source === 'admin') {
        window.osBrowser?.notification?.show({
          title: newest.title,
          body: newest.message,
          type: newest.type,
        });
      }

      // Update taskbar badge
      const unread = state.notifications.filter(n => !n.read).length;
      window.osBrowser?.notification?.setBadge(unread);
    }

    // Update badge when read state changes
    const prevUnread = prevState.notifications.filter(n => !n.read).length;
    const currUnread = state.notifications.filter(n => !n.read).length;
    if (prevUnread !== currUnread) {
      window.osBrowser?.notification?.setBadge(currUnread);
    }
  });

  // Listen for notification clicks from main process
  window.osBrowser?.notification?.onClicked((data: any) => {
    if (data.type === 'chat' || data.type === 'call') {
      window.dispatchEvent(new CustomEvent('os-browser:messaging'));
    }
  });
}
