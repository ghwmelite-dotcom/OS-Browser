import React from 'react';
import { Eye } from 'lucide-react';
import { FeatureRegistry } from '../registry';
import { useChangeDetectorStore } from '@/store/change-detector';

// Lazy load components
const WatcherIndicator = React.lazy(
  () => import('@/components/ChangeDetector/WatcherIndicator'),
);
const WatcherPanel = React.lazy(
  () => import('@/components/ChangeDetector/WatcherPanel'),
);

// ── Feature Definition ──────────────────────────────────────────────
const changeDetectorFeature = {
  id: 'change-detector',
  name: 'Change Detector',
  description: 'Watch web pages for content changes and get notified when they update.',
  stripColor: '#8B5CF6',
  icon: Eye,
  category: 'productivity' as const,
  defaultEnabled: true,
  surfaces: {
    statusBar: {
      component: WatcherIndicator,
      position: 'right' as const,
      order: 7,
    },
    sidebar: {
      panelComponent: WatcherPanel,
      order: 6,
      defaultPanelWidth: 380,
      getBadgeCount: () => useChangeDetectorStore.getState().unreadCount,
    },
    commandBar: [
      {
        id: 'change-detector:view',
        label: 'View Watched Pages',
        description: 'Open the change detector panel',
        keywords: ['watch', 'watcher', 'change', 'detect', 'monitor', 'page', 'changes'],
        action: () => {},
        group: 'Change Detector',
      },
      {
        id: 'change-detector:watch-page',
        label: 'Watch Current Page',
        description: 'Start watching the current page for changes',
        keywords: ['watch', 'add', 'monitor', 'track', 'page', 'current'],
        action: () => {},
        group: 'Change Detector',
      },
    ],
  },
};

FeatureRegistry.register(changeDetectorFeature);

export default changeDetectorFeature;
