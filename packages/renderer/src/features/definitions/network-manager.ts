import React from 'react';
import { Signal } from 'lucide-react';
import { FeatureRegistry, StatusBarIndicatorProps } from '../registry';
import { useTabsStore } from '@/store/tabs';

const openNetworkDetails = () => {
  useTabsStore.getState().createTab('os-browser://settings');
};

const suspendBackgroundTabs = () => {
  const { tabs, activeTabId } = useTabsStore.getState();
  // Mark non-active tabs as suspended by dispatching an event
  const backgroundTabs = tabs.filter(t => t.id !== activeTabId);
  window.dispatchEvent(new CustomEvent('os-browser:suspend-tabs', {
    detail: { tabIds: backgroundTabs.map(t => t.id) },
  }));
};

const resumeAllTabs = () => {
  window.dispatchEvent(new CustomEvent('os-browser:resume-tabs'));
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
        label: 'Suspend background tabs',
        description: 'Pause inactive tabs to save bandwidth and memory',
        keywords: ['suspend', 'background', 'tabs', 'pause', 'freeze', 'save', 'memory'],
        action: () => suspendBackgroundTabs(),
        group: 'Network',
      },
      {
        id: 'network-manager:resume',
        label: 'Resume all tabs',
        description: 'Resume all suspended background tabs',
        keywords: ['resume', 'tabs', 'wake', 'restore', 'unsuspend', 'activate'],
        action: () => resumeAllTabs(),
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
