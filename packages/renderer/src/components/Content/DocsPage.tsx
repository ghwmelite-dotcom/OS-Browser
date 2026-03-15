import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Keyboard, MessageSquare, Shield, Globe, Info, Zap, ChevronRight,
  Monitor, Search, Languages, Wifi, WifiOff, Battery, Building2, CreditCard,
  FileText, Download, Camera, Brain, Lock, Sidebar, Terminal, BarChart3,
  Smartphone, Users, Eye, Server, IdCard
} from 'lucide-react';

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const SECTIONS: Section[] = [
  { id: 'getting-started', label: 'Getting Started', icon: Zap, color: '#FCD116' },
  { id: 'kente-system', label: 'The Kente System', icon: Monitor, color: '#CE1126' },
  { id: 'infrastructure', label: 'Infrastructure', icon: Server, color: '#006B3F' },
  { id: 'government', label: 'Government', icon: Building2, color: '#CE1126' },
  { id: 'productivity', label: 'Productivity', icon: FileText, color: '#6366F1' },
  { id: 'communication', label: 'Communication', icon: Languages, color: '#0EA5E9' },
  { id: 'finance', label: 'Finance', icon: CreditCard, color: '#F59E0B' },
  { id: 'intelligence', label: 'Intelligence', icon: Brain, color: '#8B5CF6' },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard, color: '#64748B' },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield, color: '#10B981' },
  { id: 'about', label: 'About OS Browser', icon: Info, color: '#CE1126' },
];

