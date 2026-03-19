import React, { useCallback } from 'react';
import { useFeatureRegistry } from '@/hooks/useFeatureRegistry';
import { useKenteSidebarStore } from '@/store/kente-sidebar';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { NotificationBell } from '@/components/Notifications/NotificationBell';

/**
 * KenteStatusBar — replacement for the original StatusBar.
 *
 * Reads from the Feature Registry and renders status-bar indicators
 * that each feature declares in `surfaces.statusBar`.
 *
 * Layout: 28px height, full width bottom bar, left/right indicator groups
 * separated by `justify-content: space-between`.
 */
export function KenteStatusBar() {
  const features = useFeatureRegistry();
  const { togglePanel } = useKenteSidebarStore();
  const { currentUrl, isLoading } = useNavigationStore();

  const isNewTab = currentUrl === 'os-browser://newtab';
  const displayUrl = isNewTab ? '' : currentUrl;

  // Gather features that surface a status-bar indicator
  const statusFeatures = features
    .filter((f) => f.surfaces?.statusBar)
    .sort(
      (a, b) =>
        (a.surfaces.statusBar!.order ?? 99) -
        (b.surfaces.statusBar!.order ?? 99),
    );

  const left = statusFeatures.filter(
    (f) => f.surfaces.statusBar!.position === 'left',
  );
  const right = statusFeatures.filter(
    (f) => f.surfaces.statusBar!.position === 'right',
  );

  /** Click handler: open sidebar panel or navigate to internal page. */
  const handleClick = useCallback(
    (feature: (typeof statusFeatures)[0]) => {
      // If the feature declares a sidebar panel, open it
      if (feature.surfaces?.sidebar) {
        togglePanel(feature.id);
        return;
      }
      // If it declares an internal page URL, navigate there
      if (feature.internalPageUrl) {
        useTabsStore.getState().createTab(feature.internalPageUrl);
        return;
      }
      // Fallback: dispatch a custom event that existing listeners may handle
      window.dispatchEvent(new CustomEvent(`os-browser:${feature.id}`));
    },
    [togglePanel],
  );

  return (
    <div
      style={{
        height: 28,
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-surface-2)',
        borderTop: '2px solid var(--color-border-2)',
        fontSize: 11,
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
      }}
      aria-live="polite"
    >
      {/* Left group */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* URL / loading hint */}
        <div
          style={{
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-text-secondary)',
            maxWidth: 320,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            fontFamily: 'monospace',
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          {isLoading ? 'Loading...' : displayUrl || ''}
        </div>

        {left.length > 0 && (
          <Divider />
        )}

        {left.map((f, i) => {
          const StatusComp = f.surfaces.statusBar!.component;
          return (
            <React.Fragment key={f.id}>
              {i > 0 && <Divider />}
              <IndicatorSlot
                feature={f}
                onClick={() => handleClick(f)}
              >
                <StatusComp
                  stripColor={f.stripColor}
                  onClick={() => handleClick(f)}
                />
              </IndicatorSlot>
            </React.Fragment>
          );
        })}
      </div>

      {/* Right group */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          overflow: 'visible',
          flexShrink: 0,
        }}
      >
        {/* Notification Bell */}
        <NotificationBell />
        {right.length > 0 && <Divider />}

        {right.map((f, i) => {
          const StatusComp = f.surfaces.statusBar!.component;
          return (
            <React.Fragment key={f.id}>
              {i > 0 && <Divider />}
              <IndicatorSlot
                feature={f}
                onClick={() => handleClick(f)}
              >
                <StatusComp
                  stripColor={f.stripColor}
                  onClick={() => handleClick(f)}
                />
              </IndicatorSlot>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* Sub-components */

/** 1px vertical divider between indicators */
function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 14,
        background: 'var(--color-border-2)',
        flexShrink: 0,
      }}
    />
  );
}

/** Wrapper for each indicator slot — provides hover bg and consistent spacing */
function IndicatorSlot({
  feature,
  onClick,
  children,
}: {
  feature: { surfaces: { statusBar?: { minWidth?: number } } };
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        height: '100%',
        minWidth: feature.surfaces.statusBar?.minWidth,
        background: hovered ? 'var(--color-surface-3)' : 'transparent',
        color: 'var(--color-text-secondary)',
        transition: 'background 150ms ease',
        flexShrink: 0,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </div>
  );
}

export default KenteStatusBar;
