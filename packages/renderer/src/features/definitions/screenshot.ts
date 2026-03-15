import { Camera } from 'lucide-react';
import { FeatureRegistry } from '../registry';

const captureVisible = () => {
  window.osBrowser?.showWebViews?.();
  setTimeout(async () => {
    try {
      await (window.osBrowser as any)?.captureScreenshot?.();
    } catch {
      // Silently handle screenshot failure
    }
  }, 400);
};

const captureFullPage = () => {
  window.osBrowser?.showWebViews?.();
  setTimeout(async () => {
    try {
      await (window.osBrowser as any)?.captureFullPage?.();
    } catch {
      captureVisible(); // Fallback to visible area
    }
  }, 400);
};

const screenshotToReport = () => {
  window.osBrowser?.showWebViews?.();
  setTimeout(async () => {
    try {
      const result = await (window.osBrowser as any)?.captureScreenshot?.();
      if (result?.success && result?.filePath) {
        window.dispatchEvent(new CustomEvent('os-browser:generate-report', {
          detail: { screenshotPath: result.filePath },
        }));
      }
    } catch {
      // Silently handle failure
    }
  }, 400);
};

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
      onClick: () => captureVisible(),
      dropdownItems: [
        {
          id: 'screenshot:visible',
          label: 'Capture visible area',
          onClick: () => captureVisible(),
        },
        {
          id: 'screenshot:full-page',
          label: 'Capture full page',
          onClick: () => captureFullPage(),
        },
        {
          id: 'screenshot:to-report',
          label: 'Screenshot to Report',
          onClick: () => screenshotToReport(),
        },
      ],
    },
    commandBar: [
      {
        id: 'screenshot:take',
        label: 'Take screenshot',
        description: 'Capture the visible area of the current page',
        keywords: ['screenshot', 'capture', 'snap', 'image', 'picture', 'screen'],
        action: () => captureVisible(),
        shortcut: 'Ctrl+Shift+X',
        group: 'Screenshot',
      },
      {
        id: 'screenshot:full',
        label: 'Capture full page',
        description: 'Capture the entire page including scrolled content',
        keywords: ['full', 'page', 'capture', 'entire', 'scroll', 'complete', 'screenshot'],
        action: () => captureFullPage(),
        group: 'Screenshot',
      },
      {
        id: 'screenshot:report',
        label: 'Generate report from screenshot',
        description: 'Create a formatted report from a screenshot',
        keywords: ['report', 'generate', 'screenshot', 'document', 'annotate', 'share'],
        action: () => screenshotToReport(),
        group: 'Screenshot',
      },
    ],
  },
};

FeatureRegistry.register(screenshotFeature);

export default screenshotFeature;
