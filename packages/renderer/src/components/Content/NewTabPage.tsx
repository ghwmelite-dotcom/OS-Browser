import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  FileText,
  Languages,
  BookOpen,
  PenTool,
  GitCompare,
  Sparkles,
  ExternalLink,
  Clock,
  Globe,
  Zap,
  Shield,
  Download,
  Users,
} from 'lucide-react';
import { useTabsStore } from '@/store/tabs';
import { useStatsStore } from '@/store/stats';
import { useSettingsStore } from '@/store/settings';
import { useSidebarStore } from '@/store/sidebar';

// Intentionally no module-level navigate helper — the component uses
// useNavigationStore().navigate (same path as the OmniBar) so that
// ContentArea's isNewTab check flips correctly.

interface GovPortal {
  id: number;
  name: string;
  url: string;
  category: string;
  icon_path: string | null;
}

interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  last_visited_at: string;
  favicon_url?: string;
}

/* ── Relative time formatter ── */
function relativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime()) || date.getFullYear() < 2020) return 'Recently';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'Just now';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/* ── Category colors for portal tags ── */
const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  General: { bg: 'bg-ghana-gold-dim', text: 'text-ghana-gold' },
  Finance: { bg: 'bg-green-500/10', text: 'text-green-400' },
  Payroll: { bg: 'bg-blue-400/10', text: 'text-blue-400' },
  Tax: { bg: 'bg-red-400/10', text: 'text-red-400' },
  Pensions: { bg: 'bg-purple-400/10', text: 'text-purple-400' },
  HR: { bg: 'bg-ghana-gold-dim', text: 'text-ghana-gold' },
  'HR/Appraisal': { bg: 'bg-ghana-gold-dim', text: 'text-ghana-gold' },
  Health: { bg: 'bg-green-500/10', text: 'text-green-400' },
};

const DEFAULT_CATEGORY = { bg: 'bg-ghana-gold-dim', text: 'text-ghana-gold' };

const WORKER_URL = 'https://os-browser-worker.ghwmelite.workers.dev';

/* ── Milestone configuration ── */
const MILESTONE_CONFIG: Record<
  number,
  { name: string; level: string; confettiCount: number }
> = {
  500: { name: 'First 500', level: 'bronze', confettiCount: 20 },
  1000: { name: 'One Thousand Strong', level: 'silver', confettiCount: 25 },
  2500: { name: 'Community Rising', level: 'gold', confettiCount: 30 },
  5000: { name: 'Five Thousand', level: 'gold', confettiCount: 30 },
  10000: { name: 'Ten Thousand', level: 'platinum', confettiCount: 30 },
  25000: { name: 'Quarter Century', level: 'diamond', confettiCount: 30 },
  50000: { name: 'Fifty Thousand', level: 'star', confettiCount: 30 },
  100000: { name: 'One Hundred Thousand', level: 'blackstar', confettiCount: 30 },
};

const GHANA_COLORS = ['#D4A017', '#CE1126', '#006B3F', '#FCD116', '#ffffff'];

function getReachedMilestone(count: number): number | null {
  const lastCelebrated = parseInt(localStorage.getItem('os_ntp_milestone') || '0', 10);
  const milestones = Object.keys(MILESTONE_CONFIG)
    .map(Number)
    .sort((a, b) => a - b);
  for (const m of milestones) {
    if (count >= m && m > lastCelebrated) return m;
  }
  return null;
}

