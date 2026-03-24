import './styles.css';
import { isLoggedIn, renderLoginPage } from './auth';
import { initRouter, registerRoute, navigate } from './router';
import { webRTCService } from './services/webrtc';
import { showCallView, setIncomingCallData } from './components/call-view';
import { isNativePlatform } from './utils/platform';
import { isBrowserOpen, closeInAppBrowser } from './components/in-app-browser';

// Register service worker (skip in native Capacitor app)
if ('serviceWorker' in navigator && !isNativePlatform()) {
  navigator.serviceWorker.register('/sw.js?v=3').then(reg => {
    if (reg) reg.update();
  }).catch(() => {});
}

// Capture install prompt immediately so we can fire it on page load
let deferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  if (isNativePlatform()) return; // Skip in native app
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

function showInstallBanner() {
  // Don't show if already installed (standalone mode)
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (navigator.standalone) return; // iOS

  // Remove existing banner if any
  document.getElementById('install-banner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.innerHTML = `
    <div style="
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 10000;
      background: linear-gradient(135deg, #006B3F 0%, #004d2d 100%);
      color: white; padding: 16px 20px;
      display: flex; align-items: center; gap: 14px;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
      animation: slideUpBanner 0.4s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="
        width: 48px; height: 48px; border-radius: 12px;
        background: rgba(255,255,255,0.15); display: flex;
        align-items: center; justify-content: center; flex-shrink: 0;
        font-size: 24px;
      ">🏄</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 700; font-size: 15px; margin-bottom: 2px;">Install OS Browser Mini</div>
        <div style="font-size: 12px; opacity: 0.85;">Add to home screen for instant access & offline use</div>
      </div>
      <button id="install-btn" style="
        background: #D4A017; color: #1a1610; border: none;
        padding: 10px 20px; border-radius: 24px; font-weight: 700;
        font-size: 14px; cursor: pointer; flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">Install</button>
      <button id="install-dismiss" style="
        background: none; border: none; color: rgba(255,255,255,0.7);
        font-size: 20px; cursor: pointer; padding: 4px 8px;
        flex-shrink: 0; line-height: 1;
      ">✕</button>
    </div>
  `;

  // Add animation keyframes
  if (!document.getElementById('install-banner-styles')) {
    const style = document.createElement('style');
    style.id = 'install-banner-styles';
    style.textContent = `
      @keyframes slideUpBanner {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  document.getElementById('install-btn')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        banner.remove();
      }
      deferredPrompt = null;
    }
  });

  document.getElementById('install-dismiss')?.addEventListener('click', () => {
    banner.remove();
  });
}

