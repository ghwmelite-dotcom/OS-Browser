import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  FileText,
  Languages,
  BookOpen,
  PenTool,
  Shield,
  GitCompare,
  Sparkles,
  ExternalLink,
  Clock,
  Globe,
  Zap,
} from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { useStatsStore } from '@/store/stats';
import { useSettingsStore } from '@/store/settings';
import { useSidebarStore } from '@/store/sidebar';

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
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
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

export function NewTabPage() {
  const [portals, setPortals] = useState<GovPortal[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>([]);
  const { navigate } = useNavigationStore();
  const { activeTabId } = useTabsStore();
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = settings?.display_name;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim() || !activeTabId) return;
    const query = searchValue.trim();
    if (query.includes('.') && !query.includes(' ')) {
      navigate(activeTabId, query.startsWith('http') ? query : `https://${query}`);
    } else {
      navigate(activeTabId, `https://www.google.com/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handlePortalClick = (url: string) => {
    if (activeTabId) navigate(activeTabId, url);
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
      icon: Shield,
      label: 'Privacy Report',
      desc: 'Check site tracking & safety',
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      action: () => {},
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
      {/* Atmospheric gradient overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,160,23,0.04) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 60% 40% at 80% 100%, rgba(0,107,63,0.03) 0%, transparent 50%)',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 max-w-[900px] mx-auto px-8 py-16">
        {/* ── Hero Section ── */}
        <header className="text-center mb-14 animate-fade-up">
          <h1 className="text-2xl font-bold text-gradient-gold tracking-tight mb-2" style={{ fontSize: '32px' }}>
            OS Browser
          </h1>
          <p className="text-text-muted text-sm tracking-wide">
            Ghana's AI-Powered Browser
          </p>
          {displayName && (
            <p className="text-text-secondary text-md mt-3">
              {greeting}, {displayName}
            </p>
          )}
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
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-widest">
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
            <div className="flex items-center gap-2 shrink-0 text-text-muted group-hover:text-ghana-gold transition-colors duration-200">
              <span className="text-xs hidden sm:inline">Open</span>
              <ExternalLink size={16} />
            </div>
          </button>
        </section>

        {/* ── AI Quick Actions ── */}
        <section className="mb-14 animate-fade-up stagger-4" aria-label="AI Quick Actions">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-4 rounded-full bg-ghana-gold" />
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-widest">
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
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-widest">
                Recent
              </h2>
            </div>
            <div className="glass rounded-[16px] overflow-hidden divide-y divide-border-1/50">
              {recentHistory.map((entry, index) => (
                <button
                  key={entry.id}
                  onClick={() => activeTabId && navigate(activeTabId, entry.url)}
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

        {/* ── Footer ── */}
        <footer className="text-center pb-8 animate-fade-up stagger-6">
          <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <Zap size={10} className="text-text-muted" />
              Powered by Cloudflare Workers AI
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
