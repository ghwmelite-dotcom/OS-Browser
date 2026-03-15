import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useFeatureRegistry } from '@/hooks/useFeatureRegistry';
import { useKenteSidebarStore } from '@/store/kente-sidebar';
import { IconRail } from './IconRail';
import { ExpandedPanel } from './ExpandedPanel';

/**
 * KenteSidebar — main sidebar with Icon Rail + Expanded Panel.
 *
 * Sits on the LEFT side of the content area.
 * Icon rail: always visible when state !== 'hidden'.
 * Expanded panel: visible when state === 'expanded' and a panel is active.
 *
 * Keyboard shortcut: Ctrl+\ toggles sidebar visibility.
 */
export function KenteSidebar() {
  const features = useFeatureRegistry();
  const { state, activePanel, panelWidth, togglePanel, closePanel, toggleSidebar } =
    useKenteSidebarStore();

  // Previous panel for crossfade tracking
  const prevPanelRef = useRef<string | null>(null);
  const [contentKey, setContentKey] = useState(0);

  // Sort features that declare a sidebar surface
  const sidebarFeatures = features
    .filter((f) => f.surfaces?.sidebar)
    .sort(
      (a, b) =>
        (a.surfaces.sidebar!.order ?? 99) - (b.surfaces.sidebar!.order ?? 99),
    );

  const activeFeature = sidebarFeatures.find((f) => f.id === activePanel) ?? null;

  // Determine effective panel width from the active feature's default or the store
  const effectiveWidth =
    activeFeature?.surfaces.sidebar?.defaultPanelWidth ?? panelWidth;

  // ─── Keyboard shortcut: Ctrl+\ ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // ─── WebContentsView visibility management ───
  useEffect(() => {
    if (state === 'expanded' && activePanel) {
      window.osBrowser?.hideWebViews?.();
    } else {
      window.osBrowser?.showWebViews?.();
    }
  }, [state, activePanel]);

  // ─── Crossfade: bump key when active panel changes ───
  useEffect(() => {
    if (activePanel && activePanel !== prevPanelRef.current) {
      setContentKey((k) => k + 1);
    }
    prevPanelRef.current = activePanel;
  }, [activePanel]);

  // ─── Open settings ───
  const handleOpenSettings = useCallback(() => {
    window.dispatchEvent(new CustomEvent('os-browser:open-settings'));
  }, []);

  // ─── Panel toggle from icon rail ───
  const handleTogglePanel = useCallback(
    (featureId: string) => {
      togglePanel(featureId);
    },
    [togglePanel],
  );

  if (state === 'hidden') return null;

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Icon Rail — always present when sidebar is visible */}
      <IconRail
        features={sidebarFeatures}
        activePanel={activePanel}
        onTogglePanel={handleTogglePanel}
        onOpenSettings={handleOpenSettings}
      />

      {/* Expanded Panel — only when state is 'expanded' and a feature is selected */}
      {state === 'expanded' && activeFeature && (
        <ExpandedPanel
          key={contentKey}
          feature={activeFeature}
          width={effectiveWidth}
          onClose={closePanel}
        />
      )}
    </div>
  );
}

export default KenteSidebar;
