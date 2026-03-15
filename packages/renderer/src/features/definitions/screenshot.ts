import { Camera } from 'lucide-react';
import { FeatureRegistry } from '../registry';

// ── Feature Definition ──────────────────────────────────────────────
const screenshotFeature = {
  id: 'screenshot',
  name: 'Screenshot',
  description: 'Capture visible area or full page screenshots, and generate reports.',
  stripColor: '#D4537E',
  icon: Camera,
  category: 'productivity' as const,
  shortcut: 'Ctrl+Shift+X',
  defaultEnabled: true,
  surfaces: {
    toolbar: {
      icon: Camera,
      label: 'Screenshot',
      order: 1,
      onClick: () => console.log('[Screenshot] Capture visible area'),
      dropdownItems: [
        {
          id: 'screenshot:visible',
          label: 'Capture visible area',
          onClick: () => console.log('[Screenshot] Capture visible area'),
        },
        {
          id: 'screenshot:full-page',
          label: 'Capture full page',
          onClick: () => console.log('[Screenshot] Capture full page'),
        },
        {
          id: 'screenshot:to-report',
          label: 'Screenshot to Report',
          onClick: () => console.log('[Screenshot] Screenshot to report'),
        },
      ],
    },
    commandBar: [
      {
        id: 'screenshot:take',
        label: 'Take screenshot',
        description: 'Capture the visible area of the current page',
        keywords: ['screenshot', 'capture', 'snap', 'image', 'picture', 'screen'],
        action: () => console.log('[Screenshot] Take screenshot'),
        shortcut: 'Ctrl+Shift+X',
        group: 'Screenshot',
      },
      {
        id: 'screenshot:full',
        label: 'Capture full page',
        description: 'Capture the entire page including scrolled content',
        keywords: ['full', 'page', 'capture', 'entire', 'scroll', 'complete', 'screenshot'],
        action: () => console.log('[Screenshot] Full page'),
        group: 'Screenshot',
      },
      {
        id: 'screenshot:report',
        label: 'Generate report from screenshot',
        description: 'Create a formatted report from a screenshot',
        keywords: ['report', 'generate', 'screenshot', 'document', 'annotate', 'share'],
        action: () => console.log('[Screenshot] Generate report'),
        group: 'Screenshot',
      },
    ],
  },
};

FeatureRegistry.register(screenshotFeature);

export default screenshotFeature;
