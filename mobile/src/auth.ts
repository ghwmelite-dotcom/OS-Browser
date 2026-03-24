import { login, redeemInvite, getMe, publicSignup } from './api';
import { h, render } from './utils/dom';
import {
  isBiometricAvailable, hasBiometricCredential, getBiometricUser,
  registerBiometric, authenticateBiometric, removeBiometric,
} from './utils/biometric';

interface Credentials {
  userId: string;
  accessToken: string;
  matrixToken?: string;
  staffId: string;
  homeserverUrl: string;
  deviceId?: string;
  displayName?: string;
  department?: string;
  ministry?: string;
  userType: 'staff' | 'public' | 'guest';
  email?: string;
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem('os_mobile_token');
}

export function isGuest(): boolean {
  const creds = getCredentials();
  return creds?.userType === 'guest';
}

export function getCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem('os_mobile_credentials');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCredentials(creds: Credentials): void {
  localStorage.setItem('os_mobile_credentials', JSON.stringify(creds));
  localStorage.setItem('os_mobile_token', creds.accessToken);
  if (creds.matrixToken) localStorage.setItem('os_mobile_matrix_token', creds.matrixToken);
}

export function logout(): void {
  const creds = getCredentials();
  localStorage.removeItem('os_mobile_credentials');
  localStorage.removeItem('os_mobile_token');
  localStorage.removeItem('os_mobile_matrix_token');
  // Biometric credential is NOT removed on logout — it persists for easy re-login.
  // Only removed if the user explicitly disables biometric in settings.
  window.location.hash = '#/login';
  window.location.reload();
}

export async function enrichProfile(creds: Credentials): Promise<Credentials> {
  try {
    const me = await getMe();
    return {
      ...creds,
      displayName: me.displayName || creds.displayName,
      department: me.department || '',
      ministry: me.ministry || '',
      matrixToken: me.matrixToken || creds.matrixToken,
      deviceId: me.deviceId || creds.deviceId,
    };
  } catch { return creds; }
}

