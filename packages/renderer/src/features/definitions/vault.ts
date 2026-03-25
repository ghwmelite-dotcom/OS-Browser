import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { FeatureRegistry } from '../registry';
import { useVaultStore } from '@/store/vault';

// Lazy load components
const VaultIndicator = React.lazy(
  () => import('@/components/Vault/VaultIndicator'),
);
const VaultPanel = React.lazy(
  () => import('@/components/Vault/VaultPanel'),
);

const captureCurrentPage = () => {
  // Show web views for accurate capture
  (window as any).osBrowser?.showWebViews?.();
  setTimeout(async () => {
    try {
      await useVaultStore.getState().captureCurrentPage('manual');
    } catch {}
  }, 300);
};

// ── Feature Definition ──────────────────────────────────────────────
const vaultFeature = {
  id: 'interaction-vault',
  name: 'Interaction Vault',
  description: 'Capture and store proof of interactions on government websites with SHA-256 tamper evidence.',
  stripColor: '#10B981',
  icon: ShieldCheck,
  category: 'government' as const,
  defaultEnabled: true,
  priority: 8,
  surfaces: {
    statusBar: {
      component: VaultIndicator,
      position: 'right' as const,
      order: 7,
    },
    sidebar: {
      panelComponent: VaultPanel,
      order: 2,
      defaultPanelWidth: 380,
      getBadgeCount: () => useVaultStore.getState().totalCaptures,
    },
    toolbar: {
      icon: ShieldCheck,
      label: 'Vault Capture',
      order: 2,
      onClick: () => captureCurrentPage(),
      showCondition: (url: string) => !url.startsWith('os-browser://'),
    },
    commandBar: [
      {
        id: 'vault:capture',
        label: 'Capture page to Vault',
        description: 'Take a screenshot and save it to the Interaction Vault',
        keywords: ['vault', 'capture', 'screenshot', 'proof', 'interaction', 'save', 'government'],
        action: () => captureCurrentPage(),
        group: 'Vault',
      },
      {
        id: 'vault:view',
        label: 'View Interaction Vault',
        description: 'Open the vault to see all captured interactions',
        keywords: ['vault', 'view', 'captures', 'proof', 'history', 'interactions'],
        action: () => window.dispatchEvent(new CustomEvent('os-browser:open-panel', { detail: { featureId: 'interaction-vault' } })),
        group: 'Vault',
      },
    ],
  },
};

FeatureRegistry.register(vaultFeature);

export default vaultFeature;
