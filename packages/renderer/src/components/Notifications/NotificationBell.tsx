import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore, type AppNotification } from '@/store/notifications';
import { useTabsStore } from '@/store/tabs';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function NotificationBell() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.notifications.filter(n => !n.read).length);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  /* ---- close on outside click ---- */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* ---- click notification row ---- */
  const handleNotificationClick = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.actionRoute) {
      if (n.actionRoute === 'govchat') {
        window.dispatchEvent(new CustomEvent('os-browser:messaging'));
      } else if (n.actionRoute.startsWith('os-browser://') || n.actionRoute.startsWith('http')) {
        useTabsStore.getState().createTab(n.actionRoute);
      }
    }
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
    >
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => {
          if (!open && bellRef.current) {
            const rect = bellRef.current.getBoundingClientRect();
            setDropdownPos({
              top: rect.top, // top edge of the bell
              right: window.innerWidth - rect.right - rect.width / 2,
            });
          }
          setOpen((prev) => !prev);
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 6px',
          lineHeight: 0,
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Bell size={14} />

        {/* Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: 2,
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              background: '#CE1126',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — opens upward from bell, bottom edge sits above status bar */}
      {open && (
        <div
          role="menu"
          style={{
            position: 'fixed',
            // Panel bottom edge = 8px above the bell's top
            bottom: window.innerHeight - dropdownPos.top + 8,
            // Centered on the bell, clamped to viewport
            right: Math.max(8, dropdownPos.right - 150),
            width: 340,
            // Grows upward, max height leaves room at top of screen
            maxHeight: Math.min(420, dropdownPos.top - 80),
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-2)',
            borderRadius: 12,
            boxShadow: '0 -8px 32px rgba(0,0,0,.3), 0 4px 16px rgba(0,0,0,.2)',
            zIndex: 9999,
            fontSize: 12,
            animation: 'slideUpFadeIn 150ms ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px 10px',
              borderBottom: '1px solid var(--color-border-2)',
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--color-text-primary)',
              position: 'sticky',
              top: 0,
              background: 'var(--color-surface-1)',
              zIndex: 1,
              borderRadius: '12px 12px 0 0',
            }}
          >
            <span>
              Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </span>
            {notifications.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 11,
                  padding: '2px 4px',
                  borderRadius: 4,
                }}
              >
                Clear All
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div
              style={{
                padding: '32px 12px',
                textAlign: 'center',
                color: 'var(--color-text-tertiary)',
                fontSize: 12,
              }}
            >
              No notifications yet
            </div>
          ) : (
            <>
              {notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onClick={() => handleNotificationClick(n)}
                />
              ))}
              <div
                style={{
                  padding: '12px 14px',
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 11,
                  borderTop: '1px solid var(--color-border-1)',
                }}
              >
                That's everything
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row                                                                */
/* ------------------------------------------------------------------ */

function NotificationRow({
  notification: n,
  onClick,
}: {
  notification: AppNotification;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="menuitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--color-border-1)',
        background: hovered ? 'var(--color-surface-2)' : 'transparent',
        transition: 'background 120ms ease',
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
        {n.icon || defaultIcon(n.type)}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: n.read ? 400 : 600,
            color: 'var(--color-text-primary)',
            fontSize: 12,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {n.title}
        </div>
        <div
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 11,
            lineHeight: 1.3,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {n.message}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 3,
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
          }}
        >
          {n.source && <span>{n.source}</span>}
          {n.source && <span>&middot;</span>}
          <span>{formatRelativeTime(n.timestamp)}</span>
        </div>
      </div>

      {/* Unread dot */}
      {!n.read && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#3B82F6',
            flexShrink: 0,
            marginTop: 6,
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function defaultIcon(type: string): string {
  switch (type) {
    case 'success': return '\u2705';
    case 'info': return '\u2139\uFE0F';
    case 'warning': return '\u26A0\uFE0F';
    case 'error': return '\u274C';
    case 'chat': return '\uD83D\uDCAC';
    case 'call': return '\uD83D\uDCDE';
    default: return '\uD83D\uDD14';
  }
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default NotificationBell;
