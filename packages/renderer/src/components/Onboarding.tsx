import React, { useState, useEffect } from 'react';
import {
  ChevronRight, Globe, User, Shield, Building2, Lock, Languages,
  Download, Smartphone, Battery, Keyboard, Sidebar, Terminal, BarChart3,
  Gamepad2, Video
} from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const totalSteps = 9;

  const next = () => {
    if (step < totalSteps - 1) {
      setDirection('next');
      setStep(s => s + 1);
    }
  };

  const prev = () => {
    if (step > 0) {
      setDirection('prev');
      setStep(s => s - 1);
    }
  };

  const finish = async () => {
    if (profileName.trim()) {
      await window.osBrowser.settings.update({
        display_name: profileName.trim(),
        email: profileEmail.trim() || null,
      });
    }
    onComplete();
  };

  const skip = () => onComplete();

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { step === totalSteps - 1 ? finish() : next(); }
      else if (e.key === 'Escape') skip();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, profileName, profileEmail]);

  // Generate initials for avatar preview
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderStep = () => {
    switch (step) {
      // Step 0: Welcome
      case 0:
        return (
          <div className="text-center">
            <div className="w-28 h-28 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6"
              style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}>
              <svg width="52" height="52" viewBox="0 0 512 512">
                <path d="M256 90L370 140V270Q370 370 256 430Q142 370 142 270V140Z" fill="white" opacity=".95"/>
              </svg>
            </div>
            {/* Ghana flag stripe */}
            <div className="flex h-1 rounded-full overflow-hidden mb-6 mx-auto max-w-[180px]">
              <div className="flex-1" style={{ background: '#CE1126' }} />
              <div className="flex-1" style={{ background: '#FCD116' }} />
              <div className="flex-1" style={{ background: '#006B3F' }} />
            </div>
            <h2 className="text-[24px] font-bold text-text-primary mb-3">Welcome to OS Browser</h2>
            <p className="text-[14px] text-text-secondary leading-relaxed max-w-[400px] mx-auto mb-2">
              Ghana's purpose-built desktop browser with 12 features designed for civil servants.
            </p>
            <p className="text-[13px] text-text-muted max-w-[400px] mx-auto">
              Secure messaging, government portals, mobile money tracking, offline access, and more —
              all in one browser built for your daily work.
            </p>
          </div>
        );

      // Step 1: Set Up Your Profile
      case 1:
        return (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6"
              style={{ background: 'linear-gradient(135deg, #CE1126 0%, #F43F5E 100%)' }}>
              {profileName.trim() ? (
                <span className="text-[28px] font-bold text-white">{getInitials(profileName)}</span>
              ) : (
                <User size={40} className="text-white" />
              )}
            </div>
            <h2 className="text-[22px] font-bold text-text-primary mb-3">Set Up Your Profile</h2>
            <div className="text-left max-w-[360px] mx-auto">
              <p className="text-[13px] text-text-secondary text-center mb-5">
                Personalise your browser experience. Your profile stays on your device.
              </p>
              <div className="mb-3">
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Your Name</label>
                <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)}
                  placeholder="e.g. Kwame Mensah" autoFocus
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none border"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }} />
              </div>
              <div className="mb-2">
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Email (optional)</label>
                <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                  placeholder="you@example.gov.gh"
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none border"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)', color: 'var(--color-text-primary)' }} />
              </div>
              <p className="text-[10px] text-text-muted text-center mt-2">
                Stored locally on your device. Never sent to any server.
              </p>
            </div>
          </div>
        );

      // Step 2: Meet the Kente System
      case 2:
        return (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6"
              style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}>
              <Globe size={40} className="text-white" />
            </div>
            <h2 className="text-[22px] font-bold text-text-primary mb-2">Meet the Kente System</h2>
            <p className="text-[13px] text-text-muted mb-5 max-w-[380px] mx-auto">
              Every feature has a home. You'll find them all across 4 surfaces.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-[400px] mx-auto text-left">
              <div className="p-3 rounded-xl border" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sidebar size={14} style={{ color: '#CE1126' }} />
                  <span className="text-[12px] font-semibold text-text-primary">Sidebar</span>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">Icon rail on the left — your feature workspace</p>
              </div>
              <div className="p-3 rounded-xl border" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Globe size={14} style={{ color: '#006B3F' }} />
                  <span className="text-[12px] font-semibold text-text-primary">Toolbar</span>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">Address bar area — page-specific actions</p>
              </div>
              <div className="p-3 rounded-xl border" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Terminal size={14} style={{ color: '#6366F1' }} />
                  <span className="text-[12px] font-semibold text-text-primary">Command Bar</span>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">Ctrl+K — find anything instantly</p>
              </div>
              <div className="p-3 rounded-xl border" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <BarChart3 size={14} style={{ color: '#F59E0B' }} />
                  <span className="text-[12px] font-semibold text-text-primary">Status Bar</span>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">Below bookmarks — passive monitoring</p>
              </div>
            </div>
          </div>
        );

      // Step 3: Your Power Features
      case 3:
        return (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6"
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}>
              <Shield size={40} className="text-white" />
            </div>
            <h2 className="text-[22px] font-bold text-text-primary mb-2">Your Power Features</h2>
            <p className="text-[13px] text-text-muted mb-5 max-w-[380px] mx-auto">
              12 features built for Ghana's civil servants. Here are the highlights.
            </p>
            <div className="grid grid-cols-2 gap-2.5 max-w-[420px] mx-auto text-left">
              {[
                { icon: Building2, label: 'Gov Services Hub', desc: '25+ government portals', color: '#CE1126' },
                { icon: Lock, label: 'Encrypted Messenger', desc: '.gov.gh secure chat', color: '#0EA5E9' },
                { icon: Languages, label: 'Translation', desc: '7 Ghanaian languages', color: '#006B3F' },
                { icon: Download, label: 'Offline Library', desc: 'Save pages for offline', color: '#6366F1' },
                { icon: Smartphone, label: 'Mobile Money', desc: 'Payment tracking', color: '#F59E0B' },
                { icon: Battery, label: 'Dumsor Guard', desc: 'Power outage protection', color: '#10B981' },
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className="flex items-center gap-2.5 p-2.5 rounded-xl border"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color }}>
                    <Icon size={14} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-text-primary">{label}</div>
                    <div className="text-[10px] text-text-muted">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // Step 4: GovChat — Secure Messaging
      case 4:
        return (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6"
              style={{ background: 'linear-gradient(135deg, #D4A017 0%, #006B3F 100%)' }}>
              <Shield size={40} className="text-white" />
            </div>
            <h2 className="text-[22px] font-bold text-text-primary mb-2">GovChat — Secure Messaging</h2>
            <p className="text-[13px] text-text-muted mb-5 max-w-[380px] mx-auto">
              Chat with government colleagues using end-to-end encryption. Share files, send voice notes, make video calls. Your conversations are protected with military-grade encryption.
            </p>
            <div className="max-w-[380px] mx-auto space-y-2 text-left">
              {[
                { label: 'End-to-end encrypted messages', detail: 'UNCLASSIFIED to SECRET classification' },
                { label: 'Voice notes & file sharing', detail: 'Documents, images up to 50MB' },
                { label: 'Video & audio calls', detail: '1:1 calls built right in' },
                { label: 'People directory', detail: 'Find colleagues by name or ministry' },
              ].map(({ label, detail }) => (
                <div key={label} className="flex items-start gap-3 p-2.5 rounded-xl"
                  style={{ background: 'var(--color-surface-2)' }}>
                  <ChevronRight size={14} className="shrink-0 mt-0.5" style={{ color: '#D4A017' }} />
                  <div>
                    <div className="text-[12px] font-semibold text-text-primary">{label}</div>
                    <div className="text-[10px] text-text-muted">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // Step 5: GovPlay — Take a Break
      case 5:
        return (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6"
              style={{ background: 'linear-gradient(135deg, #FF4081 0%, #E91E63 100%)' }}>
              <Gamepad2 size={40} className="text-white" />
            </div>
            <h2 className="text-[22px] font-bold text-text-primary mb-2">GovPlay — Take a Break</h2>
            <p className="text-[13px] text-text-muted mb-5 max-w-[380px] mx-auto">
              12 built-in games including Oware (Ghana's national board game), Chess, Ludo, Sudoku, and more. Play offline anytime — sharpen your mind during breaks.
            </p>
            <div className="grid grid-cols-3 gap-2 max-w-[360px] mx-auto">
              {['Oware', 'Chess', 'Checkers', 'Ludo', 'Sudoku', '2048', 'Minesweeper', 'Solitaire', 'Snake', 'Word Scramble', 'Ghana Trivia', 'Typing Test'].map(game => (
                <div key={game} className="px-2 py-1.5 rounded-lg text-[10px] font-medium text-text-primary text-center"
                  style={{ background: 'var(--color-surface-2)' }}>
                  {game}
                </div>
              ))}
            </div>
          </div>
        );

      // Step 6: Video & Audio Calls
      case 6:
        return (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6"
              style={{ background: 'linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)' }}>
              <Video size={40} className="text-white" />
            </div>
            <h2 className="text-[22px] font-bold text-text-primary mb-2">Video & Audio Calls</h2>
            <p className="text-[13px] text-text-muted mb-5 max-w-[380px] mx-auto">
              Make crystal-clear 1:1 video and audio calls right from your chat conversations. No third-party apps needed — it's all built in.
            </p>
            <div className="max-w-[380px] mx-auto space-y-2 text-left">
              {[
                { label: 'Start from any DM', detail: 'Click the phone or camera icon in the chat header' },
                { label: 'Full controls', detail: 'Mute, camera toggle, and end call buttons' },
                { label: 'No extra apps', detail: 'Everything runs inside OS Browser' },
              ].map(({ label, detail }) => (
                <div key={label} className="flex items-start gap-3 p-2.5 rounded-xl"
                  style={{ background: 'var(--color-surface-2)' }}>
                  <ChevronRight size={14} className="shrink-0 mt-0.5" style={{ color: '#1565C0' }} />
                  <div>
                    <div className="text-[12px] font-semibold text-text-primary">{label}</div>
                    <div className="text-[10px] text-text-muted">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // Step 7: Quick Tips
      case 7:
        return (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6"
              style={{ background: 'linear-gradient(135deg, #006B3F 0%, #10B981 100%)' }}>
              <Keyboard size={40} className="text-white" />
            </div>
            <h2 className="text-[22px] font-bold text-text-primary mb-2">Quick Tips</h2>
            <p className="text-[13px] text-text-muted mb-5 max-w-[380px] mx-auto">
              A few things to help you get the most out of OS Browser.
            </p>
            <div className="max-w-[380px] mx-auto space-y-3 text-left">
              {[
                { tip: 'Press Ctrl+K to find anything', detail: 'Features, tabs, actions, settings — all searchable.' },
                { tip: 'Click the sidebar icons to open feature panels', detail: 'Each icon represents a different tool from the Kente System.' },
                { tip: 'Your data stays on your device — always', detail: 'No cloud sync, no telemetry, no tracking.' },
                { tip: 'Right-click any page for quick actions', detail: 'Save offline, translate, screenshot, and more.' },
              ].map(({ tip, detail }) => (
                <div key={tip} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--color-surface-2)' }}>
                  <ChevronRight size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary">{tip}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // Step 8: Ready to Go
      case 8:
        return (
          <div className="text-center">
            <div className="w-28 h-28 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6"
              style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}>
              <span className="text-[48px]">{'\u{1F1EC}\u{1F1ED}'}</span>
            </div>
            {/* Ghana flag stripe */}
            <div className="flex h-1 rounded-full overflow-hidden mb-6 mx-auto max-w-[180px]">
              <div className="flex-1" style={{ background: '#CE1126' }} />
              <div className="flex-1" style={{ background: '#FCD116' }} />
              <div className="flex-1" style={{ background: '#006B3F' }} />
            </div>
            <h2 className="text-[24px] font-bold text-text-primary mb-2">You're All Set!</h2>
            <p className="text-[18px] text-text-primary mb-3">Akwaaba! {'\u{1F1EC}\u{1F1ED}'}</p>
            <p className="text-[14px] text-text-secondary max-w-[380px] mx-auto mb-2">
              Welcome! Start browsing and explore all 12 features designed to make your work easier, faster, and more secure.
            </p>
            <p className="text-[12px] text-text-muted max-w-[380px] mx-auto">
              Press Ctrl+K at any time to find what you need, or explore the sidebar to discover your tools.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>

      <div className="w-[540px] rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>

        {/* Skip button */}
        <div className="flex justify-end px-5 pt-4">
          <button onClick={skip} className="text-[12px] text-text-muted hover:text-text-secondary transition-colors">
            Skip tour
          </button>
        </div>

        {/* Slide content */}
        <div className="px-10 pb-2 pt-4" key={step}
          style={{ animation: `slideIn${direction === 'next' ? 'Right' : 'Left'} 0.3s ease-out` }}>
          {renderStep()}
        </div>

        {/* Bottom bar: dots + buttons */}
        <div className="flex items-center justify-between px-8 py-5">
          {/* Progress dots */}
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button key={i} onClick={() => { setDirection(i > step ? 'next' : 'prev'); setStep(i); }}
                className="h-2 rounded-full transition-all duration-200"
                style={{
                  background: i === step ? 'var(--color-accent)' : 'var(--color-border-2)',
                  width: i === step ? '24px' : '8px',
                }} />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {step > 0 && step < totalSteps - 1 && (
              <button onClick={prev}
                className="px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all border"
                style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}>
                Back
              </button>
            )}

            {step === 0 ? (
              <button onClick={next}
                className="px-6 py-2.5 rounded-lg text-[14px] font-semibold transition-all hover:brightness-110"
                style={{ background: 'var(--color-accent)', color: '#fff' }}>
                Let's Get You Set Up
              </button>
            ) : step === totalSteps - 1 ? (
              <button onClick={finish}
                className="px-6 py-2.5 rounded-lg text-[14px] font-semibold transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #CE1126 0%, #006B3F 100%)', color: '#fff' }}>
                Start Browsing
              </button>
            ) : (
              <button onClick={next}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[14px] font-semibold transition-all hover:brightness-110"
                style={{ background: 'var(--color-accent)', color: '#fff' }}>
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slide animation styles */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
