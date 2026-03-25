import React from 'react';
import { Hash } from 'lucide-react';
import { FeatureRegistry } from '../registry';

// Lazy load components
const USSDPanel = React.lazy(
  () => import('@/components/USSD/USSDPanel'),
);

// ── Feature Definition ──────────────────────────────────────────────
const ussdCodebookFeature = {
  id: 'ussd-codebook',
  name: 'USSD Code Book',
  description: 'Comprehensive Ghana USSD code directory with search, copy, and custom code support.',
  stripColor: '#0891B2',
  icon: Hash,
  category: 'productivity' as const,
  defaultEnabled: true,
  surfaces: {
    sidebar: {
      panelComponent: USSDPanel,
      order: 7,
      defaultPanelWidth: 380,
    },
    commandBar: [
      {
        id: 'ussd-codebook:open',
        label: 'Open USSD Code Book',
        description: 'Browse and search Ghana USSD codes',
        keywords: ['ussd', 'code', 'book', 'ghana', 'dial', 'momo', 'mobile money', 'bank', 'utility'],
        action: () => window.dispatchEvent(new CustomEvent('os-browser:open-panel', { detail: { featureId: 'ussd-codebook' } })),
        group: 'USSD Code Book',
      },
      {
        id: 'ussd-codebook:search-momo',
        label: 'Search Mobile Money codes',
        description: 'Find MTN MoMo, Telecel Cash, AirtelTigo Money codes',
        keywords: ['momo', 'mobile money', 'mtn', 'telecel', 'vodafone', 'airteltigo', 'transfer', 'wallet'],
        action: () => window.dispatchEvent(new CustomEvent('os-browser:open-panel', { detail: { featureId: 'ussd-codebook' } })),
        group: 'USSD Code Book',
      },
      {
        id: 'ussd-codebook:search-bank',
        label: 'Search bank USSD codes',
        description: 'Find GCB, Ecobank, Fidelity, and other bank codes',
        keywords: ['bank', 'gcb', 'ecobank', 'fidelity', 'stanbic', 'calbank', 'uba', 'access', 'balance'],
        action: () => window.dispatchEvent(new CustomEvent('os-browser:open-panel', { detail: { featureId: 'ussd-codebook' } })),
        group: 'USSD Code Book',
      },
    ],
  },
};

FeatureRegistry.register(ussdCodebookFeature);

export default ussdCodebookFeature;
