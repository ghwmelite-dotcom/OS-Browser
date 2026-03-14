import React from 'react';
import { X, Sparkles, ExternalLink } from 'lucide-react';
import { useSidebarStore } from '@/store/sidebar';

export function AskOzzyPanel() {
  const { closePanel } = useSidebarStore();

  return (
    <div className="w-[380px] bg-surface-1 border-l border-border-1 flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-1">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-ghana-gold" />
          <span className="text-md font-medium text-text-primary">AskOzzy</span>
          <span className="text-xs text-text-muted">Ghana's Sovereign AI</span>
        </div>
        <button onClick={closePanel} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ghana-gold" aria-label="Close">
          <X size={16} className="text-text-muted" />
        </button>
      </div>

      {/* Content — placeholder until AskOzzy account is linked */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ghana-gold/20 to-ghana-green/20 flex items-center justify-center mb-6">
          <Sparkles size={32} className="text-ghana-gold" />
        </div>

        <h3 className="text-lg font-medium text-text-primary mb-2">Connect AskOzzy</h3>
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">
          AskOzzy is Ghana's sovereign AI platform for deep research, data analysis, and document drafting.
          Connect your account for enhanced AI capabilities.
        </p>

        <a
          href="https://askozzy.ghwmelite.workers.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-ghana-gold text-bg font-medium rounded-btn hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-ghana-gold focus:ring-offset-2 focus:ring-offset-surface-1"
        >
          Open AskOzzy
          <ExternalLink size={14} />
        </a>

        <p className="text-xs text-text-muted mt-4">
          Account linking coming in a future update
        </p>
      </div>
    </div>
  );
}
