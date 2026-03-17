import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical, Plus, Copy, Star, Clock, Download, Settings, Shield,
  Printer, ZoomIn, ZoomOut, Maximize, User, HelpCircle, Info,
  Sparkles, MessageSquare, BarChart3, Globe, Trash2, Key,
  ChevronRight, Search, Languages, FileText, LogIn, BookOpen, Columns, DollarSign,
  AlignJustify, Camera, Building2, MessageCircle, Brain, Smartphone, WifiOff, AppWindow
} from 'lucide-react';
import { useTabsStore } from '@/store/tabs';
import { useSettingsStore } from '@/store/settings';
import { useSidebarStore } from '@/store/sidebar';
import { useNavigationStore } from '@/store/navigation';
import { useHistoryStore } from '@/store/history';
import { useBookmarksStore } from '@/store/bookmarks';
import { useOfflineStore } from '@/store/offline';

interface BrowserMenuProps {
  onOpenHistory: () => void;
  onOpenBookmarks: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

export function BrowserMenu({ onOpenHistory, onOpenBookmarks, onOpenSettings, onOpenStats }: BrowserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [pwaInstallable, setPwaInstallable] = useState<any>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { createTab, activeTabId } = useTabsStore();
  const { settings, updateSettings } = useSettingsStore();
  const { openPanel, toggleSidebar } = useSidebarStore();
  const { navigate } = useNavigationStore();
  const { clearAll: clearHistory } = useHistoryStore();
  const { addBookmark } = useBookmarksStore();

  // Track PWA installable state
  useEffect(() => {
    const handleInstallable = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data && data.tabId === activeTabId) {
        setPwaInstallable(data);
      }
    };
    const handleCleared = () => setPwaInstallable(null);
    window.addEventListener('pwa:installable', handleInstallable);
    window.addEventListener('pwa:installable-cleared', handleCleared);
    return () => {
      window.removeEventListener('pwa:installable', handleInstallable);
      window.removeEventListener('pwa:installable-cleared', handleCleared);
    };
  }, [activeTabId]);

  // Hide WebContentsViews when menu opens, show when it closes
  useEffect(() => {
    if (isOpen) {
      window.osBrowser?.hideWebViews?.();
    } else {
      window.osBrowser?.showWebViews?.();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const MenuItem = ({ icon: Icon, label, shortcut, onClick, sub, disabled, badge }: {
    icon: any; label: string; shortcut?: string; onClick?: () => void; sub?: boolean; disabled?: boolean; badge?: string;
  }) => (
    <button
      onClick={() => { if (!disabled) { onClick?.(); if (!sub) close(); } }}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-[8px] text-left transition-colors duration-75
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-2 focus:outline-none focus:bg-surface-2'}
      `}
    >
      <Icon size={16} className="text-text-muted shrink-0" strokeWidth={1.5} />
      <span className="flex-1 text-[13px] text-text-primary">{label}</span>
      {badge && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>{badge}</span>}
      {shortcut && <span className="text-[11px] text-text-muted ml-4">{shortcut}</span>}
      {sub && <ChevronRight size={13} className="text-text-muted" />}
    </button>
  );

  const Separator = () => <div className="h-px my-1" style={{ background: 'var(--color-border-1)' }} />;

  const userName = settings?.display_name && settings.display_name !== 'User' ? settings.display_name : null;

  const currentUrl = useNavigationStore.getState().currentUrl;
  const currentTitle = useTabsStore.getState().tabs.find(t => t.id === activeTabId)?.title || '';

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-[30px] h-[30px] flex items-center justify-center rounded-md
          transition-all duration-150 ease-out
          hover:bg-surface-2 active:bg-surface-3
          focus:outline-none focus:ring-2 focus:ring-ghana-gold/50
          ${isOpen ? 'bg-surface-2' : ''}
        `}
        aria-label="Menu"
        title="Customize and control OS Browser"
      >
        <MoreVertical size={15} strokeWidth={1.8} className="text-text-secondary" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={close} />
          <div
            className="absolute top-[34px] right-0 w-[300px] py-2 rounded-xl border shadow-2xl z-[100] overflow-y-auto overflow-x-hidden"
            style={{
              background: 'var(--color-surface-1)',
              borderColor: 'var(--color-border-1)',
              maxHeight: 'min(calc(100vh - 60px), 600px)',
              scrollbarWidth: 'thin',
            }}
          >
            {/* New tab / window */}
            <MenuItem icon={Plus} label="New tab" shortcut="Ctrl+T" onClick={() => createTab()} />
            <MenuItem icon={Copy} label="New window" shortcut="Ctrl+N" onClick={() => {
              window.osBrowser?.newWindow?.();
            }} />
            <MenuItem icon={Shield} label="New private window" shortcut="Ctrl+Shift+N" onClick={() => {
              window.osBrowser?.newPrivateWindow?.();
            }} />
            <Separator />

            {/* User profile */}
            <div className="px-4 py-2.5 flex items-center gap-3">
              {userName ? (
                <>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: 'var(--color-accent)' }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-text-primary truncate">{userName}</div>
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--color-accent)', color: 'var(--color-btn-text, #fff)' }}>
                    Signed in
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface-2)' }}>
                    <User size={16} className="text-text-muted" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-[13px] font-medium text-text-primary">Guest</div>
                    <button
                      disabled
                      className="mt-1 flex items-center gap-2 px-2.5 py-1 rounded-md text-[12px] text-text-muted opacity-50 cursor-not-allowed"
                      style={{ background: 'var(--color-surface-2)' }}
                    >
                      <span>🔄 Sync Data</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-surface-3, var(--color-border-1))' }}>
                        Coming Soon
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Separator />

            {/* Core browser features */}
            <MenuItem icon={Key} label="Passwords and autofill" disabled badge="Coming Soon" />
            <MenuItem icon={Clock} label="History" shortcut="Ctrl+H" onClick={onOpenHistory} />
            <MenuItem icon={Download} label="Downloads" shortcut="Ctrl+J" onClick={() => {
              createTab('os-browser://downloads' as any);
            }} />
            <MenuItem icon={Star} label="Bookmarks and lists" shortcut="Ctrl+B" onClick={() => createTab('os-browser://bookmarks' as any)} sub />
            <MenuItem icon={FileText} label="Documents" onClick={() => createTab('os-browser://documents' as any)} />
            <MenuItem icon={Download} label={savedFeedback ? "\u2713 Saved!" : "Save Page Offline"} shortcut="Ctrl+Shift+S" onClick={() => {
              const navUrl = useNavigationStore.getState().currentUrl;
              if (!navUrl || navUrl.startsWith('os-browser://')) return;
              const allTabs = useTabsStore.getState().tabs;
              const curTab = allTabs.find(t => t.id === useTabsStore.getState().activeTabId);
              const pageTitle = curTab?.title || navUrl;
              const isGov = navUrl.includes('.gov.gh') || navUrl.includes('.edu.gh');
              let favicon: string | undefined;
              try { favicon = `${new URL(navUrl).origin}/favicon.ico`; } catch { /* ignore */ }
              useOfflineStore.getState().savePage({
                url: navUrl,
                title: pageTitle,
                category: isGov ? 'gov' : 'manual',
                content: `<html><head><title>${pageTitle}</title></head><body><p>Saved from ${navUrl}</p></body></html>`,
                favicon,
              });
              setSavedFeedback(true);
              setTimeout(() => setSavedFeedback(false), 2000);
            }} />
            <MenuItem icon={WifiOff} label="Offline Library" onClick={() => {
              createTab('os-browser://offline' as any);
            }} />
            {pwaInstallable && (
              <MenuItem icon={AppWindow} label={`Install ${pwaInstallable.shortName || pwaInstallable.name}...`} onClick={() => {
                window.dispatchEvent(new CustomEvent('pwa:show-install-prompt', { detail: pwaInstallable }));
              }} />
            )}
            <Separator />

            {/* AI features */}
            <MenuItem icon={MessageSquare} label="AI Assistant" shortcut="Ctrl+J" onClick={() => { close(); toggleSidebar(); }} />
            <MenuItem icon={Sparkles} label="AskOzzy" shortcut="Ctrl+Shift+O" onClick={() => { close(); openPanel('askozzy'); }} />
            <MenuItem icon={Columns} label="Split Screen" shortcut="Ctrl+Shift+S" onClick={() => {
              window.dispatchEvent(new CustomEvent('os-browser:split-screen'));
            }} />
            <MenuItem icon={DollarSign} label="GHS Currency & SSNIT Tools" onClick={() => {
              window.dispatchEvent(new CustomEvent('os-browser:currency-tools'));
            }} />
            <MenuItem icon={Smartphone} label="Mobile Money" onClick={() => {
              window.dispatchEvent(new CustomEvent('os-browser:mobile-money'));
            }} />
            <MenuItem icon={MessageCircle} label="Messages" shortcut="Ctrl+M" onClick={() => {
              window.dispatchEvent(new CustomEvent('os-browser:messaging'));
            }} />
            <MenuItem icon={Building2} label="Government Hub" onClick={() => {
              createTab('os-browser://gov' as any);
            }} />
            <MenuItem icon={Brain} label="Digital Assistant" onClick={() => {
              window.dispatchEvent(new CustomEvent('os-browser:literacy-assistant'));
            }} />
            <Separator />

            {/* Privacy */}
            <MenuItem icon={Trash2} label="Delete browsing data..." shortcut="Ctrl+Shift+Del" onClick={async () => {
              if (confirm('Delete all browsing history, cache, and cookies?')) {
                await clearHistory();
              }
            }} />
            <Separator />

            {/* Zoom */}
            <div className="px-4 py-[6px] flex items-center gap-2">
              <Search size={16} className="text-text-muted shrink-0" strokeWidth={1.5} />
              <span className="text-[13px] text-text-primary flex-1">Zoom</span>
              <div className="flex items-center gap-1">
                <button onClick={() => {
                  const newZoom = Math.max(25, zoom - 10);
                  setZoom(newZoom);
                  document.body.style.zoom = `${newZoom}%`;
                }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 transition-colors" aria-label="Zoom out">
                  <ZoomOut size={14} className="text-text-secondary" />
                </button>
                <span className="text-[12px] text-text-primary font-medium w-10 text-center">{zoom}%</span>
                <button onClick={() => {
                  const newZoom = Math.min(500, zoom + 10);
                  setZoom(newZoom);
                  document.body.style.zoom = `${newZoom}%`;
                }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 transition-colors" aria-label="Zoom in">
                  <ZoomIn size={14} className="text-text-secondary" />
                </button>
                <div className="w-px h-4 mx-1" style={{ background: 'var(--color-border-1)' }} />
                <button onClick={() => window.osBrowser?.fullscreen()} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 transition-colors" aria-label="Fullscreen">
                  <Maximize size={14} className="text-text-secondary" />
                </button>
              </div>
            </div>
            <Separator />

            {/* Utilities */}
            <MenuItem icon={Printer} label="Print..." shortcut="Ctrl+P" onClick={() => {
              // Ctrl+P is handled natively by Electron/Chromium
              window.print();
            }} />
            <MenuItem icon={Languages} label="Translation" onClick={() => {
              window.dispatchEvent(new CustomEvent('os-browser:translation-panel'));
            }} />
            <MenuItem icon={BookOpen} label="Twi Dictionary" onClick={() => {
              window.dispatchEvent(new CustomEvent('os-browser:twi-dictionary'));
            }} />
            <MenuItem icon={AlignJustify} label="Reading Mode" onClick={() => {
              window.dispatchEvent(new CustomEvent('os-browser:reading-mode'));
            }} />
            <MenuItem icon={Camera} label="Screenshot" onClick={() => {
              (window.osBrowser as any)?.captureScreenshot?.();
            }} />
            <MenuItem icon={FileText} label="Screenshot to Report" onClick={async () => {
              close();
              window.osBrowser?.showWebViews?.();
              await new Promise(r => setTimeout(r, 400));
              try {
                const result = await (window.osBrowser as any)?.captureScreenshotDataUrl?.();
                if (result?.dataUrl) {
                  window.dispatchEvent(new CustomEvent('os-browser:generate-report', {
                    detail: {
                      screenshotDataUrl: result.dataUrl,
                      url: currentUrl || '',
                      title: currentTitle || 'Untitled',
                      timestamp: Date.now(),
                    },
                  }));
                } else {
                  // Fallback: use regular screenshot and open report with placeholder
                  window.dispatchEvent(new CustomEvent('os-browser:generate-report', {
                    detail: {
                      screenshotDataUrl: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#f0f0f0"/><text x="200" y="150" text-anchor="middle" fill="#999" font-size="16">Screenshot preview unavailable</text></svg>'),
                      url: currentUrl || '',
                      title: currentTitle || 'Untitled',
                      timestamp: Date.now(),
                    },
                  }));
                }
              } catch {
                window.dispatchEvent(new CustomEvent('os-browser:generate-report', {
                  detail: {
                    screenshotDataUrl: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#f0f0f0"/><text x="200" y="150" text-anchor="middle" fill="#999" font-size="16">Screenshot preview unavailable</text></svg>'),
                    url: currentUrl || '',
                    title: currentTitle || 'Untitled',
                    timestamp: Date.now(),
                  },
                }));
              }
            }} />
            <MenuItem icon={FileText} label="Import bookmarks..." onClick={() => {
              (window.osBrowser?.bookmarks as any)?.import?.();
            }} />
            <MenuItem icon={FileText} label="Export bookmarks..." onClick={() => {
              window.osBrowser?.bookmarks?.export?.();
            }} />
            <Separator />

            {/* Feature Directory */}
            <MenuItem icon={Sparkles} label="Browse All Features" onClick={() => {
              createTab('os-browser://features' as any);
            }} />
            <Separator />

            {/* Settings & about */}
            <MenuItem icon={BarChart3} label="Data Dashboard" onClick={() => {
              createTab('os-browser://data' as any);
            }} />
            <MenuItem icon={BarChart3} label="Statistics" onClick={() => {
              createTab('os-browser://stats' as any);
            }} />
            <MenuItem icon={Settings} label="Settings" onClick={() => {
              createTab('os-browser://settings' as any);
            }} />
            <MenuItem icon={HelpCircle} label="Help" onClick={() => {
              createTab('os-browser://docs' as any);
            }} />
            <MenuItem icon={Info} label="About OS Browser" onClick={() => {
              createTab('os-browser://docs' as any);
            }} />
          </div>
        </>
      )}
    </div>
  );
}
