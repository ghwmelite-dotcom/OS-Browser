import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Keyboard, MessageSquare, Shield, Globe, BookOpen, Target, Camera, DollarSign, Columns, Gamepad2, Phone, Video, Users, Send, Loader2 } from 'lucide-react';
import { useAIStore } from '@/store/ai';

export function HelpPage() {
  const messages = useAIStore(s => s.messages);
  const isStreaming = useAIStore(s => s.isStreaming);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    'How do I use GovChat?',
    'How to save pages offline?',
    'How to play games?',
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = (text?: string) => {
    const msg = text || chatInput.trim();
    if (!msg) return;
    useAIStore.getState().sendMessage(msg);
    setChatInput('');
  };

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
    { keys: 'Ctrl+Shift+M', action: 'GovChat Messenger' },
    { keys: 'Ctrl+Shift+A', action: 'Search tabs' },
  ];

  const features: Array<{ icon?: any; emoji?: string; name: string; desc: string }> = [
    { icon: MessageSquare, name: 'AI Assistant', desc: 'Chat with 6 AI models. Summarize pages, translate to Twi, draft letters.' },
    { icon: Shield, name: 'Ad Blocking', desc: 'Network-level blocking removes ads and trackers. Auto-whitelists government sites.' },
    { icon: Globe, name: 'Government Portals', desc: 'Quick access to GIFMIS, CAGD, GRA, SSNIT, OHCS, E-SPAR and more.' },
    { icon: BookOpen, name: 'Twi Dictionary', desc: '50+ English-Twi translations for greetings, government terms, and common words.' },
    { icon: DollarSign, name: 'GHS Currency Tools', desc: 'Convert GHS to USD/EUR/GBP. Calculate SSNIT contributions.' },
    { icon: Target, name: 'Focus Mode', desc: 'Block distracting sites. Track your focus time.' },
    { icon: Columns, name: 'Split Screen', desc: 'View two tabs side by side for comparing documents.' },
    { icon: Camera, name: 'Screenshot', desc: 'Capture visible area or full page. Save as PNG or JPEG.' },
    { icon: Shield, name: 'GovChat Messenger', desc: 'Matrix-based encrypted messenger for secure government communication with voice notes, file sharing, and video calls.' },
    { icon: Gamepad2, name: 'GovPlay Game Center', desc: '12 built-in games including Oware, Chess, Ludo, Sudoku, and more. Play offline anytime.' },
    { icon: Video, name: 'Video & Audio Calls', desc: 'Crystal-clear 1:1 video and audio calls built right into GovChat conversations.' },
    { icon: Users, name: 'People Directory', desc: 'Find colleagues by name, department, or ministry. Start conversations instantly.' },
    { emoji: '\u2B07\uFE0F', name: 'Download Manager', desc: 'Pause, resume, and retry downloads with speed tracking and data cost estimates.' },
    { emoji: '\uD83D\uDCC2', name: 'Workspaces', desc: 'Isolated browsing environments \u2014 Government, Personal, Custom \u2014 each with separate sessions.' },
    { emoji: '\uD83D\uDD0D', name: 'Smart Tabs', desc: 'Fuzzy tab search (Ctrl+Shift+A), auto-grouping, tab snooze, and duplicate detection.' },
    { emoji: '\uD83D\uDC9A', name: 'Digital Wellbeing', desc: 'Track browsing time, get break reminders, view per-site usage stats.' },
    { emoji: '\uD83D\uDD10', name: 'TOTP 2FA', desc: 'Built-in two-factor authentication code generator with breach monitoring.' },
    { emoji: '\uD83C\uDFAC', name: 'Screen Recorder', desc: 'Record tabs or windows as video. Annotate screenshots with arrows, text, and blur.' },
    { emoji: '\uD83D\uDCD6', name: 'Reading Mode + TTS', desc: 'Distraction-free reading with text-to-speech in 9 languages including African languages.' },
    { emoji: '\u2728', name: 'AI Page Actions', desc: '10 one-click AI actions: summarize, extract data, draft emails, translate, and more.' },
    { emoji: '\uD83D\uDCCA', name: 'Data Cost Tracker', desc: 'Real-time bandwidth tracking per site with GH\u20B5 cost estimates and budget alerts.' },
    { emoji: '\uD83D\uDD0B', name: 'DumsorGuard+', desc: 'Battery detection, auto power saver, 5-snapshot session recovery history.' },
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
                  {f.icon ? <f.icon size={18} style={{ color: 'var(--color-accent)' }} /> : <span className="text-[18px]">{f.emoji}</span>}
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

        {/* GovChat */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>GovChat — Secure Government Messenger</h2>
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#D4A017' }}>
                <Shield size={18} className="text-white" />
              </div>
              <p className="text-[13px] text-text-primary font-semibold">Matrix-based encrypted messenger for government communication</p>
            </div>
            <div className="space-y-3 text-[12px] text-text-secondary">
              <div>
                <p className="font-semibold text-text-primary mb-1">How to access</p>
                <p>Click the Shield icon in the Kente Sidebar, or press <kbd className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>Ctrl+Shift+M</kbd></p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Getting started</p>
                <p>Enter your invite code + staff ID, or request a code from your IT admin, or join as a public user.</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Features</p>
                <ul className="list-disc list-inside space-y-1 text-text-muted">
                  <li>End-to-end encrypted messages</li>
                  <li>Voice notes — record and send audio messages</li>
                  <li>File sharing — documents, images up to 50MB</li>
                  <li>Reactions and emoji</li>
                  <li>Message classification (UNCLASSIFIED to SECRET)</li>
                  <li>People directory — find colleagues by name, ministry, or department</li>
                  <li>Video & audio calls — click the phone/camera icons in DM conversations</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Admin features</p>
                <p>Superadmins can generate invite codes, manage users, and approve code requests via the gear icon.</p>
              </div>
            </div>
          </div>
        </div>

        {/* GovPlay */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>GovPlay — Game Center</h2>
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FF4081' }}>
                <Gamepad2 size={18} className="text-white" />
              </div>
              <p className="text-[13px] text-text-primary font-semibold">12 built-in games for break-time entertainment</p>
            </div>
            <div className="space-y-3 text-[12px] text-text-secondary">
              <div>
                <p className="font-semibold text-text-primary mb-1">How to access</p>
                <p>Click the Gamepad icon in the Kente Sidebar, or navigate to <span className="font-mono text-[11px]" style={{ color: 'var(--color-accent)' }}>os-browser://games</span></p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Games available</p>
                <p className="text-text-muted">Oware (Ghana's national board game), Chess, Checkers, Ludo, Sudoku, 2048, Minesweeper, Solitaire, Snake, Word Scramble, Ghana Trivia Quiz, Typing Speed Test</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Features</p>
                <ul className="list-disc list-inside space-y-1 text-text-muted">
                  <li>AI opponents with difficulty levels</li>
                  <li>High scores</li>
                  <li>Sound effects</li>
                  <li>Responsive design</li>
                </ul>
              </div>
              <p className="text-text-muted italic">Tip: Games work completely offline — no internet needed.</p>
            </div>
          </div>
        </div>

        {/* Video & Audio Calls */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>Video & Audio Calls</h2>
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#1565C0' }}>
                <Video size={18} className="text-white" />
              </div>
              <p className="text-[13px] text-text-primary font-semibold">1:1 video and audio calls built into GovChat</p>
            </div>
            <div className="space-y-3 text-[12px] text-text-secondary">
              <div>
                <p className="font-semibold text-text-primary mb-1">How to make a call</p>
                <p>Open a DM conversation in GovChat, click the phone icon (audio) or camera icon (video) in the chat header.</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Controls</p>
                <p className="text-text-muted">Mute/unmute, camera toggle, end call.</p>
              </div>
              <p className="text-text-muted italic">Note: Both users must be online in GovChat for calls to connect.</p>
            </div>
          </div>
        </div>

        {/* People Directory */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>People Directory</h2>
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface-2)' }}>
                <Users size={18} style={{ color: 'var(--color-accent)' }} />
              </div>
              <p className="text-[13px] text-text-primary font-semibold">Find colleagues across government</p>
            </div>
            <div className="space-y-3 text-[12px] text-text-secondary">
              <div>
                <p className="font-semibold text-text-primary mb-1">How to find people</p>
                <p>In GovChat, click the "People" tab in the chat list.</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Features</p>
                <p className="text-text-muted">Search by name, department, or ministry. Click any user to start a DM conversation.</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Online status</p>
                <p className="text-text-muted">Green dot = online, grey dot = offline.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Download Manager */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>Download Manager</h2>
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface-2)' }}>
                <span className="text-[18px]">{'\u2B07\uFE0F'}</span>
              </div>
              <p className="text-[13px] text-text-primary font-semibold">Pause, resume, and manage all your downloads</p>
            </div>
            <div className="space-y-3 text-[12px] text-text-secondary">
              <div>
                <p className="font-semibold text-text-primary mb-1">How to access</p>
                <p>Downloads appear in the sidebar panel — click the download icon. Downloads are auto-triggered when you start a download.</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Features</p>
                <ul className="list-disc list-inside space-y-1 text-text-muted">
                  <li>Pause and resume active downloads</li>
                  <li>Retry failed downloads</li>
                  <li>Clear completed downloads</li>
                  <li>Real-time speed and ETA display</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Workspaces */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>Workspaces</h2>
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface-2)' }}>
                <span className="text-[18px]">{'\uD83D\uDCC2'}</span>
              </div>
              <p className="text-[13px] text-text-primary font-semibold">Isolated browsing environments for different contexts</p>
            </div>
            <div className="space-y-3 text-[12px] text-text-secondary">
              <div>
                <p className="font-semibold text-text-primary mb-1">How to access</p>
                <p>Workspace pills appear above the tab bar, or open via Command Palette (<kbd className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>Ctrl+K</kbd>).</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Features</p>
                <ul className="list-disc list-inside space-y-1 text-text-muted">
                  <li>Create custom workspaces</li>
                  <li>Switch with <kbd className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>Ctrl+1/2/3</kbd></li>
                  <li>Isolated cookies and sessions per workspace</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Default workspaces</p>
                <p className="text-text-muted">General, Government, Personal</p>
              </div>
            </div>
          </div>
        </div>

        {/* Screen Recorder */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>Screen Recorder</h2>
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface-2)' }}>
                <span className="text-[18px]">{'\uD83C\uDFAC'}</span>
              </div>
              <p className="text-[13px] text-text-primary font-semibold">Record tabs or windows as video with annotation tools</p>
            </div>
            <div className="space-y-3 text-[12px] text-text-secondary">
              <div>
                <p className="font-semibold text-text-primary mb-1">How to access</p>
                <p>Command Palette → "Record Tab" or "Record Window"</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Features</p>
                <ul className="list-disc list-inside space-y-1 text-text-muted">
                  <li>WebM video recording</li>
                  <li>Floating controls with pause and stop</li>
                  <li>Annotation overlay with 5 tools</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Export</p>
                <p className="text-text-muted">Downloads as a .webm file</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reading Mode + TTS */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>Reading Mode + Text-to-Speech</h2>
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface-2)' }}>
                <span className="text-[18px]">{'\uD83D\uDCD6'}</span>
              </div>
              <p className="text-[13px] text-text-primary font-semibold">Distraction-free reading with text-to-speech</p>
            </div>
            <div className="space-y-3 text-[12px] text-text-secondary">
              <div>
                <p className="font-semibold text-text-primary mb-1">How to access</p>
                <p>Command Palette → "Reading Mode" or via the toolbar</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Features</p>
                <ul className="list-disc list-inside space-y-1 text-text-muted">
                  <li>4 themes: Light, Dark, Sepia, OLED</li>
                  <li>Adjustable fonts and text size</li>
                  <li>Text-to-speech with 9 languages</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Supported languages</p>
                <p className="text-text-muted">English, French, Spanish, German, Portuguese, Swahili, Hausa, Yoruba</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Page Actions */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>AI Page Actions</h2>
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface-2)' }}>
                <span className="text-[18px]">{'\u2728'}</span>
              </div>
              <p className="text-[13px] text-text-primary font-semibold">10 one-click AI actions on any page</p>
            </div>
            <div className="space-y-3 text-[12px] text-text-secondary">
              <div>
                <p className="font-semibold text-text-primary mb-1">How to access</p>
                <p>Floating AI bar → "Actions" button (wand icon)</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Available actions</p>
                <ul className="list-disc list-inside space-y-1 text-text-muted">
                  <li>Summarize</li>
                  <li>Extract Contacts</li>
                  <li>Extract Dates</li>
                  <li>Explain Simply</li>
                  <li>Extract Tables</li>
                  <li>Draft Email</li>
                  <li>Key Facts</li>
                  <li>Compare</li>
                  <li>Translate + Summarize</li>
                  <li>Action Items</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* AI Chat Assistant */}
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>Need Help?</h2>
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border-1)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #D4A017, #006B3F)' }}>
                <MessageSquare size={18} className="text-white" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-text-primary">Ask the AI Assistant</p>
                <p className="text-[11px] text-text-muted">Get instant help with any OS Browser feature</p>
              </div>
            </div>

            {/* Messages area */}
            <div
              className="px-4 py-3 space-y-3 overflow-y-auto"
              style={{ maxHeight: '300px', minHeight: '120px', scrollbarWidth: 'thin' }}
            >
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <HelpCircle size={28} className="text-text-muted mb-2 opacity-40" />
                  <p className="text-[12px] text-text-muted">Ask a question or pick a suggestion below</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed"
                    style={
                      msg.role === 'user'
                        ? { background: 'linear-gradient(135deg, #D4A017, #006B3F)', color: '#fff' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px]" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestion chips */}
            {messages.length === 0 && (
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                {suggestionChips.map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleSend(chip)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-full transition-all duration-150 hover:opacity-80"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-accent)', border: '1px solid var(--color-border-1)' }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--color-border-1)' }}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type your question..."
                disabled={isStreaming}
                className="flex-1 text-[13px] px-3.5 py-2.5 rounded-lg border outline-none transition-colors duration-150 focus:ring-2 disabled:opacity-50"
                style={{
                  background: 'var(--color-surface-2)',
                  borderColor: 'var(--color-border-1)',
                  color: 'var(--color-text-primary)',
                  // @ts-ignore
                  '--tw-ring-color': 'var(--color-accent)',
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={isStreaming || !chatInput.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150 shrink-0 disabled:opacity-30"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
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
