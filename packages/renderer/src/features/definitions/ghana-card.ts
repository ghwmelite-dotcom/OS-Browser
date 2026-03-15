import React from 'react';
import { CreditCard } from 'lucide-react';
import { FeatureRegistry, SidebarPanelProps } from '../registry';

// ── Sidebar Panel ───────────────────────────────────────────────────
const GhanaCardPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
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
      React.createElement('span', { style: { fontWeight: 600, fontSize: '14px' } }, 'GhanaCard Identity'),
      React.createElement('button', {
        onClick: onClose,
        style: { background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' },
      }, '\u00D7'),
    ),
    React.createElement('div', { style: { padding: '12px 16px', fontSize: '13px', opacity: 0.7 } },
      'Digital identity management and credential auto-fill powered by your GhanaCard.',
    ),
    React.createElement('div', {
      style: { padding: '16px', textAlign: 'center' as const, opacity: 0.5, fontSize: '12px' },
    }, 'Setup required. Link your GhanaCard to get started.'),
  );
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
        action: () => console.log('[GhanaCard] Show card'),
        group: 'Identity',
      },
      {
        id: 'ghana-card:autofill',
        label: 'Auto-fill identity details',
        description: 'Fill form fields with GhanaCard data',
        keywords: ['autofill', 'fill', 'identity', 'form', 'details', 'name', 'address', 'dob'],
        action: () => console.log('[GhanaCard] Auto-fill'),
        group: 'Identity',
      },
      {
        id: 'ghana-card:manage',
        label: 'Manage credentials',
        description: 'View and manage stored identity credentials',
        keywords: ['credentials', 'manage', 'settings', 'security', 'privacy', 'data'],
        action: () => console.log('[GhanaCard] Manage credentials'),
        group: 'Identity',
      },
    ],
  },
};

FeatureRegistry.register(ghanaCardFeature);

export default ghanaCardFeature;
