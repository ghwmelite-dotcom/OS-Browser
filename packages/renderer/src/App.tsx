import React, { useEffect, useState } from 'react';
import { TitleBar } from './components/Browser/TitleBar';
import { TabBar } from './components/Browser/tabs/TabBar';
import { NavigationBar } from './components/Browser/NavigationBar';
import { BookmarksBar } from './components/Browser/BookmarksBar';
import { StatusBar } from './components/Browser/StatusBar';
import { ContentArea } from './components/Content/ContentArea';
import { AISidebar } from './components/Sidebar/AISidebar';
import { AskOzzyPanel } from './components/AskOzzyPanel';
import { HistoryPanel } from './components/Panels/HistoryPanel';
import { BookmarkManager } from './components/Panels/BookmarkManager';
import { SettingsPanel } from './components/Panels/SettingsPanel';
import { useTabsStore } from './store/tabs';
import { useNavigationStore } from './store/navigation';
import { useSettingsStore } from './store/settings';
import { useConnectivityStore } from './store/connectivity';
import { useStatsStore } from './store/stats';
import { useSidebarStore } from './store/sidebar';
import { useSplitScreenStore } from './store/splitscreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { CommandPalette } from './components/CommandPalette';
import { FloatingAIBar } from './components/FloatingAIBar';
import { SplitScreenToolbar, SplitScreenContent, SplitScreenPicker } from './components/SplitScreen';
import { CurrencyTools } from './components/CurrencyTools';
import { TwiDictionary } from './components/TwiDictionary';
// ReadingMode replaced by ReadingModePanel (lazy loaded below)
import { DownloadBar } from './components/DownloadBar';
import { Onboarding } from './components/Onboarding';
import { OfflineBanner } from './components/NetworkManager/OfflineBanner';
import { useNetworkStore } from './store/network';
import { IdentityPanel } from './components/GhanaCard/IdentityPanel';
import { GovChatPanel } from './components/GovChat/GovChatPanel';
import { TranslationPanel } from './components/Translation/TranslationPanel';
import { LiteracyAssistant } from './components/DigitalLiteracy/LiteracyAssistant';
import { ReportGenerator, type ReportData } from './components/ScreenshotReport/ReportGenerator';
import { MobileMoneyPanel } from './components/MobileMoney/MobileMoneyPanel';
import { initializeFeatures } from './features';
import { initDesktopNotifications } from '@/services/DesktopNotificationBridge';
import { KenteSidebar } from './components/KenteSystem/KenteSidebar';
import { KenteStatusBar } from './components/KenteSystem/KenteStatusBar';
import { KenteCommandBar } from './components/KenteSystem/KenteCommandBar';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import type { PWAInstallData } from './components/PWAInstallPrompt';
import { ToastNotification } from './components/Notifications/ToastNotification';
import { useWellbeingStore } from './store/wellbeing';
// WorkspaceSwitcher is now integrated into TabBar
import { useTabIntelligenceStore } from './store/tab-intelligence';
import { useWorkspaceStore } from './store/workspaces';
import { TabSearchModal } from './components/Tabs/TabSearchModal';
import { useNotificationStore } from './store/notifications';
import { useProfileStore } from './store/profiles';
import { useVaultStore } from './store/vault';
import { ProfileLauncher } from './components/Profiles/ProfileLauncher';
import { MiniConverter } from './components/Exchange/MiniConverter';
import { useExchangeStore } from './store/exchange';
import { useDownloadStore } from './store/downloads';

const ImportBanner = React.lazy(() => import('./components/BrowserImport/ImportBanner'));
import { MemorySaverBanner } from './components/Browser/MemorySaverBanner';
import { PasswordSavePrompt } from './components/Passwords/PasswordSavePrompt';
import { usePasswordStore } from './store/passwords';
import { RegionSelector } from './components/Screenshots/RegionSelector';
import { ScreenshotPreview } from './components/Screenshots/ScreenshotPreview';
const RecorderControls = React.lazy(() => import('./components/ScreenRecorder/RecorderControls'));
const AnnotationOverlay = React.lazy(() => import('./components/ScreenRecorder/AnnotationOverlay'));
const PostRecordingToast = React.lazy(() => import('./components/ScreenRecorder/PostRecordingToast'));
const ReadingModePanel = React.lazy(() => import('./components/ReadingMode/ReadingModePanel'));

