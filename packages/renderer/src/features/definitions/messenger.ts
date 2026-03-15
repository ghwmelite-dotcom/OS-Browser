import React from 'react';
import { MessageCircle } from 'lucide-react';
import { FeatureRegistry, StatusBarIndicatorProps, SidebarPanelProps } from '../registry';

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
      color: stripColor,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'inherit',
      whiteSpace: 'nowrap' as const,
    },
    title: 'Messenger — Click to open',
  },
    React.createElement(MessageCircle, { size: 12 }),
    React.createElement('span', null, '0'),
  );
};

// ── Sidebar Panel ───────────────────────────────────────────────────
const MessengerPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
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
      React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'Messenger'),
      React.createElement('button', {
        onClick: onClose,
        style: { background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' },
      }, '\u00D7'),
    ),
    React.createElement('div', { style: { padding: '12px 16px', fontSize: '13px', opacity: 0.7 } },
      'Encrypted government messaging. End-to-end secure conversations.',
    ),
  );
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
        action: () => console.log('[Messenger] Open'),
        shortcut: 'Ctrl+Shift+M',
        group: 'Messenger',
      },
      {
        id: 'messenger:new',
        label: 'New message',
        description: 'Start a new conversation',
        keywords: ['new', 'message', 'compose', 'write', 'send', 'chat'],
        action: () => console.log('[Messenger] New message'),
        group: 'Messenger',
      },
      {
        id: 'messenger:search',
        label: 'Search messages',
        description: 'Search through message history',
        keywords: ['search', 'messages', 'find', 'conversation', 'history', 'lookup'],
        action: () => console.log('[Messenger] Search'),
        group: 'Messenger',
      },
    ],
  },
};

FeatureRegistry.register(messengerFeature);

export default messengerFeature;
