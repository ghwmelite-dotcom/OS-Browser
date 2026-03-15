import React from 'react';
import { WifiOff, Download } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';

// ── Sidebar Panel ───────────────────────────────────────────────────
const OfflineLibraryPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
  return React.createElement('div', {
    style: {
      width,
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      borderLeft: `3px solid ${stripColor}`,
      background: 'var(--panel-bg, #1a1a2e)',
      color: 'var(--panel-text, #e0e0e0)',
    },
  },
    React.createElement('div', {
      style: { padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    },
      React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'Offline Library'),
      React.createElement('button', {
        onClick: onClose,
        style: { background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' },
      }, '\u00D7'),
    ),
    React.createElement('div', { style: { padding: '12px 16px', fontSize: '13px', opacity: 0.7 } },
      'Saved pages and queued forms available offline.',
    ),
    React.createElement('button', {
      onClick: () => console.log('[OfflineLibrary] Navigate to os-browser://offline'),
      style: {
        margin: '8px 16px',
        padding: '10px',
        borderRadius: '8px',
        border: `1px solid ${stripColor}`,
        background: 'transparent',
        color: stripColor,
        cursor: 'pointer',
        fontSize: '13px',
      },
    }, 'Open full Offline Library'),
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
      onClick: () => console.log('[OfflineLibrary] Save current page offline'),
    },
    commandBar: [
      {
        id: 'offline-library:save-page',
        label: 'Save this page offline',
        description: 'Download the current page for offline access',
        keywords: ['save', 'offline', 'page', 'download', 'cache', 'store'],
        action: () => console.log('[OfflineLibrary] Save page'),
        shortcut: 'Ctrl+Shift+S',
        group: 'Offline Library',
      },
      {
        id: 'offline-library:open',
        label: 'Open offline library',
        description: 'Browse all saved offline content',
        keywords: ['offline', 'library', 'saved', 'pages', 'browse', 'open'],
        action: () => console.log('[OfflineLibrary] Open library'),
        group: 'Offline Library',
      },
      {
        id: 'offline-library:form-queue',
        label: 'View form queue',
        description: 'See forms waiting to be submitted when online',
        keywords: ['form', 'queue', 'pending', 'submit', 'offline', 'sync'],
        action: () => console.log('[OfflineLibrary] View form queue'),
        group: 'Offline Library',
      },
      {
        id: 'offline-library:clear-cache',
        label: 'Clear offline cache',
        description: 'Remove all saved offline content',
        keywords: ['clear', 'cache', 'delete', 'remove', 'offline', 'storage', 'free'],
        action: () => console.log('[OfflineLibrary] Clear cache'),
        group: 'Offline Library',
      },
    ],
  },
};

FeatureRegistry.register(offlineLibraryFeature);

export default offlineLibraryFeature;
