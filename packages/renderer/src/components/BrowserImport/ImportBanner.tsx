import React, { useEffect, useState } from 'react';
import { Check, X, Loader } from 'lucide-react';

interface ImportBannerProps {
  onClose: () => void;
}

interface DetectedBrowser {
  id: string;
  name: string;
  email: string;
  hasBookmarks: boolean;
  hasHistory: boolean;
}

interface ImportResult {
  bookmarks: number;
  history: number;
}

type BannerState = 'detecting' | 'picker' | 'importing' | 'done';

const BROWSER_COLORS: Record<string, string> = {
  chrome: '#4285F4',
  edge: '#0078D7',
  brave: '#FB542B',
  opera: '#FF1B2D',
};

function getBrowserColor(id: string): string {
  const base = id.split(':')[0];
  return BROWSER_COLORS[base] ?? 'var(--color-accent)';
}

function getBrowserLabel(id: string): string {
  const base = id.split(':')[0];
  const labels: Record<string, string> = { chrome: 'Chrome', edge: 'Edge', brave: 'Brave', opera: 'Opera' };
  return labels[base] ?? 'Browser';
}

export default function ImportBanner({ onClose }: ImportBannerProps) {
  const [state, setState] = useState<BannerState>('detecting');
  const [browsers, setBrowsers] = useState<DetectedBrowser[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  /* ── Hide web views so banner is visible above native content ── */
  useEffect(() => {
    (window as any).osBrowser?.hideWebViews?.();
    return () => { (window as any).osBrowser?.showWebViews?.(); };
  }, []);

  /* ── Detect browsers on mount ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detected: DetectedBrowser[] =
          await (window as any).osBrowser.browserImport.detect();
        if (cancelled) return;
        setBrowsers(detected);
        setState('picker');
      } catch {
        if (!cancelled) setState('picker');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Auto-dismiss after success ── */
  useEffect(() => {
    if (state !== 'done') return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [state, onClose]);

  /* ── Import handler ── */
  const handleImport = async (browserId: string) => {
    setState('importing');
    try {
      const res: ImportResult =
        await (window as any).osBrowser.browserImport.run(browserId);
      setResult(res);
      setState('done');
      window.dispatchEvent(new Event('bookmark-changed'));
    } catch {
      setState('picker');
    }
  };

  /* ── Availability label ── */
  const availabilityLabel = (b: DetectedBrowser) => {
    if (b.hasBookmarks && b.hasHistory) return 'Bookmarks & History';
    if (b.hasBookmarks) return 'Bookmarks';
    if (b.hasHistory) return 'History';
    return '';
  };

  /* ── Render body by state ── */
  const renderBody = () => {
    /* Detecting */
    if (state === 'detecting') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-text-muted)' }} />
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Scanning for browsers...</span>
        </div>
      );
    }

    /* No browsers found */
    if (state === 'picker' && browsers.length === 0) {
      return (
        <div style={{ padding: '12px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>No supported browsers found</p>
          <button onClick={onClose} style={dismissBtnStyle}>Dismiss</button>
        </div>
      );
    }

    /* Picker — compact list with profile name + email */
    if (state === 'picker') {
      return (
        <>
          <div style={{
            maxHeight: 260, overflowY: 'auto', padding: '8px 0',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {browsers.map((b) => {
              const color = getBrowserColor(b.id);
              const isHovered = hoveredId === b.id;
              const browserLabel = getBrowserLabel(b.id);
              const initial = b.name.charAt(0).toUpperCase();

              return (
                <button
                  key={b.id}
                  onClick={() => handleImport(b.id)}
                  onMouseEnter={() => setHoveredId(b.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    border: '1px solid var(--color-border-1)',
                    background: isHovered ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {/* Profile avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: color, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff',
                    fontSize: 15, fontWeight: 700, lineHeight: 1,
                  }}>
                    {initial}
                  </div>

                  {/* Profile info */}
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {b.name}
                    </div>
                    {b.email ? (
                      <div style={{
                        fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {b.email}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
                        {browserLabel}
                      </div>
                    )}
                  </div>

                  {/* What's available */}
                  <span style={{
                    fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0,
                    padding: '2px 8px', borderRadius: 6,
                    background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)',
                    whiteSpace: 'nowrap',
                  }}>
                    {availabilityLabel(b)}
                  </span>
                </button>
              );
            })}
          </div>
          <button onClick={onClose} style={skipBtnStyle}>Skip</button>
        </>
      );
    }

    /* Importing */
    if (state === 'importing') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Importing bookmarks & history...</span>
        </div>
      );
    }

    /* Done */
    if (state === 'done' && result) {
      const parts: string[] = [];
      if (result.bookmarks > 0) parts.push(`${result.bookmarks} bookmark${result.bookmarks !== 1 ? 's' : ''}`);
      if (result.history > 0) parts.push(`${result.history} history entr${result.history !== 1 ? 'ies' : 'y'}`);
      const summary = parts.length > 0 ? `Imported ${parts.join(' and ')}` : 'Import complete';

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: '#22C55E', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            <Check size={14} color="#fff" strokeWidth={3} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{summary}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{
      position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, padding: '14px 18px', borderRadius: 14,
      background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: 380, maxWidth: '92vw',
      animation: 'fadeUp 0.3s ease-out',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--color-accent), #60A5FA)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: '#fff', fontWeight: 700,
        }}>
          ↓
        </div>
        <p style={{
          flex: 1, fontSize: 14, fontWeight: 600,
          color: 'var(--color-text-primary)', margin: 0,
        }}>
          Import from your other browser?
        </p>
        {state !== 'done' && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, color: 'var(--color-text-muted)', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Body */}
      {renderBody()}
    </div>
  );
}

const skipBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '4px 0', fontSize: 12, color: 'var(--color-text-muted)',
  fontWeight: 500,
};

const dismissBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '8px 16px', fontSize: 12, color: 'var(--color-text-muted)',
  fontWeight: 500, marginTop: 8,
};
