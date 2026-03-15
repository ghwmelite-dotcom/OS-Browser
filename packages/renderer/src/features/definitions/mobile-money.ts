import React from 'react';
import { Wallet } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';

// ── Sidebar Panel ───────────────────────────────────────────────────
const MobileMoneyPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
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
      React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'Mobile Money'),
      React.createElement('button', {
        onClick: onClose,
        style: { background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' },
      }, '\u00D7'),
    ),
    React.createElement('div', { style: { padding: '12px 16px', fontSize: '13px', opacity: 0.7 } },
      'Payment receipts, statements, and payment method management.',
    ),
  );
};

// ── Feature Definition ──────────────────────────────────────────────
const mobileMoneyFeature = {
  id: 'mobile-money',
  name: 'Mobile Money',
  description: 'Track mobile money payments, receipts, and export statements.',
  stripColor: '#BA7517',
  icon: Wallet,
  category: 'finance' as const,
  defaultEnabled: true,
  surfaces: {
    sidebar: {
      panelComponent: MobileMoneyPanel,
      order: 7,
      defaultPanelWidth: 360,
    },
    commandBar: [
      {
        id: 'mobile-money:receipts',
        label: 'View payment receipts',
        description: 'Browse all mobile money payment receipts',
        keywords: ['receipts', 'payment', 'mobile', 'money', 'momo', 'transactions', 'view'],
        action: () => console.log('[MobileMoney] View receipts'),
        group: 'Mobile Money',
      },
      {
        id: 'mobile-money:export',
        label: 'Export monthly statement',
        description: 'Download a PDF statement of monthly transactions',
        keywords: ['export', 'statement', 'monthly', 'download', 'pdf', 'report', 'finance'],
        action: () => console.log('[MobileMoney] Export statement'),
        group: 'Mobile Money',
      },
      {
        id: 'mobile-money:add-method',
        label: 'Add payment method',
        description: 'Link a new mobile money number or payment method',
        keywords: ['add', 'payment', 'method', 'link', 'mtn', 'telecel', 'vodafone', 'number'],
        action: () => console.log('[MobileMoney] Add payment method'),
        group: 'Mobile Money',
      },
      {
        id: 'mobile-money:search',
        label: 'Search receipts',
        description: 'Search through payment receipt history',
        keywords: ['search', 'receipts', 'find', 'transaction', 'payment', 'lookup'],
        action: () => console.log('[MobileMoney] Search receipts'),
        group: 'Mobile Money',
      },
    ],
  },
};

FeatureRegistry.register(mobileMoneyFeature);

export default mobileMoneyFeature;
