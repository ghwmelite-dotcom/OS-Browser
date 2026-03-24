import React from 'react';
import { BarChart3, Zap } from 'lucide-react';
import { FeatureRegistry, StatusBarIndicatorProps } from '../registry';
import { useTabsStore } from '@/store/tabs';
import { useDataSaverStore } from '@/store/datasaver';

const openDataDashboard = () => useTabsStore.getState().createTab('os-browser://data');
const toggleLiteMode = () => useDataSaverStore.getState().toggleLiteMode();

// ── Status Bar Indicator ────────────────────────────────────────────
const DataSaverIndicator: React.FC<StatusBarIndicatorProps> = ({ stripColor }) => {
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
    title: 'Data Saver — Click to open dashboard',
  },
    React.createElement(BarChart3, { size: 12, style: { color: stripColor } }),
    React.createElement('span', null, 'GH\u20B50.00'),
  );
};

// ── Feature Definition ──────────────────────────────────────────────
const dataSaverFeature = {
  id: 'data-saver',
  name: 'Data Saver',
  description: 'Monitor data usage, set budgets, and compress content to save bandwidth costs.',
  stripColor: '#639922',
  icon: BarChart3,
  category: 'infrastructure' as const,
  priority: 1,
  internalPageUrl: 'os-browser://data',
  defaultEnabled: true,
  surfaces: {
    statusBar: {
      component: DataSaverIndicator,
      position: 'left' as const,
      order: 2,
      minWidth: 140,
    },
    toolbar: {
      icon: Zap,
      label: 'Toggle Lite Mode',
      order: 4,
      onClick: () => toggleLiteMode(),
      getIsActive: () => useDataSaverStore.getState().liteModeEnabled,
    },
    commandBar: [
      {
        id: 'data-saver:open-dashboard',
        label: 'Open data dashboard',
        description: 'View data usage statistics and budget',
        keywords: ['data', 'usage', 'budget', 'bandwidth', 'stats', 'dashboard', 'monitor'],
        action: () => openDataDashboard(),
        group: 'Data Saver',
      },
      {
        id: 'data-saver:toggle-lite',
        label: 'Toggle lite mode',
        description: 'Enable or disable data compression',
        keywords: ['lite', 'save', 'compress', 'mode', 'bandwidth', 'reduce'],
        action: () => toggleLiteMode(),
        shortcut: 'Ctrl+Shift+L',
        group: 'Data Saver',
      },
      {
        id: 'data-saver:change-plan',
        label: 'Change data plan',
        description: 'Switch carrier plan or update bundle settings',
        keywords: ['plan', 'mtn', 'telecel', 'bundle', 'carrier', 'airtime', 'subscription'],
        action: () => openDataDashboard(),
        group: 'Data Saver',
      },
    ],
  },
};

FeatureRegistry.register(dataSaverFeature);

export default dataSaverFeature;
