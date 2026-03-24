/**
 * Formatting utilities for timestamps, byte sizes, and text truncation.
 */

/** Relative time string: "just now", "2m ago", "1h ago", "Yesterday", "Mar 15" */
export function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;

  const date = new Date(timestamp);
  const today = new Date();

  // Yesterday check
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday';
  }

  // Same year — "Mar 15"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (date.getFullYear() === today.getFullYear()) {
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }

  // Different year — "Mar 15, 2025"
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** Format timestamp as "14:23" */
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Human-readable byte size: "1.2 KB", "3.4 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '\u2026';
}
