import React from 'react';
import { Heart } from 'lucide-react';
import { FeatureRegistry } from '../registry';
import { useWellbeingStore } from '@/store/wellbeing';

// Lazy imports for components (avoid circular deps)
const WellbeingIndicator = React.lazy(() =>
  import('@/components/Wellbeing/WellbeingIndicator').then(m => ({ default: m.WellbeingIndicator }))
);

const WellbeingPanel = React.lazy(() =>
  import('@/components/Wellbeing/WellbeingPanel').then(m => ({ default: m.WellbeingPanel }))
);

// ── Actions ─────────────────────────────────────────────────────────
const openWellbeingPanel = () => {
  window.dispatchEvent(new CustomEvent('os-browser:open-panel', { detail: { featureId: 'wellbeing' } }));
};

const takeBreak = () => {
  useWellbeingStore.getState().takeBreak();
};

// ── Feature Definition ──────────────────────────────────────────────
const wellbeingFeature = {
  id: 'wellbeing',
  name: 'Digital Wellbeing',
  description: 'Track browsing time, get gentle break reminders, and view per-site usage stats.',
  stripColor: '#10B981',
  icon: Heart,
  category: 'productivity' as const,
  priority: 0,
  defaultEnabled: true,
  surfaces: {
    statusBar: {
      component: WellbeingIndicator,
      position: 'right' as const,
      order: 8,
    },
    sidebar: {
      panelComponent: WellbeingPanel,
      order: 7,
      defaultPanelWidth: 360,
    },
    commandBar: [
      {
        id: 'wellbeing:view',
        label: 'View Digital Wellbeing',
        description: 'See browsing time, top sites, and break stats',
        keywords: ['wellbeing', 'break', 'time', 'usage', 'browsing', 'screen', 'health', 'stats'],
        action: () => openWellbeingPanel(),
        group: 'Digital Wellbeing',
      },
      {
        id: 'wellbeing:break',
        label: 'Take a Break',
        description: 'Reset the break timer and take a short rest',
        keywords: ['break', 'rest', 'pause', 'stretch', 'relax'],
        action: () => takeBreak(),
        group: 'Digital Wellbeing',
      },
    ],
  },
};

FeatureRegistry.register(wellbeingFeature);

export default wellbeingFeature;
