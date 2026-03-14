import React, { useEffect } from 'react';
import { X, BarChart3, Globe, Star, MessageSquare, Shield } from 'lucide-react';
import { useStatsStore } from '@/store/stats';

export function StatsPanel({ onClose }: { onClose: () => void }) {
  const { totalPages, totalBookmarks, totalConversations, totalAdsBlocked, loadStats } = useStatsStore();
  useEffect(() => { loadStats(); }, []);

  const stats = [
    { icon: Globe, label: 'Pages Visited', value: totalPages, color: 'text-blue-400' },
    { icon: Star, label: 'Bookmarks', value: totalBookmarks, color: 'text-ghana-gold' },
    { icon: MessageSquare, label: 'AI Conversations', value: totalConversations, color: 'text-purple-400' },
    { icon: Shield, label: 'Ads Blocked', value: totalAdsBlocked, color: 'text-ghana-green' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-16">
      <div className="w-[420px] bg-surface-1 border border-border-1 rounded-card shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-1">
          <div className="flex items-center gap-2"><BarChart3 size={16} className="text-ghana-gold" /><span className="text-md font-medium">Statistics</span></div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ghana-gold"><X size={16} className="text-text-muted" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          {stats.map(s => (
            <div key={s.label} className="bg-surface-2 rounded-card p-4 text-center">
              <s.icon size={24} className={`${s.color} mx-auto mb-2`} />
              <div className="text-2xl font-bold text-text-primary">{s.value.toLocaleString()}</div>
              <div className="text-xs text-text-secondary mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="fixed inset-0 bg-black/50 -z-10" onClick={onClose} />
    </div>
  );
}
