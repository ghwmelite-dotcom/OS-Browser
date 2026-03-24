import { h } from '../utils/dom';
import { navigate } from '../router';

interface NavTab {
  icon: string;
  activeIcon: string;
  label: string;
  path: string;
}

const TABS: NavTab[] = [
  { icon: '🏠', activeIcon: '🏠', label: 'Home',    path: '/' },
  { icon: '💬', activeIcon: '💬', label: 'Chat',    path: '/chat' },
  { icon: '✨', activeIcon: '✨', label: 'AI',      path: '/ai' },
  { icon: '🏛️', activeIcon: '🏛️', label: 'Portals', path: '/portals' },
  { icon: '👤', activeIcon: '👤', label: 'Profile', path: '/profile' },
];

function currentPath(): string {
  return window.location.hash.replace('#', '') || '/';
}

export function createNavBar(): HTMLElement {
  // Kente thread — 1px woven line above the nav
  const kenteThread = h('div', {
    className: 'bottom-nav-kente-thread',
  });

  // Kente floor — woven band at the very bottom
  const kenteFloor = h('div', {
    style: {
      height: '2px',
      background: 'var(--kente-crown)',
      opacity: '0.35',
      flexShrink: '0',
    },
  });

  const nav = h('nav', {
    className: 'bottom-nav',
    style: {
      display: 'flex',
      flexDirection: 'column',
      flexShrink: '0',
      zIndex: '100',
      position: 'relative',
    },
  });

  const navButtons = h('div', {
    style: {
      display: 'flex',
      alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    },
  });

  const buttons: HTMLButtonElement[] = [];

  for (const tab of TABS) {
    const iconSpan = h('span', {
      className: 'nav-tab-icon',
      style: {
        fontSize: '22px',
        lineHeight: '1',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'block',
      },
    }, tab.icon);

    const labelSpan = h('span', {
      className: 'nav-tab-label',
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(10px, 2.8vw, 11px)',
        fontWeight: '600',
        lineHeight: '1',
        letterSpacing: '0.04em',
        transition: 'color 0.2s ease, opacity 0.2s ease',
      },
    }, tab.label);

    const indicator = h('div', {
      className: 'nav-tab-indicator',
      style: {
        position: 'absolute',
        top: '0',
        left: '50%',
        transform: 'translateX(-50%) scaleX(0)',
        width: '24px',
        height: '3px',
        borderRadius: '0 0 6px 6px',
        background: '#D4A017',
        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    });

    const btn = h('button', {
      className: 'nav-tab',
      onClick: () => {
        navigate(tab.path);
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);
      },
      style: {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 0 6px',
        minHeight: '52px',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
        transition: 'opacity 0.15s ease',
      },
    }, indicator, iconSpan, labelSpan) as HTMLButtonElement;

    btn.addEventListener('pointerdown', () => {
      iconSpan.style.transform = 'scale(0.85)';
    });
    btn.addEventListener('pointerup', () => {
      iconSpan.style.transform = '';
    });
    btn.addEventListener('pointerleave', () => {
      iconSpan.style.transform = '';
    });

    buttons.push(btn);
    navButtons.appendChild(btn);
  }

  nav.appendChild(kenteThread);
  nav.appendChild(navButtons);
  nav.appendChild(kenteFloor);

  function updateActive() {
    const active = currentPath();
    buttons.forEach((btn, i) => {
      const isActive = active === TABS[i].path ||
        (TABS[i].path !== '/' && active.startsWith(TABS[i].path));

      const icon = btn.querySelector('.nav-tab-icon') as HTMLElement;
      const label = btn.querySelector('.nav-tab-label') as HTMLElement;
      const ind = btn.querySelector('.nav-tab-indicator') as HTMLElement;

      if (isActive) {
        if (label) label.style.color = '#D4A017';
        if (icon) { icon.style.filter = 'brightness(1.2)'; icon.style.transform = 'scale(1.08)'; }
        if (ind) ind.style.transform = 'translateX(-50%) scaleX(1)';
        btn.style.opacity = '1';
        btn.setAttribute('data-active', 'true');
      } else {
        if (label) label.style.color = 'rgba(255,255,255,0.5)';
        if (icon) { icon.style.filter = 'brightness(0.7)'; icon.style.transform = 'scale(1)'; }
        if (ind) ind.style.transform = 'translateX(-50%) scaleX(0)';
        btn.style.opacity = '0.6';
        btn.setAttribute('data-active', 'false');
      }
    });
  }

  updateActive();
  window.addEventListener('hashchange', updateActive);

  return nav;
}
