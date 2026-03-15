import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Keyboard, MessageSquare, Shield, Globe, Settings,
  HelpCircle, Info, Zap, ChevronRight, Monitor, Palette, Download,
  Camera, Columns, Clock, Star, Eye, Search, Calculator, Languages
} from 'lucide-react';

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
}

const SECTIONS: Section[] = [
  { id: 'getting-started', label: 'Getting Started', icon: Zap },
  { id: 'features', label: 'Features Overview', icon: Monitor },
  { id: 'ai-assistant', label: 'AI Assistant', icon: MessageSquare },
  { id: 'ghana-tools', label: 'Ghana Tools', icon: Globe },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: HelpCircle },
  { id: 'about', label: 'About', icon: Info },
];

export function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setSectionRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  // Track active section via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const container = contentRef.current;
    if (!container) return;

    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
              setActiveSection(id);
            }
          });
        },
        { root: container, threshold: 0.2 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  const SectionHeading = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-accent)', color: '#fff' }}
      >
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <h2 className="text-[22px] font-bold text-text-primary">{title}</h2>
    </div>
  );

  const Shortcut = ({ keys, desc }: { keys: string; desc: string }) => (
    <tr style={{ borderBottom: '1px solid var(--color-border-1)' }}>
      <td className="py-2.5 pr-6">
        <kbd
          className="px-2 py-1 rounded text-[12px] font-mono font-semibold"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-1)' }}
        >
          {keys}
        </kbd>
      </td>
      <td className="py-2.5 text-[13px] text-text-secondary">{desc}</td>
    </tr>
  );

  const FeatureCard = ({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) => (
    <div
      className="p-4 rounded-xl border transition-all duration-200"
      style={{
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border-1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <Icon size={16} className="text-text-muted" strokeWidth={1.8} />
        </div>
        <div>
          <h4 className="text-[14px] font-semibold text-text-primary mb-1">{title}</h4>
          <p className="text-[12px] text-text-muted leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside
        className="w-[240px] shrink-0 border-r overflow-y-auto py-6 px-3"
        style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}
      >
        <div className="flex items-center gap-2.5 px-3 mb-6">
          <BookOpen size={20} style={{ color: 'var(--color-accent)' }} strokeWidth={1.8} />
          <span className="text-[15px] font-bold text-text-primary">Documentation</span>
        </div>

        <nav className="flex flex-col gap-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 w-full"
                style={{
                  background: isActive ? 'var(--color-surface-2)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
                }}
              >
                <Icon
                  size={15}
                  strokeWidth={1.8}
                  style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                  className="shrink-0"
                />
                <span
                  className="text-[13px] font-medium"
                  style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-8 mx-3 p-3 rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-[11px] text-text-muted leading-relaxed">
            OS Browser v1.0.0
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            Built by OHCS
          </p>
        </div>
      </aside>

      {/* Content */}
      <main ref={contentRef} className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-[760px] mx-auto px-8 py-10">

          {/* Getting Started */}
          <div ref={setSectionRef('getting-started')} className="mb-16">
            <SectionHeading icon={Zap} title="Getting Started" />

            <div
              className="p-5 rounded-xl mb-6"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
            >
              <p className="text-[14px] text-text-primary leading-relaxed">
                Welcome to <strong>OS Browser</strong> — a modern, fast, and privacy-focused desktop browser
                built for Ghanaian government workers and everyday users. OS Browser comes packed with
                productivity tools, AI assistance, and localised features designed to make your browsing
                experience efficient and enjoyable.
              </p>
            </div>

            <h3 className="text-[16px] font-semibold text-text-primary mb-3">System Requirements</h3>
            <ul className="text-[13px] text-text-secondary space-y-2 mb-6 ml-1">
              <li className="flex items-start gap-2">
                <ChevronRight size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                <span><strong>Operating System:</strong> Windows 10 or Windows 11 (64-bit)</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                <span><strong>RAM:</strong> 4 GB minimum</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                <span><strong>Disk Space:</strong> 200 MB available</span>
              </li>
            </ul>

            <h3 className="text-[16px] font-semibold text-text-primary mb-3">Installation</h3>
            <ol className="text-[13px] text-text-secondary space-y-2 mb-6 ml-1 list-decimal list-inside">
              <li>
                Download the installer from{' '}
                <span style={{ color: 'var(--color-accent)' }} className="font-medium">www.osbrowser.askozzy.work</span>
              </li>
              <li>Run the downloaded installer and follow the on-screen prompts</li>
              <li>Launch OS Browser from the desktop shortcut or Start Menu</li>
            </ol>

            <h3 className="text-[16px] font-semibold text-text-primary mb-3">First Launch</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              On your first launch, you will be guided through a brief onboarding tour that highlights
              key features and lets you set up your profile. You can customise your display name,
              choose a theme, and pick your preferred search engine during setup.
            </p>
          </div>

          {/* Features Overview */}
          <div ref={setSectionRef('features')} className="mb-16">
            <SectionHeading icon={Monitor} title="Features Overview" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FeatureCard
                icon={Search}
                title="Command Palette"
                desc="Quick access to any action, tab, or setting. Open with Ctrl+K and type to search."
              />
              <FeatureCard
                icon={Columns}
                title="Split Screen View"
                desc="View two pages side by side for comparison or multitasking. Toggle with Ctrl+Shift+S."
              />
              <FeatureCard
                icon={Eye}
                title="Focus Mode"
                desc="Block distracting websites and track your productive browsing time with session timers."
              />
              <FeatureCard
                icon={BookOpen}
                title="Reading Mode"
                desc="Strip away clutter and ads, leaving clean, readable text for articles and documents."
              />
              <FeatureCard
                icon={Camera}
                title="Screenshot Tool"
                desc="Capture the visible area or the full page with a single click. Saved directly to your device."
              />
              <FeatureCard
                icon={Palette}
                title="Color-coded Tabs"
                desc="Tabs are colour-coded by domain for easy identification. Hover over a tab for a page preview."
              />
              <FeatureCard
                icon={Star}
                title="Bookmarks & History"
                desc="Save and organise your favourite pages. Search through your browsing history instantly."
              />
              <FeatureCard
                icon={Palette}
                title="Dark / Light Mode"
                desc="Choose your preferred theme or follow the system setting. Includes Ghana-inspired colour accents."
              />
              <FeatureCard
                icon={Clock}
                title="Session Restore"
                desc="Pick up where you left off. OS Browser restores your tabs and windows on relaunch."
              />
              <FeatureCard
                icon={Download}
                title="Download Manager"
                desc="Track and manage all your downloads in one place. Pause, resume, or cancel at any time."
              />
              <FeatureCard
                icon={Info}
                title="Custom Profile Avatars"
                desc="Personalise your browser with a custom display name and profile avatar."
              />
            </div>
          </div>

          {/* AI Assistant */}
          <div ref={setSectionRef('ai-assistant')} className="mb-16">
            <SectionHeading icon={MessageSquare} title="AI Assistant" />

            <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
              OS Browser includes a built-in AI assistant powered by multiple large language models.
              Open it with <kbd className="px-1.5 py-0.5 rounded text-[11px] font-mono" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}>Ctrl+J</kbd> or
              by clicking the chat icon in the navigation bar.
            </p>

            <h3 className="text-[16px] font-semibold text-text-primary mb-3">Available Models</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
              {['Llama 3.3 70B', 'Llama 3.1 8B', 'DeepSeek R1', 'Mistral Small', 'Qwen 2.5 72B', 'Gemma 7B'].map((model) => (
                <div
                  key={model}
                  className="px-3 py-2 rounded-lg text-[12px] font-medium text-text-primary text-center"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}
                >
                  {model}
                </div>
              ))}
            </div>

            <h3 className="text-[16px] font-semibold text-text-primary mb-3">Quick Actions</h3>
            <ul className="text-[13px] text-text-secondary space-y-2 mb-6 ml-1">
              <li className="flex items-start gap-2">
                <ChevronRight size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                <span><strong>Summarise Page:</strong> Get a concise summary of the current web page</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                <span><strong>Translate to Twi:</strong> Translate selected text or the entire page into Twi</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                <span><strong>Draft Reply:</strong> Generate a professional response for emails or messages</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                <span><strong>Compare:</strong> Compare information across open tabs</span>
              </li>
            </ul>

            <h3 className="text-[16px] font-semibold text-text-primary mb-3">Floating AI Bar</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
              When browsing web pages, a floating AI bar appears allowing you to ask questions
              about the page content without opening the full assistant panel.
            </p>

            <h3 className="text-[16px] font-semibold text-text-primary mb-3">AskOzzy</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              For deeper research, use AskOzzy (<kbd className="px-1.5 py-0.5 rounded text-[11px] font-mono" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}>Ctrl+Shift+O</kbd>).
              AskOzzy provides detailed, well-sourced answers to complex questions by searching
              the web and synthesising information from multiple sources.
            </p>
          </div>

          {/* Ghana Tools */}
          <div ref={setSectionRef('ghana-tools')} className="mb-16">
            <SectionHeading icon={Globe} title="Ghana Tools" />

            <div className="space-y-6">
              {/* Currency Converter */}
              <div
                className="p-5 rounded-xl"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calculator size={16} style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-[15px] font-semibold text-text-primary">GHS Currency Converter</h3>
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Convert Ghana Cedis (GHS) to and from major world currencies. Access it via the
                  <strong> $ </strong> icon in the navigation bar.
                </p>
                <p className="text-[12px] text-text-muted">
                  <strong>Supported currencies:</strong> USD, EUR, GBP, NGN, CNY, ZAR, CAD, AUD
                </p>
              </div>

              {/* SSNIT Calculator */}
              <div
                className="p-5 rounded-xl"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calculator size={16} style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-[15px] font-semibold text-text-primary">SSNIT Calculator</h3>
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Calculate your Social Security contributions at a glance. Enter your basic salary
                  to see the breakdown.
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                    <div className="text-[18px] font-bold text-text-primary">5.5%</div>
                    <div className="text-[11px] text-text-muted mt-1">Employee</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                    <div className="text-[18px] font-bold text-text-primary">13%</div>
                    <div className="text-[11px] text-text-muted mt-1">Employer</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                    <div className="text-[18px] font-bold" style={{ color: 'var(--color-accent)' }}>18.5%</div>
                    <div className="text-[11px] text-text-muted mt-1">Total</div>
                  </div>
                </div>
                <p className="text-[12px] text-text-muted mt-3">
                  The calculator also shows your estimated take-home pay after deductions.
                </p>
              </div>

              {/* Twi Dictionary */}
              <div
                className="p-5 rounded-xl"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Languages size={16} style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-[15px] font-semibold text-text-primary">Twi Dictionary</h3>
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  A built-in dictionary with 57 words and phrases across categories: Greetings,
                  Government, Numbers, Common Words, and Phrases. Supports bidirectional search
                  (English to Twi and Twi to English).
                </p>
              </div>

              {/* Government Portal Hub */}
              <div
                className="p-5 rounded-xl"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={16} style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-[15px] font-semibold text-text-primary">Government Portal Hub</h3>
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Quick access to essential Ghanaian government portals, all in one place.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Ghana.gov', 'GIFMIS', 'CAGD', 'GRA', 'SSNIT', 'PSC', 'GHS', 'MOF', 'OHCS', 'E-SPAR'].map((portal) => (
                    <span
                      key={portal}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium text-text-secondary"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}
                    >
                      {portal}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div ref={setSectionRef('shortcuts')} className="mb-16">
            <SectionHeading icon={Keyboard} title="Keyboard Shortcuts" />

            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border-1)' }}>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-text-muted uppercase tracking-wide">Shortcut</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-text-muted uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="px-5">
                  <tr><td colSpan={2} className="px-5 pt-4 pb-2 text-[11px] font-bold text-text-muted uppercase tracking-wider">Tabs</td></tr>
                  <Shortcut keys="Ctrl+T" desc="Open a new tab" />
                  <Shortcut keys="Ctrl+W" desc="Close the current tab" />
                  <Shortcut keys="Ctrl+Tab" desc="Switch to the next tab" />
                  <Shortcut keys="Ctrl+Shift+Tab" desc="Switch to the previous tab" />
                  <Shortcut keys="Ctrl+Shift+T" desc="Reopen the last closed tab" />

                  <tr><td colSpan={2} className="px-5 pt-6 pb-2 text-[11px] font-bold text-text-muted uppercase tracking-wider">Navigation</td></tr>
                  <Shortcut keys="Ctrl+K" desc="Open the Command Palette" />
                  <Shortcut keys="Ctrl+L" desc="Focus the address bar" />
                  <Shortcut keys="F5" desc="Reload the current page" />
                  <Shortcut keys="F11" desc="Toggle fullscreen mode" />
                  <Shortcut keys="Escape" desc="Close the active panel" />

                  <tr><td colSpan={2} className="px-5 pt-6 pb-2 text-[11px] font-bold text-text-muted uppercase tracking-wider">Tools</td></tr>
                  <Shortcut keys="Ctrl+J" desc="Open the AI Assistant" />
                  <Shortcut keys="Ctrl+Shift+O" desc="Open AskOzzy deep research" />
                  <Shortcut keys="Ctrl+Shift+S" desc="Toggle Split Screen view" />
                  <Shortcut keys="Ctrl+H" desc="Open browsing history" />
                  <Shortcut keys="Ctrl+B" desc="Open bookmarks" />
                  <Shortcut keys="Ctrl+D" desc="Bookmark the current page" />
                </tbody>
              </table>
            </div>
          </div>

          {/* Privacy & Security */}
          <div ref={setSectionRef('privacy')} className="mb-16">
            <SectionHeading icon={Shield} title="Privacy & Security" />

            <div className="space-y-4">
              {[
                {
                  title: 'Local-first Data Storage',
                  desc: 'All your browsing data, bookmarks, history, and settings are stored locally on your device. Nothing is sent to external servers.',
                },
                {
                  title: 'No Cloud Telemetry',
                  desc: 'OS Browser does not collect usage analytics, track your browsing habits, or send telemetry data to any cloud service.',
                },
                {
                  title: 'Network-level Ad Blocking',
                  desc: 'Built-in ad blocker uses EasyList-based patterns to block ads and trackers at the network level before they load.',
                },
                {
                  title: 'Government Domain Whitelisting',
                  desc: 'Domains ending in .gov.gh, .mil.gh, and .edu.gh are automatically whitelisted to ensure uninterrupted access to official services.',
                },
                {
                  title: 'Privacy Mode',
                  desc: 'Enable Privacy Mode to browse without saving history, cache, or logs. Your session leaves no trace on the device.',
                },
                {
                  title: 'Private Windows',
                  desc: 'Open a private window for a completely separate session with its own cache and cookies. Features a dark theme to visually indicate private browsing.',
                },
                {
                  title: 'Encrypted Credential Storage',
                  desc: 'Saved passwords and autofill data are stored using encrypted storage, keeping your credentials safe even if the device is shared.',
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <ChevronRight size={14} className="shrink-0 mt-1" style={{ color: 'var(--color-accent)' }} />
                  <div>
                    <h4 className="text-[14px] font-semibold text-text-primary mb-0.5">{item.title}</h4>
                    <p className="text-[13px] text-text-secondary leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div ref={setSectionRef('settings')} className="mb-16">
            <SectionHeading icon={Settings} title="Settings" />

            <p className="text-[13px] text-text-secondary leading-relaxed mb-5">
              Access Settings from the menu or by navigating to <span className="font-mono text-[12px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-2)' }}>os-browser://settings</span>.
              Available options include:
            </p>

            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border-1)' }}>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-text-muted uppercase tracking-wide">Setting</th>
                    <th className="px-5 py-3 text-left text-[12px] font-semibold text-text-muted uppercase tracking-wide">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { setting: 'On Startup', options: 'New Tab page, or Continue where you left off' },
                    { setting: 'Theme', options: 'Light, Dark, or System (follows OS preference)' },
                    { setting: 'Search Engine', options: 'Google, DuckDuckGo, or Bing' },
                    { setting: 'Default AI Model', options: 'Choose from 6 available language models' },
                    { setting: 'Ad Blocking', options: 'Enable or disable the built-in ad blocker' },
                    { setting: 'Privacy Mode', options: 'Toggle persistent privacy mode on or off' },
                    { setting: 'Language', options: 'English or Twi' },
                  ].map((row) => (
                    <tr key={row.setting} style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                      <td className="px-5 py-3 text-[13px] font-medium text-text-primary">{row.setting}</td>
                      <td className="px-5 py-3 text-[13px] text-text-secondary">{row.options}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Troubleshooting */}
          <div ref={setSectionRef('troubleshooting')} className="mb-16">
            <SectionHeading icon={HelpCircle} title="Troubleshooting" />

            <div className="space-y-4">
              {[
                {
                  q: 'Browser will not start',
                  a: 'Try reinstalling OS Browser from www.osbrowser.askozzy.work. Ensure you are running Windows 10 or 11 (64-bit).',
                },
                {
                  q: 'Pages are not loading',
                  a: 'Check your internet connection. If a specific site fails to load, try disabling the ad blocker for that site — some sites may conflict with blocking rules.',
                },
                {
                  q: 'AI Assistant is not responding',
                  a: 'The AI features require an active internet connection. The AI models run on Cloudflare Workers, so check your connectivity and try again.',
                },
                {
                  q: 'Browser feels slow',
                  a: 'Close unused tabs to free up memory. Focus Mode can help by blocking distracting sites and limiting your tab count.',
                },
                {
                  q: 'How do I clear all browsing data?',
                  a: 'Go to Settings and select "Delete browsing data" to clear history, cache, cookies, and saved passwords.',
                },
                {
                  q: 'How do I completely reset the browser?',
                  a: 'Uninstall OS Browser and reinstall it. Your data is stored in the %APPDATA% directory and will be removed during uninstallation.',
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="p-4 rounded-xl"
                  style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
                >
                  <h4 className="text-[14px] font-semibold text-text-primary mb-2">{item.q}</h4>
                  <p className="text-[13px] text-text-secondary leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* About */}
          <div ref={setSectionRef('about')} className="mb-16">
            <SectionHeading icon={Info} title="About" />

            <div
              className="p-6 rounded-xl text-center"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                <Globe size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-[20px] font-bold text-text-primary mb-1">OS Browser</h3>
              <p className="text-[13px] text-text-muted mb-6">Version 1.0.0</p>

              <div className="space-y-3 text-left max-w-sm mx-auto">
                <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                  <span className="text-[13px] text-text-muted">Built by</span>
                  <span className="text-[13px] font-medium text-text-primary">OHCS</span>
                </div>
                <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                  <span className="text-[13px] text-text-muted">Full name</span>
                  <span className="text-[13px] font-medium text-text-primary">Office of the Head of Civil Service</span>
                </div>
                <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                  <span className="text-[13px] text-text-muted">Website</span>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--color-accent)' }}>www.osbrowser.askozzy.work</span>
                </div>
                <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                  <span className="text-[13px] text-text-muted">Source code</span>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--color-accent)' }}>github.com/ghwmelite-dotcom/OS-Browser</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[13px] text-text-muted">Report issues</span>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--color-accent)' }}>github.com/ghwmelite-dotcom/OS-Browser/issues</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
