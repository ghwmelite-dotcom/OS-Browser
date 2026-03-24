import { h, render } from '../utils/dom';
import { logout } from '../auth';
import { showToast } from '../components/toast';
import { openInAppBrowser } from '../components/in-app-browser';
import { matrixUploadMedia, matrixSetAvatar, mxcToHttp } from '../api';

interface Credentials {
  displayName?: string;
  staffId?: string;
  department?: string;
  ministry?: string;
  avatarUrl?: string;
}

export function renderProfile(container: HTMLElement): void {
  const creds: Credentials = JSON.parse(localStorage.getItem('os_mobile_credentials') || '{}');
  const displayName = creds.displayName || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  // ── Avatar with photo upload ──
  const avatarMxcUrl = creds.avatarUrl;
  const hasPhoto = !!avatarMxcUrl;

  let avatarContent: HTMLElement;
  if (hasPhoto) {
    avatarContent = h('img', {
      src: mxcToHttp(avatarMxcUrl!),
      style: {
        width: '100%', height: '100%', borderRadius: '50%',
        objectFit: 'cover',
      },
    });
  } else {
    avatarContent = h('span', {
      style: {
        fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 6.5vw, 30px)', fontWeight: '700',
        color: '#fff',
      },
    }, initial);
  }

  const fileInput = h('input', {
    type: 'file',
    accept: 'image/*',
    style: { display: 'none' },
  }) as HTMLInputElement;

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      showToast('Uploading photo\u2026', 'info');
      const mxcUrl = await matrixUploadMedia(file, file.name);
      await matrixSetAvatar(mxcUrl);
      // Save to local credentials
      const storedCreds = JSON.parse(localStorage.getItem('os_mobile_credentials') || '{}');
      storedCreds.avatarUrl = mxcUrl;
      localStorage.setItem('os_mobile_credentials', JSON.stringify(storedCreds));
      showToast('Profile photo updated', 'success');
      // Re-render to show new photo
      renderProfile(container);
    } catch {
      showToast('Failed to upload photo', 'error');
    }
  });

  const cameraOverlay = h('div', {
    style: {
      position: 'absolute', bottom: '0', right: '0',
      width: '24px', height: '24px', borderRadius: '50%',
      background: '#D4A017', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '12px', border: '2px solid var(--bg, #000)',
      cursor: 'pointer',
    },
  }, '\uD83D\uDCF7');

  const avatarCircle = h('div', {
    style: {
      width: '64px', height: '64px', borderRadius: '50%',
      background: hasPhoto ? 'transparent' : '#D4A017',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', cursor: 'pointer', overflow: 'visible',
    },
    onClick: () => fileInput.click(),
  }, avatarContent, cameraOverlay, fileInput);

  // ── Profile Card ──
  const profileCard = h('div', {
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '28px 16px 20px', gap: '8px',
    },
  },
    avatarCircle,
    h('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'clamp(17px, 4.4vw, 19px)', fontWeight: '700', color: 'var(--text-primary)' } }, displayName),
    h('div', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(15px, 3.8vw, 16px)', color: 'var(--text-muted)' } }, creds.staffId || ''),
    h('div', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 3vw, 13px)', color: 'var(--text-muted)' } },
      [creds.department, creds.ministry].filter(Boolean).join(' \u2022 ') || '',
    ),
  );

  // ── Helpers ──
  function sectionHeader(title: string): HTMLElement {
    return h('div', {
      style: {
        fontFamily: 'var(--font-display)', fontSize: 'clamp(12px, 3.2vw, 14px)', fontWeight: '700', textTransform: 'uppercase',
        color: 'var(--text-muted)', letterSpacing: '1px',
        padding: '16px 16px 8px',
      },
    }, title);
  }

  function settingRow(...children: (string | HTMLElement)[]): HTMLElement {
    return h('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: '48px', padding: '0 16px',
        borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))',
      },
    }, ...children);
  }

  function toggleSwitch(active: boolean, onChange: (val: boolean) => void): HTMLElement {
    let on = active;
    const dot = h('div', {
      style: {
        width: '18px', height: '18px', borderRadius: '50%',
        background: on ? '#fff' : '#8a7e6c',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        transition: 'transform 200ms ease, background 200ms ease',
        transform: on ? 'translateX(20px)' : 'translateX(2px)',
      },
    });
    const track = h('div', {
      style: {
        width: '42px', height: '22px', borderRadius: '11px',
        background: on ? '#D4A017' : '#1a1a22',
        border: on ? '2px solid #D4A017' : '2px solid #3a3a44',
        display: 'flex', alignItems: 'center',
        cursor: 'pointer', transition: 'all 200ms ease',
        flexShrink: '0',
        boxSizing: 'border-box',
      },
      onClick: () => {
        on = !on;
        track.style.background = on ? '#D4A017' : '#1a1a22';
        track.style.border = on ? '2px solid #D4A017' : '2px solid #3a3a44';
        dot.style.transform = on ? 'translateX(20px)' : 'translateX(2px)';
        dot.style.background = on ? '#fff' : '#8a7e6c';
        onChange(on);
      },
    }, dot);
    return track;
  }

  function label(text: string): HTMLElement {
    return h('span', { style: { fontFamily: 'var(--font-body)', fontSize: 'clamp(15px, 3.8vw, 16px)', color: 'var(--text-primary)' } }, text);
  }

  // ── Appearance ──
  const currentTheme = localStorage.getItem('os_mobile_theme') || 'auto';

  function themeButton(name: string, value: string): HTMLElement {
    const active = currentTheme === value;
    const btn = h('button', {
      style: {
        flex: '1', padding: '8px 0', border: 'none',
        borderRadius: '8px', fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 3.8vw, 16px)', fontWeight: '600',
        cursor: 'pointer', transition: 'all 150ms ease',
        background: active ? '#D4A017' : 'var(--surface-hover)',
        color: active ? '#fff' : 'var(--text-primary)',
      },
      onClick: () => {
        localStorage.setItem('os_mobile_theme', value);
        applyTheme(value);
        // Re-render to update active state
        renderProfile(container);
      },
    }, name);
    return btn;
  }

  function applyTheme(theme: string): void {
    if (theme === 'dark') {
      document.documentElement.removeAttribute('data-theme'); // dark is default
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      // Auto — CSS handles via @media + [data-theme="auto"]
      document.documentElement.setAttribute('data-theme', 'auto');
    }
  }

  const themeToggle = h('div', {
    style: { display: 'flex', gap: '4px', background: 'var(--surface-hover)', borderRadius: '10px', padding: '3px' },
  },
    themeButton('Light', 'light'),
    themeButton('Dark', 'dark'),
    themeButton('Auto', 'auto'),
  );

  // ── Notifications ──
  const notifPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
  const notifEnabled = notifPermission === 'granted';

  const notifStatus = h('span', {
    style: { fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' },
  }, notifPermission === 'granted' ? 'Enabled' : notifPermission === 'denied' ? 'Blocked' : 'Not set');

  const notifToggle = toggleSwitch(notifEnabled, async (on) => {
    if (on && typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        notifStatus.textContent = 'Enabled';
        showToast('Push notifications enabled', 'success');
      } else {
        notifStatus.textContent = perm === 'denied' ? 'Blocked' : 'Not set';
        showToast('Notification permission denied', 'error');
        // Re-render to reset toggle
        renderProfile(container);
      }
    }
  });

  // ── Data Saver ──
  const dataSaverOn = localStorage.getItem('os_mobile_data_saver') === 'true';
  const dataSaverToggle = toggleSwitch(dataSaverOn, (on) => {
    localStorage.setItem('os_mobile_data_saver', String(on));
    showToast(on ? 'Data saver enabled' : 'Data saver disabled', 'info');
  });

  // ── Storage ──
  const storageInfo = h('span', {
    style: { fontSize: '13px', color: 'var(--text-muted)' },
  }, 'Calculating...');

  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then((est) => {
      storageInfo.textContent = formatBytes(est.usage || 0) + ' used';
    }).catch(() => {
      storageInfo.textContent = 'Unknown';
    });
  } else {
    storageInfo.textContent = 'N/A';
  }

  const clearCacheBtn = h('button', {
    style: {
      padding: '10px 16px', border: 'none', borderRadius: '8px',
      background: 'var(--surface-hover)', color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)', fontSize: 'clamp(15px, 3.8vw, 16px)', fontWeight: '600', cursor: 'pointer',
      width: '100%', textAlign: 'center',
    },
    onClick: async () => {
      try {
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }
        showToast('Cached data cleared', 'success');
        // Update storage info
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          storageInfo.textContent = formatBytes(est.usage || 0) + ' used';
        }
      } catch {
        showToast('Failed to clear cache', 'error');
      }
    },
  }, 'Clear cached data');

  // ── App Info ──
  function linkRow(text: string, url: string): HTMLElement {
    return settingRow(
      label(text),
      h('button', {
        onClick: () => openInAppBrowser(url),
        style: {
          fontSize: '13px', color: '#D4A017', background: 'none',
          border: 'none', cursor: 'pointer', padding: '8px',
          minHeight: '44px', display: 'flex', alignItems: 'center',
        },
      }, '\u2192'),
    );
  }

  // ── Logout ──
  const logoutBtn = h('button', {
    style: {
      width: 'calc(100% - 32px)', margin: '24px 16px', padding: '14px',
      border: 'none', borderRadius: '12px',
      background: '#CE1126', color: '#fff',
      fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 3.8vw, 16px)', fontWeight: '700', cursor: 'pointer',
      textAlign: 'center',
    },
    onClick: () => {
      logout();
    },
  }, 'Log Out');

  // ── Render ──
  render(container,
    h('div', {
      style: { paddingBottom: '100px', overflowY: 'auto', height: '100%' },
    },
      profileCard,

      // Appearance
      sectionHeader('Appearance'),
      settingRow(label('Theme'), themeToggle),

      // Notifications
      sectionHeader('Notifications'),
      settingRow(
        h('div', { style: { display: 'flex', alignItems: 'center' } },
          label('Push Notifications'),
          notifStatus,
        ),
        notifToggle,
      ),

      // Data
      sectionHeader('Data'),
      settingRow(label('Data Saver Mode'), dataSaverToggle),

      // Storage
      sectionHeader('Storage'),
      h('div', { style: { padding: '8px 16px' } },
        storageInfo,
      ),
      h('div', { style: { padding: '4px 16px 8px' } },
        clearCacheBtn,
      ),

      // App Info
      sectionHeader('App Info'),
      settingRow(label('Version'), h('span', { style: { fontSize: '14px', color: 'var(--text-muted)' } }, '1.0.0')),
      linkRow('About OS Browser', 'https://osbrowser.askozzy.work'),
      linkRow('Desktop Version', 'https://osbrowser.askozzy.work'),
      linkRow('GitHub', 'https://github.com/ghwmelite-dotcom/OS-Browser'),

      // Account
      sectionHeader('Account'),
      logoutBtn,
    ),
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return val.toFixed(1) + ' ' + units[i];
}