export function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
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
            if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
              setActiveSection(id);
            }
          });
        },
        { root: container, threshold: 0.15 }
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

  const filteredSections = searchQuery.trim()
    ? SECTIONS.filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : SECTIONS;

  const isSectionVisible = (id: string) => {
    if (!searchQuery.trim()) return true;
    const section = SECTIONS.find(s => s.id === id);
    return section ? section.label.toLowerCase().includes(searchQuery.toLowerCase()) : false;
  };

  const SectionHeading = ({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color?: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color || 'var(--color-accent)', color: '#fff' }}
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

  const FeatureBlock = ({ icon: Icon, title, children, accentColor }: { icon: React.ElementType; title: string; children: React.ReactNode; accentColor?: string }) => (
    <div
      className="p-5 rounded-xl mb-4"
      style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color: accentColor || 'var(--color-accent)' }} />
        <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3>
      </div>
      {children}
    </div>
  );

  const BulletItem = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-2">
      <ChevronRight size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
      <span>{children}</span>
    </li>
  );

  const InlineUrl = ({ url }: { url: string }) => (
    <span className="font-mono text-[12px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-2)' }}>{url}</span>
  );

  const KbdInline = ({ children }: { children: string }) => (
    <kbd className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}>
      {children}
    </kbd>
  );

  return (
    <div className="flex h-full" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside
        className="w-[220px] shrink-0 border-r overflow-y-auto py-6 px-3"
        style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}
      >
        <div className="flex items-center gap-2.5 px-3 mb-5">
          <BookOpen size={20} style={{ color: 'var(--color-accent)' }} strokeWidth={1.8} />
          <span className="text-[14px] font-bold text-text-primary">Knowledge Centre</span>
        </div>

        <nav className="flex flex-col gap-0.5">
          {SECTIONS.map(({ id, label, icon: Icon, color }) => {
            const isActive = activeSection === id;
            const matchesSearch = !searchQuery.trim() || label.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return null;
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 w-full"
                style={{
                  background: isActive ? 'var(--color-surface-2)' : 'transparent',
                  borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                }}
              >
                <div className="relative shrink-0">
                  <Icon
                    size={14}
                    strokeWidth={1.8}
                    style={{ color: isActive ? color : 'var(--color-text-muted)' }}
                  />
                  <div
                    className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: color, opacity: isActive ? 1 : 0.4 }}
                  />
                </div>
                <span
                  className="text-[12px] font-medium"
                  style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-6 mx-3 p-3 rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-[11px] text-text-muted leading-relaxed">OS Browser v1.0.0</p>
          <p className="text-[11px] text-text-muted mt-1">Built in Ghana, for Ghana</p>
        </div>
      </aside>

      {/* Content */}
      <main ref={contentRef} className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-[760px] mx-auto px-8 py-10">

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-[28px] font-bold text-text-primary mb-2">OS Browser Knowledge Centre</h1>
            <p className="text-[14px] text-text-secondary mb-5">
              Everything you need to know about Ghana's purpose-built desktop browser.
            </p>
            {/* Search bar */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search sections..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[14px] outline-none border"
                style={{
                  background: 'var(--color-surface-1)',
                  borderColor: 'var(--color-border-1)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>

          {/* Getting Started */}
          {isSectionVisible('getting-started') && (
            <div ref={setSectionRef('getting-started')} className="mb-16">
              <SectionHeading icon={Zap} title="Getting Started" color="#FCD116" />

              <div
                className="p-5 rounded-xl mb-6"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
              >
                <p className="text-[14px] text-text-primary leading-relaxed">
                  Welcome to <strong>OS Browser</strong> — Ghana's purpose-built desktop browser, designed for civil servants
                  and government workers. With 12 specialised features across productivity, communication, government services,
                  and more, OS Browser transforms your daily work experience.
                </p>
              </div>

              <h3 className="text-[16px] font-semibold text-text-primary mb-3">What is OS Browser?</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed mb-6">
                OS Browser is a modern Chromium-based browser built specifically for Ghana's public sector. It comes pre-loaded
                with tools to access government portals, manage mobile money, translate between Ghanaian languages, send encrypted
                messages to fellow civil servants, and much more — all while keeping your data private and stored locally on your device.
              </p>

              <h3 className="text-[16px] font-semibold text-text-primary mb-3">Setting Up Your Profile</h3>
              <ul className="text-[13px] text-text-secondary space-y-2 mb-6 ml-1">
                <BulletItem>On first launch, the onboarding guide will walk you through entering your name and email</BulletItem>
                <BulletItem>Your profile generates a personalised avatar displayed throughout the browser</BulletItem>
                <BulletItem>All profile data is stored locally — never sent to any server</BulletItem>
              </ul>

              <h3 className="text-[16px] font-semibold text-text-primary mb-3">First Steps</h3>
              <ol className="text-[13px] text-text-secondary space-y-2 mb-6 ml-1 list-decimal list-inside">
                <li>Browse the web as you normally would — the address bar works just like any browser</li>
                <li>Press <KbdInline>Ctrl+K</KbdInline> to open the Command Bar — find any feature, tab, or action instantly</li>
                <li>Explore the sidebar on the left — each icon represents a feature from the Kente System</li>
                <li>Check the status bar below the bookmarks for passive monitoring (data usage, network status)</li>
              </ol>
            </div>
          )}

          {/* The Kente System */}
          {isSectionVisible('kente-system') && (
            <div ref={setSectionRef('kente-system')} className="mb-16">
              <SectionHeading icon={Monitor} title="The Kente System" color="#CE1126" />

              <div
                className="p-5 rounded-xl mb-6"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
              >
                <p className="text-[14px] text-text-primary leading-relaxed">
                  The Kente System is the architectural pattern that organises all 12 features across 4 surfaces in OS Browser.
                  Like the interwoven strips of a Kente cloth, each surface has a distinct purpose, and together they ensure
                  you can access any feature in under 2 seconds.
                </p>
              </div>

              <h3 className="text-[16px] font-semibold text-text-primary mb-4">The 4 Surfaces</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sidebar size={16} style={{ color: '#CE1126' }} />
                    <h4 className="text-[14px] font-semibold text-text-primary">Sidebar (Icon Rail)</h4>
                  </div>
                  <p className="text-[12px] text-text-muted leading-relaxed">
                    The left edge of the browser. An icon rail where each icon opens a feature panel. Your primary workspace for
                    Government Services, Messenger, Translation, Documents, and more.
                  </p>
                </div>

                <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={16} style={{ color: '#006B3F' }} />
                    <h4 className="text-[14px] font-semibold text-text-primary">Toolbar (Page Actions)</h4>
                  </div>
                  <p className="text-[12px] text-text-muted leading-relaxed">
                    The address bar area. Contains page-specific actions like Translation, Screenshot, and Data Saver toggles.
                    Actions that apply to what you are currently viewing.
                  </p>
                </div>

                <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal size={16} style={{ color: '#6366F1' }} />
                    <h4 className="text-[14px] font-semibold text-text-primary">Command Bar (Ctrl+K)</h4>
                  </div>
                  <p className="text-[12px] text-text-muted leading-relaxed">
                    A universal search interface. Press <KbdInline>Ctrl+K</KbdInline> to find any feature, tab, action, or
                    setting by typing. The fastest way to navigate OS Browser.
                  </p>
                </div>

                <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={16} style={{ color: '#F59E0B' }} />
                    <h4 className="text-[14px] font-semibold text-text-primary">Status Bar</h4>
                  </div>
                  <p className="text-[12px] text-text-muted leading-relaxed">
                    Below the bookmarks bar. Displays passive monitoring — data budget usage, network quality, Dumsor Guard status.
                    Always visible, never intrusive.
                  </p>
                </div>
              </div>

              <h3 className="text-[16px] font-semibold text-text-primary mb-3">How Features Auto-Distribute</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
                Each of the 12 features belongs to one of 6 categories (Infrastructure, Government, Productivity, Communication,
                Finance, Intelligence) and automatically distributes its controls across the appropriate surfaces. For example,
                the Translation feature has a toolbar icon for quick translate, a sidebar panel for the full phrase library,
                and an entry in the Command Bar for keyboard-driven access.
              </p>
            </div>
          )}

          {/* Infrastructure */}
          {isSectionVisible('infrastructure') && (
            <div ref={setSectionRef('infrastructure')} className="mb-16">
              <SectionHeading icon={Server} title="Infrastructure" color="#006B3F" />

              <FeatureBlock icon={BarChart3} title="Data Saver" accentColor="#006B3F">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Track your mobile data usage in real Ghana Cedis (GH&#x20B5;). Set monthly budgets per network and
                  get alerts before you overspend.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 ml-1">
                  <BulletItem>Set per-network budgets for <strong>MTN</strong>, <strong>Telecel</strong>, and <strong>AT</strong></BulletItem>
                  <BulletItem>Toggle <strong>Lite Mode</strong> with <KbdInline>Ctrl+Shift+L</KbdInline> to compress pages and block heavy media</BulletItem>
                  <BulletItem>View the full data dashboard at <InlineUrl url="os-browser://data" /></BulletItem>
                  <BulletItem>Status bar shows real-time GH&#x20B5; spend and remaining budget</BulletItem>
                </ul>
              </FeatureBlock>

              <FeatureBlock icon={Battery} title="Dumsor Guard" accentColor="#006B3F">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Named after Ghana's intermittent power outages, Dumsor Guard ensures you never lose work.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 ml-1">
                  <BulletItem><strong>Auto-saves</strong> every 30 seconds — tabs, form data, scroll positions</BulletItem>
                  <BulletItem><strong>Recovery</strong> after power outage — restores your exact session on relaunch</BulletItem>
                  <BulletItem><strong>Session protection</strong> — detects abrupt shutdowns and offers full restore</BulletItem>
                </ul>
              </FeatureBlock>

              <FeatureBlock icon={Wifi} title="Network Manager" accentColor="#006B3F">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Intelligent connection monitoring that adapts the browser to your current network quality.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 ml-1">
                  <BulletItem>Real-time connection quality monitoring with speed indicators in the status bar</BulletItem>
                  <BulletItem>Auto-suspends background tabs on slow connections to preserve bandwidth</BulletItem>
                  <BulletItem>Visual traffic-light indicator: green (good), amber (fair), red (poor)</BulletItem>
                </ul>
              </FeatureBlock>
            </div>
          )}

          {/* Government */}
          {isSectionVisible('government') && (
            <div ref={setSectionRef('government')} className="mb-16">
              <SectionHeading icon={Building2} title="Government" color="#CE1126" />

              <FeatureBlock icon={Globe} title="Gov Services Hub" accentColor="#CE1126">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  One-click access to 25+ Ghanaian government portals, searchable and categorised.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 mb-4 ml-1">
                  <BulletItem>Portals include <strong>GIFMIS, GRA, SSNIT, NIA, CAGD, PSC, GHS, MOF, OHCS, E-SPAR, Ghana.gov</strong> and more</BulletItem>
                  <BulletItem>Search and filter by category (Finance, Health, Education, etc.)</BulletItem>
                  <BulletItem>Pin your most-used portals as favourites for quick access</BulletItem>
                  <BulletItem>Open the full hub at <InlineUrl url="os-browser://gov" /></BulletItem>
                </ul>
                <div className="flex flex-wrap gap-2">
                  {['GIFMIS', 'GRA', 'SSNIT', 'NIA', 'CAGD', 'PSC', 'GHS', 'MOF', 'OHCS', 'E-SPAR', 'Ghana.gov', 'NHIS'].map((portal) => (
                    <span
                      key={portal}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium text-text-secondary"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}
                    >
                      {portal}
                    </span>
                  ))}
                </div>
              </FeatureBlock>

              <FeatureBlock icon={IdCard} title="GhanaCard Identity" accentColor="#CE1126">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Securely store your GhanaCard details and civil service credentials for auto-fill on government sites.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 ml-1">
                  <BulletItem>Store your <strong>GhanaCard number</strong> and civil service credentials locally</BulletItem>
                  <BulletItem>Auto-fill on <strong>.gov.gh</strong> sites when filling forms that request your ID</BulletItem>
                  <BulletItem>All data stored <strong>locally only</strong> — encrypted on your device, never transmitted</BulletItem>
                </ul>
              </FeatureBlock>
            </div>
          )}

          {/* Productivity */}
          {isSectionVisible('productivity') && (
            <div ref={setSectionRef('productivity')} className="mb-16">
              <SectionHeading icon={FileText} title="Productivity" color="#6366F1" />

              <FeatureBlock icon={FileText} title="Document Workspace" accentColor="#6366F1">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  View and organise government documents in one centralised workspace.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 ml-1">
                  <BulletItem>Organise documents into <strong>collections</strong> by project or department</BulletItem>
                  <BulletItem>Preview PDF documents without leaving the browser</BulletItem>
                  <BulletItem>Access at <InlineUrl url="os-browser://documents" /></BulletItem>
                </ul>
              </FeatureBlock>

              <FeatureBlock icon={Download} title="Offline Library" accentColor="#6366F1">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Save pages for offline access — essential for areas with unreliable connectivity.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 ml-1">
                  <BulletItem>Save any page with <KbdInline>Ctrl+Shift+S</KbdInline></BulletItem>
                  <BulletItem>Auto-caches <strong>.gov.gh</strong> sites you visit frequently</BulletItem>
                  <BulletItem>Queues form submissions when offline and sends them when back online</BulletItem>
                  <BulletItem>Browse your saved pages at <InlineUrl url="os-browser://offline" /></BulletItem>
                </ul>
              </FeatureBlock>

              <FeatureBlock icon={Camera} title="Screenshot-to-Report" accentColor="#6366F1">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Capture, annotate, stamp, and generate official PDF reports from screenshots.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 ml-1">
                  <BulletItem><strong>Capture</strong> the visible area or full page with <KbdInline>Ctrl+Shift+X</KbdInline></BulletItem>
                  <BulletItem><strong>Annotate</strong> with text, arrows, highlights, and redactions</BulletItem>
                  <BulletItem><strong>Stamp</strong> with official stamps: Approved, Reviewed, Draft, or Confidential</BulletItem>
                  <BulletItem><strong>Generate</strong> an official PDF report with metadata, timestamps, and annotations included</BulletItem>
                </ul>
              </FeatureBlock>
            </div>
          )}

          {/* Communication */}
          {isSectionVisible('communication') && (
            <div ref={setSectionRef('communication')} className="mb-16">
              <SectionHeading icon={Languages} title="Communication" color="#0EA5E9" />

              <FeatureBlock icon={Globe} title="Translation" accentColor="#0EA5E9">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Translate between 7 Ghanaian languages with 45+ offline phrases per language pair.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 mb-4 ml-1">
                  <BulletItem>Supported languages: <strong>English, Twi, Ga, Ewe, Dagbani, Hausa, Fante</strong></BulletItem>
                  <BulletItem>45+ common phrases available offline for each pair — no internet required</BulletItem>
                  <BulletItem>Access from the <strong>globe icon</strong> in the toolbar</BulletItem>
                  <BulletItem>Also available via Command Bar (<KbdInline>Ctrl+K</KbdInline> then type "translate")</BulletItem>
                </ul>
                <div className="flex flex-wrap gap-2">
                  {['English', 'Twi', 'Ga', 'Ewe', 'Dagbani', 'Hausa', 'Fante'].map((lang) => (
                    <span
                      key={lang}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium text-text-secondary"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </FeatureBlock>

              <FeatureBlock icon={Lock} title="Encrypted Messenger" accentColor="#0EA5E9">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Real-time end-to-end encrypted messaging built exclusively for .gov.gh email holders.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 ml-1">
                  <BulletItem>Open with <KbdInline>Ctrl+Shift+M</KbdInline> or from the sidebar</BulletItem>
                  <BulletItem><strong>ECDH P-256</strong> key exchange + <strong>AES-GCM 256-bit</strong> encryption — military-grade security</BulletItem>
                  <BulletItem>Auto-approved registration for <strong>.gov.gh</strong> email addresses</BulletItem>
                  <BulletItem><strong>WebSocket</strong> real-time delivery — messages arrive instantly</BulletItem>
                  <BulletItem>Messages are encrypted on your device before sending — the server never sees plaintext</BulletItem>
                </ul>
              </FeatureBlock>
            </div>
          )}

          {/* Finance */}
          {isSectionVisible('finance') && (
            <div ref={setSectionRef('finance')} className="mb-16">
              <SectionHeading icon={CreditCard} title="Finance" color="#F59E0B" />

              <FeatureBlock icon={Smartphone} title="Mobile Money Quick Pay" accentColor="#F59E0B">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  Manage your mobile money accounts and track payments directly from the browser.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 mb-4 ml-1">
                  <BulletItem>Link accounts from <strong>MTN MoMo</strong>, <strong>Telecel Cash</strong>, and <strong>AirtelTigo Money</strong></BulletItem>
                  <BulletItem>View <strong>payment receipts</strong> with full transaction details</BulletItem>
                  <BulletItem>Generate <strong>monthly statements</strong> for record-keeping</BulletItem>
                  <BulletItem><strong>Budget tracking</strong> with GH&#x20B5; formatting — see where your money goes</BulletItem>
                </ul>
                <div className="flex flex-wrap gap-3">
                  {['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money'].map((provider) => (
                    <div
                      key={provider}
                      className="px-3 py-2 rounded-lg text-[12px] font-medium text-text-primary text-center"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}
                    >
                      {provider}
                    </div>
                  ))}
                </div>
              </FeatureBlock>
            </div>
          )}

          {/* Intelligence */}
          {isSectionVisible('intelligence') && (
            <div ref={setSectionRef('intelligence')} className="mb-16">
              <SectionHeading icon={Brain} title="Intelligence" color="#8B5CF6" />

              <FeatureBlock icon={Brain} title="Digital Literacy AI" accentColor="#8B5CF6">
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  An intelligent assistant that helps you understand government websites and fill forms correctly.
                </p>
                <ul className="text-[13px] text-text-secondary space-y-2 mb-4 ml-1">
                  <BulletItem><strong>Page Explainer</strong> — simplifies complex government pages into plain language</BulletItem>
                  <BulletItem><strong>Form Filling Guides</strong> — step-by-step help for GRA tax returns, SSNIT contributions, NHIS registration, E-SPAR submissions, and Ghana.gov applications</BulletItem>
                  <BulletItem><strong>Phishing Detection</strong> — automatically scans pages and shows a traffic-light rating:
                    <span className="inline-flex items-center gap-1 ml-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#22C55E' }} /> Safe
                      <span className="w-2 h-2 rounded-full inline-block ml-2" style={{ background: '#F59E0B' }} /> Caution
                      <span className="w-2 h-2 rounded-full inline-block ml-2" style={{ background: '#EF4444' }} /> Danger
                    </span>
                  </BulletItem>
                </ul>
                <div className="flex flex-wrap gap-2">
                  {['GRA', 'SSNIT', 'NHIS', 'E-SPAR', 'Ghana.gov'].map((form) => (
                    <span
                      key={form}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium text-text-secondary"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-1)' }}
                    >
                      {form} Forms
                    </span>
                  ))}
                </div>
              </FeatureBlock>
            </div>
          )}

          {/* Keyboard Shortcuts */}
          {isSectionVisible('shortcuts') && (
            <div ref={setSectionRef('shortcuts')} className="mb-16">
              <SectionHeading icon={Keyboard} title="Keyboard Shortcuts" color="#64748B" />

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
                    <tr><td colSpan={2} className="px-5 pt-4 pb-2 text-[11px] font-bold text-text-muted uppercase tracking-wider">Navigation</td></tr>
                    <Shortcut keys="Ctrl+K" desc="Open Command Bar" />
                    <Shortcut keys="Ctrl+\" desc="Toggle Sidebar" />
                    <Shortcut keys="Ctrl+T" desc="New Tab" />
                    <Shortcut keys="Ctrl+W" desc="Close Tab" />
                    <Shortcut keys="F5" desc="Reload Page" />
                    <Shortcut keys="F11" desc="Toggle Fullscreen" />

                    <tr><td colSpan={2} className="px-5 pt-6 pb-2 text-[11px] font-bold text-text-muted uppercase tracking-wider">Browsing</td></tr>
                    <Shortcut keys="Ctrl+H" desc="History" />
                    <Shortcut keys="Ctrl+B" desc="Bookmarks" />
                    <Shortcut keys="Ctrl+D" desc="Bookmark Current Page" />
                    <Shortcut keys="Ctrl+Shift+N" desc="Private Window" />

                    <tr><td colSpan={2} className="px-5 pt-6 pb-2 text-[11px] font-bold text-text-muted uppercase tracking-wider">Features</td></tr>
                    <Shortcut keys="Ctrl+Shift+S" desc="Save Page Offline" />
                    <Shortcut keys="Ctrl+Shift+O" desc="AskOzzy" />
                    <Shortcut keys="Ctrl+J" desc="AI Assistant" />
                    <Shortcut keys="Ctrl+Shift+M" desc="Encrypted Messenger" />
                    <Shortcut keys="Ctrl+Shift+X" desc="Screenshot-to-Report" />
                    <Shortcut keys="Ctrl+Shift+L" desc="Toggle Lite Mode (Data Saver)" />
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Privacy & Security */}
          {isSectionVisible('privacy') && (
            <div ref={setSectionRef('privacy')} className="mb-16">
              <SectionHeading icon={Shield} title="Privacy & Security" color="#10B981" />

              <div className="space-y-4">
                {[
                  {
                    title: 'Local-First Data Storage',
                    desc: 'All browsing data, bookmarks, history, credentials, and settings are stored locally on your device. Nothing is sent to external servers or cloud services.',
                  },
                  {
                    title: 'No Cloud Telemetry',
                    desc: 'OS Browser does not collect usage analytics, track your browsing habits, or send telemetry data to any service. Your activity is yours alone.',
                  },
                  {
                    title: 'End-to-End Encrypted Messaging',
                    desc: 'The Encrypted Messenger uses ECDH P-256 key exchange and AES-GCM 256-bit encryption. Messages are encrypted on your device before transmission — the server never sees plaintext.',
                  },
                  {
                    title: 'Government Domain Validation',
                    desc: 'OS Browser validates .gov.gh domains to ensure you are accessing legitimate government services. The GhanaCard Identity feature only auto-fills on verified government sites.',
                  },
                  {
                    title: 'Encrypted Credential Storage',
                    desc: 'GhanaCard details, mobile money references, and saved passwords are stored using encrypted local storage. Even on shared devices, your data remains protected.',
                  },
                  {
                    title: 'Private Windows',
                    desc: 'Open a private window (Ctrl+Shift+N) for a completely separate session. No history, cache, or cookies are retained after the window closes.',
                  },
                  {
                    title: 'Phishing Protection',
                    desc: 'The Digital Literacy AI scans pages in real time and assigns a traffic-light safety rating, warning you before you interact with potentially fraudulent sites.',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <ChevronRight size={14} className="shrink-0 mt-1" style={{ color: '#10B981' }} />
                    <div>
                      <h4 className="text-[14px] font-semibold text-text-primary mb-0.5">{item.title}</h4>
                      <p className="text-[13px] text-text-secondary leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          {isSectionVisible('about') && (
            <div ref={setSectionRef('about')} className="mb-16">
              <SectionHeading icon={Info} title="About OS Browser" color="#CE1126" />

              <div
                className="p-6 rounded-xl text-center"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' }}
              >
                {/* Ghana flag stripe accent */}
                <div className="flex h-1 rounded-full overflow-hidden mb-6 mx-auto max-w-[200px]">
                  <div className="flex-1" style={{ background: '#CE1126' }} />
                  <div className="flex-1" style={{ background: '#FCD116' }} />
                  <div className="flex-1" style={{ background: '#006B3F' }} />
                </div>

                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--color-accent)', color: '#fff' }}
                >
                  <Globe size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-[20px] font-bold text-text-primary mb-1">OS Browser</h3>
                <p className="text-[13px] text-text-muted mb-1">Version 1.0.0</p>
                <p className="text-[13px] text-text-muted mb-6">Built in Ghana, for Ghana</p>

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
                    <span className="text-[13px] text-text-muted">Features</span>
                    <span className="text-[13px] font-medium text-text-primary">12 features, 6 categories</span>
                  </div>
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                    <span className="text-[13px] text-text-muted">Architecture</span>
                    <span className="text-[13px] font-medium text-text-primary">The Kente System</span>
                  </div>
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                    <span className="text-[13px] text-text-muted">Website</span>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--color-accent)' }}>www.osbrowser.askozzy.work</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-text-muted">Source code</span>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--color-accent)' }}>github.com/ghwmelite-dotcom/OS-Browser</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
