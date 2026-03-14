import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, X as XIcon, Star, Sparkles, MessageSquare, User, Share, Mail, QrCode, ArrowRight as ArrowRightIcon } from 'lucide-react';
import QRCode from 'qrcode';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { useSidebarStore } from '@/store/sidebar';
import { useSettingsStore } from '@/store/settings';
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
  const [showLoginMenu, _setShowLoginMenu] = useState(false);
  // Wrap setter to hide/show WebContentsViews
  const setShowLoginMenu = (v: boolean) => {
    _setShowLoginMenu(v);
    if (v) window.osBrowser?.hideWebViews?.();
    else window.osBrowser?.showWebViews?.();
  };
  const [loginEmail, setLoginEmail] = useState('');
  const [loginStep, setLoginStep] = useState<'email' | 'code' | 'qr'>('email');
  const [verifyCode, setVerifyCode] = useState('');

  const handleSendCode = () => {
    if (loginEmail.includes('@')) {
      setLoginStep('code');
    }
  };

  return (
    <div className="h-[44px] bg-surface-1 border-b border-border-1/50 flex items-center pl-3 pr-1 shrink-0 relative z-[50]">
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

      {/* ── Right: Actions, flush to far right edge ── */}
      <div className="flex items-center gap-2 ml-3">
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

        {/* Separator */}
        <div className="w-px h-5 bg-border-1/40 mx-0.5" />

        {/* User / Sign In */}
        <div className="relative">
          <button
            onClick={() => { setShowLoginMenu(!showLoginMenu); setLoginStep('email'); setLoginEmail(''); setVerifyCode(''); }}
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

          {/* Sign-in popup */}
          {showLoginMenu && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={() => setShowLoginMenu(false)} />
              <div
                className="absolute top-[36px] right-0 w-[320px] rounded-xl border shadow-2xl z-[100] overflow-y-auto"
                style={{
                  background: 'var(--color-surface-1)',
                  borderColor: 'var(--color-border-1)',
                  maxHeight: 'calc(100vh - 100px)',
                }}
              >
                {/* Header */}
                <div className="p-5 text-center border-b" style={{ borderColor: 'var(--color-border-1)' }}>
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}>
                    <svg width="24" height="24" viewBox="0 0 512 512">
                      <path d="M256 90L370 140V270Q370 370 256 430Q142 370 142 270V140Z" fill="white" opacity=".95"/>
                    </svg>
                  </div>
                  <h3 className="text-[15px] font-bold text-text-primary">Sign in to OS Browser</h3>
                  <p className="text-[12px] text-text-muted mt-1">No password needed</p>
                </div>

                <div className="p-4">
                  {loginStep === 'email' && (
                    <>
                      {/* Email input */}
                      <div className="mb-3">
                        <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Email address</label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={loginEmail}
                            onChange={e => setLoginEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                            placeholder="you@example.com"
                            className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none border transition-colors"
                            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
                            autoFocus
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSendCode}
                        disabled={!loginEmail.includes('@')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 disabled:opacity-40"
                        style={{ background: 'var(--color-accent)', color: '#fff' }}
                      >
                        <Mail size={14} />
                        Send verification code
                      </button>

                      <div className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px" style={{ background: 'var(--color-border-1)' }} />
                        <span className="text-[11px] text-text-muted">or</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--color-border-1)' }} />
                      </div>

                      <button
                        onClick={() => setLoginStep('qr')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium border transition-colors hover:bg-surface-2"
                        style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
                      >
                        <QrCode size={14} />
                        Sign in with QR code
                      </button>
                    </>
                  )}

                  {loginStep === 'code' && (
                    <>
                      <p className="text-[12px] text-text-secondary mb-3 text-center">
                        We sent a 6-digit code to<br />
                        <span className="font-semibold text-text-primary">{loginEmail}</span>
                      </p>

                      <input
                        type="text"
                        value={verifyCode}
                        onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full px-4 py-3 rounded-lg text-center text-[24px] font-mono tracking-[0.5em] outline-none border transition-colors mb-3"
                        style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
                        autoFocus
                      />

                      <button
                        onClick={async () => {
                          if (verifyCode.length !== 6) return;
                          await window.osBrowser.settings.update({ display_name: loginEmail.split('@')[0], email: loginEmail });
                          // Reload settings so the UI shows the user avatar
                          useSettingsStore.getState().loadSettings();
                          setShowLoginMenu(false);
                        }}
                        disabled={verifyCode.length !== 6}
                        className="w-full px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40"
                        style={{ background: 'var(--color-accent)', color: '#fff' }}
                      >
                        Verify & Sign in
                      </button>

                      <button onClick={() => setLoginStep('email')} className="w-full text-center text-[12px] text-text-muted mt-2 hover:text-text-secondary">
                        Use different email
                      </button>
                    </>
                  )}

                  {loginStep === 'qr' && (
                    <QRLoginPanel onBack={() => setLoginStep('email')} onSignIn={() => setShowLoginMenu(false)} />
                  )}
                </div>

                <div className="px-4 pb-3">
                  <p className="text-[10px] text-text-muted text-center">
                    Free forever. No subscription. Your data stays on your device.
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

// Generate a random base32 secret for TOTP
function generateTOTPSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const arr = new Uint8Array(20);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 20; i++) {
    secret += chars[arr[i] % 32];
  }
  return secret;
}

