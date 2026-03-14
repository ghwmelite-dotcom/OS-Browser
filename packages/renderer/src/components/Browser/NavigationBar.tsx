import React from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Star, Clock, MessageSquare, Sparkles } from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { useSidebarStore } from '@/store/sidebar';
import { OmniBar } from './OmniBar';

export function NavigationBar() {
  const { canGoBack, canGoForward, isLoading } = useNavigationStore();
  const { goBack, goForward, reload, stop } = useNavigationStore();
  const { activeTabId, createTab } = useTabsStore();
  const { isOpen, toggleSidebar, openPanel, activePanel } = useSidebarStore();

  const navBtn = (onClick: () => void, disabled: boolean, icon: React.ReactNode, label: string) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 flex items-center justify-center rounded-btn hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-ghana-gold"
      aria-label={label}
    >
      {icon}
    </button>
  );

  return (
    <div className="h-10 bg-surface-1 border-b border-border-1 flex items-center gap-1 px-2 shrink-0">
      {/* Nav buttons */}
      {navBtn(() => activeTabId && goBack(activeTabId), !canGoBack, <ArrowLeft size={16} className="text-text-secondary" />, 'Go back')}
      {navBtn(() => activeTabId && goForward(activeTabId), !canGoForward, <ArrowRight size={16} className="text-text-secondary" />, 'Go forward')}
      {navBtn(
        () => activeTabId && (isLoading ? stop(activeTabId) : reload(activeTabId)),
        false,
        <RotateCw size={14} className={`text-text-secondary ${isLoading ? 'animate-spin' : ''}`} />,
        isLoading ? 'Stop loading' : 'Reload'
      )}
      {navBtn(() => createTab(), false, <Home size={16} className="text-text-secondary" />, 'Home')}

      {/* OmniBar */}
      <OmniBar />

      {/* Right side buttons */}
      <div className="flex items-center gap-1">
        {navBtn(() => {}, false, <Star size={16} className="text-text-secondary" />, 'Bookmark this page')}
        {navBtn(() => {}, false, <Clock size={16} className="text-text-secondary" />, 'History')}

        {/* AskOzzy button */}
        <button
          onClick={() => openPanel(activePanel === 'askozzy' ? 'none' : 'askozzy')}
          className={`w-8 h-8 flex items-center justify-center rounded-btn transition-colors focus:outline-none focus:ring-2 focus:ring-ghana-gold ${activePanel === 'askozzy' ? 'bg-ghana-gold-dim' : 'hover:bg-surface-2'}`}
          aria-label="Open AskOzzy"
          title="AskOzzy"
        >
          <Sparkles size={16} className={activePanel === 'askozzy' ? 'text-ghana-gold' : 'text-text-secondary'} />
        </button>

        {/* AI Toggle */}
        <button
          onClick={toggleSidebar}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-ghana-gold ${isOpen && activePanel === 'ai' ? 'bg-ghana-gold text-bg animate-gold-pulse' : 'bg-surface-3 text-text-secondary hover:bg-surface-2'}`}
          aria-label="Toggle AI sidebar"
          title="AI Assistant"
        >
          <MessageSquare size={14} />
        </button>
      </div>
    </div>
  );
}
