import { h } from '../utils/dom';
import { openInAppBrowser } from './in-app-browser';

const CATEGORY_COLORS: Record<string, string> = {
  Revenue: '#006B3F',
  Health: '#CE1126',
  Education: '#3B82F6',
  Identity: '#D4A017',
  Finance: '#8B5CF6',
  Digital: '#14B8A6',
};

export function createPortalCard(name: string, url: string, category: string): HTMLElement {
  const color = CATEGORY_COLORS[category] || '#6B7280';
  const initial = name.charAt(0).toUpperCase();

  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = url;
  }

  const card = h('div', {
    className: 'portal-card',
    style: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      borderRadius: '12px',
      background: 'var(--card-bg, #fff)',
      border: '1px solid var(--border, rgba(0,0,0,0.08))',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      cursor: 'pointer',
      transition: 'transform 150ms ease, box-shadow 150ms ease',
    },
    onClick: () => openInAppBrowser(url),
  },
    // Colored circle with initial
    h('div', {
      style: {
        width: '40px',
        height: '40px',
        minWidth: '40px',
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: '700',
      },
    }, initial),
    // Text column
    h('div', {
      style: { display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' },
    },
      h('span', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(14px, 3.6vw, 15px)',
          fontWeight: '600',
          color: 'var(--text, #1a1a1a)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      }, name),
      h('span', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(11px, 2.8vw, 12px)',
          color: 'var(--text-muted, #888)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      }, domain),
    ),
  );

  // Hover lift
  card.addEventListener('pointerenter', () => {
    card.style.transform = 'translateY(-2px)';
    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
  });
  card.addEventListener('pointerleave', () => {
    card.style.transform = 'translateY(0)';
    card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
  });

  return card;
}
