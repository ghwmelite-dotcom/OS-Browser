import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Minus, Square, X, Bell, Trash2 } from 'lucide-react';
import { useSettingsStore } from '@/store/settings';
import { useNotificationStore, type AppNotification } from '@/store/notifications';
import { useTabsStore } from '@/store/tabs';

declare global {
  interface Window {
    osBrowser: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      fullscreen: () => Promise<void>;
      [key: string]: any;
    };
  }
}

/** Animated OS Browser logo — Kente-inspired golden compass with subtle glow */
function BrowserLogo() {
  return (
    <div className="relative w-6 h-6 flex items-center justify-center shrink-0" title="OS Browser">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        className="browser-logo-spin">
        {/* Outer ring */}
        <circle cx="12" cy="12" r="10.5" stroke="url(#logoGrad)" strokeWidth="1.8" fill="none" />
        {/* Inner compass cross */}
        <path d="M12 3.5V8M12 16v4.5M3.5 12H8M16 12h4.5" stroke="url(#logoGrad)" strokeWidth="1.2" strokeLinecap="round" />
        {/* Center globe lines */}
        <ellipse cx="12" cy="12" rx="4.5" ry="10.5" stroke="url(#logoGrad2)" strokeWidth="0.8" opacity="0.5" />
        <ellipse cx="12" cy="12" rx="10.5" ry="4.5" stroke="url(#logoGrad2)" strokeWidth="0.8" opacity="0.5" />
        {/* Center dot */}
        <circle cx="12" cy="12" r="2" fill="url(#logoGrad)" className="browser-logo-pulse" />
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="24" y2="24">
            <stop offset="0%" stopColor="#D4A017" />
            <stop offset="50%" stopColor="#F2C94C" />
            <stop offset="100%" stopColor="#D4A017" />
          </linearGradient>
          <linearGradient id="logoGrad2" x1="0" y1="12" x2="24" y2="12">
            <stop offset="0%" stopColor="#D4A017" />
            <stop offset="100%" stopColor="#F2C94C" />
          </linearGradient>
        </defs>
      </svg>
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full browser-logo-glow" />
    </div>
  );
}

export function TitleBar() {
  const { settings, updateSettings } = useSettingsStore();
  const isDark = settings?.theme !== 'light';

  const handleMinimize = () => window.osBrowser?.minimize();
  const handleMaximize = () => window.osBrowser?.maximize();
  const handleClose = () => window.osBrowser?.close();

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    updateSettings({ theme: newTheme });
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  return (
    <div
      className="shrink-0 select-none flex flex-col"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Kente crown — woven band at the very top */}
      <div style={{
        height: 3,
        background: 'var(--kente-crown)',
        flexShrink: 0,
        opacity: isDark ? 0.5 : 1,
      }} />
      <div
        className="h-8 flex items-center justify-between"
        style={{ background: 'var(--kente-header-bg)' }}
      >
      {/* Left: Animated browser logo + App title */}
      <div className="flex items-center gap-2 pl-3">
        <BrowserLogo />
        <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-accent)', WebkitAppRegion: 'drag' } as React.CSSProperties}>
          OS Browser
        </span>
      </div>

      {/* Center: draggable area */}
      <div className="flex-1" />

      {/* Right: Theme toggle + Window controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Notification bell + dropdown */}
        <TitleBarNotifications />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-surface-2 transition-all duration-150 mr-1"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
          style={{ border: '1px solid var(--color-border-1)' }}
        >
          {isDark ? (
            <Sun size={13} className="text-ghana-gold" />
          ) : (
            <Moon size={13} className="text-text-secondary" />
          )}
          <span className="text-[10px] font-medium" style={{ color: isDark ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>
            {isDark ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center hover:bg-surface-2 transition-colors duration-100"
          aria-label="Minimize"
          title="Minimize"
        >
          <Minus size={14} className="text-text-secondary" />
        </button>

        {/* Maximize */}
        <button
          onClick={handleMaximize}
          className="w-11 h-full flex items-center justify-center hover:bg-surface-2 transition-colors duration-100"
          aria-label="Maximize"
          title="Maximize"
        >
          <Square size={11} className="text-text-secondary" />
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors duration-100 group"
          aria-label="Close"
          title="Close"
        >
          <X size={14} className="text-text-secondary group-hover:text-white" />
        </button>
      </div>
      </div>
    </div>
  );
}

/* ── Notification Bell + Dropdown (TitleBar) ─────────────────────── */

function formatRelativeTime(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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

function TitleBarNotifications() {
  const notifications = useNotificationStore(s => s.notifications);
  const unreadCount = useNotificationStore(s => s.notifications.filter(n => !n.read).length);
  const markAsRead = useNotificationStore(s => s.markAsRead);
  const clearAll = useNotificationStore(s => s.clearAll);

  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

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

  // Calculate dropdown position from bell
  const getDropdownStyle = (): React.CSSProperties => {
    if (!bellRef.current) return {};
    const rect = bellRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right - 120),
      width: 360,
      maxHeight: 'min(460px, calc(100vh - 120px))',
    };
  };

  return (
    <div className="relative flex items-center mr-1">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => setOpen(prev => !prev)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-2 transition-all duration-150"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        title="Notifications"
      >
        <Bell size={14} className="text-text-secondary" />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center"
            style={{
              top: 2, right: 2,
              minWidth: 15, height: 15, borderRadius: 8,
              background: '#CE1126', color: '#fff',
              fontSize: 9, fontWeight: 700,
              padding: '0 3px', lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — opens DOWNWARD from the bell */}
      {open && (
        <div
          ref={panelRef}
          style={{
            ...getDropdownStyle(),
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-2)',
            borderRadius: 14,
            boxShadow: '0 12px 40px rgba(0,0,0,.3), 0 4px 12px rgba(0,0,0,.15)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'notifDropIn 150ms ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 12px',
              borderBottom: '1px solid var(--color-border-2)',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
              Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {notifications.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearAll(); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-surface-2 transition-colors"
                  style={{ fontSize: 11, color: 'var(--color-text-muted)' }}
                  title="Clear all notifications"
                >
                  <Trash2 size={11} />
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-surface-2 transition-colors"
                title="Close"
              >
                <X size={13} className="text-text-muted" />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '40px 16px', textAlign: 'center',
                color: 'var(--color-text-muted)', fontSize: 13,
              }}>
                <Bell size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors duration-100"
                  style={{ borderBottom: '1px solid var(--color-border-1)' }}
                >
                  {/* Icon */}
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                    {n.icon || defaultIcon(n.type)}
                  </span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: n.read ? 400 : 600,
                      color: 'var(--color-text-primary)',
                      fontSize: 12.5, lineHeight: 1.35,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: 11.5, lineHeight: 1.35, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {n.message}
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      marginTop: 4, fontSize: 10, color: 'var(--color-text-muted)',
                    }}>
                      {n.source && <span>{n.source}</span>}
                      {n.source && <span style={{ opacity: 0.4 }}>&middot;</span>}
                      <span>{formatRelativeTime(n.timestamp)}</span>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#3B82F6', flexShrink: 0, marginTop: 6,
                    }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes notifDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
