import React from 'react';
import { Wallet } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';
import { MobileMoneyPanel as MobileMoneyPanelComponent } from '@/components/MobileMoney/MobileMoneyPanel';

const dispatchMobileMoney = () => {
  window.dispatchEvent(new CustomEvent('os-browser:mobile-money'));
};

// ── Sidebar Panel ───────────────────────────────────────────────────
const MobileMoneyPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
  return React.createElement('div', {
    style: {
      width,
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      borderLeft: `3px solid ${stripColor}`,
      background: 'var(--color-surface-1)',
      color: 'var(--color-text-primary)',
      overflow: 'hidden',
    },
  },
    React.createElement(MobileMoneyPanelComponent, { onClose }),
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
        action: () => dispatchMobileMoney(),
        group: 'Mobile Money',
      },
      {
        id: 'mobile-money:export',
        label: 'Export monthly statement',
        description: 'Download a PDF statement of monthly transactions',
        keywords: ['export', 'statement', 'monthly', 'download', 'pdf', 'report', 'finance'],
        action: () => dispatchMobileMoney(),
        group: 'Mobile Money',
      },
      {
        id: 'mobile-money:add-method',
        label: 'Add payment method',
        description: 'Link a new mobile money number or payment method',
        keywords: ['add', 'payment', 'method', 'link', 'mtn', 'telecel', 'vodafone', 'number'],
        action: () => dispatchMobileMoney(),
        group: 'Mobile Money',
      },
      {
        id: 'mobile-money:search',
        label: 'Search receipts',
        description: 'Search through payment receipt history',
        keywords: ['search', 'receipts', 'find', 'transaction', 'payment', 'lookup'],
        action: () => dispatchMobileMoney(),
        group: 'Mobile Money',
      },
    ],
  },
};

FeatureRegistry.register(mobileMoneyFeature);

export default mobileMoneyFeature;
