import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { FeatureRegistry, StatusBarIndicatorProps } from '../registry';

// ── Status Bar Indicator ────────────────────────────────────────────
const DumsorGuardIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor, onClick }) => {
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
    title: 'Dumsor Guard — Session protection active',
  },
    React.createElement(ShieldCheck, { size: 12 }),
    React.createElement('span', null, 'Saved 0s ago'),
  );
};

// ── Feature Definition ──────────────────────────────────────────────
const dumsorGuardFeature = {
  id: 'dumsor-guard',
  name: 'Dumsor Guard',
  description: 'Automatically saves browser sessions to protect against sudden power outages (dumsor).',
  stripColor: '#3DDC84',
  icon: ShieldCheck,
  category: 'infrastructure' as const,
  shortcut: 'Ctrl+Shift+D',
  defaultEnabled: true,
  surfaces: {
    statusBar: {
      component: DumsorGuardIndicator,
      position: 'left' as const,
      order: 1,
    },
    commandBar: [
      {
        id: 'dumsor-guard:save-now',
        label: 'Save session now',
        description: 'Immediately save all open tabs and session state',
        keywords: ['save', 'session', 'now', 'backup', 'dumsor', 'protect', 'snapshot'],
        action: () => console.log('[DumsorGuard] Save session now'),
        shortcut: 'Ctrl+Shift+D',
        group: 'Dumsor Guard',
      },
      {
        id: 'dumsor-guard:settings',
        label: 'Dumsor Guard settings',
        description: 'Configure auto-save interval and recovery options',
        keywords: ['dumsor', 'settings', 'guard', 'configure', 'interval', 'auto', 'save'],
        action: () => console.log('[DumsorGuard] Open settings'),
        group: 'Dumsor Guard',
      },
      {
        id: 'dumsor-guard:restore',
        label: 'Restore previous session',
        description: 'Recover tabs and state from the last saved session',
        keywords: ['restore', 'session', 'recover', 'previous', 'tabs', 'undo', 'crash'],
        action: () => console.log('[DumsorGuard] Restore session'),
        group: 'Dumsor Guard',
      },
    ],
  },
};

FeatureRegistry.register(dumsorGuardFeature);

export default dumsorGuardFeature;
