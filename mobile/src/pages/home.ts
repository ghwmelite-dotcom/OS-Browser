import { h, render } from '../utils/dom';
import { navigate } from '../router';
import { mxcToHttp } from '../api';
import { openInAppBrowser } from '../components/in-app-browser';
import { isNativePlatform } from '../utils/platform';

interface QuickAction {
  icon: string;
  label: string;
  desc: string;
  gradient: string;
  action: () => void;
}

interface StatCard {
  icon: string;
  label: string;
  value: string;
  color: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDisplayName(): string {
  try {
    const raw = localStorage.getItem('os_mobile_credentials');
    if (raw) {
      const creds = JSON.parse(raw);
      if (creds.displayName) return creds.displayName;
    }
  } catch { /* ignore */ }
  return 'User';
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
}

function getAvatarUrl(): string | null {
  try {
    const raw = localStorage.getItem('os_mobile_credentials');
    if (raw) {
      const creds = JSON.parse(raw);
      if (creds.avatarUrl) return mxcToHttp(creds.avatarUrl);
    }
  } catch { /* ignore */ }
  return null;
}

function showToast(message: string): void {
  const existing = document.querySelector('.pwa-toast');
  if (existing) existing.remove();

  const toast = h('div', {
    className: 'pwa-toast',
    style: {
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(30,30,46,0.95)',
      color: '#fff',
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: '999',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
    },
  }, message);

  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

function formatDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  };
  return now.toLocaleDateString('en-GB', options);
}

