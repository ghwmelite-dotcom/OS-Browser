import React from 'react';
import { TrendingUp } from 'lucide-react';
import { FeatureRegistry, StatusBarIndicatorProps, SidebarPanelProps } from '../registry';
import { ExchangeTicker } from '@/components/Exchange/ExchangeTicker';
import { ExchangePanel as ExchangePanelComponent } from '@/components/Exchange/ExchangePanel';
import { useExchangeStore } from '@/store/exchange';
import { useKenteSidebarStore } from '@/store/kente-sidebar';

// ── Status Bar Indicator (wraps ExchangeTicker) ────────────────────
const ExchangeStatusBar: React.FC<StatusBarIndicatorProps> = ({ stripColor }) => {
  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
  },
    React.createElement(TrendingUp, { size: 12, style: { color: stripColor, flexShrink: 0 } }),
    React.createElement(ExchangeTicker),
  );
};

// ── Sidebar Panel ───────────────────────────────────────────────────
const ExchangeSidebarPanel: React.FC<SidebarPanelProps> = ({ width, stripColor, onClose }) => {
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
    React.createElement(ExchangePanelComponent, { onClose }),
  );
};

// ── Actions ─────────────────────────────────────────────────────────
const openExchangePanel = () => {
  useKenteSidebarStore.getState().togglePanel('exchange-rate');
};

const toggleOverlay = () => {
  useExchangeStore.getState().toggleOverlay();
};

// ── Feature Definition ──────────────────────────────────────────────
const exchangeRateFeature = {
  id: 'exchange-rate',
  name: 'Cedi Exchange',
  description: 'Live GHS exchange rates, currency converter, and inline price detection overlay.',
  stripColor: '#D4A017',
  icon: TrendingUp,
  category: 'finance' as const,
  defaultEnabled: true,
  priority: 2,
  surfaces: {
    sidebar: {
      panelComponent: ExchangeSidebarPanel,
      order: 6,
      defaultPanelWidth: 340,
    },
    toolbar: {
      icon: TrendingUp,
      label: 'Toggle Price Overlay',
      order: 6,
      onClick: () => toggleOverlay(),
      getIsActive: () => useExchangeStore.getState().overlayEnabled,
      showCondition: (url: string) => !url.startsWith('os-browser://'),
    },
    commandBar: [
      {
        id: 'exchange-rate:open-panel',
        label: 'Open exchange rate converter',
        description: 'View live rates and convert currencies to GH\u20B5',
        keywords: ['exchange', 'rate', 'currency', 'convert', 'cedi', 'dollar', 'euro', 'pound', 'forex', 'money'],
        action: () => openExchangePanel(),
        group: 'Cedi Exchange',
      },
      {
        id: 'exchange-rate:toggle-overlay',
        label: 'Toggle price detection overlay',
        description: 'Detect and convert foreign prices on web pages to GH\u20B5',
        keywords: ['overlay', 'price', 'detect', 'convert', 'inline', 'page', 'cedi'],
        action: () => toggleOverlay(),
        shortcut: 'Ctrl+Shift+E',
        group: 'Cedi Exchange',
      },
    ],
  },
};

FeatureRegistry.register(exchangeRateFeature);

export default exchangeRateFeature;
