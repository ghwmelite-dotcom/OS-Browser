import React, { useEffect, useState } from 'react';
import { Search, FileText, Languages, BookOpen, PenTool, Shield, GitCompare, Sparkles, ExternalLink } from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { useStatsStore } from '@/store/stats';
import { useSettingsStore } from '@/store/settings';
import { useSidebarStore } from '@/store/sidebar';

interface GovPortal {
  id: number; name: string; url: string; category: string; icon_path: string | null;
}

export function NewTabPage() {
  const [portals, setPortals] = useState<GovPortal[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const { navigate } = useNavigationStore();
  const { activeTabId } = useTabsStore();
  const { totalAdsBlocked } = useStatsStore();
  const { settings } = useSettingsStore();
  const { openPanel } = useSidebarStore();

  useEffect(() => {
    window.osBrowser.govPortals.list().then(setPortals).catch(() => {});
    window.osBrowser.history.list(0).then((entries: any[]) => {
      setRecentHistory(entries.slice(0, 5));
    }).catch(() => {});
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

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
    { icon: FileText, label: 'Summarize Page', color: 'text-ghana-gold', action: () => openPanel('ai') },
    { icon: Languages, label: 'Translate to Twi', color: 'text-ghana-green', action: () => openPanel('ai') },
    { icon: BookOpen, label: 'Research Helper', color: 'text-blue-400', action: () => openPanel('ai') },
    { icon: PenTool, label: 'Draft Letter', color: 'text-purple-400', action: () => openPanel('ai') },
    { icon: Shield, label: 'Privacy Report', color: 'text-ghana-red', action: () => {} },
    { icon: GitCompare, label: 'Compare Options', color: 'text-orange-400', action: () => openPanel('ai') },
  ];

  const categoryColors: Record<string, string> = {
    General: 'border-ghana-gold/30',
    Finance: 'border-green-500/30',
    Payroll: 'border-blue-400/30',
    Tax: 'border-red-400/30',
    Pensions: 'border-purple-400/30',
    HR: 'border-ghana-gold/30',
    'HR/Appraisal': 'border-ghana-gold/30',
    Health: 'border-ghana-green/30',
  };

  return (
    <div className="min-h-full">
      <div className="max-w-[800px] mx-auto px-6 py-12 animate-fade-in">
        {/* Greeting */}
        <div className="text-center mb-10">
          <p className="text-text-secondary text-lg mb-2">
            {getGreeting()}{settings?.display_name ? `, ${settings.display_name}` : ''}
          </p>
          <h1 className="text-2xl font-bold text-ghana-gold tracking-tight">
            OS Browser
          </h1>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-12">
          <div className="flex items-center gap-3 h-12 px-4 rounded-search bg-surface-2 border border-border-1 focus-within:border-ghana-gold transition-colors">
            <Search size={18} className="text-text-muted shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search or enter URL..."
              className="flex-1 bg-transparent text-lg text-text-primary font-mono placeholder:text-text-muted outline-none"
              autoFocus
              spellCheck={false}
            />
          </div>
        </form>

        {/* Government Portals */}
        {portals.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
              Government Portals
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {portals.map((portal) => (
                <button
                  key={portal.id}
                  onClick={() => handlePortalClick(portal.url)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-card bg-surface-2 border ${categoryColors[portal.category] || 'border-border-1'} hover:bg-surface-3 hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-ghana-gold`}
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center text-lg font-bold text-ghana-gold">
                    {portal.name.charAt(0)}
                  </div>
                  <span className="text-xs text-text-primary text-center truncate w-full">
                    {portal.name}
                  </span>
                  <span className="text-xs text-text-muted">{portal.category}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* AskOzzy Card */}
        <section className="mb-10">
          <button
            onClick={() => openPanel('askozzy')}
            className="w-full flex items-center gap-4 p-4 rounded-card bg-gradient-to-r from-ghana-gold/10 to-ghana-green/10 border border-ghana-gold/20 hover:border-ghana-gold/40 transition-all focus:outline-none focus:ring-2 focus:ring-ghana-gold"
          >
            <div className="w-12 h-12 rounded-lg bg-ghana-gold/20 flex items-center justify-center">
              <Sparkles size={24} className="text-ghana-gold" />
            </div>
            <div className="text-left">
              <h3 className="text-md font-medium text-text-primary">AskOzzy</h3>
              <p className="text-sm text-text-secondary">Ghana's Sovereign AI — Deep research, data analysis & document drafting</p>
            </div>
            <ExternalLink size={16} className="text-text-muted ml-auto" />
          </button>
        </section>

        {/* AI Quick Actions */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
            AI Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.action}
                className="flex items-center gap-3 p-3 rounded-card bg-surface-2 border border-border-1 hover:bg-surface-3 hover:border-border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ghana-gold"
              >
                <action.icon size={18} className={action.color} />
                <span className="text-sm text-text-primary">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent History */}
        {recentHistory.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
              Recent
            </h2>
            <div className="space-y-1">
              {recentHistory.map((entry: any) => (
                <button
                  key={entry.id}
                  onClick={() => activeTabId && navigate(activeTabId, entry.url)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-btn hover:bg-surface-2 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-ghana-gold"
                >
                  <FileText size={14} className="text-text-muted shrink-0" />
                  <span className="text-sm text-text-primary truncate flex-1">{entry.title || entry.url}</span>
                  <span className="text-xs text-text-muted shrink-0">
                    {new Date(entry.last_visited_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Footer stats */}
        <div className="text-center text-xs text-text-muted space-y-1">
          <p>Powered by Cloudflare Workers AI</p>
          {totalAdsBlocked > 0 && (
            <p className="flex items-center justify-center gap-1">
              <Shield size={11} className="text-ghana-green" />
              {totalAdsBlocked.toLocaleString()} ads blocked
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
