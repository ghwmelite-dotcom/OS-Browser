import React from 'react';
import { Shield } from 'lucide-react';
import { FeatureRegistry, StatusBarIndicatorProps, SidebarPanelProps } from '../registry';
import { useGovChatStore } from '@/store/govchat';

// Lazy-load GovChatPanel to keep initial bundle small (~600KB matrix-js-sdk)
const LazyGovChatPanel = React.lazy(() =>
  import('@/components/GovChat/GovChatPanel').then(m => ({ default: m.GovChatPanel }))
);

const dispatchMessaging = () => {
  window.dispatchEvent(new CustomEvent('os-browser:messaging'));
};

// ── Status Bar Indicator ────────────────────────────────────────────
const GovChatIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor, onClick }) => {
  const unreadCount = useGovChatStore(s =>
    s.rooms.reduce((sum, r) => sum + r.unreadCount, 0)
  );

  return React.createElement('button', {
    onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      fontSize: '11px',
      color: 'var(--color-text-primary)',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'inherit',
      whiteSpace: 'nowrap' as const,
    },
    title: 'GovChat — Secure Government Messenger',
  },
    React.createElement(Shield, { size: 12, style: { color: stripColor } }),
    React.createElement('span', null, unreadCount > 0 ? String(unreadCount) : '0'),
  );
};

// ── Sidebar Panel ───────────────────────────────────────────────────
const GovChatSidebarPanel: React.FC<SidebarPanelProps> = ({ onClose }) => {
  return React.createElement(
    React.Suspense,
    { fallback: React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--color-text-muted)',
        fontSize: '12px',
      },
    }, 'Loading GovChat...') },
    React.createElement(LazyGovChatPanel, { onClose })
  );
};

// ── Feature Definition ──────────────────────────────────────────────
const messengerFeature = {
  id: 'messenger',
  name: 'GovChat',
  description: 'Matrix-based secure messenger for government communication with E2E encryption.',
  stripColor: '#D4A017',
  icon: Shield,
  category: 'communication' as const,
  shortcut: 'Ctrl+Shift+M',
  defaultEnabled: true,
  surfaces: {
    statusBar: {
      component: GovChatIndicator,
      position: 'right' as const,
      order: 1,
    },
    sidebar: {
      panelComponent: GovChatSidebarPanel,
      order: 2,
      defaultPanelWidth: 420,
      getBadgeCount: () => {
        try {
          return useGovChatStore.getState().rooms.reduce((sum, r) => sum + r.unreadCount, 0);
        } catch {
          return 0;
        }
      },
    },
    commandBar: [
      {
        id: 'messenger:open',
        label: 'Open GovChat',
        description: 'Open the GovChat secure messenger',
        keywords: ['govchat', 'messenger', 'messages', 'chat', 'open', 'communication', 'matrix'],
        action: () => dispatchMessaging(),
        shortcut: 'Ctrl+Shift+M',
        group: 'GovChat',
      },
      {
        id: 'messenger:new',
        label: 'New message',
        description: 'Start a new GovChat conversation',
        keywords: ['new', 'message', 'compose', 'write', 'send', 'chat'],
        action: () => dispatchMessaging(),
        group: 'GovChat',
      },
      {
        id: 'messenger:search',
        label: 'Search messages',
        description: 'Search through GovChat message history',
        keywords: ['search', 'messages', 'find', 'conversation', 'history', 'lookup'],
        action: () => dispatchMessaging(),
        group: 'GovChat',
      },
    ],
  },
};

FeatureRegistry.register(messengerFeature);

export default messengerFeature;
