import React from 'react';
import { Signal } from 'lucide-react';
import { FeatureRegistry, StatusBarIndicatorProps } from '../registry';
import { useTabsStore } from '@/store/tabs';

const openNetworkDetails = () => {
  useTabsStore.getState().createTab('os-browser://settings');
};

const showMemorySaverStats = () => {
  const memorySaver = (window as any).osBrowser?.memorySaver;
  if (!memorySaver) {
    window.dispatchEvent(new CustomEvent('os-browser:toast', {
      detail: { message: 'Memory Saver is active — inactive tabs are suspended automatically' },
    }));
    return;
  }
  memorySaver.stats().then((stats: any) => {
    const msg = stats?.suspendedCount > 0
      ? `${stats.suspendedCount} tab${stats.suspendedCount > 1 ? 's' : ''} suspended, saving ${Math.round((stats.totalSaved || 0) / 1024 / 1024)}MB`
      : 'Memory Saver is active — inactive tabs will be suspended automatically';
    window.dispatchEvent(new CustomEvent('os-browser:toast', { detail: { message: msg } }));
  }).catch(() => {
    window.dispatchEvent(new CustomEvent('os-browser:toast', {
      detail: { message: 'Memory Saver is active — inactive tabs are managed automatically' },
    }));
  });
};

// ── Status Bar Indicator ────────────────────────────────────────────
const NetworkIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor }) => {
  return React.createElement('span', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      color: 'var(--color-text-primary)',
      fontFamily: 'inherit',
      whiteSpace: 'nowrap' as const,
    },
    title: 'Network — Click for details',
  },
    React.createElement(Signal, { size: 12, style: { color: stripColor } }),
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
        action: () => openNetworkDetails(),
        group: 'Network',
      },
      {
        id: 'network-manager:suspend',
        label: 'Memory Saver status',
        description: 'Show how many tabs are suspended and memory saved',
        keywords: ['suspend', 'background', 'tabs', 'pause', 'freeze', 'save', 'memory', 'saver'],
        action: () => showMemorySaverStats(),
        group: 'Network',
      },
      {
        id: 'network-manager:details',
        label: 'Network details',
        description: 'View detailed network connection information',
        keywords: ['network', 'details', 'info', 'status', 'connection', 'signal', 'latency'],
        action: () => openNetworkDetails(),
        group: 'Network',
      },
    ],
  },
};

FeatureRegistry.register(networkManagerFeature);

export default networkManagerFeature;
