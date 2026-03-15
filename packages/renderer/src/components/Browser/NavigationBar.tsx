import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, X as XIcon, Star, Sparkles, MessageSquare, User, Share, Target, DollarSign, BookOpen, AlignJustify } from 'lucide-react';
import { ScreenshotButton } from '@/components/ScreenshotTool';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { useSidebarStore } from '@/store/sidebar';
import { useSettingsStore } from '@/store/settings';
import { useFocusStore } from '@/store/focus';
import { FocusSettings } from '@/components/FocusMode';
import { OmniBar } from './OmniBar';
import { BrowserMenu } from './BrowserMenu';

function NavButton({
  onClick, disabled = false, icon, label, className = '',
}: {
  onClick: () => void; disabled?: boolean; icon: React.ReactNode; label: string; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-[32px] h-[32px] flex items-center justify-center rounded-full
        transition-all duration-100 hover:bg-surface-2 active:bg-surface-3
        disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent
        focus:outline-none focus:ring-2 focus:ring-ghana-gold/40 ${className}`}
      aria-label={label} title={label}
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
  const { canGoBack, canGoForward, isLoading, currentUrl } = useNavigationStore();
  const { goBack, goForward, reload, stop, navigate } = useNavigationStore();
  const { activeTabId } = useTabsStore();
  const { isOpen, toggleSidebar, openPanel, activePanel } = useSidebarStore();
  const { settings } = useSettingsStore();
  const focusActive = useFocusStore(s => s.isActive);

  // Track any open dropdown — hide WebContentsViews when ANY dropdown is open
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const toggleDropdown = (name: string) => {
    const newState = openDropdown === name ? null : name;
    setOpenDropdown(newState);
    if (newState) window.osBrowser?.hideWebViews?.();
    else window.osBrowser?.showWebViews?.();
  };
  const closeDropdown = () => {
    setOpenDropdown(null);
    window.osBrowser?.showWebViews?.();
  };

  // Profile form state
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');


  return (
    <div className="h-[44px] bg-surface-1 border-b border-border-1/50 flex items-center pl-3 pr-2 shrink-0 relative z-[50]">
      {/* ── Left: Nav buttons ── */}
      <div className="flex items-center gap-1 mr-3">
        <NavButton
          onClick={() => activeTabId && goBack(activeTabId)}
          disabled={!canGoBack}
          icon={<ArrowLeft size={16} strokeWidth={2} className="text-text-secondary" />}
          label="Go back (Alt+Left)"
        />
        <NavButton
          onClick={() => activeTabId && goForward(activeTabId)}
          disabled={!canGoForward}
          icon={<ArrowRight size={16} strokeWidth={2} className="text-text-secondary" />}
          label="Go forward (Alt+Right)"
        />
        <NavButton
          onClick={() => activeTabId && (isLoading ? stop(activeTabId) : reload(activeTabId))}
          icon={isLoading
            ? <XIcon size={16} strokeWidth={2} className="text-text-secondary" />
            : <RotateCw size={15} strokeWidth={2} className="text-text-secondary" />
          }
          label={isLoading ? 'Stop (Esc)' : 'Reload (F5)'}
        />
      </div>

      {/* ── Center: OmniBar ── */}
      <OmniBar />

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-[6px] ml-3">
        {/* Share */}
        <NavButton
          onClick={() => {
            if (currentUrl && currentUrl !== 'os-browser://newtab') {
              navigator.clipboard?.writeText(currentUrl);
            }
          }}
          icon={<Share size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="Copy link"
        />

        {/* Bookmark */}
        <NavButton
          onClick={async () => {
            const url = currentUrl;
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
          icon={<Sparkles size={15} strokeWidth={1.8} className={activePanel === 'askozzy' ? 'text-ghana-gold' : 'text-text-secondary'} />}
          label="AskOzzy (Ctrl+Shift+O)"
          className={activePanel === 'askozzy' ? 'bg-ghana-gold-dim' : ''}
        />

        {/* AI sidebar */}
        <button
          onClick={toggleSidebar}
          className={`w-[32px] h-[32px] flex items-center justify-center rounded-full transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-ghana-gold/40
            ${isOpen && activePanel === 'ai'
              ? 'bg-ghana-gold text-bg shadow-[0_0_8px_rgba(212,160,23,0.3)]'
              : 'hover:bg-surface-2 text-text-secondary'
            }`}
          aria-label="AI Assistant (Ctrl+J)" title="AI Assistant (Ctrl+J)"
        >
          <MessageSquare size={14} strokeWidth={1.8} />
        </button>

        {/* GHS Tools */}
        <NavButton
          onClick={() => window.dispatchEvent(new CustomEvent('os-browser:currency-tools'))}
          icon={<DollarSign size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="GHS Currency & SSNIT Tools"
        />

        {/* Twi Dictionary */}
        <NavButton
          onClick={() => window.dispatchEvent(new CustomEvent('os-browser:twi-dictionary'))}
          icon={<BookOpen size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="Twi Dictionary"
        />

        {/* Screenshot */}
        <ScreenshotButton />

        {/* Reading Mode */}
        <NavButton
          onClick={() => window.dispatchEvent(new CustomEvent('os-browser:reading-mode'))}
          icon={<AlignJustify size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="Reading Mode"
        />

        {/* Focus Mode */}
        <div className="relative">
          <NavButton
            onClick={() => {
              if (focusActive) {
                useFocusStore.getState().toggleFocus();
              } else {
                toggleDropdown('focus');
              }
            }}
            icon={<Target size={15} strokeWidth={1.8} className={focusActive ? 'text-ghana-gold' : 'text-text-secondary'} />}
            label="Focus Mode"
            className={focusActive ? 'bg-ghana-gold-dim' : ''}
          />
          {openDropdown === 'focus' && <FocusSettings onClose={closeDropdown} />}
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-border-1/40 mx-0.5" />

        {/* User / Profile */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('profile')}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-surface-2 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-ghana-gold/40"
            aria-label="Account" title="Account"
          >
            {settings?.email ? (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--color-accent)' }}>
                {(settings.display_name || settings.email).charAt(0).toUpperCase()}
              </div>
            ) : (
              <User size={16} strokeWidth={1.8} className="text-text-secondary" />
            )}
          </button>

          {/* Profile popup */}
          {openDropdown === 'profile' && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={closeDropdown} />
              <div
                className="absolute top-[36px] right-0 w-[300px] rounded-xl border shadow-2xl z-[100] overflow-y-auto"
                style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)', maxHeight: 'calc(100vh - 100px)' }}
              >
                {/* Header */}
                <div className="p-4 text-center border-b" style={{ borderColor: 'var(--color-border-1)' }}>
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}>
                    <svg width="24" height="24" viewBox="0 0 512 512">
                      <path d="M256 90L370 140V270Q370 370 256 430Q142 370 142 270V140Z" fill="white" opacity=".95"/>
                    </svg>
                  </div>
                  {settings?.email ? (
                    <>
                      <h3 className="text-[15px] font-bold text-text-primary">{settings.display_name}</h3>
                      <p className="text-[12px] text-text-muted mt-0.5">{settings.email}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-[15px] font-bold text-text-primary">Create Your Profile</h3>
                      <p className="text-[12px] text-text-muted mt-0.5">Personalize your browsing experience</p>
                    </>
                  )}
                </div>

                <div className="p-4">
                  {settings?.email ? (
                    /* Already has a profile — show info + sign out */
                    <div>
                      <div className="flex items-center gap-3 p-3 rounded-lg mb-3" style={{ background: 'var(--color-surface-2)' }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold text-white" style={{ background: 'var(--color-accent)' }}>
                          {(settings.display_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-text-primary">{settings.display_name}</p>
                          <p className="text-[11px] text-text-muted">{settings.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          await window.osBrowser.settings.update({ display_name: 'User', email: '' });
                          useSettingsStore.getState().loadSettings();
                          closeDropdown();
                        }}
                        className="w-full py-2 rounded-lg text-[12px] font-medium border hover:bg-surface-2 transition-colors"
                        style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    /* No profile — create one */
                    <div>
                      <div className="mb-3">
                        <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Your Name</label>
                        <input
                          type="text" value={profileName} onChange={e => setProfileName(e.target.value)}
                          placeholder="e.g. Ozzy"
                          className="w-full px-3 py-2 rounded-lg text-[13px] outline-none border"
                          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
                          autoFocus
                        />
                      </div>
                      <div className="mb-4">
                        <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Email (optional)</label>
                        <input
                          type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full px-3 py-2 rounded-lg text-[13px] outline-none border"
                          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
                        />
                      </div>
                      <button
                        onClick={async () => {
                          if (!profileName.trim()) return;
                          await window.osBrowser.settings.update({
                            display_name: profileName.trim(),
                            email: profileEmail.trim() || null,
                          });
                          useSettingsStore.getState().loadSettings();
                          setProfileName('');
                          setProfileEmail('');
                          closeDropdown();
                        }}
                        disabled={!profileName.trim()}
                        className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40"
                        style={{ background: 'var(--color-accent)', color: '#fff' }}
                      >
                        Create Profile
                      </button>
                    </div>
                  )}
                </div>

                <div className="px-4 pb-3">
                  <p className="text-[10px] text-text-muted text-center">
                    Your profile is stored locally on this device.
                  </p>
                </div>
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

