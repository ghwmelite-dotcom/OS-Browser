import React, { useState, useEffect, useRef } from 'react';
import { FileText, Languages, Database, PenTool, Download, Wand2, X } from 'lucide-react';
import { useTabsStore } from '@/store/tabs';
import { useSidebarStore } from '@/store/sidebar';
import { useAIStore } from '@/store/ai';
import { PageActionsMenu } from '@/components/AI/PageActionsMenu';

export function FloatingAIBar() {
  const { tabs, activeTabId } = useTabsStore();
  const { openPanel } = useSidebarStore();
  const { sendMessage } = useAIStore();
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [showPageActions, setShowPageActions] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastUrlRef = useRef('');

  const activeTab = tabs.find(t => t.id === activeTabId);
  const isRealPage = activeTab?.url && !activeTab.url.startsWith('os-browser://');

  // Reset dismissed state when navigating to a new page
  useEffect(() => {
    const url = activeTab?.url || '';
    if (url !== lastUrlRef.current) {
      lastUrlRef.current = url;
      setDismissed(false);
      setVisible(true);
    }
  }, [activeTab?.url]);

  // Auto-hide after 4 seconds, reappear on mouse move
  useEffect(() => {
    if (!isRealPage) return;
    let timer: NodeJS.Timeout;

    const handleMouseMove = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!hovered) setVisible(false);
      }, 4000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    timer = setTimeout(() => setVisible(false), 4000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timer);
    };
  }, [isRealPage, hovered]);

  if (!isRealPage || dismissed) return null;

  const actions = [
    { icon: FileText, label: 'Summarize', prompt: 'Summarize this page concisely with key points' },
    { icon: Languages, label: 'Translate', prompt: 'Translate this page content to Twi' },
    { icon: Database, label: 'Extract', prompt: 'Extract the key data and facts from this page' },
    { icon: PenTool, label: 'Draft Reply', prompt: 'Help me draft a professional reply based on this page content' },
    { icon: Download, label: 'Save PDF', prompt: 'Save this page as PDF' },
  ];

  return (
    <div
      className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative">
        {showPageActions && (
          <PageActionsMenu
            pageContent={activeTab?.title || ''}
            pageUrl={activeTab?.url || ''}
            onClose={() => setShowPageActions(false)}
          />
        )}
        <div
          className="flex items-center gap-1 px-2 py-1.5 rounded-full border shadow-lg backdrop-blur-xl"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          {actions.map(action => (
            <button
              key={action.label}
              onClick={() => {
                if (action.label === 'Save PDF') {
                  const tabId = useTabsStore.getState().activeTabId;
                  if (tabId) {
                    (window as any).osBrowser?.tabs?.printToPdf?.(tabId);
                  }
                  return;
                }
                openPanel('ai');
                setTimeout(() => sendMessage(action.prompt), 300);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 hover:bg-surface-2"
              style={{ color: 'var(--color-text-secondary)' }}
              title={action.label}
            >
              <action.icon size={13} />
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}

          {/* Page Actions button */}
          <div className="w-px h-4 mx-0.5" style={{ background: 'var(--glass-border)' }} />
          <button
            onClick={() => setShowPageActions(!showPageActions)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 hover:bg-surface-2 ${
              showPageActions ? 'bg-surface-2' : ''
            }`}
            style={{ color: showPageActions ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
            title="AI Page Actions"
          >
            <Wand2 size={13} />
            <span className="hidden sm:inline">Actions</span>
          </button>

          {/* Dismiss button */}
          <div className="w-px h-4 mx-0.5" style={{ background: 'var(--glass-border)' }} />
          <button
            onClick={() => setDismissed(true)}
            className="flex items-center justify-center w-6 h-6 rounded-full transition-all duration-150 hover:bg-surface-2"
            style={{ color: 'var(--color-text-muted)' }}
            title="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
