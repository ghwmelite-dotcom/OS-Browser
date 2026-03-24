import React from 'react';
import { Download } from 'lucide-react';
import { FeatureRegistry } from '../registry';
import { useDownloadStore } from '@/store/downloads';

// Lazy load components
const DownloadIndicator = React.lazy(
  () => import('@/components/Downloads/DownloadIndicator'),
);
const DownloadPanel = React.lazy(
  () => import('@/components/Downloads/DownloadPanel'),
);

const openDownloads = () => {
  // Toggle sidebar panel via feature system
};

const pauseAllDownloads = () => {
  const { downloads, pauseDownload } = useDownloadStore.getState();
  downloads
    .filter(d => d.state === 'downloading')
    .forEach(d => pauseDownload(d.id));
};

const clearCompleted = () => {
  useDownloadStore.getState().clearCompleted();
};

// ── Feature Definition ──────────────────────────────────────────────
const downloadsFeature = {
  id: 'download-manager',
  name: 'Download Manager',
  description: 'Track, pause, resume, and manage all file downloads with speed and ETA info.',
  stripColor: '#3B82F6',
  icon: Download,
  category: 'productivity' as const,
  defaultEnabled: true,
  surfaces: {
    statusBar: {
      component: DownloadIndicator,
      position: 'right' as const,
      order: 6,
    },
    sidebar: {
      panelComponent: DownloadPanel,
      order: 5,
      defaultPanelWidth: 380,
      getBadgeCount: () => useDownloadStore.getState().activeCount(),
    },
    commandBar: [
      {
        id: 'download-manager:view',
        label: 'View Downloads',
        description: 'Open the download manager panel',
        keywords: ['download', 'downloads', 'view', 'files', 'manager'],
        action: () => openDownloads(),
        group: 'Downloads',
      },
      {
        id: 'download-manager:pause-all',
        label: 'Pause All Downloads',
        description: 'Pause every active download',
        keywords: ['pause', 'stop', 'downloads', 'all', 'halt'],
        action: () => pauseAllDownloads(),
        group: 'Downloads',
      },
      {
        id: 'download-manager:clear',
        label: 'Clear Completed',
        description: 'Remove completed and failed downloads from the list',
        keywords: ['clear', 'clean', 'completed', 'done', 'remove', 'downloads'],
        action: () => clearCompleted(),
        group: 'Downloads',
      },
    ],
  },
};

FeatureRegistry.register(downloadsFeature);

export default downloadsFeature;
