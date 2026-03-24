import { h } from '../utils/dom';

export function enablePullToRefresh(element: HTMLElement, onRefresh: () => Promise<void>): void {
  let startY = 0;
  let pulling = false;
  let indicator: HTMLElement | null = null;

  function createIndicator(): HTMLElement {
    const el = h('div', {
      className: 'pull-refresh-indicator',
      style: {
        position: 'absolute',
        top: '0',
        left: '50%',
        transform: 'translateX(-50%) translateY(-40px)',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '3px solid rgba(212,160,23,0.3)',
        borderTopColor: '#D4A017',
        transition: 'transform 200ms ease',
        zIndex: '100',
        pointerEvents: 'none',
      },
    });
    return el;
  }

  element.style.position = 'relative';

  element.addEventListener('touchstart', (e: TouchEvent) => {
    if (element.scrollTop === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  element.addEventListener('touchmove', (e: TouchEvent) => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy < 0) { pulling = false; return; }

    if (dy > 10 && !indicator) {
      indicator = createIndicator();
      element.appendChild(indicator);
    }

    if (indicator && dy > 10) {
      const progress = Math.min(dy / 120, 1);
      const translateY = Math.min(dy * 0.4, 60);
      indicator.style.transform = `translateX(-50%) translateY(${translateY}px)`;
      indicator.style.opacity = String(progress);

      if (dy >= 60) {
        indicator.style.borderTopColor = '#006B3F';
      } else {
        indicator.style.borderTopColor = '#D4A017';
      }
    }
  }, { passive: true });

  element.addEventListener('touchend', async () => {
    if (!pulling) return;
    pulling = false;

    if (indicator) {
      const ind = indicator;
      const computedY = parseFloat(ind.style.transform.match(/translateY\(([^)]+)\)/)?.[1] || '0');

      if (computedY >= 24) {
        // Show spinning animation
        ind.style.animation = 'ptr-spin 600ms linear infinite';
        const style = document.createElement('style');
        style.textContent = `@keyframes ptr-spin { to { transform: translateX(-50%) translateY(24px) rotate(360deg); } }`;
        document.head.appendChild(style);

        try {
          await onRefresh();
        } finally {
          style.remove();
          ind.style.transform = 'translateX(-50%) translateY(-40px)';
          ind.style.opacity = '0';
          setTimeout(() => ind.remove(), 200);
        }
      } else {
        ind.style.transform = 'translateX(-50%) translateY(-40px)';
        ind.style.opacity = '0';
        setTimeout(() => ind.remove(), 200);
      }
      indicator = null;
    }
  });
}
