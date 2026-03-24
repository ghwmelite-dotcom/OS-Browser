import React, { useCallback, useState, useEffect } from 'react';
import { useFeatureRegistry } from '@/hooks/useFeatureRegistry';
import { useKenteSidebarStore } from '@/store/kente-sidebar';
import { useNavigationStore } from '@/store/navigation';
import { useTabsStore } from '@/store/tabs';
import { useDownloadStore } from '@/store/downloads';
import { NotificationBell } from '@/components/Notifications/NotificationBell';
import { Check } from 'lucide-react';

/** Thin download progress indicator shown at the top of the status bar */
function DownloadProgressBar() {
  const downloads = useDownloadStore((s) => s.downloads);
  const [recentlyCompleted, setRecentlyCompleted] = useState<string | null>(null);

  // Find the first actively downloading item
  const activeDownload = downloads.find((d) => d.state === 'downloading');
  const progress =
    activeDownload && activeDownload.totalBytes > 0
      ? Math.round((activeDownload.receivedBytes / activeDownload.totalBytes) * 100)
      : 0;
  const filename = activeDownload?.filename || '';
  const truncatedName =
    filename.length > 24 ? filename.slice(0, 21) + '...' : filename;

  // Track completion to show green checkmark briefly
  useEffect(() => {
    if (!activeDownload) return;
    const unsub = useDownloadStore.subscribe((state) => {
      const dl = state.downloads.find((d) => d.id === activeDownload.id);
      if (dl && dl.state === 'completed') {
        setRecentlyCompleted(dl.filename.length > 24 ? dl.filename.slice(0, 21) + '...' : dl.filename);
        const timer = setTimeout(() => setRecentlyCompleted(null), 2500);
        return () => clearTimeout(timer);
      }
    });
    return unsub;
  }, [activeDownload?.id]);

  // Show green completion indicator
  if (recentlyCompleted) {
    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: '#10B981',
            transition: 'opacity 0.5s ease-out',
            zIndex: 5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            color: '#10B981',
            zIndex: 5,
            animation: 'fadeUp 0.3s ease-out',
            whiteSpace: 'nowrap',
          }}
        >
          <Check size={10} />
          <span>{recentlyCompleted} complete</span>
        </div>
      </>
    );
  }

  // No active download
  if (!activeDownload) return null;

  return (
    <>
      {/* Thin 2px gold progress bar at the top of the status bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'rgba(212, 160, 23, 0.1)',
          zIndex: 5,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #D4A017, #F2C94C)',
            transition: 'width 300ms ease',
            borderRadius: '0 1px 1px 0',
          }}
        />
      </div>
      {/* Filename + percentage overlay */}
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          color: '#D4A017',
          zIndex: 5,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        <span style={{ opacity: 0.8 }}>{truncatedName}</span>
        <span style={{ fontWeight: 600 }}>{progress}%</span>
      </div>
    </>
  );
}

/** Polished URL display for the status bar — shows domain prominently, path dimmed */
function StatusBarUrl({ url, isLoading }: { url: string; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div style={{
        padding: '0 12px', display: 'flex', alignItems: 'center', gap: 5,
        color: 'var(--color-accent)', fontSize: 11, flexShrink: 1, minWidth: 0,
      }}>
        <span style={{
          width: 4, height: 4, borderRadius: '50%', background: 'var(--color-accent)',
          animation: 'pulse 1s ease-in-out infinite',
        }} />
        <span style={{ fontWeight: 500 }}>Loading</span>
      </div>
    );
  }

  if (!url) return null;

  let domain = '';
  let path = '';
  let isSecure = false;
  try {
    const parsed = new URL(url);
    isSecure = parsed.protocol === 'https:';
    domain = parsed.hostname.replace(/^www\./, '');
    path = parsed.pathname !== '/' ? parsed.pathname : '';
    if (path.length > 28) path = path.slice(0, 25) + '...';
  } catch {
    domain = url;
  }

  return (
    <div style={{
      padding: '0 12px', display: 'flex', alignItems: 'center', gap: 5,
      maxWidth: 360, overflow: 'hidden', whiteSpace: 'nowrap',
      flexShrink: 1, minWidth: 0, fontSize: 11,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: isSecure ? '#10B981' : '#F59E0B',
      }} />
      <span style={{
        color: 'var(--color-text-primary)', fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {domain}
      </span>
      {path && (
        <span style={{
          color: 'var(--color-text-muted)', fontWeight: 400,
          opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {path}
        </span>
      )}
    </div>
  );
}

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
      // If it has toolbar actions, trigger the primary one
      if (feature.surfaces?.toolbar?.onClick) {
        feature.surfaces.toolbar.onClick();
        return;
      }
      // Fallback: dispatch a custom event that existing listeners may handle
      window.dispatchEvent(new CustomEvent(`os-browser:${feature.id}`));
    },
    [togglePanel],
  );

  return (
    <div
      className="kente-status-floor"
      style={{
        height: 28,
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-surface-2)',
        borderTop: '1px solid var(--color-border-1)',
        fontSize: 11,
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-live="polite"
    >
      {/* Download progress indicator */}
      <DownloadProgressBar />

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
        {/* URL / loading hint — polished display */}
        <StatusBarUrl url={displayUrl} isLoading={isLoading} />

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
                <React.Suspense fallback={null}>
                  <StatusComp
                    stripColor={f.stripColor}
                  />
                </React.Suspense>
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
        {/* Notification Bell moved to TitleBar */}
        {right.length > 0 && false && <Divider />}

        {right.map((f, i) => {
          const StatusComp = f.surfaces.statusBar!.component;
          return (
            <React.Fragment key={f.id}>
              {i > 0 && <Divider />}
              <IndicatorSlot
                feature={f}
                onClick={() => handleClick(f)}
              >
                <React.Suspense fallback={null}>
                  <StatusComp
                    stripColor={f.stripColor}
                  />
                </React.Suspense>
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
