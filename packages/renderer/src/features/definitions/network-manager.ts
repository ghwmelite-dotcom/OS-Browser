import React from 'react';
import { Signal } from 'lucide-react';
import { FeatureRegistry, StatusBarIndicatorProps } from '../registry';

// ── Status Bar Indicator ────────────────────────────────────────────
const NetworkIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor, onClick }) => {
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
    title: 'Network — Click for details',
  },
    React.createElement(Signal, { size: 12 }),
    React.createElement('span', null, navigator.onLine ? 'Online' : 'Offline'),
  );
};

// ── Feature Definition ──────────────────────────────────────────────
const networkManagerFeature = {
  id: 'network-manager',
  name: 'Network',
  description: 'Monitor connection quality, run speed tests, and manage background tab resources.',
  stripColor: '#2DA06B',
  icon: Signal,
  category: 'infrastructure' as const,
  defaultEnabled: true,
  surfaces: {
    statusBar: {
      component: NetworkIndicator,
      position: 'left' as const,
      order: 3,
    },
    commandBar: [
      {
        id: 'network-manager:speed-test',
        label: 'Run speed test',
        description: 'Test current network download and upload speed',
        keywords: ['speed', 'test', 'network', 'bandwidth', 'internet', 'mbps', 'connection'],
        action: () => console.log('[Network] Run speed test'),
        group: 'Network',
      },
      {
        id: 'network-manager:suspend',
        label: 'Suspend background tabs',
        description: 'Pause inactive tabs to save bandwidth and memory',
        keywords: ['suspend', 'background', 'tabs', 'pause', 'freeze', 'save', 'memory'],
        action: () => console.log('[Network] Suspend tabs'),
        group: 'Network',
      },
      {
        id: 'network-manager:resume',
        label: 'Resume all tabs',
        description: 'Resume all suspended background tabs',
        keywords: ['resume', 'tabs', 'wake', 'restore', 'unsuspend', 'activate'],
        action: () => console.log('[Network] Resume tabs'),
        group: 'Network',
      },
      {
        id: 'network-manager:details',
        label: 'Network details',
        description: 'View detailed network connection information',
        keywords: ['network', 'details', 'info', 'status', 'connection', 'signal', 'latency'],
        action: () => console.log('[Network] Show details'),
        group: 'Network',
      },
    ],
  },
};

FeatureRegistry.register(networkManagerFeature);

export default networkManagerFeature;
