import { Camera } from 'lucide-react';
import { FeatureRegistry } from '../registry';

const captureVisible = () => {
  // Show web views so we capture the actual page content
  window.osBrowser?.showWebViews?.();
  setTimeout(async () => {
    try {
      const result = await (window.osBrowser as any)?.captureScreenshot?.();
      if (result?.success) {
        // Brief visual feedback
        window.osBrowser?.hideWebViews?.();
      }
    } catch {
      // If captureScreenshot doesn't exist, try print as fallback
      try { window.print(); } catch {}
    }
  }, 300);
};

const captureFullPage = () => {
  window.osBrowser?.showWebViews?.();
  setTimeout(async () => {
    try {
      await (window.osBrowser as any)?.captureFullPage?.();
    } catch {
      captureVisible();
    }
  }, 300);
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
    } catch {}
  }, 300);
};

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
        { id: 'screenshot:visible', label: 'Capture visible area', onClick: () => captureVisible() },
        { id: 'screenshot:full-page', label: 'Capture full page', onClick: () => captureFullPage() },
        { id: 'screenshot:to-report', label: 'Screenshot to Report', onClick: () => screenshotToReport() },
      ],
    },
    commandBar: [
      { id: 'screenshot:take', label: 'Take screenshot', description: 'Capture the visible area', keywords: ['screenshot', 'capture', 'snap', 'image', 'screen'], action: () => captureVisible(), shortcut: 'Ctrl+Shift+X' },
      { id: 'screenshot:full', label: 'Capture full page', description: 'Capture entire scrolled page', keywords: ['full', 'page', 'capture', 'entire', 'screenshot'], action: () => captureFullPage() },
      { id: 'screenshot:report', label: 'Generate report from screenshot', description: 'Create a formatted report', keywords: ['report', 'generate', 'screenshot', 'document'], action: () => screenshotToReport() },
    ],
  },
};

FeatureRegistry.register(screenshotFeature);
export default screenshotFeature;