/* ── Lightweight CSS confetti for NTP ── */
function MilestoneCelebration({
  milestone,
  onDismiss,
}: {
  milestone: number;
  onDismiss: () => void;
}) {
  const config = MILESTONE_CONFIG[milestone];
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Generate confetti pieces
  const confettiPieces = useMemo(() => {
    if (prefersReducedMotion) return [];
    return Array.from({ length: config?.confettiCount || 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: Math.random() * 2 + 2,
      color: GHANA_COLORS[Math.floor(Math.random() * GHANA_COLORS.length)],
      size: Math.random() * 6 + 4,
      rotation: Math.random() * 360,
    }));
  }, [config?.confettiCount, prefersReducedMotion]);

  if (!config) return null;

  const levelGradients: Record<string, string> = {
    bronze: 'from-yellow-900/80 to-yellow-950/90',
    silver: 'from-yellow-900/80 via-yellow-800/70 to-yellow-950/90',
    gold: 'from-yellow-800/85 via-amber-700/70 to-yellow-900/85',
    platinum: 'from-green-900/85 via-yellow-800/70 to-green-950/85',
    diamond: 'from-purple-900/80 via-yellow-800/70 to-green-900/80',
    star: 'from-red-900/70 via-yellow-800/70 to-green-900/70',
    blackstar: 'from-red-900/70 via-yellow-700/80 to-green-900/70',
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.5)' }}
      onClick={onDismiss}
      role="dialog"
      aria-label="Milestone celebration"
    >
      {/* CSS Confetti */}
      {confettiPieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            background: p.color,
            borderRadius: p.id % 2 === 0 ? '50%' : '0',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confettiDrop ${p.duration}s ease-out ${p.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}

      {/* Celebration Card */}
      <div
        className={`relative rounded-[20px] p-8 text-center max-w-[360px] w-[90%] bg-gradient-to-br ${levelGradients[config.level] || levelGradients.bronze} border border-ghana-gold/20`}
        style={{
          boxShadow:
            '0 24px 80px rgba(0,0,0,0.5), 0 0 48px rgba(212,160,23,0.15)',
          animation: 'fadeUp 0.5s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ghana flag stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px] overflow-hidden"
          style={{
            background:
              'linear-gradient(90deg, #CE1126 0%, #CE1126 33%, #D4A017 33%, #D4A017 66%, #006B3F 66%, #006B3F 100%)',
          }}
        />

        {/* Star */}
        <div
          className="text-[56px] leading-none mb-3"
          style={{
            color: '#D4A017',
            textShadow:
              '0 0 24px rgba(212,160,23,0.5), 0 0 48px rgba(212,160,23,0.25)',
            animation: prefersReducedMotion
              ? 'none'
              : 'milestoneStarPulse 2s ease-in-out infinite',
          }}
        >
          &#9733;
        </div>

        <div
          className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2"
          style={{ color: '#D4A017', opacity: 0.8 }}
        >
          MILESTONE REACHED
        </div>

        <div
          className="text-[40px] font-bold leading-none mb-1"
          style={{
            color: 'var(--color-accent)',
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 0 20px rgba(212,160,23,0.3)',
          }}
        >
          {new Intl.NumberFormat().format(milestone)}
        </div>

        <div
          className="text-base font-semibold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {config.name}
        </div>

        <div className="text-sm italic" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}>
          Thank you, Ghana! &#127468;&#127469;
        </div>

        <button
          onClick={onDismiss}
          className="mt-4 px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105"
          style={{
            background: 'rgba(212,160,23,0.15)',
            border: '1px solid rgba(212,160,23,0.2)',
            color: '#D4A017',
          }}
        >
          Celebrate!
        </button>
      </div>
    </div>
  );
}

