import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, X as XIcon, Star, Sparkles, MessageSquare, User, LogIn } from 'lucide-react';
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
  const { goBack, goForward, reload, stop } = useNavigationStore();
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
        {/* Bookmark star */}
        <NavButton
          onClick={() => {}}
          icon={<Star size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="Bookmark this page"
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
                  <div
                    className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ background: 'var(--color-surface-2)' }}
                  >
                    <User size={24} className="text-text-muted" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-text-primary">Sign in to OS Browser</h3>
                  <p className="text-[12px] text-text-muted mt-1">Sync your bookmarks, history, and settings</p>
                </div>

                {/* Google Sign In */}
                <button
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-border-1 hover:bg-surface-2 transition-colors duration-150 mb-2"
                  onClick={() => setShowLoginMenu(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-[13px] font-medium text-text-primary">Sign in with Google</span>
                </button>

                {/* Email sign in */}
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-btn-text, #fff)' }}
                  onClick={() => setShowLoginMenu(false)}
                >
                  <LogIn size={14} />
                  Sign in with Email
                </button>

                <p className="text-[11px] text-text-muted text-center mt-3">
                  Your data stays on your device by default
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
