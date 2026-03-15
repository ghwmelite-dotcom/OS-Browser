import React from 'react';
import { WifiOff, Download, ExternalLink, Save, ListChecks, Trash2, ChevronRight } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';
import { useTabsStore } from '@/store/tabs';
import { useNavigationStore } from '@/store/navigation';
import { useOfflineStore } from '@/store/offline';

const openOfflineLibrary = () => useTabsStore.getState().createTab('os-browser://offline');

const savePageOffline = () => {
  const url = useNavigationStore.getState().currentUrl;
  if (!url || url.startsWith('os-browser://')) return;
  const tabs = useTabsStore.getState().tabs;
  const activeTab = tabs.find(t => t.id === useTabsStore.getState().activeTabId);
  const title = activeTab?.title || url;
  const isGov = url.includes('.gov.gh') || url.includes('.edu.gh');
  useOfflineStore.getState().savePage({
    url,
    title,
    category: isGov ? 'gov' : 'manual',
    content: `<html><head><title>${title}</title></head><body><p>Saved from ${url}</p></body></html>`,
  });
  // Also dispatch event for any other listeners
  window.dispatchEvent(new CustomEvent('os-browser:save-page-offline'));
};

const OFFLINE_ACTIONS = [
  { label: 'Save Current Page', desc: 'Download this page for offline access', icon: Save, action: savePageOffline },
  { label: 'View Form Queue', desc: 'Forms waiting to be submitted when online', icon: ListChecks, action: openOfflineLibrary },
  { label: 'Manage Saved Pages', desc: 'Browse and manage offline content', icon: WifiOff, action: openOfflineLibrary },
];

// ── Sidebar Panel ───────────────────────────────────────────────────
const OfflineLibraryPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
  return React.createElement('div', {
    style: {
      width,
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      borderLeft: `3px solid ${stripColor}`,
      background: 'var(--color-surface-1)',
      color: 'var(--color-text-primary)',
    },
  },
    // Header
    React.createElement('div', {
      style: {
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-border-1)',
      },
    },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement(WifiOff, { size: 16, style: { color: stripColor } }),
        React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'Offline Library'),
      ),
      React.createElement('button', {
        onClick: onClose,
        style: {
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
          padding: '4px',
          borderRadius: '4px',
        },
      }, '\u00D7'),
    ),

    // Description
    React.createElement('div', {
      style: { padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-muted)' },
    }, 'Save pages and forms for offline access — perfect for low-connectivity areas.'),

    // Actions
    React.createElement('div', {
      style: { flex: 1, overflowY: 'auto' as const, padding: '8px' },
    },
      ...OFFLINE_ACTIONS.map(item =>
        React.createElement('button', {
          key: item.label,
          onClick: item.action,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 8px',
            margin: '2px 0',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--color-text-primary)',
            textAlign: 'left' as const,
            fontSize: '13px',
            fontFamily: 'inherit',
          },
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'var(--color-surface-2)';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'transparent';
          },
        },
          React.createElement('div', {
            style: {
              width: 32, height: 32,
              borderRadius: '8px',
              background: `${stripColor}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            },
          }, React.createElement(item.icon, { size: 16, style: { color: stripColor } })),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 500 } }, item.label),
            React.createElement('div', { style: { fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' } }, item.desc),
          ),
          React.createElement(ChevronRight, { size: 14, style: { color: 'var(--color-text-muted)', flexShrink: 0 } }),
        ),
      ),
    ),

    // Open Full Library button
    React.createElement('div', { style: { padding: '12px 16px', borderTop: '1px solid var(--color-border-1)' } },
      React.createElement('button', {
        onClick: openOfflineLibrary,
        style: {
          width: '100%',
          padding: '10px',
          borderRadius: '8px',
          border: `1px solid ${stripColor}`,
          background: `${stripColor}12`,
          color: stripColor,
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        },
      },
        React.createElement(ExternalLink, { size: 14 }),
        'Open Full Offline Library',
      ),
    ),
  );
};

// ── Feature Definition ──────────────────────────────────────────────
const offlineLibraryFeature = {
  id: 'offline-library',
  name: 'Offline Library',
  description: 'Save pages, forms, and documents for offline access — perfect for low-connectivity areas.',
  stripColor: '#1D9E75',
  icon: WifiOff,
  category: 'productivity' as const,
  internalPageUrl: 'os-browser://offline',
  defaultEnabled: true,
  surfaces: {
    sidebar: {
      panelComponent: OfflineLibraryPanel,
      order: 6,
      defaultPanelWidth: 320,
    },
    toolbar: {
      icon: Download,
      label: 'Save Page Offline',
      order: 2,
      onClick: () => savePageOffline(),
    },
    commandBar: [
      {
        id: 'offline-library:save-page',
        label: 'Save this page offline',
        description: 'Download the current page for offline access',
        keywords: ['save', 'offline', 'page', 'download', 'cache', 'store'],
        action: () => savePageOffline(),
        shortcut: 'Ctrl+Shift+S',
        group: 'Offline Library',
      },
      {
        id: 'offline-library:open',
        label: 'Open offline library',
        description: 'Browse all saved offline content',
        keywords: ['offline', 'library', 'saved', 'pages', 'browse', 'open'],
        action: () => openOfflineLibrary(),
        group: 'Offline Library',
      },
      {
        id: 'offline-library:form-queue',
        label: 'View form queue',
        description: 'See forms waiting to be submitted when online',
        keywords: ['form', 'queue', 'pending', 'submit', 'offline', 'sync'],
        action: () => openOfflineLibrary(),
        group: 'Offline Library',
      },
      {
        id: 'offline-library:clear-cache',
        label: 'Clear offline cache',
        description: 'Remove all saved offline content',
        keywords: ['clear', 'cache', 'delete', 'remove', 'offline', 'storage', 'free'],
        action: () => openOfflineLibrary(),
        group: 'Offline Library',
      },
    ],
  },
};

FeatureRegistry.register(offlineLibraryFeature);

export default offlineLibraryFeature;
