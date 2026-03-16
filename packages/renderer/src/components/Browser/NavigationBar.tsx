import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, X as XIcon, User, Share, MonitorDown, Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { useSettingsStore } from '@/store/settings';
import { OmniBar } from './OmniBar';
import { BrowserMenu } from './BrowserMenu';
import { KenteToolbar } from '../KenteSystem/KenteToolbar';

// Auto-generated avatar colors based on name hash
const AVATAR_COLORS = [
  'linear-gradient(135deg, #CE1126 0%, #FCD116 100%)', // Ghana red-gold
  'linear-gradient(135deg, #006B3F 0%, #FCD116 100%)', // Ghana green-gold
  'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', // Purple
  'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)', // Pink
  'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)', // Blue
  'linear-gradient(135deg, #f97316 0%, #eab308 100%)', // Orange
  'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', // Teal
  'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', // Violet
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.charAt(0).toUpperCase();
}

// Reusable avatar component — shows photo if available, otherwise generated initials
function ProfileAvatar({ name, avatarPath, avatarColor, size = 72, editable = false, onChangePhoto }: {
  name: string; avatarPath?: string | null; avatarColor?: string | null; size?: number; editable?: boolean; onChangePhoto?: () => void;
}) {
  const initials = getInitials(name || 'U');
  const bgColor = avatarColor || getAvatarColor(name || 'User');
  const fontSize = size < 40 ? size * 0.4 : size * 0.38;

  return (
    <div className="relative group" style={{ width: size, height: size }}>
      {avatarPath ? (
        <img src={avatarPath} alt={name}
          className="rounded-full object-cover shadow-lg"
          style={{ width: size, height: size }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="rounded-full flex items-center justify-center font-bold text-white shadow-lg"
          style={{ width: size, height: size, background: bgColor, fontSize }}>
          {initials}
        </div>
      )}
      {editable && onChangePhoto && (
        <button onClick={onChangePhoto}
          className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <span className="text-white text-[10px] font-medium">Change</span>
        </button>
      )}
    </div>
  );
}

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
  const { goBack, goForward, reload, stop } = useNavigationStore();
  const { activeTabId } = useTabsStore();
  const { settings } = useSettingsStore();

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

  // PWA installable state
  const [pwaInstallable, setPwaInstallable] = useState<any>(null);

  useEffect(() => {
    const handleInstallable = (e: Event) => {
      const data = (e as CustomEvent).detail;
      // Only show if the installable tab matches the active tab
      if (data && data.tabId === useTabsStore.getState().activeTabId) {
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
  }, []);

  // ── Ad Block Shield state ──
  const [shieldStatus, setShieldStatus] = useState<{
    enabled: boolean;
    siteEnabled: boolean;
    isGovSite: boolean;
    isUserWhitelisted: boolean;
    totalBlocked: number;
    hostname: string;
  }>({ enabled: true, siteEnabled: true, isGovSite: false, isUserWhitelisted: false, totalBlocked: 0, hostname: '' });

  const refreshShieldStatus = useCallback(async () => {
    try {
      const osBrowser = (window as any).osBrowser;
      if (!osBrowser?.adblock) return;
      const [status, countResult] = await Promise.all([
        osBrowser.adblock.getStatus(),
        osBrowser.adblock.getBlockedCount(),
      ]);
      let hostname = '';
      let siteInfo = { enabled: true, isGovSite: false, isUserWhitelisted: false };
      if (currentUrl && !currentUrl.startsWith('os-browser://')) {
        try {
          hostname = new URL(currentUrl).hostname;
          siteInfo = await osBrowser.adblock.isSiteEnabled(hostname);
        } catch {}
      }
      setShieldStatus({
        enabled: status.enabled,
        siteEnabled: siteInfo.enabled,
        isGovSite: siteInfo.isGovSite,
        isUserWhitelisted: siteInfo.isUserWhitelisted,
        totalBlocked: countResult.totalBlocked || 0,
        hostname,
      });
    } catch {}
  }, [currentUrl]);

  useEffect(() => { refreshShieldStatus(); }, [refreshShieldStatus]);

  const handleToggleGlobal = async () => {
    try {
      await (window as any).osBrowser?.adblock?.toggleGlobal();
      await refreshShieldStatus();
    } catch {}
  };

  const handleToggleSite = async () => {
    if (!shieldStatus.hostname) return;
    try {
      await (window as any).osBrowser?.adblock?.toggleSite(shieldStatus.hostname);
      await refreshShieldStatus();
    } catch {}
  };

  // Profile form state
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileView, setProfileView] = useState<'main' | 'edit' | 'customize' | 'add'>('main');
  const [showCopied, setShowCopied] = useState(false);


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
      <div className="flex items-center gap-1 ml-3">
        {/* Kente Toolbar — contextual page actions (Screenshot, Save Offline, Translate, Lite Mode) */}
        <KenteToolbar />

        {/* Share — with copy feedback */}
        <div className="relative">
          <NavButton
            onClick={() => {
              if (currentUrl && currentUrl !== 'os-browser://newtab') {
                navigator.clipboard?.writeText(currentUrl);
                setShowCopied(true);
                setTimeout(() => setShowCopied(false), 1500);
              }
            }}
            icon={<Share size={15} strokeWidth={1.8} className="text-text-secondary" />}
            label="Copy link"
          />
          {showCopied && (
            <div className="absolute top-[36px] left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap z-50 shadow-lg"
              style={{ background: 'var(--color-accent)', color: '#fff' }}>
              Link copied!
            </div>
          )}
        </div>

        {/* Shield — Ad Blocker status */}
        <div className="relative">
          <button
            onClick={() => { refreshShieldStatus(); toggleDropdown('shield'); }}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-surface-2 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-ghana-gold/40 relative"
            aria-label="Ad Blocker Shield" title="Ad Blocker Shield"
          >
            {shieldStatus.enabled && shieldStatus.siteEnabled ? (
              <ShieldCheck size={16} strokeWidth={1.8} style={{ color: '#FCD116' }} />
            ) : shieldStatus.enabled ? (
              <Shield size={16} strokeWidth={1.8} className="text-text-muted" />
            ) : (
              <ShieldOff size={16} strokeWidth={1.8} className="text-text-muted opacity-50" />
            )}
            {shieldStatus.totalBlocked > 0 && shieldStatus.enabled && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold text-white px-0.5"
                style={{ background: '#FCD116', color: '#1a1a1a' }}>
                {shieldStatus.totalBlocked > 999 ? '999+' : shieldStatus.totalBlocked}
              </span>
            )}
          </button>

          {openDropdown === 'shield' && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={closeDropdown} />
              <div
                className="absolute top-[36px] right-0 w-[300px] rounded-2xl border shadow-2xl z-[100] overflow-hidden"
                style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
              >
                {/* Header */}
                <div className="px-5 pt-5 pb-4 text-center" style={{ background: 'var(--color-surface-2)' }}>
                  <div className="flex justify-center mb-2">
                    {shieldStatus.enabled ? (
                      <ShieldCheck size={32} style={{ color: '#FCD116' }} />
                    ) : (
                      <ShieldOff size={32} className="text-text-muted" />
                    )}
                  </div>
                  <h3 className="text-[15px] font-bold text-text-primary">
                    {shieldStatus.enabled ? 'Shields Up' : 'Shields Down'}
                  </h3>
                  <p className="text-[12px] text-text-muted mt-0.5">
                    {shieldStatus.totalBlocked > 0
                      ? `${shieldStatus.totalBlocked.toLocaleString()} trackers & ads blocked`
                      : 'Protecting your browsing'}
                  </p>
                </div>

                {/* Controls */}
                <div className="py-3 px-5">
                  {/* Global toggle */}
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[13px] text-text-primary font-medium">Global protection</span>
                    <button
                      onClick={handleToggleGlobal}
                      className="w-[44px] h-[24px] rounded-full transition-all duration-200 relative"
                      style={{
                        background: shieldStatus.enabled ? '#FCD116' : 'var(--color-surface-3)',
                      }}
                    >
                      <div className="absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white shadow transition-all duration-200"
                        style={{ left: shieldStatus.enabled ? '22px' : '2px' }} />
                    </button>
                  </div>

                  {/* Per-site toggle */}
                  {shieldStatus.hostname && !shieldStatus.isGovSite && (
                    <>
                      <div className="h-px my-1" style={{ background: 'var(--color-border-1)' }} />
                      <div className="flex items-center justify-between py-2.5">
                        <div>
                          <span className="text-[13px] text-text-primary font-medium block">Site shield</span>
                          <span className="text-[11px] text-text-muted">{shieldStatus.hostname}</span>
                        </div>
                        <button
                          onClick={handleToggleSite}
                          className="w-[44px] h-[24px] rounded-full transition-all duration-200 relative"
                          style={{
                            background: shieldStatus.siteEnabled ? '#FCD116' : 'var(--color-surface-3)',
                          }}
                        >
                          <div className="absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white shadow transition-all duration-200"
                            style={{ left: shieldStatus.siteEnabled ? '22px' : '2px' }} />
                        </button>
                      </div>
                    </>
                  )}

                  {/* Gov site badge */}
                  {shieldStatus.isGovSite && (
                    <>
                      <div className="h-px my-1" style={{ background: 'var(--color-border-1)' }} />
                      <div className="flex items-center gap-2.5 py-2.5">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[12px]"
                          style={{ background: 'linear-gradient(135deg, #CE1126 0%, #006B3F 50%, #FCD116 100%)' }}>
                          <span className="text-white font-bold text-[9px]">GH</span>
                        </div>
                        <div>
                          <span className="text-[12px] text-text-primary font-medium block">Government site</span>
                          <span className="text-[10px] text-text-muted">Shields relaxed for .gov.gh domains</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-4">
                  <p className="text-[10px] text-text-muted text-center">
                    Powered by Ghostery engine with EasyList filters
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Thin separator */}
        <div className="w-px h-4 mx-1" style={{ background: 'var(--color-border-2)' }} />

        {/* User / Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileView('main'); toggleDropdown('profile'); }}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-surface-2 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-ghana-gold/40"
            aria-label="Account" title="Account"
          >
            {settings?.email ? (
              <ProfileAvatar name={settings.display_name || 'U'} avatarPath={settings.avatar_path} avatarColor={(settings as any).avatar_color} size={26} />
            ) : (
              <User size={16} strokeWidth={1.8} className="text-text-secondary" />
            )}
          </button>

          {/* Profile popup — Chrome-style */}
          {openDropdown === 'profile' && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={closeDropdown} />
              <div
                className="absolute top-[36px] right-0 w-[340px] rounded-2xl border shadow-2xl z-[100] overflow-hidden"
                style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)', maxHeight: 'calc(100vh - 100px)' }}
              >
                {settings?.email ? (
                  /* ── Signed in view ── */
                  <>
                    {/* Large profile header */}
                    <div className="px-6 pt-6 pb-5 text-center" style={{ background: 'var(--color-surface-2)' }}>
                      {/* Hidden file input for photo upload — compresses to 128x128 */}
                      <input type="file" id="avatar-upload" accept="image/*" className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            // Compress image to 128x128 to keep data URL small
                            const img = new Image();
                            img.onload = async () => {
                              const canvas = document.createElement('canvas');
                              canvas.width = 128;
                              canvas.height = 128;
                              const ctx = canvas.getContext('2d')!;
                              // Draw centered/cropped square
                              const s = Math.min(img.width, img.height);
                              const sx = (img.width - s) / 2;
                              const sy = (img.height - s) / 2;
                              ctx.drawImage(img, sx, sy, s, s, 0, 0, 128, 128);
                              const smallDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                              await useSettingsStore.getState().updateSettings({ avatar_path: smallDataUrl });
                            };
                            img.src = URL.createObjectURL(file);
                          } catch {}
                        }}
                      />
                      <div className="flex justify-center mb-3">
                        <ProfileAvatar
                          name={settings.display_name || 'U'}
                          avatarPath={settings.avatar_path}
                          avatarColor={(settings as any).avatar_color}
                          size={80}
                          editable
                          onChangePhoto={() => document.getElementById('avatar-upload')?.click()}
                        />
                      </div>
                      <h3 className="text-[16px] font-bold text-text-primary">{settings.display_name}</h3>
                      <p className="text-[12px] text-text-muted mt-0.5">{settings.email}</p>
                    </div>

                    {profileView === 'main' && (
                      <>
                        {/* Menu items */}
                        <div className="py-2 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
                          <button onClick={() => { setProfileView('edit'); setProfileName(settings.display_name || ''); setProfileEmail(settings.email || ''); }}
                            className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2 transition-colors">
                            <span className="text-[15px] w-5 text-center">⚙️</span>
                            <span className="text-[13px] text-text-primary">Manage your profile</span>
                          </button>
                          <button onClick={() => setProfileView('customize')}
                            className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2 transition-colors">
                            <span className="text-[15px] w-5 text-center">✏️</span>
                            <span className="text-[13px] text-text-primary">Customize profile</span>
                          </button>
                          <button onClick={() => { closeDropdown(); useTabsStore.getState().createTab('os-browser://settings'); }}
                            className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2 transition-colors">
                            <span className="text-[15px] w-5 text-center">🔑</span>
                            <span className="text-[13px] text-text-primary">Passwords and autofill</span>
                          </button>
                        </div>

                        {/* Sign out */}
                        <div className="py-2 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
                          <button onClick={async () => {
                              await useSettingsStore.getState().updateSettings({ display_name: 'User', email: '', avatar_path: null });
                              closeDropdown();
                            }}
                            className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2 transition-colors">
                            <span className="text-[15px] w-5 text-center">🚪</span>
                            <span className="text-[13px] text-text-primary">Sign out of OS Browser</span>
                          </button>
                        </div>

                        {/* Other profiles */}
                        <div className="py-2">
                          <p className="px-5 py-1.5 text-[12px] font-bold text-text-primary">Other profiles</p>
                          <button onClick={() => { closeDropdown(); window.osBrowser?.newWindow?.(); }}
                            className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2 transition-colors">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#6366f1' }}>G</div>
                            <span className="text-[13px] text-text-primary">Guest</span>
                          </button>
                          <div className="h-px my-1" style={{ background: 'var(--color-border-1)' }} />
                          <button onClick={() => setProfileView('add')}
                            className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2 transition-colors">
                            <span className="text-[15px] w-5 text-center">👤</span>
                            <span className="text-[13px]" style={{ color: 'var(--color-accent)' }}>Add a profile</span>
                          </button>
                          <button onClick={() => { closeDropdown(); window.osBrowser?.newPrivateWindow?.(); }}
                            className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2 transition-colors">
                            <span className="text-[15px] w-5 text-center">🕵️</span>
                            <span className="text-[13px] text-text-primary">Open Guest profile</span>
                          </button>
                        </div>
                      </>
                    )}

                    {/* ── Edit Profile View ── */}
                    {profileView === 'edit' && (
                      <div className="p-5">
                        <button onClick={() => setProfileView('main')} className="text-[12px] text-text-muted hover:text-text-secondary mb-4 flex items-center gap-1">
                          ← Back
                        </button>
                        <h4 className="text-[14px] font-bold text-text-primary mb-4">Edit Profile</h4>
                        <div className="mb-3">
                          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Display Name</label>
                          <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none border"
                            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }} />
                        </div>
                        <div className="mb-4">
                          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Email</label>
                          <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none border"
                            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }} />
                        </div>
                        <button onClick={async () => {
                            if (!profileName.trim()) return;
                            await useSettingsStore.getState().updateSettings({ display_name: profileName.trim(), email: profileEmail.trim() || null });
                            setProfileView('main');
                          }}
                          disabled={!profileName.trim()}
                          className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40"
                          style={{ background: 'var(--color-accent)', color: '#fff' }}>
                          Save Changes
                        </button>
                      </div>
                    )}

                    {/* ── Customize Profile View ── */}
                    {profileView === 'customize' && (
                      <div className="p-5">
                        <button onClick={() => setProfileView('main')} className="text-[12px] text-text-muted hover:text-text-secondary mb-4 flex items-center gap-1">
                          ← Back
                        </button>
                        <h4 className="text-[14px] font-bold text-text-primary mb-4">Customize Profile</h4>

                        {/* Avatar change */}
                        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">Profile Photo</p>
                        <div className="flex items-center gap-4 mb-5">
                          <ProfileAvatar name={settings.display_name || 'U'} avatarPath={settings.avatar_path} avatarColor={(settings as any).avatar_color} size={56} />
                          <div className="flex flex-col gap-1.5">
                            <button onClick={() => document.getElementById('avatar-upload')?.click()}
                              className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                              style={{ background: 'var(--color-accent)', color: '#fff' }}>
                              Upload Photo
                            </button>
                            {settings.avatar_path && (
                              <button onClick={async () => {
                                  await useSettingsStore.getState().updateSettings({ avatar_path: null });
                                }}
                                className="px-3 py-1.5 rounded-lg text-[12px] font-medium border hover:bg-surface-2"
                                style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}>
                                Remove Photo
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Theme color for avatar */}
                        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">Avatar Color</p>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {AVATAR_COLORS.map((color, i) => (
                            <button key={i} onClick={async () => {
                              // Set this color as the avatar color and remove any custom photo
                              await useSettingsStore.getState().updateSettings({ avatar_path: null, avatar_color: color });
                            }}
                              className="w-full aspect-square rounded-xl hover:scale-110 transition-transform border-2"
                              style={{
                                background: color,
                                borderColor: (settings as any).avatar_color === color ? 'var(--color-text-primary)' : 'transparent',
                              }} />
                          ))}
                        </div>

                        <p className="text-[10px] text-text-muted text-center">
                          Select a color for your avatar background
                        </p>
                      </div>
                    )}

                    {/* ── Add Profile View ── */}
                    {profileView === 'add' && (
                      <div className="p-5">
                        <button onClick={() => setProfileView('main')} className="text-[12px] text-text-muted hover:text-text-secondary mb-4 flex items-center gap-1">
                          ← Back
                        </button>
                        <h4 className="text-[14px] font-bold text-text-primary mb-2">Add a Profile</h4>
                        <p className="text-[12px] text-text-muted mb-4">Create a separate browsing profile with its own bookmarks and history.</p>

                        <div className="mb-3">
                          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Profile Name</label>
                          <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)}
                            placeholder="e.g. Work, Personal"
                            className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none border"
                            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
                            autoFocus />
                        </div>
                        <button onClick={() => {
                            if (!profileName.trim()) return;
                            // Open a new window as a separate profile
                            window.osBrowser?.newWindow?.();
                            setProfileName('');
                            closeDropdown();
                          }}
                          disabled={!profileName.trim()}
                          className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40"
                          style={{ background: 'var(--color-accent)', color: '#fff' }}>
                          Create & Open Profile
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* ── Not signed in view ── */
                  <>
                    <div className="px-6 pt-6 pb-5 text-center" style={{ background: 'var(--color-surface-2)' }}>
                      <div className="w-[72px] h-[72px] rounded-full mx-auto mb-3 flex items-center justify-center"
                        style={{ background: 'var(--color-surface-3)' }}>
                        <User size={32} className="text-text-muted" />
                      </div>
                      <h3 className="text-[16px] font-bold text-text-primary">Set Up Your Profile</h3>
                      <p className="text-[12px] text-text-muted mt-1">Personalize your OS Browser experience</p>
                    </div>

                    <div className="p-5">
                      <div className="mb-3">
                        <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Your Name</label>
                        <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)}
                          placeholder="e.g. Ozzy" autoFocus
                          className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none border"
                          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }} />
                      </div>
                      <div className="mb-4">
                        <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Email (optional)</label>
                        <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none border"
                          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }} />
                      </div>
                      <button onClick={async () => {
                          if (!profileName.trim()) return;
                          await window.osBrowser.settings.update({ display_name: profileName.trim(), email: profileEmail.trim() || null });
                          useSettingsStore.getState().loadSettings();
                          setProfileName(''); setProfileEmail('');
                          closeDropdown();
                        }}
                        disabled={!profileName.trim()}
                        className="w-full py-2.5 rounded-lg text-[14px] font-semibold transition-all disabled:opacity-40"
                        style={{ background: 'var(--color-accent)', color: '#fff' }}>
                        Create Profile
                      </button>
                    </div>

                    <div className="px-5 pb-4">
                      <p className="text-[10px] text-text-muted text-center">Your profile is stored locally on this device. Free forever.</p>
                    </div>
                  </>
                )}
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

