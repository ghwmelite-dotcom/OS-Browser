import { Camera } from 'lucide-react';
import { FeatureRegistry } from '../registry';

/**
 * Helper: dispatch the `screenshot:captured` custom event so the UI
 * shows the ScreenshotPreview toast. Clipboard copy is handled in the
 * main process via clipboard.writeImage() which is more reliable.
 */
function dispatchCapture(dataUrl: string): void {
  window.dispatchEvent(
    new CustomEvent('screenshot:captured', { detail: { dataUrl } }),
  );
}

/**
 * Capture the visible area of the active tab.
 */
const captureVisible = async () => {
  try {
    const result = await (window as any).osBrowser?.screenshot?.captureVisible?.();
    if (result?.success && result.dataUrl) {
      dispatchCapture(result.dataUrl);
      return;
    }
    // If the new API failed, try legacy Save As dialog method
    if (!result?.success) {
      console.warn('[Screenshot] captureVisible failed:', result?.error);
    }
  } catch (err) {
    console.warn('[Screenshot] captureVisible error:', err);
  }
};

/**
 * Capture the full scrollable page of the active tab.
 */
const captureFullPage = async () => {
  try {
    const result = await (window as any).osBrowser?.screenshot?.captureFull?.();
    if (result?.success && result.dataUrl) {
      dispatchCapture(result.dataUrl);
      return;
    }
    if (!result?.success) {
      console.warn('[Screenshot] captureFull failed:', result?.error, '— falling back to visible');
      // Fall back to visible capture
      await captureVisible();
    }
  } catch (err) {
    console.warn('[Screenshot] captureFull error:', err);
    await captureVisible();
  }
};

/**
 * Start region selection — dispatches an event that App.tsx listens
 * for to render the RegionSelector overlay.
 */
const selectRegion = () => {
  window.dispatchEvent(new CustomEvent('screenshot:start-region'));
};

const screenshotFeature = {
  id: 'screenshot',
  name: 'Screenshot',
  description: 'Capture visible area, full page, or a selected region.',
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
        { id: 'screenshot:region', label: 'Select region', onClick: () => selectRegion() },
      ],
    },
    commandBar: [
      { id: 'screenshot:take', label: 'Take screenshot', description: 'Capture the visible area', keywords: ['screenshot', 'capture', 'snap', 'image', 'screen'], action: () => captureVisible(), shortcut: 'Ctrl+Shift+X' },
      { id: 'screenshot:full', label: 'Capture full page', description: 'Capture entire scrolled page', keywords: ['full', 'page', 'capture', 'entire', 'screenshot'], action: () => captureFullPage() },
      { id: 'screenshot:region', label: 'Select region to capture', description: 'Draw a rectangle to capture', keywords: ['region', 'select', 'area', 'crop', 'screenshot'], action: () => selectRegion() },
    ],
  },
};

FeatureRegistry.register(screenshotFeature);
export default screenshotFeature;
