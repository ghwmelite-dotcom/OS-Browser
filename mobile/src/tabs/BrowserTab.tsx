import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Plus, X, Search, Globe } from 'lucide-react';
import { InAppBrowser } from '@capacitor/inappbrowser';

interface Tab {
  id: string;
  url: string;
  title: string;
}

interface BrowserTabProps {
  colors: Record<string, string>;
}

export function BrowserTab({ colors }: BrowserTabProps) {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', url: '', title: 'New Tab' },
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [urlInput, setUrlInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Listen for InAppBrowser close events
  useEffect(() => {
    const listener = InAppBrowser.addListener('browserClosed', () => {
      setIsBrowsing(false);
    });
    return () => { listener.then(l => l.remove()); };
  }, []);

  // Listen for navigation completion to update tab URL
  useEffect(() => {
    const listener = InAppBrowser.addListener('browserPageNavigationCompleted', (data) => {
      if (data.url) {
        setTabs(prev => prev.map(t => t.id === activeTabId ? {
          ...t,
          url: data.url!,
          title: (() => { try { return new URL(data.url!).hostname; } catch { return data.url!; } })(),
        } : t));
        setUrlInput(data.url);
      }
    });
    return () => { listener.then(l => l.remove()); };
  }, [activeTabId]);

  const openInBrowser = useCallback(async (url: string) => {
    try {
      // Close any existing browser first
      try { await InAppBrowser.close(); } catch {}

      await InAppBrowser.openInWebView({
        url,
        options: {
          showURL: true,
          showToolbar: true,
          showNavigationButtons: true,
          clearCache: false,
          clearSessionCache: false,
          mediaPlaybackRequiresUserAction: false,
          closeButtonText: 'Done',
          toolbarPosition: 0, // TOP
          leftToRight: false,
          android: {
            allowZoom: true,
            hardwareBack: true,
            pauseMedia: true,
          },
          iOS: {
            allowOverScroll: true,
            enableViewportScale: true,
            allowInLineMediaPlayback: true,
            surpressIncrementalRendering: false,
            viewStyle: 2, // FULL_SCREEN
            animationEffect: 2, // COVER_VERTICAL
            allowsBackForwardNavigationGestures: true,
          },
        },
      });
      setIsBrowsing(true);
    } catch (err) {
      console.error('[Browser] Failed to open:', err);
    }
  }, []);

  const navigate = useCallback((url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl) return;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = 'https://' + finalUrl;
      } else {
        finalUrl = 'https://www.google.com/search?q=' + encodeURIComponent(finalUrl);
      }
    }
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: finalUrl, title: finalUrl } : t));
    setUrlInput(finalUrl);
    setIsEditing(false);
    openInBrowser(finalUrl);
  }, [activeTabId, openInBrowser]);

  const createTab = () => {
    if (tabs.length >= 8) return;
    // Close current browser if open
    try { InAppBrowser.close(); } catch {}
    setIsBrowsing(false);

    const id = String(Date.now());
    const newTab: Tab = { id, url: '', title: 'New Tab' };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
    setUrlInput('');
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeTab = (id: string) => {
    if (tabs.length <= 1) return;
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      const newActive = remaining[remaining.length - 1];
      setActiveTabId(newActive.id);
      setUrlInput(newActive.url);
      if (newActive.url) {
        openInBrowser(newActive.url);
      } else {
        try { InAppBrowser.close(); } catch {}
        setIsBrowsing(false);
      }
    }
  };

  const switchTab = (id: string) => {
    setActiveTabId(id);
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      setUrlInput(tab.url);
      if (tab.url) {
        openInBrowser(tab.url);
      } else {
        try { InAppBrowser.close(); } catch {}
        setIsBrowsing(false);
      }
    }
    setIsEditing(false);
  };

  const displayUrl = activeTab?.url || '';
  let shortUrl = displayUrl;
  try { shortUrl = new URL(displayUrl).hostname.replace('www.', ''); } catch { /* keep full */ }

  // Quick access links for new tab page
  const quickLinks = [
    { name: 'Google', url: 'https://www.google.com', color: '#4285F4' },
    { name: 'YouTube', url: 'https://www.youtube.com', color: '#FF0000' },
    { name: 'Gmail', url: 'https://mail.google.com', color: '#EA4335' },
    { name: 'WhatsApp', url: 'https://web.whatsapp.com', color: '#25D366' },
    { name: 'Facebook', url: 'https://www.facebook.com', color: '#1877F2' },
    { name: 'Twitter', url: 'https://x.com', color: '#1DA1F2' },
    { name: 'GhanaGov', url: 'https://www.ghana.gov.gh', color: '#006B3F' },
    { name: 'GRA', url: 'https://gra.gov.gh', color: '#CE1126' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Address bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px',
        background: colors.surface1, borderBottom: `1px solid ${colors.border}`,
      }}>
        {/* URL input */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          background: colors.surface2, borderRadius: 20,
          padding: '8px 14px', gap: 8, minWidth: 0,
        }}>
          <Search size={15} style={{ color: colors.textMuted, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={isEditing ? urlInput : (shortUrl || '')}
            onChange={e => setUrlInput(e.target.value)}
            onFocus={() => { setIsEditing(true); setUrlInput(displayUrl); }}
            onBlur={() => { setTimeout(() => setIsEditing(false), 200); }}
            onKeyDown={e => { if (e.key === 'Enter') navigate(urlInput); }}
            placeholder="Search or enter URL"
            enterKeyHint="go"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: colors.text, minWidth: 0,
            }}
          />
        </div>

        {/* Tab count badge */}
        <button onClick={createTab} style={{
          ...iconBtnStyle(colors),
          position: 'relative',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            border: `2px solid ${colors.textMuted}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: colors.textMuted,
          }}>
            {tabs.length}
          </div>
        </button>
      </div>

      {/* Tab strip — only when multiple tabs */}
      {tabs.length > 1 && (
        <div style={{
          display: 'flex', gap: 4, padding: '4px 8px', overflowX: 'auto',
          background: colors.surface1, borderBottom: `1px solid ${colors.border}`,
          scrollbarWidth: 'none',
        }}>
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            let tabHost = 'New Tab';
            try { tabHost = new URL(tab.url).hostname.replace('www.', ''); } catch {}
            return (
              <div key={tab.id} onClick={() => switchTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 8, flexShrink: 0,
                background: isActive ? colors.accent + '20' : colors.surface2,
                border: isActive ? `1px solid ${colors.accent}40` : '1px solid transparent',
                cursor: 'pointer', maxWidth: 140,
              }}>
                {tab.url && (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${tabHost}&sz=16`}
                    alt="" style={{ width: 14, height: 14, borderRadius: 2 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <span style={{
                  fontSize: 11, color: isActive ? colors.accent : colors.textMuted,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: isActive ? 600 : 400,
                }}>{tab.url ? tabHost : 'New Tab'}</span>
                <button onClick={e => { e.stopPropagation(); closeTab(tab.id); }} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: colors.textMuted, display: 'flex', flexShrink: 0,
                }}>
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* New tab page — shown when no URL is loaded */}
      {!isBrowsing && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ textAlign: 'center', marginTop: 20, marginBottom: 32 }}>
            {/* Logo */}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
              <circle cx="12" cy="12" r="10.5" stroke="#D4A017" strokeWidth="1.5" fill="none" />
              <path d="M12 3.5V8M12 16v4.5M3.5 12H8M16 12h4.5" stroke="#D4A017" strokeWidth="1" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2" fill="#D4A017" />
            </svg>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text }}>OS Browser</h2>
            <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Search or enter a URL above</p>
          </div>

          {/* Quick links grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16, maxWidth: 360, margin: '0 auto',
          }}>
            {quickLinks.map(link => (
              <button key={link.name} onClick={() => navigate(link.url)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: 8,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: colors.surface2, border: `1px solid ${colors.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=24`}
                    alt={link.name} style={{ width: 24, height: 24 }}
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 500 }}>{link.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* When browsing, show a minimal status bar */}
      {isBrowsing && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: colors.bg,
        }}>
          <div style={{ textAlign: 'center' }}>
            <Globe size={32} style={{ color: colors.accent, margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: colors.textMuted }}>
              Browsing in native view
            </p>
            <button onClick={() => {
              try { InAppBrowser.close(); } catch {}
              setIsBrowsing(false);
            }} style={{
              marginTop: 12, padding: '8px 20px', borderRadius: 8,
              background: colors.surface2, border: `1px solid ${colors.border}`,
              color: colors.text, fontSize: 13, cursor: 'pointer',
            }}>
              Back to tabs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function iconBtnStyle(colors: Record<string, string>): React.CSSProperties {
  return {
    width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer',
    color: colors.textMuted, flexShrink: 0,
  };
}
