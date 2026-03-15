import React from 'react';
import { CreditCard } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';
import { IdentityPanel } from '@/components/GhanaCard/IdentityPanel';

// ── Sidebar Panel ───────────────────────────────────────────────────
const GhanaCardPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
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
    React.createElement(IdentityPanel, { onClose }),
  );
};

const dispatchIdentityPanel = () => {
  window.dispatchEvent(new CustomEvent('os-browser:identity-panel'));
};

// ── Feature Definition ──────────────────────────────────────────────
const ghanaCardFeature = {
  id: 'ghana-card',
  name: 'GhanaCard Identity',
  description: 'Securely store and auto-fill identity credentials from your GhanaCard.',
  stripColor: '#7F77DD',
  icon: CreditCard,
  category: 'government' as const,
  requiresSetup: true,
  defaultEnabled: true,
  surfaces: {
    sidebar: {
      panelComponent: GhanaCardPanel,
      order: 5,
      defaultPanelWidth: 340,
    },
    commandBar: [
      {
        id: 'ghana-card:show',
        label: 'Show my GhanaCard',
        description: 'Display digital GhanaCard details',
        keywords: ['ghanacard', 'card', 'identity', 'id', 'show', 'display', 'nia'],
        action: () => dispatchIdentityPanel(),
        group: 'Identity',
      },
      {
        id: 'ghana-card:autofill',
        label: 'Auto-fill identity details',
        description: 'Fill form fields with GhanaCard data',
        keywords: ['autofill', 'fill', 'identity', 'form', 'details', 'name', 'address', 'dob'],
        action: () => dispatchIdentityPanel(),
        group: 'Identity',
      },
      {
        id: 'ghana-card:manage',
        label: 'Manage credentials',
        description: 'View and manage stored identity credentials',
        keywords: ['credentials', 'manage', 'settings', 'security', 'privacy', 'data'],
        action: () => dispatchIdentityPanel(),
        group: 'Identity',
      },
    ],
  },
};

FeatureRegistry.register(ghanaCardFeature);

export default ghanaCardFeature;
