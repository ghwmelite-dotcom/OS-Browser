import React from 'react';
import { HelpCircle, Keyboard, MessageSquare, Shield, Globe, BookOpen, Target, Camera, DollarSign, Columns } from 'lucide-react';

export function HelpPage() {
  const shortcuts = [
    { keys: 'Ctrl+T', action: 'New tab' },
    { keys: 'Ctrl+W', action: 'Close tab' },
    { keys: 'Ctrl+Tab', action: 'Next tab' },
    { keys: 'Ctrl+Shift+T', action: 'Reopen closed tab' },
    { keys: 'Ctrl+K', action: 'Command Palette' },
    { keys: 'Ctrl+L', action: 'Focus address bar' },
    { keys: 'Ctrl+J', action: 'AI Assistant' },
    { keys: 'Ctrl+Shift+O', action: 'AskOzzy' },
    { keys: 'Ctrl+Shift+S', action: 'Split Screen' },
    { keys: 'Ctrl+H', action: 'History' },
    { keys: 'Ctrl+B', action: 'Bookmarks' },
    { keys: 'Ctrl+D', action: 'Bookmark page' },
    { keys: 'F5', action: 'Reload page' },
    { keys: 'F11', action: 'Fullscreen' },
    { keys: 'Escape', action: 'Close panel' },
  ];

  const features = [
    { icon: MessageSquare, name: 'AI Assistant', desc: 'Chat with 6 AI models. Summarize pages, translate to Twi, draft letters.' },
    { icon: Shield, name: 'Ad Blocking', desc: 'Network-level blocking removes ads and trackers. Auto-whitelists government sites.' },
    { icon: Globe, name: 'Government Portals', desc: 'Quick access to GIFMIS, CAGD, GRA, SSNIT, OHCS, E-SPAR and more.' },
    { icon: BookOpen, name: 'Twi Dictionary', desc: '50+ English-Twi translations for greetings, government terms, and common words.' },
    { icon: DollarSign, name: 'GHS Currency Tools', desc: 'Convert GHS to USD/EUR/GBP. Calculate SSNIT contributions.' },
    { icon: Target, name: 'Focus Mode', desc: 'Block distracting sites. Track your focus time.' },
    { icon: Columns, name: 'Split Screen', desc: 'View two tabs side by side for comparing documents.' },
    { icon: Camera, name: 'Screenshot', desc: 'Capture visible area or full page. Save as PNG or JPEG.' },
  ];

  return (
    <div className="min-h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[680px] mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-accent)', color: '#fff' }}>
            <HelpCircle size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Help & Support</h1>
            <p className="text-[12px] text-text-muted">Learn about OS Browser's features</p>
          </div>
        </div>

        {/* Features */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>Features</h2>
          <div className="grid grid-cols-1 gap-3">
            {features.map(f => (
              <div key={f.name} className="flex items-start gap-4 p-4 rounded-xl border" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface-2)' }}>
                  <f.icon size={18} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-text-primary">{f.name}</p>
                  <p className="text-[12px] text-text-muted mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>Keyboard Shortcuts</h2>
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
            {shortcuts.map((s) => (
              <div key={s.keys} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--color-border-1)' }}>
                <span className="text-[13px] text-text-primary">{s.action}</span>
                <kbd className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="rounded-xl border p-5 text-center" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}>
            <svg width="28" height="28" viewBox="0 0 512 512">
              <path d="M256 90L370 140V270Q370 370 256 430Q142 370 142 270V140Z" fill="white" opacity=".95"/>
            </svg>
          </div>
          <h3 className="text-[16px] font-bold text-text-primary">OS Browser v1.0.0</h3>
          <p className="text-[12px] text-text-muted mt-1">Ghana's AI-Powered Desktop Browser</p>
          <p className="text-[11px] text-text-muted mt-1">Built by OHCS — Powered by Cloudflare Workers AI</p>
          <a href="https://github.com/ghwmelite-dotcom/OS-Browser" target="_blank"
            className="inline-block mt-3 text-[12px] font-medium" style={{ color: 'var(--color-accent)' }}>
            View on GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}