/* ── Animated number counter hook ── */
function useAnimatedCount(target: number, duration = 1500): number {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;
    const start = 0;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(start + (target - start) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return display;
}

/* ── Download Counter Widget ── */
function DownloadCounterWidget() {
  const [count, setCount] = useState(0);
  const [error, setError] = useState(false);
  const [nextMilestone, setNextMilestone] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [celebratingMilestone, setCelebratingMilestone] = useState<number | null>(null);
  const animatedCount = useAnimatedCount(count);

  const handleDismiss = useCallback(() => {
    setCelebratingMilestone(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchCount() {
      try {
        const res = await fetch(`${WORKER_URL}/api/v1/downloads/count`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (!cancelled) {
          setCount(data.count || 0);
          setError(false);
          setNextMilestone(data.nextMilestone ?? null);
          setProgress(data.progress ?? 0);

          // Check for milestone celebration
          const currentCount = data.count || 0;
          const reached = getReachedMilestone(currentCount);
          if (reached) {
            setCelebratingMilestone(reached);
            localStorage.setItem('os_ntp_milestone', String(reached));
          }
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }
    fetchCount();
    return () => { cancelled = true; };
  }, []);

  // Hide widget gracefully if API is unreachable and no cached count
  if (error && count === 0) return null;

  const formatter = new Intl.NumberFormat();

  return (
    <>
      {celebratingMilestone && (
        <MilestoneCelebration
          milestone={celebratingMilestone}
          onDismiss={handleDismiss}
        />
      )}
      <div
        className="glass rounded-[16px] p-5 text-center transition-all duration-300 hover:-translate-y-[2px]"
        style={{
          maxWidth: 220,
          margin: '0 auto',
          borderColor: 'rgba(212, 160, 23, 0.1)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Users size={14} className="text-ghana-gold" />
          <span
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-accent)' }}
          >
            OS Browser Community
          </span>
        </div>
        <div
          className="text-2xl font-bold mb-1"
          style={{
            color: 'var(--color-accent)',
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 0 16px rgba(212, 160, 23, 0.25)',
          }}
        >
          {formatter.format(animatedCount)}
        </div>
        <div className="flex items-center justify-center gap-1.5 text-text-muted">
          <Download size={11} />
          <span className="text-xs">downloads</span>
        </div>

        {/* Milestone progress */}
        {nextMilestone && (
          <div className="mt-3">
            <div
              className="h-[3px] rounded-full overflow-hidden"
              style={{ background: 'rgba(212, 160, 23, 0.1)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #D4A017, #F2C94C)',
                }}
              />
            </div>
            <div
              className="text-[9px] mt-1.5 text-text-muted opacity-50"
            >
              {formatter.format(nextMilestone - count)} to {formatter.format(nextMilestone)}
            </div>
          </div>
        )}

        <div
          className="text-[10px] mt-2 text-text-muted italic opacity-60"
        >
          Join the movement
        </div>
      </div>
    </>
  );
}

export function NewTabPage() {
  const [portals, setPortals] = useState<GovPortal[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>([]);
  const { activeTabId, createTab } = useTabsStore();
  const { totalAdsBlocked } = useStatsStore();
  const { settings } = useSettingsStore();
  const { openPanel } = useSidebarStore();

  useEffect(() => {
    window.osBrowser.govPortals
      .list()
      .then(setPortals)
      .catch(() => {});
    window.osBrowser.history
      .list(0)
      .then((entries: HistoryEntry[]) => {
        setRecentHistory(entries.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const isLoggedIn = settings?.display_name && settings.display_name !== 'User';
  const firstName = isLoggedIn ? settings!.display_name!.split(' ')[0] : '';

  const { greeting, emoji, subtitle } = useMemo(() => {
    const hour = new Date().getHours();
    const day = new Date().getDay(); // 0=Sun, 1=Mon...
    const isFriday = day === 5;
    const isWeekend = day === 0 || day === 6;
    const isMonday = day === 1;

    if (isLoggedIn) {
      // Personalized greetings for logged-in users
      if (hour < 5) return { greeting: 'Still up', emoji: '🌙', subtitle: 'Burning the midnight oil? Remember to rest!' };
      if (hour < 9) return { greeting: 'Good morning', emoji: '☀️', subtitle: isMonday ? 'New week, new goals! Let\'s make it count' : 'Ready to make today great?' };
      if (hour < 12) return { greeting: 'Hey there', emoji: '👋', subtitle: 'What are you working on today?' };
      if (hour < 14) return { greeting: 'Good afternoon', emoji: '🌤️', subtitle: 'Hope you\'re having a productive day!' };
      if (hour < 17) return { greeting: 'Keep going', emoji: '💪', subtitle: isFriday ? 'Almost there! TGIF 🎉' : 'You\'re doing great today!' };
      if (hour < 20) return { greeting: 'Good evening', emoji: '🌅', subtitle: isWeekend ? 'Enjoy your evening!' : 'Wrapping up for the day?' };
      return { greeting: 'Good night', emoji: '✨', subtitle: 'Time to wind down. See you tomorrow!' };
    } else {
      // Cute welcoming greetings for guests
      if (hour < 5) return { greeting: 'Akwaaba, Night Owl', emoji: '🦉', subtitle: 'Welcome! Browsing at this hour? We love the dedication' };
      if (hour < 9) return { greeting: 'Akwaaba', emoji: '🌅', subtitle: 'Welcome to OS Browser! Sign in to personalize your experience' };
      if (hour < 12) return { greeting: 'Maakye', emoji: '☀️', subtitle: 'Good morning! Your AI-powered browsing companion is ready' };
      if (hour < 14) return { greeting: 'Hello, Explorer', emoji: '🌍', subtitle: 'Discover a smarter way to browse the web' };
      if (hour < 17) return { greeting: 'Maaha', emoji: '👋', subtitle: 'Good afternoon! Ready to explore? Sign in to unlock all features' };
      if (hour < 20) return { greeting: 'Maadwo', emoji: '🌆', subtitle: 'Good evening! Ghana\'s smartest browser is at your service' };
      return { greeting: 'Welcome, Friend', emoji: '✨', subtitle: 'The internet is better with OS Browser. Try signing in!' };
    }
  }, [isLoggedIn]);

  // Navigate the active tab — uses the SAME navigate() from the navigation
  // store that the OmniBar uses.  Also updates the tab store URL eagerly so
  // ContentArea stops showing the NewTabPage immediately.
  // Use createTab(url) — this creates a brand new tab with a WebContentsView
  // in the main process in one step. Much simpler than trying to navigate
  // an existing newtab (which has no WebContentsView).
  const openUrl = (url: string) => {
    let finalUrl = url;
    if (!finalUrl.includes('://')) finalUrl = `https://${finalUrl}`;
    createTab(finalUrl);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    const query = searchValue.trim();
    if (query.includes('.') && !query.includes(' ')) {
      openUrl(query.startsWith('http') ? query : `https://${query}`);
    } else {
      const searchEngines: Record<string, string> = {
        google: 'https://www.google.com/search?q=',
        duckduckgo: 'https://duckduckgo.com/?q=',
        bing: 'https://www.bing.com/search?q=',
        osbrowser: 'https://www.google.com/search?q=',
      };
      const searchUrl = searchEngines[(settings as any)?.search_engine || 'google'] || searchEngines.google;
      openUrl(`${searchUrl}${encodeURIComponent(query)}`);
    }
  };

  const handlePortalClick = (url: string) => {
    openUrl(url);
  };

  const quickActions = [
    {
      icon: FileText,
      label: 'Summarize Page',
      desc: 'Get key takeaways instantly',
      color: 'text-ghana-gold',
      bgColor: 'bg-ghana-gold-dim',
      action: () => openPanel('ai'),
    },
    {
      icon: Languages,
      label: 'Translate to Twi',
      desc: 'Local language translation',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      action: () => openPanel('ai'),
    },
    {
      icon: BookOpen,
      label: 'Research Helper',
      desc: 'Deep dive on any topic',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      action: () => openPanel('ai'),
    },
    {
      icon: PenTool,
      label: 'Draft Letter',
      desc: 'Professional document drafting',
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      action: () => openPanel('ai'),
    },
    {
      icon: GitCompare,
      label: 'Compare Options',
      desc: 'Side-by-side analysis',
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      action: () => openPanel('ai'),
    },
  ];

  return (
    <div className="min-h-full overflow-y-auto noise-bg" style={{ background: 'var(--color-bg)' }}>
      {/* Ghana flag atmospheric gradient — Red, Gold, Green, Black */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: [
            // Gold glow from top center — most prominent (Ghana's star)
            'radial-gradient(ellipse 110% 55% at 50% -8%, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.06) 30%, transparent 55%)',
            // Red glow from top-left
            'radial-gradient(ellipse 60% 45% at 0% 0%, rgba(206,17,38,0.12) 0%, transparent 45%)',
            // Green glow from bottom-right
            'radial-gradient(ellipse 70% 50% at 100% 95%, rgba(0,107,63,0.14) 0%, transparent 50%)',
            // Red accent bottom-left
            'radial-gradient(ellipse 40% 35% at 5% 90%, rgba(206,17,38,0.08) 0%, transparent 40%)',
            // Green accent top-right
            'radial-gradient(ellipse 45% 30% at 95% 10%, rgba(0,107,63,0.06) 0%, transparent 35%)',
            // Subtle gold center warmth
            'radial-gradient(circle at 50% 45%, rgba(212,160,23,0.04) 0%, transparent 60%)',
          ].join(', '),
          zIndex: 0,
        }}
      />

      <div className="relative z-10 max-w-[900px] mx-auto px-8 py-16">
        {/* ── Hero Section ── */}
        <header className="text-center mb-14 animate-fade-up">
          {/* Greeting with emoji */}
          <div className="text-[40px] mb-3">{emoji}</div>

          {isLoggedIn ? (
            <>
              <h1 className="font-bold tracking-tight mb-1" style={{ fontSize: '28px', color: 'var(--color-text-primary)' }}>
                {greeting}, <span className="text-gradient-gold">{firstName}</span>!
              </h1>
              <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">
                {subtitle}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-bold tracking-tight mb-1" style={{ fontSize: '28px' }}>
                <span className="text-gradient-gold">{greeting}</span>{' '}
                <span style={{ color: 'var(--color-text-primary)' }}>{emoji === '🦉' ? '' : '🇬🇭'}</span>
              </h1>
              <p className="text-[14px] text-text-secondary mt-2 leading-relaxed max-w-[400px] mx-auto">
                {subtitle}
              </p>
            </>
          )}

          <p className="text-[11px] text-text-muted mt-3 tracking-wide font-semibold uppercase" style={{ color: 'var(--color-subheading)' }}>
            OS Browser — Ghana's AI-Powered Browser
          </p>
        </header>

        {/* ── Search Bar ── */}
        <form
          onSubmit={handleSearch}
          className="mb-16 animate-fade-up stagger-1"
          role="search"
        >
          <div
            className="search-shimmer flex items-center gap-3 px-5 rounded-[28px] bg-surface-1 border border-border-1 transition-all duration-300 focus-within:border-transparent"
            style={{
              height: '48px',
              boxShadow: 'var(--search-shadow)',
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--search-glow)';
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--search-shadow)';
            }}
          >
            <Search size={18} className="text-text-muted shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search or enter URL..."
              aria-label="Search the web or enter a URL"
              className="flex-1 bg-transparent text-md text-text-primary placeholder:text-text-muted outline-none"
              autoFocus
              spellCheck={false}
            />
          </div>
        </form>

        {/* ── Government Portals ── */}
        {portals.length > 0 && (
          <section className="mb-14 animate-fade-up stagger-2" aria-label="Government Portals">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-4 rounded-full bg-ghana-gold" />
              <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent-green)' }}>
                Government Portals
              </h2>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {portals.map((portal, index) => {
                const catStyle = CATEGORY_STYLES[portal.category] || DEFAULT_CATEGORY;
                return (
                  <button
                    key={portal.id}
                    onClick={() => handlePortalClick(portal.url)}
                    aria-label={`Open ${portal.name} portal`}
                    className="group glass flex flex-col items-center gap-2.5 p-4 rounded-[16px] hover:-translate-y-[2px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ghana-gold animate-fade-up"
                    style={{
                      animationDelay: `${150 + index * 50}ms`,
                    }}
                  >
                    <div className="w-11 h-11 rounded-xl bg-ghana-gold-dim flex items-center justify-center text-lg font-bold text-ghana-gold group-hover:glow-gold transition-shadow duration-200">
                      {portal.name.charAt(0)}
                    </div>
                    <span className="text-xs text-text-primary text-center truncate w-full font-medium">
                      {portal.name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text}`}
                    >
                      {portal.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── AskOzzy Card ── */}
        <section className="mb-14 animate-fade-up stagger-3" aria-label="AskOzzy AI Assistant">
          <button
            onClick={() => openPanel('askozzy')}
            aria-label="Open AskOzzy AI assistant"
            className="shimmer-border group w-full flex items-center gap-5 p-5 rounded-[20px] bg-surface-1 transition-all duration-300 hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ghana-gold"
            style={{
              boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ghana-gold/20 to-ghana-green/20 flex items-center justify-center shrink-0">
              <Sparkles size={28} className="text-ghana-gold" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gradient-gold mb-0.5">
                AskOzzy
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Ghana's Sovereign AI — Deep research, data analysis & document drafting
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="btn-gold px-4 py-1.5 text-xs hidden sm:inline-flex items-center gap-1.5">Open <ExternalLink size={12} /></span>
              <ExternalLink size={16} className="sm:hidden text-text-muted" />
            </div>
          </button>
        </section>

        {/* ── GovChat Card ── */}
        <section className="mb-14 animate-fade-up stagger-3" aria-label="GovChat Secure Messaging">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('os-browser:messaging'))}
            className="shimmer-border group w-full flex items-center gap-5 p-5 rounded-[20px] text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ghana-gold"
            style={{
              background: 'linear-gradient(135deg, rgba(212, 160, 23, 0.08), rgba(0, 107, 63, 0.08))',
              border: '1px solid rgba(212, 160, 23, 0.2)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
            }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(212, 160, 23, 0.2), rgba(0, 107, 63, 0.2))' }}
            >
              <Shield size={28} style={{ color: '#D4A017' }} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <h3 className="text-lg font-bold mb-0.5" style={{ color: '#D4A017' }}>GovChat</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Secure government messaging with Matrix E2E encryption. Reactions, threads, voice notes & more.
              </p>
            </div>
            <div className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#006B3F' }}
            >
              Open
            </div>
          </button>
        </section>

        {/* ── GovPlay Card ── */}
        <section className="mb-6 animate-fade-up stagger-3" aria-label="GovPlay Game Center">
          <button
            onClick={() => {
              import('@/store/tabs').then(({ useTabsStore }) => {
                useTabsStore.getState().createTab('os-browser://games');
              });
            }}
            className="shimmer-border group w-full flex items-center gap-5 p-5 rounded-[20px] text-left"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 64, 129, 0.08), rgba(212, 83, 126, 0.08))',
              border: '1px solid rgba(255, 64, 129, 0.2)',
            }}
            aria-label="Open GovPlay game center"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(255, 64, 129, 0.2), rgba(212, 83, 126, 0.2))' }}
            >
              <span style={{ fontSize: 28 }}>🎮</span>
            </div>
            <div className="text-left flex-1 min-w-0">
              <h3 className="text-lg font-bold mb-0.5" style={{ color: '#FF4081' }}>GovPlay</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                12 built-in games — Oware, Chess, Ludo, Sudoku, Trivia & more. Take a break, sharpen your mind.
              </p>
            </div>
            <div className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#FF4081' }}
            >
              Play
            </div>
          </button>
        </section>

        {/* ── AI Quick Actions ── */}
        <section className="mb-14 animate-fade-up stagger-4" aria-label="AI Quick Actions">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
              AI Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <button
                key={action.label}
                onClick={action.action}
                aria-label={action.label}
                className="group glass flex items-start gap-3 p-4 rounded-[16px] text-left transition-all duration-200 hover:scale-[1.02] hover:border-ghana-gold/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ghana-gold animate-fade-up"
                style={{
                  animationDelay: `${250 + index * 50}ms`,
                }}
              >
                <div
                  className={`w-9 h-9 rounded-xl ${action.bgColor} flex items-center justify-center shrink-0`}
                >
                  <action.icon size={18} className={action.color} />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-text-primary block">
                    {action.label}
                  </span>
                  <span className="text-xs text-text-muted leading-snug block mt-0.5">
                    {action.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Recent History ── */}
        {recentHistory.length > 0 && (
          <section className="mb-14 animate-fade-up stagger-5" aria-label="Recent browsing history">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-4 rounded-full bg-ghana-gold" />
              <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent-green)' }}>
                Recent
              </h2>
            </div>
            <div className="glass rounded-[16px] overflow-hidden divide-y divide-border-1/50">
              {recentHistory.map((entry, index) => (
                <button
                  key={entry.id}
                  onClick={() => openUrl(entry.url)}
                  aria-label={`Visit ${entry.title || entry.url}`}
                  className="group w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50 transition-all duration-150 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ghana-gold animate-fade-up"
                  style={{
                    animationDelay: `${350 + index * 50}ms`,
                  }}
                >
                  <div className="w-0.5 h-5 rounded-full bg-transparent group-hover:bg-ghana-gold transition-colors duration-200 shrink-0" />
                  <Globe size={14} className="text-text-muted shrink-0" />
                  <span className="text-sm text-text-primary truncate flex-1 group-hover:text-ghana-gold-light transition-colors duration-200">
                    {entry.title || entry.url}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-text-muted shrink-0">
                    <Clock size={10} />
                    {relativeTime(entry.last_visited_at)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Download Counter Widget ── */}
        <section className="mb-14 animate-fade-up stagger-6" aria-label="Download counter">
          <DownloadCounterWidget />
        </section>

        {/* ── Footer ── */}
        <footer className="text-center pb-8 animate-fade-up stagger-6">
          <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <Zap size={10} className="text-text-muted" />
              Powered by OHCS
            </span>
            {totalAdsBlocked > 0 && (
              <>
                <span className="w-px h-3 bg-border-1" />
                <span className="flex items-center gap-1.5">
                  <Shield size={10} className="text-ghana-green" />
                  {totalAdsBlocked.toLocaleString()} ads blocked
                </span>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
