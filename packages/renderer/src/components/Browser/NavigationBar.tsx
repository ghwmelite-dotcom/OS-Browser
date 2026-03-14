import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, X as XIcon, Star, Sparkles, MessageSquare, User, LogIn, Share, ExternalLink } from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { useSidebarStore } from '@/store/sidebar';
import { useSettingsStore } from '@/store/settings';
import { OmniBar } from './OmniBar';
import { BrowserMenu } from './BrowserMenu';

function NavButton({
  onClick,
  disabled = false,
  icon,
  label,
  className = '',
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-[30px] h-[30px] flex items-center justify-center rounded-md
        transition-all duration-150 ease-out
        hover:bg-surface-2 active:bg-surface-3
        disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent
        focus:outline-none focus:ring-2 focus:ring-ghana-gold/50
        ${className}
      `}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

interface NavigationBarProps {
  onOpenHistory: () => void;
  onOpenBookmarks: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

export function NavigationBar({ onOpenHistory, onOpenBookmarks, onOpenSettings, onOpenStats }: NavigationBarProps) {
  const { canGoBack, canGoForward, isLoading } = useNavigationStore();
  const { goBack, goForward, reload, stop, navigate } = useNavigationStore();
  const { activeTabId } = useTabsStore();
  const { isOpen, toggleSidebar, openPanel, activePanel } = useSidebarStore();
  const { settings } = useSettingsStore();
  const [showLoginMenu, setShowLoginMenu] = useState(false);

  return (
    <div className="h-11 bg-surface-1 border-b border-border-1/60 flex items-center gap-1 px-2 shrink-0">
      {/* Navigation button group */}
      <div className="flex items-center gap-[3px]">
        <NavButton
          onClick={() => activeTabId && goBack(activeTabId)}
          disabled={!canGoBack}
          icon={<ArrowLeft size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="Go back"
        />
        <NavButton
          onClick={() => activeTabId && goForward(activeTabId)}
          disabled={!canGoForward}
          icon={<ArrowRight size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="Go forward"
        />
        <NavButton
          onClick={() => activeTabId && (isLoading ? stop(activeTabId) : reload(activeTabId))}
          icon={
            isLoading ? (
              <XIcon size={14} strokeWidth={1.8} className="text-text-secondary" />
            ) : (
              <RotateCw size={13} strokeWidth={1.8} className="text-text-secondary" />
            )
          }
          label={isLoading ? 'Stop loading' : 'Reload'}
        />
      </div>

      {/* Subtle separator */}
      <div className="w-px h-4 bg-border-1/50 mx-1" />

      {/* OmniBar */}
      <OmniBar />

      {/* Right side actions */}
      <div className="flex items-center gap-[3px] ml-1">
        {/* Share / Open in external */}
        <NavButton
          onClick={() => {
            const url = useNavigationStore.getState().currentUrl;
            if (url && url !== 'os-browser://newtab') {
              navigator.clipboard?.writeText(url);
            }
          }}
          icon={<Share size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="Share or copy link"
        />

        {/* Bookmark star */}
        <NavButton
          onClick={async () => {
            const url = useNavigationStore.getState().currentUrl;
            const title = useTabsStore.getState().tabs.find(t => t.id === activeTabId)?.title || url;
            if (url && url !== 'os-browser://newtab') {
              const isBookmarked = await window.osBrowser.bookmarks.isBookmarked(url);
              if (!isBookmarked) {
                await window.osBrowser.bookmarks.add({ url, title });
              }
            }
          }}
          icon={<Star size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="Bookmark this page (Ctrl+D)"
        />

        {/* AskOzzy */}
        <NavButton
          onClick={() => openPanel(activePanel === 'askozzy' ? 'none' : 'askozzy')}
          icon={
            <Sparkles
              size={15}
              strokeWidth={1.8}
              className={activePanel === 'askozzy' ? 'text-ghana-gold' : 'text-text-secondary'}
            />
          }
          label="AskOzzy"
          className={activePanel === 'askozzy' ? 'bg-ghana-gold-dim' : ''}
        />

        {/* AI sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className={`
            w-[30px] h-[30px] flex items-center justify-center rounded-full
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-ghana-gold/50
            ${isOpen && activePanel === 'ai'
              ? 'bg-ghana-gold text-bg shadow-[0_0_10px_rgba(212,160,23,0.35)]'
              : 'bg-surface-3/60 text-text-secondary hover:bg-surface-3 hover:text-text-primary'
            }
          `}
          aria-label="Toggle AI sidebar"
          title="AI Assistant (Ctrl+J)"
        >
          <MessageSquare size={13} strokeWidth={1.8} />
        </button>

        {/* Separator before user/menu */}
        <div className="w-px h-4 bg-border-1/50 mx-1" />

        {/* User avatar / Sign in */}
        <div className="relative">
          <button
            onClick={() => setShowLoginMenu(!showLoginMenu)}
            className="w-[30px] h-[30px] flex items-center justify-center rounded-full hover:bg-surface-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ghana-gold/50"
            aria-label="Sign in"
            title={settings?.display_name ? settings.display_name : 'Sign in'}
          >
            {settings?.display_name && settings.display_name !== 'User' ? (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: 'var(--color-accent)' }}
              >
                {settings.display_name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <User size={15} strokeWidth={1.8} className="text-text-secondary" />
            )}
          </button>

          {/* Login dropdown */}
          {showLoginMenu && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={() => setShowLoginMenu(false)} />
              <div
                className="absolute top-[34px] right-0 w-[280px] p-4 rounded-xl border border-border-1 shadow-2xl z-[100]"
                style={{ background: 'var(--color-surface-1)' }}
              >
                <div className="text-center mb-4">
                  {/* OS Browser icon */}
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}>
                    <svg width="28" height="28" viewBox="0 0 512 512">
                      <path d="M256 90L370 140V270Q370 370 256 430Q142 370 142 270V140Z" fill="white" stroke="#000" strokeWidth="4" opacity=".95"/>
                      <text x="256" y="310" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="900" fontSize="160" fill="#0f1117" letterSpacing="-8">OS</text>
                    </svg>
                  </div>
                  <h3 className="text-[14px] font-semibold text-text-primary">OS Browser Account</h3>
                  <p className="text-[12px] text-text-muted mt-1 leading-relaxed">Sign in to sync bookmarks and settings across devices. The browser is completely free without an account.</p>
                </div>

                {/* Coming soon notice */}
                <div
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[13px] font-medium border"
                  style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}
                >
                  <User size={14} />
                  Account sync coming soon
                </div>

                <p className="text-[11px] text-text-muted text-center mt-3">
                  No account needed — all features work offline and for free
                </p>
              </div>
            </>
          )}
        </div>

        {/* 3-dot menu */}
        <BrowserMenu
          onOpenHistory={onOpenHistory}
          onOpenBookmarks={onOpenBookmarks}
          onOpenSettings={onOpenSettings}
          onOpenStats={onOpenStats}
        />
      </div>
    </div>
  );
}
