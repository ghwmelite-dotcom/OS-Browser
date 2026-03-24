import React from 'react';
import { Layers } from 'lucide-react';
import { FeatureRegistry } from '../registry';
import { useWorkspaceStore } from '@/store/workspaces';
import { useTabIntelligenceStore } from '@/store/tab-intelligence';

// Lazy imports for components
const WorkspaceManager = React.lazy(() =>
  import('@/components/Workspaces/WorkspaceManager').then(m => ({ default: m.WorkspaceManager }))
);

// ── Actions ─────────────────────────────────────────────────────────
const openWorkspacePanel = () => {
  window.dispatchEvent(new CustomEvent('os-browser:open-panel', { detail: { featureId: 'workspaces' } }));
};

const switchWorkspacePrompt = () => {
  openWorkspacePanel();
};

const createWorkspacePrompt = () => {
  openWorkspacePanel();
};

const searchTabs = () => {
  useTabIntelligenceStore.getState().toggleTabSearch();
};

// ── Feature Definition ──────────────────────────────────────────────
const workspacesFeature = {
  id: 'workspaces',
  name: 'Workspaces',
  description: 'Organize tabs into color-coded workspaces. Search, snooze, and manage tabs intelligently.',
  stripColor: '#8B5CF6',
  icon: Layers,
  category: 'productivity' as const,
  priority: 0,
  defaultEnabled: true,
  surfaces: {
    sidebar: {
      panelComponent: WorkspaceManager,
      order: 3,
      defaultPanelWidth: 340,
    },
    commandBar: [
      {
        id: 'workspaces:switch',
        label: 'Switch Workspace',
        description: 'Switch to a different workspace',
        keywords: ['workspace', 'switch', 'tab', 'organize', 'group'],
        action: () => switchWorkspacePrompt(),
        group: 'Workspaces',
      },
      {
        id: 'workspaces:create',
        label: 'Create Workspace',
        description: 'Create a new tab workspace',
        keywords: ['workspace', 'create', 'new', 'add', 'organize'],
        action: () => createWorkspacePrompt(),
        group: 'Workspaces',
      },
      {
        id: 'workspaces:search-tabs',
        label: 'Search Tabs',
        description: 'Search and switch between all open tabs',
        keywords: ['tab', 'search', 'find', 'switch', 'open'],
        shortcut: 'Ctrl+Shift+A',
        action: () => searchTabs(),
        group: 'Workspaces',
      },
    ],
  },
};

FeatureRegistry.register(workspacesFeature);

export default workspacesFeature;
