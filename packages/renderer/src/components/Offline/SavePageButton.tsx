import React, { useState, useEffect } from 'react';
import { Download, Check } from 'lucide-react';
import { useOfflineStore } from '@/store/offline';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';

export function SavePageButton() {
  const [saved, setSaved] = useState(false);
  const { savePage } = useOfflineStore();
  const { currentUrl } = useNavigationStore();
  const { tabs, activeTabId } = useTabsStore();

  const activeTab = tabs.find(t => t.id === activeTabId);
  const title = activeTab?.title || 'Untitled Page';
  const isInternalPage = !currentUrl || currentUrl.startsWith('os-browser://');

  const handleSave = () => {
    if (isInternalPage || saved) return;

    // Determine category
    let category: 'manual' | 'auto-cached' | 'gov' = 'manual';
    if (currentUrl) {
      const url = currentUrl.toLowerCase();
      if (url.includes('.gov.gh') || url.includes('ssnit.org.gh') || url.includes('nhis.gov.gh')) {
        category = 'gov';
      }
    }

    savePage({
      url: currentUrl!,
      title,
      category,
      content: `<html><head><title>${title}</title></head><body><p>Offline snapshot of ${currentUrl}</p></body></html>`,
      favicon: currentUrl ? `${new URL(currentUrl).origin}/favicon.ico` : undefined,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Listen for save-page events from menu or keyboard shortcut
  useEffect(() => {
    const handler = () => handleSave();
    window.addEventListener('os-browser:save-page-offline', handler as EventListener);
    return () => window.removeEventListener('os-browser:save-page-offline', handler as EventListener);
  }, [currentUrl, title, isInternalPage, saved]);

  // Keyboard shortcut: Ctrl+Shift+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentUrl, title, isInternalPage, saved]);

  return (
    <button
      onClick={handleSave}
      disabled={isInternalPage}
      className={`
        w-[32px] h-[32px] flex items-center justify-center rounded-full
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-ghana-gold/40
        ${saved
          ? 'bg-ghana-green-dim'
          : isInternalPage
            ? 'opacity-30 cursor-not-allowed'
            : 'hover:bg-surface-2 active:bg-surface-3'
        }
      `}
      aria-label="Save page offline (Ctrl+Shift+S)"
      title="Save page offline (Ctrl+Shift+S)"
      style={{ position: 'relative' }}
    >
      {saved ? (
        <Check size={15} strokeWidth={2} style={{ color: '#006B3F' }} />
      ) : (
        <Download size={15} strokeWidth={1.8} className="text-text-secondary" />
      )}

      {/* Toast notification */}
      {saved && (
        <div
          style={{
            position: 'absolute',
            top: 38,
            right: -20,
            whiteSpace: 'nowrap',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            color: '#fff',
            background: '#006B3F',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 200,
            animation: 'fadeInDown 200ms ease-out',
            pointerEvents: 'none',
          }}
        >
          Page saved for offline reading
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </button>
  );
}
