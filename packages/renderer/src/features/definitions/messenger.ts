import React from 'react';
import { MessageCircle } from 'lucide-react';
import { FeatureRegistry, StatusBarIndicatorProps, SidebarPanelProps } from '../registry';
import { MessagingPanel } from '@/components/Messaging/MessagingPanel';

const dispatchMessaging = () => {
  window.dispatchEvent(new CustomEvent('os-browser:messaging'));
};

// ── Status Bar Indicator ────────────────────────────────────────────
const MessengerIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor, onClick }) => {
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
    title: 'Messenger — Click to open',
  },
    React.createElement(MessageCircle, { size: 12, style: { color: stripColor } }),
    React.createElement('span', null, '0'),
  );
};

// ── Sidebar Panel ───────────────────────────────────────────────────
const MessengerPanel: React.FC<SidebarPanelProps> = ({ onClose }) => {
  return React.createElement(MessagingPanel, { onClose });
};

// ── Feature Definition ──────────────────────────────────────────────
const messengerFeature = {
  id: 'messenger',
  name: 'Messenger',
  description: 'Secure, encrypted messaging for government communication.',
  stripColor: '#3B8BD4',
  icon: MessageCircle,
  category: 'communication' as const,
  shortcut: 'Ctrl+Shift+M',
  defaultEnabled: true,
  surfaces: {
    statusBar: {
      component: MessengerIndicator,
      position: 'right' as const,
      order: 1,
    },
    sidebar: {
      panelComponent: MessengerPanel,
      order: 2,
      defaultPanelWidth: 380,
      getBadgeCount: () => 0,
    },
    commandBar: [
      {
        id: 'messenger:open',
        label: 'Open messenger',
        description: 'Open the messenger panel',
        keywords: ['messenger', 'messages', 'chat', 'open', 'communication'],
        action: () => dispatchMessaging(),
        shortcut: 'Ctrl+Shift+M',
        group: 'Messenger',
      },
      {
        id: 'messenger:new',
        label: 'New message',
        description: 'Start a new conversation',
        keywords: ['new', 'message', 'compose', 'write', 'send', 'chat'],
        action: () => dispatchMessaging(),
        group: 'Messenger',
      },
      {
        id: 'messenger:search',
        label: 'Search messages',
        description: 'Search through message history',
        keywords: ['search', 'messages', 'find', 'conversation', 'history', 'lookup'],
        action: () => dispatchMessaging(),
        group: 'Messenger',
      },
    ],
  },
};

FeatureRegistry.register(messengerFeature);

export default messengerFeature;
