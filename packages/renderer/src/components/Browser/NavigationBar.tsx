import React from 'react';
import { ArrowLeft, ArrowRight, RotateCw, X as XIcon, Star, Sparkles, MessageSquare } from 'lucide-react';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { useSidebarStore } from '@/store/sidebar';
import { OmniBar } from './OmniBar';

function NavButton({
  onClick,
  disabled = false,
  icon,
  label,
  className = '',
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-[30px] h-[30px] flex items-center justify-center rounded-md
        transition-all duration-150 ease-out
        hover:bg-surface-2 active:bg-surface-3
        disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent
        focus:outline-none focus:ring-2 focus:ring-ghana-gold/50
        ${className}
      `}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

export function NavigationBar() {
  const { canGoBack, canGoForward, isLoading } = useNavigationStore();
  const { goBack, goForward, reload, stop } = useNavigationStore();
  const { activeTabId } = useTabsStore();
  const { isOpen, toggleSidebar, openPanel, activePanel } = useSidebarStore();

  return (
    <div className="h-11 bg-surface-1 border-b border-border-1/60 flex items-center gap-1 px-2 shrink-0">
      {/* Navigation button group */}
      <div className="flex items-center gap-[3px]">
        <NavButton
          onClick={() => activeTabId && goBack(activeTabId)}
          disabled={!canGoBack}
          icon={<ArrowLeft size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="Go back"
        />
        <NavButton
          onClick={() => activeTabId && goForward(activeTabId)}
          disabled={!canGoForward}
          icon={<ArrowRight size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="Go forward"
        />
        <NavButton
          onClick={() => activeTabId && (isLoading ? stop(activeTabId) : reload(activeTabId))}
          icon={
            isLoading ? (
              <XIcon size={14} strokeWidth={1.8} className="text-text-secondary" />
            ) : (
              <RotateCw size={13} strokeWidth={1.8} className="text-text-secondary" />
            )
          }
          label={isLoading ? 'Stop loading' : 'Reload'}
        />
      </div>

      {/* Subtle separator */}
      <div className="w-px h-4 bg-border-1/50 mx-1" />

      {/* OmniBar */}
      <OmniBar />

      {/* Right side actions */}
      <div className="flex items-center gap-[3px] ml-1">
        {/* Bookmark star */}
        <NavButton
          onClick={() => {}}
          icon={<Star size={15} strokeWidth={1.8} className="text-text-secondary" />}
          label="Bookmark this page"
        />

        {/* AskOzzy */}
        <NavButton
          onClick={() => openPanel(activePanel === 'askozzy' ? 'none' : 'askozzy')}
          icon={
            <Sparkles
              size={15}
              strokeWidth={1.8}
              className={activePanel === 'askozzy' ? 'text-ghana-gold' : 'text-text-secondary'}
            />
          }
          label="AskOzzy"
          className={activePanel === 'askozzy' ? 'bg-ghana-gold-dim' : ''}
        />

        {/* AI sidebar toggle — refined circular button */}
        <button
          onClick={toggleSidebar}
          className={`
            w-[30px] h-[30px] flex items-center justify-center rounded-full
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-ghana-gold/50
            ${isOpen && activePanel === 'ai'
              ? 'bg-ghana-gold text-bg shadow-[0_0_10px_rgba(212,160,23,0.35)] animate-gold-pulse'
              : 'bg-surface-3/60 text-text-secondary hover:bg-surface-3 hover:text-text-primary'
            }
          `}
          aria-label="Toggle AI sidebar"
          title="AI Assistant"
        >
          <MessageSquare size={13} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
