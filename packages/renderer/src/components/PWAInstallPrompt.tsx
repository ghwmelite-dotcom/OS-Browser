import React, { useState, useEffect } from 'react';
import { Lock, X } from 'lucide-react';

export interface PWAInstallData {
  tabId: string;
  name: string;
  shortName?: string;
  description: string;
  iconUrl: string | null;
  startUrl: string;
  url: string;
}

interface PWAInstallPromptProps {
  data: PWAInstallData;
  onClose: () => void;
}

export function PWAInstallPrompt({ data, onClose }: PWAInstallPromptProps) {
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [iconError, setIconError] = useState(false);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await (window as any).osBrowser.pwa.install({
        name: data.name,
        startUrl: data.startUrl,
        iconUrl: data.iconUrl || '',
      });
      // Mark as dismissed so we don't prompt again
      try {
        const dismissed = JSON.parse(localStorage.getItem('pwa_dismissed') || '[]');
        if (!dismissed.includes(data.startUrl)) {
          dismissed.push(data.startUrl);
          localStorage.setItem('pwa_dismissed', JSON.stringify(dismissed));
        }
      } catch { /* localStorage error — ignore */ }
      handleClose();
    } catch {
      setInstalling(false);
    }
  };

  const isHttps = data.url.startsWith('https://');
  const displayUrl = (() => {
    try {
      const u = new URL(data.url);
      return u.hostname;
    } catch {
      return data.url;
    }
  })();

  const firstLetter = (data.shortName || data.name || 'A').charAt(0).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[400px] rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--color-surface-1)',
          borderColor: 'var(--color-border-1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors z-10"
          aria-label="Close"
        >
          <X size={14} className="text-text-muted" />
        </button>

        {/* Content */}
        <div className="px-6 pt-6 pb-5">
          <h2 className="text-[15px] font-semibold text-text-primary mb-5">Install app</h2>

          <div className="flex items-center gap-4 mb-5">
            {/* App icon */}
            {data.iconUrl && !iconError ? (
              <img
                src={data.iconUrl}
                alt={data.name}
                className="shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  objectFit: 'cover',
                }}
                onError={() => setIconError(true)}
              />
            ) : (
              <div
                className="shrink-0 flex items-center justify-center font-bold text-white text-[20px]"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #D4A017 0%, #b8860b 100%)',
                }}
              >
                {firstLetter}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold text-text-primary truncate">{data.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {isHttps && <Lock size={11} className="text-text-muted shrink-0" />}
                <p className="text-[13px] text-text-muted truncate">{displayUrl}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {data.description && (
            <p className="text-[13px] text-text-secondary mb-5 line-clamp-2">{data.description}</p>
          )}
        </div>

        {/* Actions */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-3"
          style={{ borderTop: '1px solid var(--color-border-1)' }}
        >
          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-lg text-[13px] font-medium border transition-colors hover:bg-surface-2"
            style={{
              borderColor: 'var(--color-border-1)',
              color: 'var(--color-text-primary)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="px-5 py-2 rounded-lg text-[13px] font-bold transition-all hover:brightness-110 active:brightness-95 disabled:opacity-60"
            style={{
              background: '#D4A017',
              color: '#1a1a1a',
            }}
          >
            {installing ? 'Installing...' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
}
