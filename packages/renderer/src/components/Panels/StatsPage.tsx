import React, { useEffect } from 'react';
import { BarChart3, Globe, Star, MessageSquare, Shield } from 'lucide-react';
import { useStatsStore } from '@/store/stats';

export function StatsPage() {
  const { totalPages, totalBookmarks, totalConversations, totalAdsBlocked, loadStats } = useStatsStore();

  useEffect(() => { loadStats(); }, []);

  const stats = [
    { icon: Globe, label: 'Pages Visited', value: totalPages, color: '#3B82F6', desc: "Total web pages you've browsed" },
    { icon: Star, label: 'Bookmarks', value: totalBookmarks, color: '#D4A017', desc: 'Saved bookmarks across all folders' },
    { icon: MessageSquare, label: 'AI Conversations', value: totalConversations, color: '#8B5CF6', desc: 'Chats with the AI assistant' },
    { icon: Shield, label: 'Ads Blocked', value: totalAdsBlocked, color: '#006B3F', desc: 'Ads and trackers blocked' },
  ];

  return (
    <div className="min-h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[680px] mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-accent)', color: '#fff' }}>
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Statistics</h1>
            <p className="text-[12px] text-text-muted">Your browsing activity at a glance</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl p-5 border" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                  <s.icon size={20} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-[24px] font-bold text-text-primary">{s.value.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[13px] font-medium text-text-primary">{s.label}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Browser Info */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}>
          <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-accent)' }}>
            Browser Information
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Browser', value: 'OS Browser v1.0.0' },
              { label: 'Engine', value: 'Chromium (Electron 33)' },
              { label: 'Platform', value: navigator.platform },
              { label: 'Language', value: navigator.language },
              { label: 'User Agent', value: navigator.userAgent.slice(0, 80) + '...' },
            ].map(item => (
              <div key={item.label} className="flex items-start justify-between gap-4 py-2 border-b last:border-0" style={{ borderColor: 'var(--color-border-1)' }}>
                <span className="text-[13px] text-text-secondary shrink-0">{item.label}</span>
                <span className="text-[12px] text-text-muted text-right font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[10px] text-text-muted mt-6">
          Designed & Developed by Osborn Hodges | Powered by RSIMD(OHCS)
        </p>
      </div>
    </div>
  );
}
