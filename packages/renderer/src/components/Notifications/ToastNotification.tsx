import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import {
  useNotificationStore,
  pauseToastTimer,
  resumeToastTimer,
  type NotificationType,
} from '@/store/notifications';
import { useTabsStore } from '@/store/tabs';

/* ------------------------------------------------------------------ */
/*  Colour map                                                         */
/* ------------------------------------------------------------------ */

const ACCENT_COLORS: Record<NotificationType, string> = {
  success: '#006B3F',
  info: '#D4A017',
  warning: '#F59E0B',
  error: '#CE1126',
  chat: '#3B82F6',
  call: '#8B5CF6',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ToastNotification() {
  const currentToast = useNotificationStore((s) => s.currentToast);
  const dismissToast = useNotificationStore((s) => s.dismissToast);

  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const isPaused = useRef(false);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const elapsedBeforePause = useRef(0);

  const DURATION = 5_000;

  /* ---- inject keyframes once ---- */
  useEffect(() => {
    if (document.getElementById('toast-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'toast-keyframes';
    style.textContent = `
      @keyframes toastSlideIn {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes toastSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  /* ---- progress bar animation ---- */
  const tick = useCallback(
    (now: number) => {
      if (isPaused.current) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = elapsedBeforePause.current + (now - startRef.current);
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct > 0) {
        animRef.current = requestAnimationFrame(tick);
      }
    },
    [],
  );

  useEffect(() => {
    if (!currentToast) return;

    // Reset state for new toast
    setExiting(false);
    setProgress(100);
    isPaused.current = false;
    elapsedBeforePause.current = 0;
    startRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [currentToast?.id, tick]);

  /* ---- hover handlers ---- */
  const handleMouseEnter = () => {
    isPaused.current = true;
    elapsedBeforePause.current += performance.now() - startRef.current;
    pauseToastTimer();
  };

  const handleMouseLeave = () => {
    isPaused.current = false;
    startRef.current = performance.now();
    resumeToastTimer();
  };

  /* ---- dismiss with exit animation ---- */
  const handleDismiss = () => {
    setExiting(true);
    setTimeout(dismissToast, 280);
  };

  /* ---- action click ---- */
  const handleAction = () => {
    if (currentToast?.actionRoute) {
      if (currentToast.actionRoute === 'govchat') {
        window.dispatchEvent(new CustomEvent('os-browser:messaging'));
      } else if (currentToast.actionRoute.startsWith('os-browser://') || currentToast.actionRoute.startsWith('http')) {
        useTabsStore.getState().createTab(currentToast.actionRoute);
      }
    }
    handleDismiss();
  };

  if (!currentToast) return null;

  const accent = ACCENT_COLORS[currentToast.type] ?? ACCENT_COLORS.info;

  /* ---- relative time ---- */
  const ago = formatRelativeTime(currentToast.timestamp);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 200,
        width: 340,
        maxWidth: 'calc(100vw - 24px)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--color-surface-1)',
        boxShadow: '0 8px 30px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.10)',
        display: 'flex',
        flexDirection: 'column',
        animation: exiting
          ? 'toastSlideOut 280ms ease-in forwards'
          : 'toastSlideIn 320ms ease-out forwards',
        fontFamily: 'inherit',
      }}
    >
      {/* Accent bar (left) */}
      <div style={{ display: 'flex', flex: 1 }}>
        <div
          style={{
            width: 4,
            flexShrink: 0,
            background: accent,
            borderRadius: '12px 0 0 12px',
          }}
        />

        {/* Body */}
        <div style={{ flex: 1, padding: '12px 12px 10px 12px' }}>
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--color-text-primary)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: accent,
                  flexShrink: 0,
                }}
              />
              {currentToast.title}
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss notification"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 2,
                lineHeight: 0,
                color: 'var(--color-text-secondary)',
                borderRadius: 4,
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Message */}
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            {currentToast.message}
          </div>

          {/* Footer: action + time */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
            }}
          >
            {currentToast.actionLabel ? (
              <button
                onClick={handleAction}
                style={{
                  background: accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  lineHeight: 1.4,
                }}
              >
                {currentToast.actionLabel}
              </button>
            ) : (
              <span />
            )}

            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
              {ago}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 3,
          width: '100%',
          background: 'var(--color-surface-2)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: accent,
            opacity: 0.6,
            transition: 'width 100ms linear',
            borderRadius: '0 0 0 12px',
          }}
        />
      </div>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Relative time helper                                               */
/* ------------------------------------------------------------------ */

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

export default ToastNotification;