// For iOS which doesn't support beforeinstallprompt
function showIOSInstallHint() {
  // Already installed as PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (navigator.standalone) return;

  // Detect iOS (any browser on iOS uses WebKit under the hood)
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) return;

  // Don't show if already dismissed this session
  if (sessionStorage.getItem('ios_install_dismissed')) return;

  document.getElementById('install-banner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.innerHTML = `
    <div style="
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 10000;
      background: #141414;
      color: white;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.5);
      animation: slideUpBanner 0.4s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border-top: 2px solid rgba(212, 160, 23, 0.5);
    ">
      <!-- Header row -->
      <div style="display:flex; align-items:center; gap:12px; padding: 16px 16px 12px;">
        <div style="
          width:44px; height:44px; border-radius:11px;
          background: linear-gradient(135deg, #CE1126, #D4A017, #006B3F);
          display:flex; align-items:center; justify-content:center;
          font-size:17px; font-weight:800; color:#fff; flex-shrink:0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">OS</div>
        <div style="flex:1;">
          <div style="font-weight:700; font-size:15px;">Install OS Browser Mini</div>
          <div style="font-size:12px; color:rgba(255,255,255,0.5); margin-top:1px;">Add to your home screen</div>
        </div>
        <button id="install-dismiss" style="
          background: none; border: none; color: rgba(255,255,255,0.4);
          font-size: 20px; cursor: pointer; padding: 8px;
          flex-shrink: 0; line-height: 1;
          -webkit-tap-highlight-color: transparent;
        ">✕</button>
      </div>

      <!-- Step-by-step instructions -->
      <div style="padding: 0 16px 16px; display:flex; flex-direction:column; gap:10px;">
        <div style="
          display:flex; align-items:center; gap:12px;
          background: rgba(255,255,255,0.05); border-radius:12px; padding:12px 14px;
        ">
          <div style="
            width:32px; height:32px; border-radius:8px;
            background: rgba(0,122,255,0.15); color:#0A84FF;
            display:flex; align-items:center; justify-content:center;
            font-weight:800; font-size:14px; flex-shrink:0;
          ">1</div>
          <div style="font-size:14px; line-height:1.3;">
            Tap the <svg style="display:inline-block;vertical-align:middle;margin:0 3px;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" stroke-width="2.5" stroke-linecap="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> <strong style="color:#0A84FF;">Share</strong> button below
          </div>
        </div>

        <div style="
          display:flex; align-items:center; gap:12px;
          background: rgba(255,255,255,0.05); border-radius:12px; padding:12px 14px;
        ">
          <div style="
            width:32px; height:32px; border-radius:8px;
            background: rgba(0,107,63,0.15); color:#00A86B;
            display:flex; align-items:center; justify-content:center;
            font-weight:800; font-size:14px; flex-shrink:0;
          ">2</div>
          <div style="font-size:14px; line-height:1.3;">
            Scroll down &amp; tap <strong style="color:#00A86B;">Add to Home Screen</strong>
          </div>
        </div>
      </div>

      <!-- Arrow pointing to Safari share button -->
      <div style="
        text-align:center; padding-bottom:8px; font-size:22px;
        animation: bounceDown 1.5s ease-in-out infinite;
        color: #0A84FF;
      ">↓</div>
    </div>
  `;

  if (!document.getElementById('install-banner-styles')) {
    const style = document.createElement('style');
    style.id = 'install-banner-styles';
    style.textContent = `
      @keyframes slideUpBanner { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes bounceDown { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);
  document.getElementById('install-dismiss')?.addEventListener('click', () => {
    banner.remove();
    sessionStorage.setItem('ios_install_dismissed', '1');
  });
}

// Extend Navigator for iOS standalone check
declare global { interface Navigator { standalone?: boolean; } }

// Apply saved theme on boot (dark is default — no attribute needed)
function applyStoredTheme() {
  const saved = localStorage.getItem('os_mobile_theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else if (saved === 'auto') {
    document.documentElement.setAttribute('data-theme', 'auto');
  }
  // 'dark' or no saved value = default dark (no attribute)
}

// App init
function init() {
  applyStoredTheme();
  const app = document.getElementById('app');
  if (!app) return;

  if (!isLoggedIn()) {
    renderLoginPage(app, () => {
      // Don't reload — just boot the app directly after login
      window.location.hash = '#/';
      bootApp(app);
    });
    return;
  }

  bootApp(app);
}

async function bootApp(app: HTMLElement) {
  // Clear any login page content
  app.innerHTML = '';

  // Create app shell: kente crown + page content + kente thread + bottom nav

  // Kente crown — woven band at the very top
  const kenteCrown = document.createElement('div');
  kenteCrown.style.cssText = `
    height: 3px;
    background: var(--kente-crown);
    opacity: var(--kente-crown-opacity, 0.5);
    flex-shrink: 0;
  `;
  app.appendChild(kenteCrown);

  const pageContent = document.createElement('div');
  pageContent.id = 'page-content';
  pageContent.className = 'scrollable';
  pageContent.style.cssText = `
    height: calc(100dvh - 56px - 3px);
    height: calc(100vh - 56px - 3px);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    position: relative;
  `;
  app.appendChild(pageContent);

  // Import nav bar and pages in parallel
  const [
    navModule, home, chat, chatRoom, ai, portals, profile,
    ghanaCard, momo, dictionary, converter, dataSaver, passwords, games, dumsor,
    ussd, exchange,
  ] = await Promise.all([
    import('./components/nav-bar'),
    import('./pages/home'),
    import('./pages/chat'),
    import('./pages/chat-room'),
    import('./pages/ai'),
    import('./pages/portals'),
    import('./pages/profile'),
    import('./pages/ghana-card'),
    import('./pages/momo'),
    import('./pages/dictionary'),
    import('./pages/converter'),
    import('./pages/data-saver'),
    import('./pages/passwords'),
    import('./pages/games'),
    import('./pages/dumsor'),
    import('./pages/ussd'),
    import('./pages/exchange'),
  ]);

  // Initialize Dumsor Guard background services
  if (dumsor.initDumsorGuard) dumsor.initDumsorGuard();

  // Kente thread separator above bottom nav
  const kenteThread = document.createElement('div');
  kenteThread.style.cssText = `
    height: 1px;
    background: var(--kente-thread);
    opacity: 0.6;
    flex-shrink: 0;
  `;
  app.appendChild(kenteThread);

  // Add bottom nav bar
  app.appendChild(navModule.createNavBar());

  registerRoute('/', home.renderHomePage);
  registerRoute('/chat', chat.renderChatList);
  registerRoute('/chat/:roomId', chatRoom.renderChatRoom);
  registerRoute('/ai', ai.renderAIChat);
  registerRoute('/portals', portals.renderPortals);
  registerRoute('/profile', profile.renderProfile);
  registerRoute('/ghana-card', ghanaCard.renderGhanaCardPage);
  registerRoute('/momo', momo.renderMomoPage);
  registerRoute('/dictionary', dictionary.renderDictionaryPage);
  registerRoute('/converter', converter.renderConverterPage);
  registerRoute('/data-saver', dataSaver.renderDataSaverPage);
  registerRoute('/passwords', passwords.renderPasswordsPage);
  registerRoute('/games', games.renderGamesPage);
  registerRoute('/dumsor', dumsor.renderDumsorPage);
  registerRoute('/ussd', ussd.renderUSSDPage);
  registerRoute('/exchange', exchange.renderExchangePage);

  // All routes registered — now start the router (renders into pageContent)
  initRouter(pageContent);

  // Start incoming call polling (if authenticated, non-guest)
  try {
    const creds = JSON.parse(localStorage.getItem('os_mobile_credentials') || '{}');
    if (creds.accessToken && creds.userId && creds.userType !== 'guest') {
      webRTCService.setCredentials({ accessToken: creds.accessToken, userId: creds.userId });
      webRTCService.startIncomingCallPolling();

      webRTCService.on('call:incoming', (data: any) => {
        setIncomingCallData(data);
        showCallView();
      });
    }
  } catch { /* non-critical */ }

  // Request notification permission after 10 seconds (non-blocking)
  if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(() => {
      Notification.requestPermission();
    }, 10000);
  }

  // Android hardware back button handler (Capacitor native only)
  if (isNativePlatform()) {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', ({ canGoBack }) => {
        if (isBrowserOpen()) {
          closeInAppBrowser();
        } else if (window.location.hash && window.location.hash !== '#/') {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
    }).catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();

  // Show iOS install hint immediately on any page (login or dashboard)
  // Android is handled by the beforeinstallprompt listener above
  setTimeout(() => showIOSInstallHint(), 800);
});