export function renderHomePage(container: HTMLElement): void {
  const name = getDisplayName();
  const initials = getInitials(name);
  const avatarPhotoUrl = getAvatarUrl();

  const PRIMARY_ACTIONS = ['GovChat', 'Ask Ozzy', 'Gov Portals'];

  const actions: QuickAction[] = [
    { icon: '\u{1F4AC}', label: 'GovChat',     desc: 'Secure messaging',       gradient: 'linear-gradient(135deg, #006B3F, #00a85f)', action: () => navigate('/chat') },
    { icon: '\u2728', label: 'Ask Ozzy',    desc: 'AI assistant',            gradient: 'linear-gradient(135deg, #D4A017, #e8b92e)', action: () => navigate('/ai') },
    { icon: '\u{1F3DB}\uFE0F', label: 'Gov Portals', desc: 'Government services',    gradient: 'linear-gradient(135deg, #5B3CC4, #8B5CF6)', action: () => navigate('/portals') },
    { icon: '\u{1F1EC}\u{1F1ED}', label: 'Ghana Card', desc: 'Digital identity',        gradient: 'linear-gradient(135deg, #006B3F, #D4A017)', action: () => navigate('/ghana-card') },
    { icon: '\u{1F4B0}', label: 'MoMo',        desc: 'Mobile money hub',        gradient: 'linear-gradient(135deg, #FFCC00, #e6b800)', action: () => navigate('/momo') },
    { icon: '\u{1F4D6}', label: 'Twi Dict',    desc: 'English\u2194Twi',             gradient: 'linear-gradient(135deg, #0891B2, #22D3EE)', action: () => navigate('/dictionary') },
    { icon: '#\uFE0F\u20E3', label: 'USSD',       desc: 'Code directory',           gradient: 'linear-gradient(135deg, #0891B2, #22D3EE)', action: () => navigate('/ussd') },
    { icon: '\uD83D\uDCB1', label: 'Exchange',   desc: 'Cedi rates',               gradient: 'linear-gradient(135deg, #D4A017, #e8b92e)', action: () => navigate('/exchange') },
    { icon: '\u{1F4B1}', label: 'Converter',   desc: 'Currency rates',           gradient: 'linear-gradient(135deg, #9B7610, #D4A017)', action: () => navigate('/converter') },
    { icon: '\u{1F4CA}', label: 'Data Saver', desc: 'Track data usage',         gradient: 'linear-gradient(135deg, #006B3F, #00a85f)', action: () => navigate('/data-saver') },
    { icon: '\u{1F510}', label: 'Passwords',  desc: 'Vault & generator',        gradient: 'linear-gradient(135deg, #374151, #6B7280)', action: () => navigate('/passwords') },
    { icon: '\u{1F310}', label: 'Browse',      desc: 'Mini browser',             gradient: 'linear-gradient(135deg, #1565C0, #42A5F5)', action: () => openInAppBrowser('https://www.google.com') },
    { icon: '\u{1F3AE}', label: 'GovPlay',    desc: 'Games & fun',              gradient: 'linear-gradient(135deg, #CE1126, #e84057)', action: () => navigate('/games') },
    { icon: '\u26A1', label: 'Dumsor',      desc: 'Power guard',              gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)', action: () => navigate('/dumsor') },
    { icon: '\u{1F464}', label: 'Profile',     desc: 'Settings & account',      gradient: 'linear-gradient(135deg, #CE1126, #e84057)', action: () => navigate('/profile') },
  ];

  const stats: StatCard[] = [
    { icon: '\u{1F4AC}', label: 'Messages',  value: '\u2014',  color: '#006B3F' },
    { icon: '\u{1F916}', label: 'AI Chats',  value: '\u2014',  color: '#D4A017' },
    { icon: '\u{1F3DB}\uFE0F', label: 'Portals',   value: '25+', color: '#5B3CC4' },
  ];

  const statColorMap: Record<string, string> = {
    '#006B3F': 'green',
    '#D4A017': 'gold',
    '#5B3CC4': 'purple',
  };

  // --- Build the page ---
  const page = h('div', {
    className: 'home-page',
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '20px 20px 24px',
      paddingTop: 'calc(env(safe-area-inset-top, 20px) + 20px)',
      minHeight: '100%',
      boxSizing: 'border-box',
    },
  });

  // Avatar + greeting
  const avatarEl = avatarPhotoUrl
    ? h('div', {
        style: {
          width: '52px', height: '52px', borderRadius: '16px',
          overflow: 'hidden', flexShrink: '0',
          boxShadow: '0 4px 16px rgba(212, 160, 23, 0.25)',
        },
      }, h('img', {
        src: avatarPhotoUrl,
        style: { width: '100%', height: '100%', objectFit: 'cover' },
      }))
    : h('div', {
        style: {
          width: '52px', height: '52px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #CE1126, #D4A017, #006B3F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: '800', color: '#fff',
          boxShadow: '0 4px 16px rgba(212, 160, 23, 0.25)',
          flexShrink: '0',
        },
      }, initials);

  // Kente divider: 3 thin flag-colored lines
  const kenteDivider = h('div', { className: 'kente-divider' },
    h('span', {}), h('span', {}), h('span', {}),
  );

  const headerSection = h('div', {
    className: 'home-header-section',
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '20px',
    },
  },
    avatarEl,
    h('div', {},
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(13px, 3.5vw, 15px)',
          color: 'var(--text-tertiary)',
          marginBottom: '3px',
          fontWeight: '400',
        },
      }, getGreeting()),
      h('div', {
        className: 'home-name-gold',
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 7vw, 34px)',
          fontWeight: '800',
          letterSpacing: '-0.01em',
          lineHeight: '1.15',
        },
      }, name),
      h('div', { className: 'home-date' }, formatDate()),
      kenteDivider,
    ),
  );

  // Stats ribbon
  const statsRow = h('div', { className: 'home-stats-row' });

  for (const stat of stats) {
    const colorClass = statColorMap[stat.color] || 'gold';
    statsRow.appendChild(
      h('div', { className: `home-stat-card home-stat-card--${colorClass}` },
        h('div', { className: 'home-stat-icon' }, stat.icon),
        h('div', { className: 'home-stat-value', style: { color: stat.color } }, stat.value),
        h('div', { className: 'home-stat-label' }, stat.label),
      )
    );
  }

  // Quick actions grid
  const sectionLabel = h('div', { className: 'home-section-label' }, 'Quick Actions');

  const grid = h('div', { className: 'home-grid' });

  for (const action of actions) {
    const isPrimary = PRIMARY_ACTIONS.includes(action.label);
    const card = h('button', {
      className: `home-action-card${isPrimary ? ' home-action-card--primary' : ''}`,
      onClick: action.action,
    },
      h('div', {
        className: 'home-action-icon',
        style: { background: action.gradient },
      }, action.icon),
      h('div', { style: { minWidth: '0' } },
        h('div', { className: 'home-action-label' }, action.label),
        h('div', { className: 'home-action-desc' }, action.desc),
      ),
    );

    grid.appendChild(card);
  }

  // Recent activity section
  const recentSection = h('div', { className: 'home-recent-card' },
    h('div', { style: { fontSize: '28px', marginBottom: '8px' } }, '\u{1F4CB}'),
    h('div', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(14px, 3.6vw, 16px)',
        fontWeight: '700',
        color: 'var(--text-secondary)',
        marginBottom: '4px',
      },
    }, 'No recent activity'),
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(12px, 3.2vw, 14px)',
        color: 'var(--text-tertiary)',
        lineHeight: '1.4',
      },
    }, 'Start a chat or ask Ozzy to see your activity here'),
  );

  // Footer with Ghana flag stripe
  const footer = h('div', { className: 'home-footer' },
    h('div', { className: 'home-footer-stripe' },
      h('span', {}), h('span', {}), h('span', {}),
    ),
    h('div', { className: 'home-footer-inner' },
      h('div', { className: 'home-footer-badge' }, 'OS'),
      h('span', {}, 'OS Browser Mini'),
    ),
  );

  // Search / Browse bar
  const searchInput = h('input', {
    type: 'text',
    placeholder: 'Search or enter URL...',
    style: {
      flex: '1',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      fontFamily: 'var(--font-body)',
      fontSize: 'clamp(14px, 3.6vw, 15px)',
      color: 'var(--text-primary)',
      minWidth: '0',
    },
  }) as HTMLInputElement;

  const searchBar = h('form', {
    className: 'home-search-bar',
    onSubmit: (e: Event) => {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (!q) return;
      if (q.includes('.') && !q.includes(' ')) {
        openInAppBrowser(q.startsWith('http') ? q : 'https://' + q);
      } else {
        openInAppBrowser('https://www.google.com/search?q=' + encodeURIComponent(q));
      }
      searchInput.value = '';
      searchInput.blur();
    },
  },
    h('span', { style: { fontSize: '16px', color: '#D4A017', flexShrink: '0' } }, '\u{1F50D}'),
    searchInput,
    h('span', { style: { fontSize: '12px', color: 'var(--text-tertiary)', flexShrink: '0', fontFamily: 'var(--font-body)', fontWeight: '600' } }, '\u{1F6E1}\uFE0F'),
  );

  page.appendChild(headerSection);
  page.appendChild(searchBar);
  page.appendChild(statsRow);
  page.appendChild(sectionLabel);
  page.appendChild(grid);
  page.appendChild(recentSection);
  page.appendChild(footer);

  render(container, page);
}
