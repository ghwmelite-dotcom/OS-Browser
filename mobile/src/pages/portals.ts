import { h, render } from '../utils/dom';
import { createHeader } from '../components/header';
import { openInAppBrowser } from '../components/in-app-browser';

interface Portal {
  name: string;
  url: string;
}

interface PortalCategory {
  name: string;
  color: string;
  portals: Portal[];
}

const CATEGORIES: PortalCategory[] = [
  {
    name: 'Revenue & Tax',
    color: '#D4A017',
    portals: [
      { name: 'GRA (Ghana Revenue Authority)', url: 'https://gra.gov.gh' },
      { name: 'SSNIT', url: 'https://www.ssnit.org.gh' },
    ],
  },
  {
    name: 'Health',
    color: '#4CAF50',
    portals: [
      { name: 'NHIS', url: 'https://www.nhis.gov.gh' },
      { name: 'Ghana Health Service', url: 'https://www.ghs.gov.gh' },
      { name: 'FDA Ghana', url: 'https://www.fdaghana.gov.gh' },
    ],
  },
  {
    name: 'Education',
    color: '#2196F3',
    portals: [
      { name: 'Ministry of Education', url: 'https://www.moe.gov.gh' },
      { name: 'Ghana Education Service', url: 'https://ges.gov.gh' },
      { name: 'WAEC', url: 'https://www.waecgh.org' },
    ],
  },
  {
    name: 'Identity',
    color: '#9C27B0',
    portals: [
      { name: 'NIA (Ghana Card)', url: 'https://nia.gov.gh' },
      { name: 'Birth & Death Registry', url: 'https://bdr.gov.gh' },
    ],
  },
  {
    name: 'Finance',
    color: '#FF9800',
    portals: [
      { name: 'Bank of Ghana', url: 'https://www.bog.gov.gh' },
      { name: 'Ministry of Finance', url: 'https://www.mofep.gov.gh' },
    ],
  },
  {
    name: 'Digital',
    color: '#00BCD4',
    portals: [
      { name: 'Ghana.gov', url: 'https://www.ghana.gov.gh' },
      { name: 'Parliament', url: 'https://www.parliament.gh' },
    ],
  },
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function renderPortals(container: HTMLElement): void {
  const header = createHeader('Gov Portals', true);

  const searchInput = h('input', {
    type: 'text',
    placeholder: 'Search portals...',
    style: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '10px',
      border: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
      color: 'inherit',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(14px, 3.6vw, 15px)',
      boxSizing: 'border-box',
      outline: 'none',
    },
  }) as HTMLInputElement;

  const searchWrap = h('div', {
    style: { padding: '12px 16px' },
  }, searchInput);

  const categoriesWrap = h('div', {
    className: 'portals-categories',
    style: { padding: '0 16px 80px', display: 'flex', flexDirection: 'column', gap: '20px' },
  });

  function buildCategories(filter: string) {
    categoriesWrap.innerHTML = '';
    const query = filter.toLowerCase().trim();

    for (const cat of CATEGORIES) {
      const filtered = query
        ? cat.portals.filter(p => p.name.toLowerCase().includes(query))
        : cat.portals;

      if (filtered.length === 0) continue;

      const catLabel = h('h3', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(12px, 3.2vw, 14px)',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: cat.color,
          margin: '0 0 8px',
        },
      }, cat.name);

      const cards = h('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '8px' },
      });

      for (const portal of filtered) {
        const initial = portal.name.charAt(0).toUpperCase();

        const card = h('button', {
          className: 'portal-card',
          onClick: () => openInAppBrowser(portal.url),
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--color-surface)',
            borderRadius: '12px',
            padding: '12px',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            color: 'inherit',
            minHeight: '44px',
          },
        },
          h('div', {
            style: {
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: cat.color,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: '700',
              flexShrink: '0',
            },
          }, initial),
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' },
          },
            h('span', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 3.6vw, 15px)', fontWeight: '600' } }, portal.name),
            h('span', {
              style: {
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(13px, 3.4vw, 14px)',
                color: 'var(--color-text-secondary, #7a7060)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            }, getDomain(portal.url)),
          ),
        );

        cards.appendChild(card);
      }

      const section = h('div', {}, catLabel, cards);
      categoriesWrap.appendChild(section);
    }

    if (categoriesWrap.children.length === 0) {
      categoriesWrap.appendChild(
        h('div', {
          style: {
            textAlign: 'center',
            color: 'var(--color-text-secondary, #7a7060)',
            fontFamily: 'var(--font-body)',
          fontSize: 'clamp(13px, 3.4vw, 14px)',
            padding: '24px 0',
          },
        }, 'No portals match your search')
      );
    }
  }

  searchInput.addEventListener('input', () => {
    buildCategories(searchInput.value);
  });

  buildCategories('');

  render(container, header, searchWrap, categoriesWrap);
}