/** Inject loading screen keyframes + styles once */
function injectLoadingStyles(): void {
  if (document.getElementById('login-loading-styles')) return;
  const style = document.createElement('style');
  style.id = 'login-loading-styles';
  style.textContent = `
    @keyframes loginPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.08); opacity: 0.85; }
    }
    @keyframes loginOrbitSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes loginShimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes loginDotBounce {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
      40% { transform: translateY(-8px); opacity: 1; }
    }
    @keyframes loginFadeIn {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes loginProgressGlow {
      0% { box-shadow: 0 0 8px rgba(212,160,23,0.3); }
      50% { box-shadow: 0 0 20px rgba(212,160,23,0.6), 0 0 40px rgba(0,107,63,0.2); }
      100% { box-shadow: 0 0 8px rgba(212,160,23,0.3); }
    }
    @keyframes loginStatusFade {
      0% { opacity: 0; transform: translateY(6px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

/** Create the beautiful full-screen loading overlay */
function createLoadingScreen(displayName: string): HTMLElement {
  injectLoadingStyles();

  const initials = displayName
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'OS';

  const overlay = h('div', {
    className: 'login-loading-overlay',
    style: {
      position: 'fixed',
      inset: '0',
      zIndex: '10000',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0',
      animation: 'loginFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    },
  },
    // Orbital ring container
    h('div', {
      style: {
        position: 'relative',
        width: '120px',
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '32px',
      },
    },
      // Spinning orbit ring
      h('div', {
        style: {
          position: 'absolute',
          inset: '0',
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#CE1126',
          borderRightColor: '#D4A017',
          borderBottomColor: '#006B3F',
          animation: 'loginOrbitSpin 1.8s linear infinite',
        },
      }),
      // Second ring (counter-spin, smaller)
      h('div', {
        style: {
          position: 'absolute',
          inset: '10px',
          borderRadius: '50%',
          border: '1.5px solid transparent',
          borderTopColor: '#006B3F',
          borderRightColor: '#CE1126',
          borderBottomColor: '#D4A017',
          animation: 'loginOrbitSpin 2.4s linear infinite reverse',
          opacity: '0.5',
        },
      }),
      // Center avatar with pulsing logo
      h('div', {
        style: {
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #CE1126, #D4A017, #006B3F)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '24px',
          fontWeight: '800',
          color: '#fff',
          letterSpacing: '-0.5px',
          animation: 'loginPulse 2s ease-in-out infinite',
          boxShadow: '0 4px 24px rgba(212,160,23,0.3)',
        },
      }, initials),
    ),

    // Welcome text
    h('div', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(20px, 5.5vw, 24px)',
        fontWeight: '700',
        color: '#f0f0f0',
        textAlign: 'center',
        marginBottom: '8px',
        letterSpacing: '-0.3px',
      },
    }, `Welcome, ${displayName}`),

    // Shimmer subtitle
    h('div', {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(13px, 3.4vw, 15px)',
        fontWeight: '500',
        background: 'linear-gradient(90deg, #6e6e85 0%, #D4A017 50%, #6e6e85 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'loginShimmer 2.5s linear infinite',
        textAlign: 'center',
        marginBottom: '36px',
      },
    }, 'Setting up your workspace...'),

    // Progress bar
    h('div', {
      style: {
        width: 'clamp(200px, 60vw, 260px)',
        height: '3px',
        borderRadius: '4px',
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        marginBottom: '24px',
        animation: 'loginProgressGlow 2s ease-in-out infinite',
      },
    },
      h('div', {
        style: {
          width: '40%',
          height: '100%',
          borderRadius: '4px',
          background: 'linear-gradient(90deg, #CE1126, #D4A017, #006B3F)',
          animation: 'loginShimmer 1.5s ease-in-out infinite',
          backgroundSize: '200% auto',
        },
      }),
    ),

    // Bouncing dots
    h('div', {
      style: {
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        marginBottom: '16px',
      },
    },
      h('div', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#CE1126', animation: 'loginDotBounce 1.4s ease-in-out infinite' } }),
      h('div', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#D4A017', animation: 'loginDotBounce 1.4s ease-in-out 0.2s infinite' } }),
      h('div', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#006B3F', animation: 'loginDotBounce 1.4s ease-in-out 0.4s infinite' } }),
    ),

    // Status text (animated change)
    h('div', {
      className: 'login-status-text',
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(11px, 2.8vw, 12px)',
        color: '#6e6e85',
        textAlign: 'center',
        animation: 'loginStatusFade 0.4s ease-out',
      },
    }, 'Connecting to OS Browser Mini...'),
  );

  // Cycle through status messages
  const statusEl = overlay.querySelector('.login-status-text') as HTMLElement;
  const statuses = [
    'Connecting to OS Browser Mini...',
    'Authenticating credentials...',
    'Loading your profile...',
    'Preparing dashboard...',
    'Almost ready...',
  ];
  let idx = 0;
  const statusInterval = setInterval(() => {
    idx = (idx + 1) % statuses.length;
    if (statusEl) {
      statusEl.style.animation = 'none';
      statusEl.offsetHeight; // force reflow
      statusEl.textContent = statuses[idx];
      statusEl.style.animation = 'loginStatusFade 0.4s ease-out';
    }
  }, 2200);

  // Store interval on element for cleanup
  (overlay as any)._statusInterval = statusInterval;

  return overlay;
}

/** Remove loading screen with fade-out */
function removeLoadingScreen(): void {
  const overlay = document.querySelector('.login-loading-overlay') as HTMLElement | null;
  if (!overlay) return;
  if ((overlay as any)._statusInterval) clearInterval((overlay as any)._statusInterval);
  overlay.style.transition = 'opacity 0.3s ease-out';
  overlay.style.opacity = '0';
  setTimeout(() => overlay.remove(), 300);
}

// ---------------------------------------------------------------------------
// Biometric prompt helpers
// ---------------------------------------------------------------------------

/** Show "Enable biometric login?" banner after successful login */
function showBiometricPrompt(
  userId: string, staffId: string, displayName: string, userType: 'staff' | 'public' | 'guest',
): void {
  const banner = h('div', {
    className: 'biometric-prompt-banner',
    style: {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      zIndex: '10001',
      background: 'rgba(15, 15, 20, 0.96)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(212,160,23,0.3)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'loginStatusFade 0.3s ease-out',
    },
  },
    h('div', {
      style: { fontSize: '28px', flexShrink: '0' },
    }, '\uD83D\uDD12'),
    h('div', { style: { flex: '1', minWidth: '0' } },
      h('div', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: '14px',
          fontWeight: '600',
          color: '#f0f0f0',
          marginBottom: '2px',
        },
      }, 'Enable biometric login?'),
      h('div', {
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          color: '#8e8ea0',
        },
      }, 'Use fingerprint or face to sign in next time'),
    ),
    h('button', {
      style: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        background: 'linear-gradient(135deg, #D4A017, #b8860b)',
        color: '#fff',
        fontFamily: 'var(--font-display)',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        flexShrink: '0',
      },
      onClick: async () => {
        const ok = await registerBiometric(userId, staffId, displayName, userType);
        banner.remove();
        if (ok) showToast('Biometric login enabled!');
      },
    }, 'Enable'),
    h('button', {
      style: {
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'transparent',
        color: '#8e8ea0',
        fontFamily: 'var(--font-body)',
        fontSize: '12px',
        cursor: 'pointer',
        flexShrink: '0',
      },
      onClick: () => banner.remove(),
    }, 'Not now'),
  );
  document.body.appendChild(banner);
}

/** Minimal toast notification */
function showToast(message: string): void {
  const toast = h('div', {
    style: {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '10002',
      background: 'rgba(0, 107, 63, 0.95)',
      color: '#fff',
      padding: '10px 20px',
      borderRadius: '10px',
      fontFamily: 'var(--font-body)',
      fontSize: '13px',
      fontWeight: '500',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      animation: 'loginStatusFade 0.3s ease-out',
    },
  }, message);
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease-out';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ---------------------------------------------------------------------------
// Post-login biometric check
// ---------------------------------------------------------------------------

async function maybeOfferBiometric(
  userId: string, staffId: string, displayName: string, userType: 'staff' | 'public' | 'guest',
): Promise<void> {
  try {
    const available = await isBiometricAvailable();
    if (available && !hasBiometricCredential()) {
      showBiometricPrompt(userId, staffId, displayName, userType);
    }
  } catch { /* biometric offer is best-effort */ }
}

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------

export function renderLoginPage(container: HTMLElement, onSuccess: () => void): void {
  let mode: 'login' | 'public' | 'guest' = 'login';
  let loading = false;
  let error = '';
  let showBiometricSection = hasBiometricCredential();
  const bioUser = getBiometricUser();

  // ── Biometric handler (reused) ──
  async function handleBiometric() {
    const user = await authenticateBiometric();
    if (user) {
      const name = user.displayName || 'User';
      document.body.appendChild(createLoadingScreen(name));
      try {
        if (user.userType === 'guest') {
          const guestCreds: Credentials = {
            userId: `guest_${Date.now()}`, accessToken: 'guest_token',
            matrixToken: undefined, staffId: '', homeserverUrl: '',
            userType: 'guest', displayName: name,
          };
          saveCredentials(guestCreds);
          setTimeout(() => { removeLoadingScreen(); onSuccess(); }, 400);
        } else {
          const data = await login(user.staffId, user.displayName);
          const creds: Credentials = {
            userId: data.userId, accessToken: data.accessToken,
            matrixToken: data.matrixToken, staffId: data.staffId,
            homeserverUrl: data.homeserverUrl, deviceId: data.deviceId,
            displayName: name, userType: user.userType || 'staff',
          };
          saveCredentials(creds);
          enrichProfile(creds).then(enriched => saveCredentials(enriched)).catch(() => {});
          setTimeout(() => { removeLoadingScreen(); onSuccess(); }, 800);
        }
      } catch (err: any) {
        removeLoadingScreen();
        error = err.message || 'Biometric login failed';
        showBiometricSection = false;
        draw();
      }
    } else {
      showToast('Biometric authentication failed');
    }
  }

  function draw() {
    // ── Build the card contents ──
    const cardChildren: HTMLElement[] = [];

    // Desktop-only card header (logo is in the brand panel on desktop)
    cardChildren.push(
      h('div', { className: 'login-card-header' },
        h('div', { className: 'login-card-header-title' }, 'Welcome'),
        h('div', { className: 'login-card-header-subtitle' }, 'Sign in to access government services'),
      ),
    );

    // Mobile-only logo
    cardChildren.push(
      h('div', { className: 'login-logo' },
        h('img', { className: 'login-logo-icon', src: '/icons/logo.png', alt: 'OS Browser', draggable: 'false' }),
        h('h1', { className: 'login-title' }, 'OS Browser Mini'),
        h('p', { className: 'login-subtitle' }, "Ghana\u2019s Government Browser"),
      ),
    );

    // Biometric unlock section
    if (showBiometricSection && bioUser) {
      cardChildren.push(
        h('div', { className: 'login-biometric' },
          h('div', { className: 'login-biometric-title' }, `Welcome back, ${bioUser.displayName}`),
          h('button', { className: 'login-biometric-btn', onClick: handleBiometric }, '\uD83D\uDD13'),
          h('div', { className: 'login-biometric-hint' }, 'Tap to unlock with biometrics'),
          h('button', {
            className: 'login-biometric-fallback',
            onClick: () => { showBiometricSection = false; draw(); },
          }, 'Use password instead'),
        ),
        h('div', { className: 'login-divider' },
          h('span', { className: 'login-divider-text' }, 'or sign in'),
        ),
      );
    }

    // Mode toggle
    cardChildren.push(
      h('div', { className: 'login-toggle' },
        h('button', {
          className: `login-toggle-btn ${mode === 'login' ? 'active' : ''}`,
          onClick: () => { mode = 'login'; error = ''; draw(); },
        }, 'Staff'),
        h('button', {
          className: `login-toggle-btn ${mode === 'public' ? 'active' : ''}`,
          onClick: () => { mode = 'public'; error = ''; draw(); },
        }, 'Public'),
        h('button', {
          className: `login-toggle-btn ${mode === 'guest' ? 'active' : ''}`,
          onClick: () => { mode = 'guest'; error = ''; draw(); },
        }, 'Guest'),
      ),
    );

    // ── Staff Login form ──
    if (mode === 'login') {
      cardChildren.push(
        h('form', {
          className: 'login-form',
          onSubmit: async (e: Event) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const staffId = (form.querySelector('[name="staffId"]') as HTMLInputElement)?.value?.trim();
            const displayName = (form.querySelector('[name="displayName"]') as HTMLInputElement)?.value?.trim() || staffId;
            const code = (form.querySelector('[name="code"]') as HTMLInputElement)?.value?.trim();
            if (!staffId) { error = 'Staff ID is required'; draw(); return; }
            loading = true; error = '';
            document.body.appendChild(createLoadingScreen(displayName));
            try {
              const data = code
                ? await redeemInvite(code, staffId, displayName)
                : await login(staffId, displayName);
              const creds: Credentials = {
                userId: data.userId, accessToken: data.accessToken,
                matrixToken: data.matrixToken, staffId: data.staffId,
                homeserverUrl: data.homeserverUrl, deviceId: data.deviceId,
                displayName, userType: 'staff',
              };
              saveCredentials(creds);
              enrichProfile(creds).then(enriched => saveCredentials(enriched)).catch(() => {});
              setTimeout(() => {
                removeLoadingScreen(); onSuccess();
                maybeOfferBiometric(creds.userId, creds.staffId, displayName, 'staff');
              }, 800);
            } catch (err: any) {
              removeLoadingScreen();
              error = err.message || 'Login failed';
              loading = false; draw();
            }
          },
        },
          h('input', { type: 'text', name: 'staffId', placeholder: 'Staff ID (e.g. GHS-00123)', className: 'login-input', autocomplete: 'username' }),
          h('input', { type: 'text', name: 'displayName', placeholder: 'Display Name', className: 'login-input' }),
          h('input', { type: 'text', name: 'code', placeholder: 'Invite Code (optional)', className: 'login-input', maxLength: '8', style: { textTransform: 'uppercase', letterSpacing: '2px' } }),
          error ? h('div', { className: 'login-error' }, error) : h('span', { style: { display: 'none' } }),
          h('button', { type: 'submit', className: 'login-btn', disabled: loading },
            loading ? 'Signing in\u2026' : 'Sign In',
          ),
        ),
      );
    }

    // ── Public Signup form ──
    if (mode === 'public') {
      cardChildren.push(
        h('form', {
          className: 'login-form',
          onSubmit: async (e: Event) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const displayName = (form.querySelector('[name="displayName"]') as HTMLInputElement)?.value?.trim();
            const email = (form.querySelector('[name="email"]') as HTMLInputElement)?.value?.trim();
            if (!displayName) { error = 'Display Name is required'; draw(); return; }
            if (!email) { error = 'Email is required'; draw(); return; }
            if (email.toLowerCase().endsWith('.gov.gh')) {
              error = 'Government emails should use Staff Login instead';
              draw(); return;
            }
            loading = true; error = '';
            document.body.appendChild(createLoadingScreen(displayName));
            try {
              const data = await publicSignup(displayName, email);
              const creds: Credentials = {
                userId: data.userId, accessToken: data.accessToken,
                matrixToken: data.matrixToken, staffId: data.staffId || '',
                homeserverUrl: data.homeserverUrl || '', deviceId: data.deviceId,
                displayName, userType: 'public', email,
              };
              saveCredentials(creds);
              enrichProfile(creds).then(enriched => saveCredentials(enriched)).catch(() => {});
              setTimeout(() => {
                removeLoadingScreen(); onSuccess();
                maybeOfferBiometric(creds.userId, creds.staffId || email, displayName, 'public');
              }, 800);
            } catch (err: any) {
              removeLoadingScreen();
              error = err.message || 'Signup failed. Try Guest mode instead.';
              loading = false; draw();
            }
          },
        },
          h('input', { type: 'text', name: 'displayName', placeholder: 'Display Name', className: 'login-input' }),
          h('input', { type: 'email', name: 'email', placeholder: 'Email address', className: 'login-input', autocomplete: 'email' }),
          h('div', { className: 'login-helper' }, 'Public users can access portals, AI, games & tools. Government chat requires a Staff ID.'),
          error ? h('div', { className: 'login-error' }, error) : h('span', { style: { display: 'none' } }),
          h('button', {
            type: 'submit', className: 'login-btn', disabled: loading,
            style: { background: 'linear-gradient(135deg, #006B3F, #00a86b)' },
          }, loading ? 'Joining\u2026' : 'Join as Public User'),
        ),
      );
    }

    // ── Guest Mode form ──
    if (mode === 'guest') {
      cardChildren.push(
        h('form', {
          className: 'login-form',
          onSubmit: (e: Event) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const displayName = (form.querySelector('[name="displayName"]') as HTMLInputElement)?.value?.trim() || 'Guest';
            document.body.appendChild(createLoadingScreen(displayName));
            const guestCreds: Credentials = {
              userId: `guest_${Date.now()}`, accessToken: 'guest_token',
              matrixToken: undefined, staffId: '', homeserverUrl: '',
              userType: 'guest', displayName,
            };
            saveCredentials(guestCreds);
            setTimeout(() => { removeLoadingScreen(); onSuccess(); }, 400);
          },
        },
          h('input', { type: 'text', name: 'displayName', placeholder: 'Display Name (optional)', className: 'login-input' }),
          h('div', { className: 'login-helper' }, 'Browse portals, AI assistant, games, and tools without an account. Chat features are disabled.'),
          error ? h('div', { className: 'login-error' }, error) : h('span', { style: { display: 'none' } }),
          h('button', {
            type: 'submit', className: 'login-btn',
          }, 'Continue as Guest'),
        ),
      );
    }

    // ── Footer ──
    cardChildren.push(
      h('div', { className: 'login-footer' },
        h('div', { className: 'login-footer-text' },
          'Powered by OS Browser',
          h('span', { className: 'login-footer-flag' },
            h('span', { style: { background: '#CE1126' } }),
            h('span', { style: { background: '#D4A017' } }),
            h('span', { style: { background: '#006B3F' } }),
          ),
        ),
      ),
    );

    // ── Assemble the full page ──
    const page = h('div', { className: 'login-page' },
      // Animated background
      h('div', { className: 'login-bg' },
        h('div', { className: 'login-bg-orb login-bg-orb--gold' }),
        h('div', { className: 'login-bg-orb login-bg-orb--green' }),
        h('div', { className: 'login-bg-orb login-bg-orb--red' }),
        h('div', { className: 'login-bg-kente' }),
        h('div', { className: 'login-bg-particles' },
          h('div', { className: 'login-bg-particle' }),
          h('div', { className: 'login-bg-particle' }),
          h('div', { className: 'login-bg-particle' }),
          h('div', { className: 'login-bg-particle' }),
          h('div', { className: 'login-bg-particle' }),
          h('div', { className: 'login-bg-particle' }),
        ),
      ),

      // Desktop brand panel (left side)
      h('div', { className: 'login-brand' },
        h('img', { className: 'login-brand-logo', src: '/icons/logo.png', alt: 'OS Browser', draggable: 'false' }),
        h('h1', { className: 'login-brand-title' },
          'Ghana\u2019s Digital',
          h('br'),
          'Government Portal',
        ),
        h('p', { className: 'login-brand-subtitle' },
          'Access government services, communicate securely with colleagues, and stay connected \u2014 all from one unified platform.',
        ),
        h('div', { className: 'login-brand-features' },
          h('div', { className: 'login-brand-feature' },
            h('div', { className: 'login-brand-feature-icon login-brand-feature-icon--gold' }, '\uD83D\uDD12'),
            h('span', {}, 'Secure end-to-end encrypted messaging'),
          ),
          h('div', { className: 'login-brand-feature' },
            h('div', { className: 'login-brand-feature-icon login-brand-feature-icon--green' }, '\uD83C\uDFDB\uFE0F'),
            h('span', {}, '25+ government service portals'),
          ),
          h('div', { className: 'login-brand-feature' },
            h('div', { className: 'login-brand-feature-icon login-brand-feature-icon--red' }, '\u2728'),
            h('span', {}, 'AI-powered assistant for instant help'),
          ),
        ),
      ),

      // Login card panel (right side on desktop, full on mobile)
      h('div', { className: 'login-card-panel' },
        h('div', { className: 'login-card' }, ...cardChildren),
      ),
    );

    render(container, page);
  }

  draw();
}
