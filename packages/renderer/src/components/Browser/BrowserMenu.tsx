import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical, Plus, Copy, Star, Clock, Download, Settings, Shield,
  Printer, ZoomIn, ZoomOut, Maximize, User, HelpCircle, Info,
  Sparkles, MessageSquare, BarChart3, Globe, Trash2, Key,
  ChevronRight, Search, Languages, FileText, LogIn, BookOpen
} from 'lucide-react';
import { useTabsStore } from '@/store/tabs';
import { useSettingsStore } from '@/store/settings';
import { useSidebarStore } from '@/store/sidebar';
import { useNavigationStore } from '@/store/navigation';
import { useHistoryStore } from '@/store/history';
import { useBookmarksStore } from '@/store/bookmarks';

interface BrowserMenuProps {
  onOpenHistory: () => void;
  onOpenBookmarks: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

export function BrowserMenu({ onOpenHistory, onOpenBookmarks, onOpenSettings, onOpenStats }: BrowserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const menuRef = useRef<HTMLDivElement>(null);
  const { createTab, activeTabId } = useTabsStore();
  const { settings, updateSettings } = useSettingsStore();
  const { openPanel, toggleSidebar } = useSidebarStore();
  const { navigate } = useNavigationStore();
  const { clearAll: clearHistory } = useHistoryStore();
  const { addBookmark } = useBookmarksStore();

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

  const MenuItem = ({ icon: Icon, label, shortcut, onClick, sub, disabled }: {
    icon: any; label: string; shortcut?: string; onClick?: () => void; sub?: boolean; disabled?: boolean;
  }) => (
    <button
      onClick={() => { onClick?.(); if (!sub) close(); }}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-[8px] text-left transition-colors duration-75
        hover:bg-surface-2 focus:outline-none focus:bg-surface-2
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      <Icon size={16} className="text-text-muted shrink-0" strokeWidth={1.5} />
      <span className="flex-1 text-[13px] text-text-primary">{label}</span>
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
            className="absolute top-[34px] right-0 w-[300px] py-2 rounded-xl border shadow-2xl z-[100] overflow-hidden overflow-y-auto"
            style={{
              background: 'var(--color-surface-1)',
              borderColor: 'var(--color-border-1)',
              maxHeight: 'calc(100vh - 80px)',
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
                    <div className="text-[11px] text-text-muted">Account sync coming soon</div>
                  </div>
                </div>
              )}
            </div>
            <Separator />

            {/* Core browser features */}
            <MenuItem icon={Key} label="Passwords and autofill" onClick={onOpenSettings} sub />
            <MenuItem icon={Clock} label="History" shortcut="Ctrl+H" onClick={onOpenHistory} />
            <MenuItem icon={Download} label="Downloads" shortcut="Ctrl+J" onClick={() => {
              if (activeTabId) navigate(activeTabId, 'os-browser://downloads');
            }} />
            <MenuItem icon={Star} label="Bookmarks and lists" shortcut="Ctrl+B" onClick={onOpenBookmarks} sub />
            <Separator />

            {/* AI features */}
            <MenuItem icon={MessageSquare} label="AI Assistant" shortcut="Ctrl+J" onClick={() => { close(); toggleSidebar(); }} />
            <MenuItem icon={Sparkles} label="AskOzzy" shortcut="Ctrl+Shift+O" onClick={() => { close(); openPanel('askozzy'); }} />
            <MenuItem icon={Globe} label="Government Portals" onClick={() => {
              if (activeTabId) navigate(activeTabId, 'os-browser://newtab');
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
                <button onClick={() => setZoom(Math.max(25, zoom - 10))} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 transition-colors" aria-label="Zoom out">
                  <ZoomOut size={14} className="text-text-secondary" />
                </button>
                <span className="text-[12px] text-text-primary font-medium w-10 text-center">{zoom}%</span>
                <button onClick={() => setZoom(Math.min(500, zoom + 10))} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 transition-colors" aria-label="Zoom in">
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
              // Print is handled via keyboard shortcut in Electron
            }} />
            <MenuItem icon={Languages} label="Translate to Twi" onClick={() => { close(); openPanel('ai'); }} />
            <MenuItem icon={FileText} label="Import bookmarks..." onClick={() => {
              window.osBrowser?.bookmarks?.list(); // Trigger import dialog in Electron
            }} />
            <Separator />

            {/* Settings & about */}
            <MenuItem icon={BarChart3} label="Statistics" onClick={onOpenStats} />
            <MenuItem icon={Settings} label="Settings" onClick={onOpenSettings} />
            <MenuItem icon={HelpCircle} label="Help" onClick={() => {
              if (activeTabId) navigate(activeTabId, 'https://github.com/ghwmelite-dotcom/OS-Browser');
            }} />
            <MenuItem icon={Info} label="About OS Browser" onClick={() => {
              alert('OS Browser v1.0.0\nGhana\'s AI-Powered Desktop Browser\n\nBuilt by OHCS\nPowered by Cloudflare Workers AI');
            }} />
          </div>
        </>
      )}
    </div>
  );
}