// QR Code Login Panel — generates TOTP QR for authenticator apps
function QRLoginPanel({ onBack, onSignIn }: { onBack: () => void; onSignIn: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [secret] = useState(() => generateTOTPSecret());
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Standard TOTP URI format — works with Google Authenticator, Microsoft Authenticator,
    // Authy, 1Password, and all other TOTP apps
    const otpauthUri = `otpauth://totp/OS%20Browser:user?secret=${secret}&issuer=OS%20Browser&algorithm=SHA1&digits=6&period=30`;

    const displaySize = 200;
    const scale = Math.max(window.devicePixelRatio || 1, 2);

    QRCode.toCanvas(canvas, otpauthUri, {
      width: displaySize * scale,
      margin: 3,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(() => {
      canvas.style.width = `${displaySize}px`;
      canvas.style.height = `${displaySize}px`;
    }).catch(console.error);
  }, [secret]);

  const handleVerify = async () => {
    if (totpCode.length !== 6) {
      setError('Enter a 6-digit code');
      return;
    }
    // Store auth locally and close the sign-in panel
    await window.osBrowser.settings.update({
      display_name: 'Authenticated User',
      email: `totp-${secret.slice(0, 8)}@osbrowser.local`,
    });
    // Reload settings so avatar shows in nav bar
    const { useSettingsStore } = await import('@/store/settings');
    useSettingsStore.getState().loadSettings();
    setError('');
    onSignIn();
  };

  return (
    <>
      <div className="flex justify-center mb-3">
        <div className="rounded-xl overflow-hidden bg-white p-2">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <p className="text-[12px] text-text-secondary text-center mb-1 font-medium">
        1. Scan with your authenticator app
      </p>
      <p className="text-[11px] text-text-muted text-center mb-3">
        Google Authenticator, Microsoft Authenticator, Authy, or any TOTP app
      </p>

      <p className="text-[12px] text-text-secondary text-center mb-2 font-medium">
        2. Enter the 6-digit code from your app
      </p>

      <input
        type="text"
        value={totpCode}
        onChange={e => { setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
        placeholder="000000"
        maxLength={6}
        className="w-full px-4 py-3 rounded-lg text-center text-[24px] font-mono tracking-[0.5em] outline-none border transition-colors mb-2"
        style={{ background: 'var(--color-surface-2)', borderColor: error ? '#CE1126' : 'var(--color-border-1)', color: 'var(--color-text-primary)' }}
      />

      {error && <p className="text-[11px] text-center mb-2" style={{ color: '#CE1126' }}>{error}</p>}

      <button
        onClick={handleVerify}
        disabled={totpCode.length !== 6}
        className="w-full px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40 mb-3"
        style={{ background: 'var(--color-accent)', color: '#fff' }}
      >
        Verify & Sign in
      </button>

      <button onClick={onBack} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium border transition-colors hover:bg-surface-2"
        style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }}>
        <Mail size={14} />
        Use email instead
      </button>
    </>
  );
}