/** Non-intrusive banner prompting user to set OS Browser as default */
function DefaultBrowserBanner({ onClose }: { onClose: () => void }) {
  const [setting, setSetting] = useState(false);

  const handleSetDefault = async () => {
    setSetting(true);
    try {
      await (window as any).osBrowser?.app?.setDefaultBrowser?.();
      setTimeout(onClose, 1500);
    } catch {
      setSetting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 20px', borderRadius: 12,
      background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxWidth: 520,
      animation: 'fadeUp 0.3s ease-out',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: 'linear-gradient(135deg, #D4A017, #F2C94C)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
      }}>
        🌐
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          Set OS Browser as your default?
        </p>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
          Open web links directly in OS Browser
        </p>
      </div>
      <button
        onClick={handleSetDefault}
        disabled={setting}
        style={{
          padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'var(--color-accent)', color: '#fff', fontSize: 12,
          fontWeight: 600, whiteSpace: 'nowrap', opacity: setting ? 0.6 : 1,
        }}
      >
        {setting ? 'Opening...' : 'Set Default'}
      </button>
      <button
        onClick={onClose}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          color: 'var(--color-text-muted)', fontSize: 16, lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

function TabSearchOverlay() {
  const showTabSearch = useTabIntelligenceStore(s => s.showTabSearch);
  if (!showTabSearch) return null;
  return <TabSearchModal onClose={() => useTabIntelligenceStore.getState().toggleTabSearch()} />;
}

export function App() {
  const { loadTabs, createTab, activeTabId } = useTabsStore();
  const { loadSettings } = useSettingsStore();
  const { init: initConnectivity } = useConnectivityStore();
  const { loadStats } = useStatsStore();
  const { isOpen, activePanel } = useSidebarStore();

  const { isLaunching, isLocked, setLaunching } = useProfileStore();
  const [profileReady, setProfileReady] = useState(false);

  // On mount, check if there's an active profile already
  useEffect(() => {
    (async () => {
      try {
        const active = await window.osBrowser.profiles.getActive();
        if (active) {
          // Active profile exists — skip launcher
          useProfileStore.getState().loadActiveProfile();
          setProfileReady(true);
          setLaunching(false);
        } else {
          // No active profile — show launcher
          setLaunching(true);
        }
      } catch {
        // profiles bridge might not exist in older builds — skip
        setProfileReady(true);
        setLaunching(false);
      }
    })();
  }, []);

  // Sync notification unread count to profile system (for launcher badges)
  useEffect(() => {
    const syncUnread = async () => {
      try {
        const active = await window.osBrowser.profiles.getActive();
        if (!active) return;
        // Count unread from localStorage notifications
        const raw = localStorage.getItem('os-browser-notifications');
        if (raw) {
          const notifications = JSON.parse(raw);
          const unread = Array.isArray(notifications) ? notifications.filter((n: any) => !n.read).length : 0;
          await window.osBrowser.profiles.updateUnread(active.id, unread);
        }
      } catch {}
    };
    // Sync every 30 seconds and on visibility change
    const interval = setInterval(syncUnread, 30000);
    const handleVisibility = () => { if (document.hidden) syncUnread(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);

  // ALL useState hooks MUST be declared before any conditional return
  const [showHistory, setShowHistory] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSplitPicker, setShowSplitPicker] = useState(false);
  const [showCurrencyTools, _setShowCurrencyTools] = useState(false);
  const [showTwiDictionary, _setShowTwiDictionary] = useState(false);
  const [readingMode, setReadingMode] = useState<{ active: boolean; content: string; title: string; url: string }>({ active: false, content: '', title: '', url: '' });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showIdentityPanel, setShowIdentityPanel] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showTranslationPanel, _setShowTranslationPanel] = useState(false);
  const [showLiteracyPanel, setShowLiteracyPanel] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [showMobileMoney, setShowMobileMoney] = useState(false);
  const [pwaData, setPwaData] = useState<PWAInstallData | null>(null);
  const [pwaInstallableData, setPwaInstallableData] = useState<PWAInstallData | null>(null);
  const [showDefaultBrowserPrompt, setShowDefaultBrowserPrompt] = useState(false);
  const [showImportBanner, setShowImportBanner] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [memorySaverBanner, setMemorySaverBanner] = useState<{
    tabId: string; memorySavedBytes: number; domain: string;
  } | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<{
    domain: string; username: string; password: string; url: string; tabId: string;
  } | null>(null);

  const handleProfileReady = async () => {
    setProfileReady(true);
    setLaunching(false);
    useProfileStore.getState().loadActiveProfile();
    // Sync profile name to the old profile store (localStorage) so Settings page picks it up
    try {
      const active = await window.osBrowser.profiles.getActive();
      if (active?.name) {
        const existing = JSON.parse(localStorage.getItem('os_browser_profile') || '{}');
        localStorage.setItem('os_browser_profile', JSON.stringify({
          ...existing,
          displayName: active.name,
        }));
      }
    } catch {}
    // Force reload the app data for the new profile
    window.location.reload();
  };

  // Wrap sidebar panel setters to hide/show WebContentsViews
  const setShowCurrencyTools = (v: boolean | ((prev: boolean) => boolean)) => {
    _setShowCurrencyTools(prev => {
      const newVal = typeof v === 'function' ? v(prev) : v;
      if (newVal) window.osBrowser?.hideWebViews?.();
      else if (!showTwiDictionary && !isOpen) window.osBrowser?.showWebViews?.();
      return newVal;
    });
  };
  const setShowTwiDictionary = (v: boolean | ((prev: boolean) => boolean)) => {
    _setShowTwiDictionary(prev => {
      const newVal = typeof v === 'function' ? v(prev) : v;
      if (newVal) window.osBrowser?.hideWebViews?.();
      else if (!showCurrencyTools && !showTranslationPanel && !isOpen) window.osBrowser?.showWebViews?.();
      return newVal;
    });
  };
  const setShowTranslationPanel = (v: boolean | ((prev: boolean) => boolean)) => {
    _setShowTranslationPanel(prev => {
      const newVal = typeof v === 'function' ? v(prev) : v;
      if (newVal) window.osBrowser?.hideWebViews?.();
      else if (!showCurrencyTools && !showTwiDictionary && !isOpen) window.osBrowser?.showWebViews?.();
      return newVal;
    });
  };

  // Also hide views when AI sidebar or AskOzzy panel opens
  useEffect(() => {
    if (isOpen) window.osBrowser?.hideWebViews?.();
    else if (!showCurrencyTools && !showTwiDictionary && !showTranslationPanel) window.osBrowser?.showWebViews?.();
  }, [isOpen]);
  const splitActive = useSplitScreenStore(s => s.isActive);

  useKeyboardShortcuts({
    onToggleHistory: () => setShowHistory(prev => !prev),
    onToggleBookmarks: () => setShowBookmarks(prev => !prev),
    onToggleSettings: () => setShowSettings(prev => !prev),
    onToggleCommandPalette: () => setShowCommandPalette(prev => !prev),
    onToggleSplitScreen: () => {
      const { isActive, deactivate } = useSplitScreenStore.getState();
      if (isActive) deactivate();
      else setShowSplitPicker(true);
    },
    onBookmarkPage: async () => {
      const url = useNavigationStore.getState().currentUrl;
      const tabs = useTabsStore.getState().tabs;
      const activeTab = tabs.find(t => t.id === useTabsStore.getState().activeTabId);
      if (url && !url.startsWith('os-browser://')) {
        const isBookmarked = await window.osBrowser.bookmarks.isBookmarked(url);
        if (!isBookmarked) {
          await window.osBrowser.bookmarks.add({ url, title: activeTab?.title || url });
        } else {
          const data = await window.osBrowser.bookmarks.list();
          const bms = data.bookmarks || data || [];
          const match = bms.find((b: any) => b.url === url);
          if (match) await window.osBrowser.bookmarks.delete(match.id);
        }
        // Notify BookmarkStar to refresh its state
        window.dispatchEvent(new Event('bookmark-changed'));
      }
    },
  });

  useEffect(() => {
    const init = async () => {
      try {
        initializeFeatures();
        initDesktopNotifications();
        await loadSettings();
        const settings = useSettingsStore.getState().settings as any;
        const startupMode = settings?.startup_mode || 'newtab';

        // Check if this is a private window (always dark mode)
        const isPrivate = new URLSearchParams(window.location.search).get('private') === 'true';
        if (isPrivate) {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
          // Set privacy mode
          window.osBrowser.settings.update({ privacy_mode: true });
        } else {
          // Apply saved theme on startup
          const theme = settings?.theme || 'light';
          document.documentElement.classList.toggle('dark', theme === 'dark');
          document.documentElement.classList.toggle('light', theme !== 'dark');
        }

        // Check if onboarding was completed
        const onboardingDone = (useSettingsStore.getState().settings as any)?.onboarding_completed;
        if (!onboardingDone) {
          setShowOnboarding(true);
          // During onboarding: start fresh — hide any existing web views
          // and create a single clean new tab
          window.osBrowser?.hideWebViews?.();
          await loadTabs();
          if (useTabsStore.getState().tabs.length === 0) {
            await createTab();
          }
          await loadStats();
          return; // Skip session restore — onboarding is showing
        }

        await loadTabs();
        const existingTabs = useTabsStore.getState().tabs;

        if (startupMode === 'restore' && existingTabs.length > 0) {
          for (const tab of existingTabs) {
            if (tab.url && tab.url !== 'os-browser://newtab') {
              await window.osBrowser.tabs.navigate(tab.id, tab.url);
            }
          }
        } else {
          if (existingTabs.length === 0) {
            await createTab();
          }
        }

        await loadStats();

        // Default browser check moved to separate useEffect
      } catch (err) {
        console.error('Init error:', err);
      }
    };
    init();

    let cleanup: (() => void) | undefined;
    try {
      cleanup = initConnectivity();
    } catch {}

    let networkCleanup: (() => void) | undefined;
    try {
      networkCleanup = useNetworkStore.getState().init();
    } catch {}

    // Listen for tab events from main process
    const cleanups: (() => void)[] = [];
    try {
      cleanups.push(window.osBrowser.tabs.onLoading((data: any) => {
        useTabsStore.getState().updateTab(data.id, { is_loading: data.isLoading });
        if (data.id === useTabsStore.getState().activeTabId) {
          useNavigationStore.getState().setLoading(data.isLoading);
        }
      }));
      cleanups.push(window.osBrowser.tabs.onUrlUpdated((data: any) => {
        useTabsStore.getState().updateTab(data.id, { url: data.url });
        if (data.id === useTabsStore.getState().activeTabId) {
          useNavigationStore.getState().setUrl(data.url);
          useNavigationStore.getState().setNavState({
            canGoBack: data.canGoBack,
            canGoForward: data.canGoForward,
          });
          // Track site for Digital Wellbeing
          try {
            const url = data.url as string;
            if (url && !url.startsWith('os-browser://') && !url.startsWith('about:')) {
              useWellbeingStore.getState().setSite(new URL(url).hostname);
            } else {
              useWellbeingStore.getState().setSite(null);
            }
          } catch {}
        }
      }));
      cleanups.push(window.osBrowser.tabs.onTitleUpdated((data: any) => {
        useTabsStore.getState().updateTab(data.id, { title: data.title });
      }));
      cleanups.push(window.osBrowser.tabs.onFaviconUpdated((data: any) => {
        useTabsStore.getState().updateTab(data.id, { favicon_path: data.favicon });
      }));
      // Listen for tabs created by the main process (right-click "Open in New Tab", window.open)
      cleanups.push(window.osBrowser.tabs.onTabsRefresh(async (data: any) => {
        await useTabsStore.getState().loadTabs();
        // Add the new tab to the active workspace so it's visible
        if (data?.newTabId) {
          try {
            useWorkspaceStore.getState().addTabToWorkspace(data.newTabId);
          } catch {}
        }
        // Update navigation store so ContentArea shows the WebContentsView
        // instead of rendering an internal page on top of it
        if (data?.url) {
          useNavigationStore.getState().setUrl(data.url);
        }
        // Track for wellbeing
        try {
          if (data?.url && !data.url.startsWith('os-browser://')) {
            useWellbeingStore.getState().setSite(new URL(data.url).hostname);
          }
        } catch {}
      }));
      // Listen for authoritative state updates from TabManager
      cleanups.push(window.osBrowser.tabs.onStateUpdated((state: any) => {
        useTabsStore.getState().syncFromMain(state);
      }));
    } catch {}

    // Memory saver: show banner when a suspended tab is restored
    try {
      if (window.osBrowser?.memorySaver?.onTabRestored) {
        cleanups.push(window.osBrowser.memorySaver.onTabRestored((data: any) => {
          try {
            const tab = useTabsStore.getState().tabs.find(t => t.id === data.id);
            const domain = tab?.url ? new URL(tab.url).hostname : '';
            setMemorySaverBanner({
              tabId: data.id,
              memorySavedBytes: data.memorySavedBytes || 0,
              domain,
            });
          } catch {}
        }));
      }
    } catch {}

    // Digital Wellbeing — tick every second to track browsing time
    const wellbeingInterval = setInterval(() => {
      useWellbeingStore.getState().tick();
    }, 1000);

    // Tab Search shortcut: Ctrl+Shift+A
    const handleTabSearchKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        useTabIntelligenceStore.getState().toggleTabSearch();
      }
    };
    window.addEventListener('keydown', handleTabSearchKey);

    // Workspace switching: Ctrl+Alt+1 through Ctrl+Alt+9
    const handleWorkspaceKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && !e.shiftKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        const wsState = useWorkspaceStore.getState();
        if (index < wsState.workspaces.length) {
          e.preventDefault();
          wsState.switchWorkspace(wsState.workspaces[index].id);
        }
      }
    };
    window.addEventListener('keydown', handleWorkspaceKey);

    // Snoozed tabs — check every 30 seconds and reopen woken tabs
    const snoozeInterval = setInterval(() => {
      const woken = useTabIntelligenceStore.getState().checkSnoozedTabs();
      for (const tab of woken) {
        useTabsStore.getState().createTab(tab.url);
      }
    }, 30000);

    // Downloads — initialize listeners so downloads are tracked from the start
    let downloadCleanup: (() => void) | undefined;
    try {
      downloadCleanup = useDownloadStore.getState().init();
    } catch {}

    // Vault — initialize store and listen for auto-capture events
    let vaultCleanup: (() => void) | undefined;
    try {
      vaultCleanup = useVaultStore.getState().init();
    } catch {}

    // Screen Recorder — load saved recordings
    try {
      import('./store/recorder').then(({ useRecorderStore }) => {
        useRecorderStore.getState().loadRecordings();
      }).catch(() => {});
    } catch {}

    // Vault — show toast when auto-capture happens on gov sites
    let vaultAutoCleanup: (() => void) | undefined;
    try {
      if (window.osBrowser?.vault?.onCaptured) {
        vaultAutoCleanup = window.osBrowser.vault.onCaptured((data: any) => {
          useNotificationStore.getState().addNotification({
            type: 'info',
            title: 'Interaction Captured',
            message: `Page captured for your records: ${data?.title || data?.url || 'Unknown page'}`,
            source: 'vault',
            icon: 'shield',
          });
        });
      }
    } catch {}

    // Password detection — show "Save password?" prompt
    let passwordDetectedCleanup: (() => void) | undefined;
    let passwordPageLoadedCleanup: (() => void) | undefined;
    try {
      if ((window as any).osBrowser?.password?.onDetected) {
        passwordDetectedCleanup = (window as any).osBrowser.password.onDetected((data: any) => {
          // Don't prompt if we already have this credential saved
          const existing = usePasswordStore.getState().getPasswordForDomain(data.domain);
          if (existing && existing.username === data.username) return;
          setPasswordPrompt(data);
        });
      }
      if ((window as any).osBrowser?.password?.onPageLoaded) {
        passwordPageLoadedCleanup = (window as any).osBrowser.password.onPageLoaded((data: any) => {
          // Check if we have saved credentials for this domain and autofill
          const saved = usePasswordStore.getState().getPasswordForDomain(data.domain);
          if (saved && saved.username && saved.password) {
            (window as any).osBrowser.password.autofill(data.tabId, saved.username, saved.password);
          }
        });
      }
    } catch {}

    // Exchange Rate Overlay — listen for toggle events from the store
    const handleExchangeOverlay = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const tabId = useTabsStore.getState().activeTabId;
      if (!tabId) return;
      const url = useNavigationStore.getState().currentUrl;
      if (!url || url.startsWith('os-browser://')) return;

      try {
        if (detail?.enabled) {
          const { rates, fetchRates } = useExchangeStore.getState();
          if (Object.keys(rates).length === 0) await fetchRates();
          const currentRates = useExchangeStore.getState().rates;
          await (window as any).osBrowser?.exchange?.injectOverlay(tabId, currentRates);
        } else {
          await (window as any).osBrowser?.exchange?.removeOverlay(tabId);
        }
      } catch {}
    };
    window.addEventListener('exchange:overlay-toggle', handleExchangeOverlay);

    // Screenshot events — region selector trigger and capture result
    const handleStartRegion = () => setShowRegionSelector(true);
    const handleScreenshotCaptured = (e: any) => {
      const dataUrl = (e as CustomEvent).detail?.dataUrl;
      if (dataUrl) setScreenshotPreview(dataUrl);
    };
    window.addEventListener('screenshot:start-region', handleStartRegion);
    window.addEventListener('screenshot:captured', handleScreenshotCaptured);

    return () => {
      cleanup?.();
      networkCleanup?.();
      cleanups.forEach(c => c());
      clearInterval(wellbeingInterval);
      window.removeEventListener('keydown', handleTabSearchKey);
      window.removeEventListener('keydown', handleWorkspaceKey);
      clearInterval(snoozeInterval);
      downloadCleanup?.();
      vaultCleanup?.();
      vaultAutoCleanup?.();
      window.removeEventListener('exchange:overlay-toggle', handleExchangeOverlay);
      window.removeEventListener('screenshot:start-region', handleStartRegion);
      window.removeEventListener('screenshot:captured', handleScreenshotCaptured);
      passwordDetectedCleanup?.();
      passwordPageLoadedCleanup?.();
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      const { isActive, deactivate } = useSplitScreenStore.getState();
      if (isActive) deactivate();
      else setShowSplitPicker(true);
    };
    window.addEventListener('os-browser:split-screen', handler);
    return () => window.removeEventListener('os-browser:split-screen', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowCurrencyTools(prev => !prev);
    window.addEventListener('os-browser:currency-tools', handler);
    return () => window.removeEventListener('os-browser:currency-tools', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowTwiDictionary(prev => !prev);
    window.addEventListener('os-browser:twi-dictionary', handler);
    return () => window.removeEventListener('os-browser:twi-dictionary', handler);
  }, []);

  useEffect(() => {
    const handleReadingMode = async () => {
      const tabs = useTabsStore.getState().tabs;
      const activeId = useTabsStore.getState().activeTabId;
      const active = tabs.find(t => t.id === activeId);
      if (active && !active.url?.startsWith('os-browser://') && activeId) {
        // Show immediately with loading state, then fetch real content
        setReadingMode({ active: true, content: '', title: active.title || '', url: active.url || '' });
        try {
          const result = await (window as any).osBrowser.tabs.getContent(activeId);
          if (result && result.content) {
            setReadingMode({ active: true, content: result.content, title: result.title || active.title || '', url: active.url || '' });
          } else {
            setReadingMode({ active: true, content: 'Could not extract content from this page. Reading mode works best with articles and text-heavy pages.', title: active.title || '', url: active.url || '' });
          }
        } catch {
          setReadingMode({ active: true, content: 'Could not extract content from this page. Reading mode works best with articles and text-heavy pages.', title: active.title || '', url: active.url || '' });
        }
      }
    };
    window.addEventListener('os-browser:reading-mode', handleReadingMode);
    return () => window.removeEventListener('os-browser:reading-mode', handleReadingMode);
  }, []);

  useEffect(() => {
    const handler = () => {
      useTabsStore.getState().createTab('os-browser://settings');
    };
    window.addEventListener('os-browser:open-settings', handler);
    return () => window.removeEventListener('os-browser:open-settings', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowIdentityPanel(prev => !prev);
    window.addEventListener('os-browser:identity-panel', handler);
    return () => window.removeEventListener('os-browser:identity-panel', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowTranslationPanel(prev => !prev);
    window.addEventListener('os-browser:translation-panel', handler);
    return () => window.removeEventListener('os-browser:translation-panel', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      setShowLiteracyPanel(prev => {
        const next = !prev;
        if (next) window.osBrowser?.hideWebViews?.();
        else if (!showCurrencyTools && !showTwiDictionary && !isOpen) window.osBrowser?.showWebViews?.();
        return next;
      });
    };
    window.addEventListener('os-browser:literacy-assistant', handler);
    return () => window.removeEventListener('os-browser:literacy-assistant', handler);
  }, [showCurrencyTools, showTwiDictionary, isOpen]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ReportData;
      if (detail) setReportData(detail);
    };
    window.addEventListener('os-browser:generate-report', handler);
    return () => window.removeEventListener('os-browser:generate-report', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      setShowMessaging(prev => {
        const next = !prev;
        if (next) window.osBrowser?.hideWebViews?.();
        else if (!showCurrencyTools && !showTwiDictionary && !isOpen) window.osBrowser?.showWebViews?.();
        return next;
      });
    };
    window.addEventListener('os-browser:messaging', handler);
    return () => window.removeEventListener('os-browser:messaging', handler);
  }, [showCurrencyTools, showTwiDictionary, isOpen]);

  useEffect(() => {
    const handler = () => {
      setShowMobileMoney(prev => {
        const next = !prev;
        if (next) window.osBrowser?.hideWebViews?.();
        else if (!showCurrencyTools && !showTwiDictionary && !isOpen) window.osBrowser?.showWebViews?.();
        return next;
      });
    };
    window.addEventListener('os-browser:mobile-money', handler);
    return () => window.removeEventListener('os-browser:mobile-money', handler);
  }, [showCurrencyTools, showTwiDictionary, isOpen]);

  // PWA installable detection — listen for events from main process
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    try {
      cleanup = (window as any).osBrowser.pwa.onInstallable((data: PWAInstallData) => {
        // Check if the user has already dismissed this app
        try {
          const dismissed = JSON.parse(localStorage.getItem('pwa_dismissed') || '[]');
          if (dismissed.includes(data.startUrl)) return;
        } catch { /* ignore */ }

        // Store the data so NavigationBar and BrowserMenu can show the install icon/item
        setPwaInstallableData(data);

        // Broadcast event so NavigationBar and BrowserMenu can pick it up
        window.dispatchEvent(new CustomEvent('pwa:installable', { detail: data }));
      });
    } catch { /* pwa bridge not available */ }
    return () => cleanup?.();
  }, []);

  // Clear PWA installable data when active tab changes or URL changes
  useEffect(() => {
    let prevActiveTabId = useTabsStore.getState().activeTabId;
    const unsub = useTabsStore.subscribe((state) => {
      if (state.activeTabId !== prevActiveTabId) {
        prevActiveTabId = state.activeTabId;
        setPwaInstallableData(null);
        window.dispatchEvent(new CustomEvent('pwa:installable-cleared'));
      }
    });
    return unsub;
  }, []);

  // Listen for install prompt trigger from NavigationBar / BrowserMenu
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as PWAInstallData;
      if (detail) setPwaData(detail);
    };
    window.addEventListener('pwa:show-install-prompt', handler);
    return () => window.removeEventListener('pwa:show-install-prompt', handler);
  }, []);

  // Auto-update event listeners — show toast notifications for update status
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    try {
      const app = (window as any).osBrowser?.app;
      if (app?.onUpdateAvailable) {
        cleanups.push(app.onUpdateAvailable((info: any) => {
          useNotificationStore.getState().addNotification({
            type: 'info',
            title: 'Update Available',
            message: `OS Browser v${info?.version || 'new'} is downloading...`,
            source: 'auto-update',
          });
        }));
      }
      if (app?.onUpdateDownloaded) {
        cleanups.push(app.onUpdateDownloaded((info: any) => {
          useNotificationStore.getState().addNotification({
            type: 'success',
            title: 'Update Ready',
            message: `v${info?.version || 'new'} will install on restart`,
            source: 'auto-update',
          });
        }));
      }
      if (app?.onUpdateError) {
        cleanups.push(app.onUpdateError((_msg: string) => {
          // Silently log update errors — don't spam the user
          console.warn('[AutoUpdate] Error:', _msg);
        }));
      }
    } catch { /* auto-update bridge not available */ }
    return () => cleanups.forEach(c => c());
  }, []);

  // Prompt to set OS Browser as default — shows once per install, only after onboarding
  useEffect(() => {
    if (!profileReady || showOnboarding) return;
    if (localStorage.getItem('default-browser-prompted')) return;
    const timer = setTimeout(() => setShowDefaultBrowserPrompt(true), 4000);
    return () => clearTimeout(timer);
  }, [profileReady, showOnboarding]);

  // Profile launcher covers everything when launching/locked
  const showProfileLauncher = (isLaunching || isLocked) && !profileReady;

  return (
    <>
    {showProfileLauncher ? (
      <ProfileLauncher onProfileReady={handleProfileReady} />
    ) : (
    <div className="h-screen w-screen flex flex-col bg-bg">
      <TitleBar />
      <TabBar />
      <NavigationBar
        onOpenHistory={() => setShowHistory(true)}
        onOpenBookmarks={() => setShowBookmarks(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => useTabsStore.getState().createTab('os-browser://stats')}
      />
      <BookmarksBar />
      <KenteStatusBar />
      <OfflineBanner />

      {/* Content + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Kente Sidebar — left side */}
        <KenteSidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {splitActive && <SplitScreenToolbar />}
          {splitActive ? (
            <SplitScreenContent />
          ) : (
            <div className="flex-1 overflow-y-auto">
              {passwordPrompt && passwordPrompt.tabId === activeTabId && (
                <PasswordSavePrompt
                  domain={passwordPrompt.domain}
                  username={passwordPrompt.username}
                  password={passwordPrompt.password}
                  url={passwordPrompt.url}
                  onSave={() => {
                    usePasswordStore.getState().addPassword({
                      url: passwordPrompt.url,
                      domain: passwordPrompt.domain,
                      username: passwordPrompt.username,
                      password: passwordPrompt.password,
                      category: passwordPrompt.domain.endsWith('.gov.gh') ? 'government' : 'personal',
                    });
                    setPasswordPrompt(null);
                  }}
                  onNever={() => setPasswordPrompt(null)}
                  onDismiss={() => setPasswordPrompt(null)}
                />
              )}
              {memorySaverBanner && memorySaverBanner.tabId === activeTabId && (
                <MemorySaverBanner
                  tabId={memorySaverBanner.tabId}
                  memorySavedBytes={memorySaverBanner.memorySavedBytes}
                  domain={memorySaverBanner.domain}
                  onDismiss={() => setMemorySaverBanner(null)}
                  onExcludeSite={(domain) => {
                    window.osBrowser?.memorySaver?.excludeAdd?.(domain);
                    setMemorySaverBanner(null);
                  }}
                />
              )}
              <ContentArea />
              <FloatingAIBar />
            </div>
          )}
        </div>

        {/* AI Sidebar */}
        {isOpen && activePanel === 'ai' && <AISidebar />}

        {/* AskOzzy Panel */}
        {isOpen && activePanel === 'askozzy' && <AskOzzyPanel />}

        {/* GHS Currency & SSNIT Tools */}
        {showCurrencyTools && <CurrencyTools onClose={() => setShowCurrencyTools(false)} />}

        {/* Twi Dictionary */}
        {showTwiDictionary && <TwiDictionary onClose={() => setShowTwiDictionary(false)} />}

        {/* GhanaCard Identity Panel */}
        {showIdentityPanel && <IdentityPanel onClose={() => setShowIdentityPanel(false)} />}

        {/* Translation Panel */}
        {showTranslationPanel && <TranslationPanel onClose={() => setShowTranslationPanel(false)} />}

        {/* Civil Service Messaging */}
        {showMessaging && <GovChatPanel onClose={() => {
          setShowMessaging(false);
          if (!showCurrencyTools && !showTwiDictionary && !isOpen) window.osBrowser?.showWebViews?.();
        }} />}

        {/* Mobile Money Quick Pay */}
        {showMobileMoney && <MobileMoneyPanel onClose={() => {
          setShowMobileMoney(false);
          if (!showCurrencyTools && !showTwiDictionary && !isOpen) window.osBrowser?.showWebViews?.();
        }} />}

        {/* Digital Literacy Assistant */}
        {showLiteracyPanel && <LiteracyAssistant onClose={() => {
          setShowLiteracyPanel(false);
          if (!showCurrencyTools && !showTwiDictionary && !isOpen) window.osBrowser?.showWebViews?.();
        }} />}
      </div>

      <DownloadBar />

      {showSplitPicker && <SplitScreenPicker onClose={() => setShowSplitPicker(false)} />}

      {readingMode.active && (
        <React.Suspense fallback={null}>
          <ReadingModePanel
            content={readingMode.content}
            title={readingMode.title}
            url={readingMode.url}
            onClose={() => setReadingMode({ active: false, content: '', title: '', url: '' })}
          />
        </React.Suspense>
      )}

      <KenteCommandBar isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />

      {/* Overlay Panels */}
      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
      {showBookmarks && <BookmarkManager onClose={() => setShowBookmarks(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Screenshot Report Generator Modal */}
      {reportData && <ReportGenerator data={reportData} onClose={() => setReportData(null)} />}

      {showOnboarding && <Onboarding onComplete={() => {
        useSettingsStore.getState().updateSettings({ onboarding_completed: true });
        setShowOnboarding(false);
        useSettingsStore.getState().loadSettings();
        // Show web views now that onboarding is done
        window.osBrowser?.showWebViews?.();
      }} />}

      {/* PWA Install Prompt */}
      {pwaData && <PWAInstallPrompt data={pwaData} onClose={() => setPwaData(null)} />}

      {/* Default Browser Prompt */}
      {showDefaultBrowserPrompt && (
        <DefaultBrowserBanner onClose={() => {
          setShowDefaultBrowserPrompt(false);
          localStorage.setItem('default-browser-prompted', '1');
          // Show import banner after a short delay if not already shown
          if (!localStorage.getItem('browser-import-prompted')) {
            setTimeout(() => setShowImportBanner(true), 2000);
          }
        }} />
      )}

      {/* Browser Import Banner — only shown on internal pages (no WebContentsView covering it) */}
      {showImportBanner && useNavigationStore.getState().currentUrl.startsWith('os-browser://') && (
        <React.Suspense fallback={null}>
          <ImportBanner onClose={() => {
            setShowImportBanner(false);
            localStorage.setItem('browser-import-prompted', '1');
          }} />
        </React.Suspense>
      )}

      {/* Exchange Rate Mini Converter — floating above status bar */}
      <MiniConverter />

      {/* Tab Search Modal — Ctrl+Shift+A */}
      <TabSearchOverlay />

      {/* Screenshot overlays */}
      {showRegionSelector && (
        <RegionSelector
          onSelect={async (rect) => {
            setShowRegionSelector(false);
            try {
              const res = await (window as any).osBrowser.screenshot.captureRegion(rect);
              if (res?.success && res.dataUrl) {
                try {
                  const blob = await (await fetch(res.dataUrl)).blob();
                  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                } catch {}
                setScreenshotPreview(res.dataUrl);
              }
            } catch {}
          }}
          onCancel={() => setShowRegionSelector(false)}
        />
      )}
      {screenshotPreview && (
        <ScreenshotPreview
          dataUrl={screenshotPreview}
          onSave={async () => {
            await (window as any).osBrowser.screenshot.save(screenshotPreview);
          }}
          onDismiss={() => setScreenshotPreview(null)}
        />
      )}

      {/* Screen Recorder overlays — floating controls + annotation canvas + post-recording toast */}
      <React.Suspense fallback={null}>
        <RecorderControls />
        <AnnotationOverlay />
        <PostRecordingToast />
      </React.Suspense>
    </div>
    )}

    {/* Toast notifications always render regardless of profile state */}
    <ToastNotification />
    </>
  );
}
