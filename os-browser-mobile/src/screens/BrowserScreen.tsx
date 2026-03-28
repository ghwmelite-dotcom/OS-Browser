import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Keyboard,
  Platform,
  Dimensions,
  StatusBar,
  BackHandler,
  Share,
  Animated,
  Modal,
  Clipboard,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import { useBrowserStore } from '../store/browser';
import { useSettingsStore, buildSearchUrl } from '../store/settings';
import { getAdBlockScript, isVideoHost } from '../services/adblock';
import { COLORS, KENTE, SPACING, FONT_SIZE, RADIUS, MIN_TOUCH_TARGET, rs } from '../constants/theme';
import { useNetworkStore } from '../store/network';
import { useNotificationStore } from '../store/notifications';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Quick Links ─────────────────────────────────────────────────────────────

interface QuickLink {
  name: string;
  url: string;
  icon: string; // favicon URL
  color: string;
}

// Ad-free browsing sites — platforms where our ad blocker shines
const QUICK_LINKS: QuickLink[] = [
  { name: 'Google', url: 'https://www.google.com', icon: 'https://www.google.com/favicon.ico', color: '#4285F4' },
  { name: 'YouTube', url: 'https://m.youtube.com', icon: 'https://www.youtube.com/favicon.ico', color: '#FF0000' },
  { name: 'Facebook', url: 'https://m.facebook.com', icon: 'https://www.facebook.com/favicon.ico', color: '#1877F2' },
  { name: 'Twitter/X', url: 'https://x.com', icon: 'https://abs.twimg.com/favicons/twitter.3.ico', color: '#1DA1F2' },
  { name: 'Twitch', url: 'https://m.twitch.tv', icon: 'https://www.twitch.tv/favicon.ico', color: '#9146FF' },
  { name: 'TikTok', url: 'https://www.tiktok.com', icon: 'https://www.tiktok.com/favicon.ico', color: '#000000' },
];

// Feature shortcut cards
interface FeatureShortcut {
  id: string;
  label: string;
  desc: string;
  icon: string;
  color: string;
  gradient: [string, string];
}

const FEATURE_SHORTCUTS: FeatureShortcut[] = [
  { id: 'govhub', label: 'GovHub', desc: 'Gov portals & MoMo', icon: 'business', color: '#006B3F', gradient: ['#006B3F', '#00894D'] },
  { id: 'govplay', label: 'GovPlay', desc: '4 games to play', icon: 'game-controller', color: '#FF4081', gradient: ['#FF4081', '#FF6B9D'] },
  { id: 'govchat', label: 'GovChat', desc: 'Secure messaging', icon: 'chatbubbles', color: '#D4A017', gradient: ['#D4A017', '#E8B830'] },
  { id: 'askozzy', label: 'AskOzzy', desc: 'AI assistant', icon: 'sparkles', color: '#8B5CF6', gradient: ['#8B5CF6', '#A78BFA'] },
];

// Time-aware greeting
function getGreeting(): { text: string; emoji: string; subtitle: string } {
  const h = new Date().getHours();
  if (h < 5) return { emoji: '\u{1F319}', text: 'Good Night', subtitle: 'Burning the midnight oil?' };
  if (h < 12) return { emoji: '\u{2600}\u{FE0F}', text: 'Good Morning', subtitle: 'Start your day with OS Mini' };
  if (h < 17) return { emoji: '\u{1F4AA}', text: 'Good Afternoon', subtitle: 'Keep the momentum going' };
  if (h < 21) return { emoji: '\u{1F307}', text: 'Good Evening', subtitle: 'Wind down with ad-free browsing' };
  return { emoji: '\u{2728}', text: 'Good Night', subtitle: 'Sweet dreams ahead' };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isUrl(text: string): boolean {
  return /^(https?:\/\/|www\.)/.test(text) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(text);
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

// ── Component ───────────────────────────────────────────────────────────────

export function BrowserScreen() {
  const insets = useSafeAreaInsets();
  const theme = useSettingsStore((s) => s.theme);
  const searchEngine = useSettingsStore((s) => s.searchEngine);
  const adBlockEnabled = useSettingsStore((s) => s.adBlockEnabled);
  const colors = COLORS[theme];

  const tabs = useBrowserStore((s) => s.tabs);
  const activeTabId = useBrowserStore((s) => s.activeTabId);
  const addTab = useBrowserStore((s) => s.addTab);
  const removeTab = useBrowserStore((s) => s.removeTab);
  const switchTab = useBrowserStore((s) => s.switchTab);
  const updateTab = useBrowserStore((s) => s.updateTab);
  const addHistoryEntry = useBrowserStore((s) => s.addHistoryEntry);
  const addBookmark = useBrowserStore((s) => s.addBookmark);
  const removeBookmark = useBrowserStore((s) => s.removeBookmark);
  const isBookmarked = useBrowserStore((s) => s.isBookmarked);
  const bookmarks = useBrowserStore((s) => s.bookmarks);
  const addToast = useNotificationStore((s) => s.addToast);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId), [tabs, activeTabId]);
  const activeTabBookmarked = useMemo(
    () => activeTab?.url ? bookmarks.some((b) => b.url === activeTab.url) : false,
    [activeTab?.url, bookmarks],
  );

  const [addressBarText, setAddressBarText] = useState('');
  const [addressBarFocused, setAddressBarFocused] = useState(false);
  const [showTabManager, setShowTabManager] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showFindBar, setShowFindBar] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findMatchCount, setFindMatchCount] = useState(0);
  const [webViewError, setWebViewError] = useState<{ code: number; description: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ url: string; text: string } | null>(null);

  // Animated values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const addressBarTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const addressBarVisible = useRef(true);

  // WebView refs — one per tab
  const webViewRefs = useRef<Record<string, WebView | null>>({});
  // Track canGoBack per tab
  const canGoBackRef = useRef<Record<string, boolean>>({});

  // ── [2] Android back button handler ─────────────────────────────────────

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = () => {
      // Close find bar first
      if (showFindBar) { setShowFindBar(false); setFindQuery(''); return true; }
      // Close context menu
      if (contextMenu) { setContextMenu(null); return true; }
      // Close tab manager
      if (showTabManager) { setShowTabManager(false); return true; }
      // Go back in WebView
      if (activeTab && canGoBackRef.current[activeTab.id]) {
        webViewRefs.current[activeTab.id]?.goBack();
        return true;
      }
      // If on a loaded page, go home
      if (activeTab?.url) {
        updateTab(activeTab.id, { url: '', title: 'New Tab' });
        return true;
      }
      return false; // Let system handle (exit app)
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [activeTab, showFindBar, contextMenu, showTabManager, updateTab]);

  // ── [6] Haptic helpers ──────────────────────────────────────────────────

  const hapticLight = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const hapticMedium = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const hapticSuccess = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // ── Address bar handlers ──────────────────────────────────────────────────

  const handleAddressFocus = useCallback(() => {
    setAddressBarFocused(true);
    setAddressBarText(activeTab?.url || '');
  }, [activeTab?.url]);

  const handleAddressBlur = useCallback(() => {
    setAddressBarFocused(false);
  }, []);

  const handleAddressSubmit = useCallback(() => {
    const text = addressBarText.trim();
    if (!text || !activeTab) return;

    let url: string;
    if (isUrl(text)) {
      url = normalizeUrl(text);
    } else {
      url = buildSearchUrl(text, searchEngine);
    }

    updateTab(activeTab.id, { url });
    setAddressBarFocused(false);
    Keyboard.dismiss();
  }, [addressBarText, activeTab, searchEngine, updateTab]);

  // ── Navigation handlers ───────────────────────────────────────────────────

  const handleNavigationStateChange = useCallback(
    (tabId: string, navState: WebViewNavigation) => {
      const { url, title, canGoBack } = navState;
      updateTab(tabId, { url, title: title || extractHostname(url) });
      canGoBackRef.current[tabId] = !!canGoBack;

      // Clear error state on successful navigation
      if (tabId === activeTabId) setWebViewError(null);

      // Record in history + track data usage
      if (url && url !== 'about:blank' && !url.startsWith('data:')) {
        addHistoryEntry({ url, title: title || extractHostname(url), favicon: '' });
        useNetworkStore.getState().recordPageLoad();
      }

      // Re-inject ad blocker on EVERY navigation (not just video platforms)
      if (adBlockEnabled && url) {
        try {
          const host = new URL(url).hostname;
          const script = getAdBlockScript(host);
          if (script) {
            webViewRefs.current[tabId]?.injectJavaScript(script + '; true;');
          }
        } catch {}
      }
    },
    [updateTab, addHistoryEntry, adBlockEnabled, activeTabId],
  );

  // ── Quick link tap ────────────────────────────────────────────────────────

  const handleQuickLinkPress = useCallback(
    (url: string) => {
      if (activeTab) {
        updateTab(activeTab.id, { url });
      }
    },
    [activeTab, updateTab],
  );

  // ── Navigation buttons ────────────────────────────────────────────────────

  const goBack = useCallback(() => {
    if (activeTab) { hapticLight(); webViewRefs.current[activeTab.id]?.goBack(); }
  }, [activeTab, hapticLight]);

  const goForward = useCallback(() => {
    if (activeTab) { hapticLight(); webViewRefs.current[activeTab.id]?.goForward(); }
  }, [activeTab, hapticLight]);

  const reload = useCallback(() => {
    if (activeTab) { hapticLight(); setWebViewError(null); webViewRefs.current[activeTab.id]?.reload(); }
  }, [activeTab, hapticLight]);

  const goHome = useCallback(() => {
    if (activeTab) {
      hapticLight();
      updateTab(activeTab.id, { url: '', title: 'New Tab' });
    }
  }, [activeTab, updateTab, hapticLight]);

  // ── [4] Bookmark star toggle ──────────────────────────────────────────────

  const toggleBookmark = useCallback(() => {
    if (!activeTab?.url) return;
    hapticMedium();
    if (activeTabBookmarked) {
      const bm = useBrowserStore.getState().bookmarks.find((b) => b.url === activeTab.url);
      if (bm) removeBookmark(bm.id);
      addToast({ title: 'Bookmark removed', body: extractHostname(activeTab.url), type: 'info' });
    } else {
      addBookmark({ url: activeTab.url, title: activeTab.title || extractHostname(activeTab.url), favicon: '' });
      addToast({ title: 'Bookmarked!', body: activeTab.title || activeTab.url, type: 'success' });
    }
  }, [activeTab, activeTabBookmarked, hapticMedium, addBookmark, removeBookmark, addToast]);

  // ── [5] Share URL ─────────────────────────────────────────────────────────

  const shareUrl = useCallback(async () => {
    if (!activeTab?.url) return;
    hapticMedium();
    try {
      await Share.share({
        message: activeTab.url,
        title: activeTab.title || 'Shared from OS Mini',
      });
    } catch { /* cancelled */ }
  }, [activeTab, hapticMedium]);

  // ── [3] Page loading progress bar ─────────────────────────────────────────

  const handleLoadProgress = useCallback(({ nativeEvent }: { nativeEvent: { progress: number } }) => {
    const p = nativeEvent.progress;
    setLoadProgress(p);
    Animated.timing(progressAnim, { toValue: p, duration: 150, useNativeDriver: false }).start();
    if (p < 1) {
      setIsLoading(true);
      progressOpacity.setValue(1);
    } else {
      setIsLoading(false);
      Animated.timing(progressOpacity, { toValue: 0, duration: 400, useNativeDriver: false }).start();
    }
  }, [progressAnim, progressOpacity]);

  // ── [8] Custom error page ─────────────────────────────────────────────────

  const handleWebViewError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setWebViewError({ code: nativeEvent.code || -1, description: nativeEvent.description || 'Page failed to load' });
  }, []);

  // ── [9] Auto-hide address bar on scroll ───────────────────────────────────

  const handleWebViewScroll = useCallback((event: any) => {
    // [11] Dismiss keyboard on scroll
    Keyboard.dismiss();

    const y = event?.nativeEvent?.contentOffset?.y ?? 0;
    const dy = y - lastScrollY.current;
    lastScrollY.current = y;

    if (isFullscreen) return;

    // Scroll down > 10px → hide address bar
    if (dy > 10 && addressBarVisible.current) {
      addressBarVisible.current = false;
      Animated.timing(addressBarTranslateY, { toValue: -80, duration: 200, useNativeDriver: true }).start();
    }
    // Scroll up > 10px → show address bar
    if (dy < -10 && !addressBarVisible.current) {
      addressBarVisible.current = true;
      Animated.timing(addressBarTranslateY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [addressBarTranslateY, isFullscreen]);

  // ── [10] Find in page ─────────────────────────────────────────────────────

  const handleFindInPage = useCallback((query: string) => {
    setFindQuery(query);
    if (!activeTab || !query.trim()) { setFindMatchCount(0); return; }
    // Use window.find() + count matches
    webViewRefs.current[activeTab.id]?.injectJavaScript(`
      (function() {
        if (window.getSelection) window.getSelection().removeAllRanges();
        var count = 0;
        if ('${query.replace(/'/g, "\\'")}') {
          var body = document.body.innerText;
          var re = new RegExp('${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}', 'gi');
          var m = body.match(re);
          count = m ? m.length : 0;
          if (count > 0) window.find('${query.replace(/'/g, "\\'")}');
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'findResult', count: count }));
      })(); true;
    `);
  }, [activeTab]);

  const findNext = useCallback(() => {
    if (!activeTab || !findQuery) return;
    webViewRefs.current[activeTab.id]?.injectJavaScript(`window.find('${findQuery.replace(/'/g, "\\'")}'); true;`);
  }, [activeTab, findQuery]);

  const findPrev = useCallback(() => {
    if (!activeTab || !findQuery) return;
    webViewRefs.current[activeTab.id]?.injectJavaScript(`window.find('${findQuery.replace(/'/g, "\\'")}', false, true); true;`);
  }, [activeTab, findQuery]);

  // ── [7] Long-press context menu handler ───────────────────────────────────

  const handleContextMenuAction = useCallback((action: string) => {
    if (!contextMenu) return;
    hapticMedium();
    switch (action) {
      case 'newTab':
        addTab(contextMenu.url);
        addToast({ title: 'Opened in new tab', body: extractHostname(contextMenu.url), type: 'info' });
        break;
      case 'copy':
        Clipboard.setString(contextMenu.url);
        addToast({ title: 'Copied!', body: contextMenu.url, type: 'success' });
        break;
      case 'share':
        Share.share({ message: contextMenu.url, title: contextMenu.text || 'Shared from OS Mini' });
        break;
    }
    setContextMenu(null);
  }, [contextMenu, hapticMedium, addTab, addToast]);

  // ── Injected script per tab ───────────────────────────────────────────────

  // Fullscreen + context menu + scroll detection script
  const BRIDGE_SCRIPT = `
    (function() {
      if (window.__osMiniInstalled) return;
      window.__osMiniInstalled = true;

      // Fullscreen detection
      function notifyFs() {
        var isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fullscreen', active: isFull }));
      }
      document.addEventListener('fullscreenchange', notifyFs);
      document.addEventListener('webkitfullscreenchange', notifyFs);

      // Pull-to-refresh detection
      var ptrStartY = 0;
      var ptrActive = false;
      document.addEventListener('touchstart', function(e) {
        if (window.scrollY === 0 && e.touches.length === 1) {
          ptrStartY = e.touches[0].clientY;
          ptrActive = true;
        } else {
          ptrActive = false;
        }
      }, { passive: true });
      document.addEventListener('touchmove', function(e) {
        if (!ptrActive) return;
        var dy = e.touches[0].clientY - ptrStartY;
        if (dy > 120 && window.scrollY === 0) {
          ptrActive = false;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pullRefresh' }));
        }
      }, { passive: true });
      document.addEventListener('touchend', function() { ptrActive = false; }, { passive: true });

      // Long-press context menu on links
      var longPressTimer = null;
      var longPressTarget = null;
      document.addEventListener('touchstart', function(e) {
        var el = e.target;
        while (el && el.tagName !== 'A') el = el.parentElement;
        if (el && el.href) {
          longPressTarget = el;
          longPressTimer = setTimeout(function() {
            e.preventDefault();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'contextMenu',
              url: el.href,
              text: el.textContent ? el.textContent.trim().substring(0, 100) : ''
            }));
          }, 600);
        }
      }, { passive: false });
      document.addEventListener('touchend', function() { clearTimeout(longPressTimer); });
      document.addEventListener('touchmove', function() { clearTimeout(longPressTimer); });
    })();
    true;
  `;

  const getInjectedScript = useCallback(
    (url: string): string => {
      let script = BRIDGE_SCRIPT;
      if (adBlockEnabled && url) {
        try {
          const host = new URL(url).hostname;
          const adScript = getAdBlockScript(host);
          if (adScript) script += '\n' + adScript;
        } catch { /* ignore */ }
      }
      return script;
    },
    [adBlockEnabled],
  );

  // Handle messages from WebView (fullscreen, context menu, find results)
  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'fullscreen':
          setIsFullscreen(msg.active);
          if (msg.active) {
            ScreenOrientation.unlockAsync();
          } else {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          }
          break;
        case 'pullRefresh':
          hapticMedium();
          if (activeTab) webViewRefs.current[activeTab.id]?.reload();
          break;
        case 'contextMenu':
          hapticMedium();
          setContextMenu({ url: msg.url, text: msg.text });
          break;
        case 'findResult':
          setFindMatchCount(msg.count || 0);
          break;
      }
    } catch { /* ignore non-JSON messages */ }
  }, [hapticMedium]);

  // ── Tab manager overlay ───────────────────────────────────────────────────

  const renderTabManager = () => (
    <View style={[styles.tabManagerOverlay, { backgroundColor: colors.bg }]}>
      <View style={[styles.tabManagerHeader, { paddingTop: insets.top + SPACING.sm }]}>
        <Text style={[styles.tabManagerTitle, { color: colors.text }]}>
          {tabs.length} Tab{tabs.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          style={styles.tabManagerClose}
          onPress={() => setShowTabManager(false)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.tabManagerList} contentContainerStyle={{ padding: SPACING.md }}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabCard,
              {
                backgroundColor: colors.surface1,
                borderColor: tab.id === activeTabId ? colors.accent : colors.border,
                borderWidth: tab.id === activeTabId ? 2 : 1,
              },
            ]}
            onPress={() => {
              switchTab(tab.id);
              setShowTabManager(false);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.tabCardContent}>
              <Text style={[styles.tabCardTitle, { color: colors.text }]} numberOfLines={1}>
                {tab.title || 'New Tab'}
              </Text>
              <Text style={[styles.tabCardUrl, { color: colors.textMuted }]} numberOfLines={1}>
                {tab.url ? extractHostname(tab.url) : 'New Tab'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.tabCloseBtn}
              onPress={() => removeTab(tab.id)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tabs.length < 8 && (
        <TouchableOpacity
          style={[styles.newTabButton, { backgroundColor: colors.accent }]}
          onPress={() => {
            addTab();
            setShowTabManager(false);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
          <Text style={styles.newTabButtonText}>New Tab</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── New Tab Page ──────────────────────────────────────────────────────────

  // ── Frequent & Recent sites from history ──────────────────────────────────

  const history = useBrowserStore((s) => s.history);

  const frequentSites = useMemo(() => {
    return [...history]
      .filter((h) => (h.visitCount || 1) >= 2)
      .sort((a, b) => (b.visitCount || 1) - (a.visitCount || 1))
      .slice(0, 8);
  }, [history]);

  const recentSites = useMemo(() => {
    // Get last 6 unique-domain visits, excluding internal/blank pages
    const seen = new Set<string>();
    const result: typeof history = [];
    for (const entry of history) {
      if (!entry.url || entry.url === 'about:blank') continue;
      const domain = extractHostname(entry.url);
      if (seen.has(domain)) continue;
      seen.add(domain);
      result.push(entry);
      if (result.length >= 6) break;
    }
    return result;
  }, [history]);

  const renderNewTabPage = () => {
    const greeting = getGreeting();
    const pageLoads = useNetworkStore.getState().pageLoads;

    return (
      <ScrollView
        style={[styles.newTabPage, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.newTabPageContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Atmospheric gradient background ── */}
        <View style={styles.atmosphereGlow}>
          <View style={[styles.glowOrb, styles.glowGold]} />
          <View style={[styles.glowOrb, styles.glowGreen]} />
          <View style={[styles.glowOrb, styles.glowRed]} />
        </View>

        {/* ── Logo + Greeting ── */}
        <View style={styles.heroSection}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.newTabLogo}
            resizeMode="contain"
          />
          <Text style={[styles.greetingEmoji]}>{greeting.emoji}</Text>
          <Text style={[styles.newTabTitle, { color: colors.text }]}>{greeting.text}</Text>
          <Text style={[styles.newTabSubtitle, { color: colors.textMuted }]}>
            {greeting.subtitle}
          </Text>
        </View>

        {/* ── Search bar with glow ── */}
        <View style={styles.searchWrapper}>
          <View style={[styles.searchGlow, { borderColor: KENTE.gold + '30' }]} />
          <View style={[styles.newTabSearchBar, { backgroundColor: colors.surface1, borderColor: addressBarFocused ? KENTE.gold + '60' : colors.border }]}>
            <Ionicons name="search" size={20} color={addressBarFocused ? KENTE.gold : colors.textMuted} />
            <TextInput
              style={[styles.newTabSearchInput, { color: colors.text }]}
              placeholder="Search the web or enter URL..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="go"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={handleAddressFocus}
              onBlur={handleAddressBlur}
              onChangeText={setAddressBarText}
              onSubmitEditing={handleAddressSubmit}
              value={addressBarFocused ? addressBarText : ''}
            />
            {adBlockEnabled && (
              <View style={styles.shieldBadge}>
                <Ionicons name="shield-checkmark" size={16} color={KENTE.green} />
              </View>
            )}
          </View>
        </View>

        {/* ── Ad-Free Browsing Banner ── */}
        {adBlockEnabled && (
          <View style={[styles.adBanner, { backgroundColor: KENTE.green + '12', borderColor: KENTE.green + '25' }]}>
            <Ionicons name="shield-checkmark" size={22} color={KENTE.green} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.adBannerTitle, { color: KENTE.green }]}>Ad-Free Browsing Active</Text>
              <Text style={[styles.adBannerDesc, { color: colors.textMuted }]}>
                YouTube, Twitch, Facebook & more — no ads
              </Text>
            </View>
          </View>
        )}

        {/* ── Frequently Visited ── */}
        {frequentSites.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: KENTE.gold }]} />
              <Text style={[styles.sectionLabel, { color: KENTE.gold }]}>FREQUENTLY VISITED</Text>
              <Ionicons name="trending-up" size={rs(14)} color={KENTE.gold} style={{ opacity: 0.6 }} />
            </View>
            <View style={styles.quickLinksGrid}>
              {frequentSites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  style={[styles.quickLink, { backgroundColor: colors.surface1, borderColor: colors.border }]}
                  onPress={() => handleQuickLinkPress(site.url)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickLinkIcon, { backgroundColor: KENTE.gold + '12' }]}>
                    <Image
                      source={{ uri: `https://www.google.com/s2/favicons?domain=${extractHostname(site.url)}&sz=64` }}
                      style={styles.quickLinkFavicon}
                      defaultSource={require('../../assets/icon.png')}
                    />
                  </View>
                  <Text style={[styles.quickLinkName, { color: colors.text }]} numberOfLines={1}>
                    {site.title ? site.title.split(/\s*[-–—|:]\s*/)[0].slice(0, 16) : extractHostname(site.url)}
                  </Text>
                  <View style={styles.visitBadge}>
                    <Ionicons name="star" size={rs(9)} color={KENTE.gold} />
                    <Text style={[styles.visitBadgeText, { color: colors.textMuted }]}>
                      {site.visitCount || 1}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Recently Visited ── */}
        {recentSites.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: KENTE.green }]} />
              <Text style={[styles.sectionLabel, { color: KENTE.green }]}>RECENTLY VISITED</Text>
              <Ionicons name="time-outline" size={rs(14)} color={KENTE.green} style={{ opacity: 0.6 }} />
            </View>
            <View style={[styles.recentList, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
              {recentSites.map((site, index) => (
                <TouchableOpacity
                  key={site.id}
                  style={[
                    styles.recentItem,
                    index < recentSites.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
                  ]}
                  onPress={() => handleQuickLinkPress(site.url)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: `https://www.google.com/s2/favicons?domain=${extractHostname(site.url)}&sz=32` }}
                    style={styles.recentFavicon}
                    defaultSource={require('../../assets/icon.png')}
                  />
                  <View style={styles.recentTextWrap}>
                    <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>
                      {site.title || extractHostname(site.url)}
                    </Text>
                    <Text style={[styles.recentDomain, { color: colors.textMuted }]} numberOfLines={1}>
                      {extractHostname(site.url)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={rs(16)} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Quick Sites ── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: KENTE.gold }]} />
          <Text style={[styles.sectionLabel, { color: KENTE.gold }]}>QUICK SITES</Text>
        </View>
        <View style={styles.quickLinksGrid}>
          {QUICK_LINKS.map((link) => (
            <TouchableOpacity
              key={link.name}
              style={[styles.quickLink, { backgroundColor: colors.surface1, borderColor: colors.border }]}
              onPress={() => handleQuickLinkPress(link.url)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: link.color + '15' }]}>
                <Image
                  source={{ uri: link.icon }}
                  style={styles.quickLinkFavicon}
                  defaultSource={require('../../assets/icon.png')}
                />
              </View>
              <Text style={[styles.quickLinkName, { color: colors.text }]} numberOfLines={1}>
                {link.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── GovPlay Banner ── */}
        <TouchableOpacity
          style={[styles.govPlayBanner, { backgroundColor: colors.surface1, borderColor: '#FF408130' }]}
          onPress={() => (globalThis as any).__switchTab?.('govplay')}
          activeOpacity={0.7}
        >
          <View style={styles.govPlayBannerAccent} />
          <View style={styles.govPlayBannerIcon}>
            <Ionicons name="game-controller" size={rs(28)} color="#FF4081" />
          </View>
          <View style={styles.govPlayBannerText}>
            <Text style={[styles.govPlayBannerTitle, { color: '#FF4081' }]}>GovPlay</Text>
            <Text style={[styles.govPlayBannerDesc, { color: colors.textMuted }]}>
              2048, Snake, Minesweeper, Ghana Trivia — play now!
            </Text>
          </View>
          <View style={styles.govPlayBannerArrow}>
            <Ionicons name="chevron-forward" size={rs(20)} color="#FF4081" />
          </View>
        </TouchableOpacity>

        {/* ── Feature Shortcuts ── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: KENTE.green }]} />
          <Text style={[styles.sectionLabel, { color: KENTE.green }]}>QUICK ACCESS</Text>
        </View>
        <View style={styles.featureGrid}>
          {FEATURE_SHORTCUTS.map((feat) => (
            <TouchableOpacity
              key={feat.id}
              style={[styles.featureCard, { backgroundColor: feat.gradient[0] + '10', borderColor: feat.gradient[0] + '25' }]}
              onPress={() => {
                (globalThis as any).__switchTab?.(feat.id);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.featureIcon, { backgroundColor: feat.gradient[0] + '20' }]}>
                <Ionicons name={feat.icon as any} size={24} color={feat.color} />
              </View>
              <Text style={[styles.featureLabel, { color: colors.text }]}>{feat.label}</Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{feat.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Kente strip footer ── */}
        <View style={styles.kenteFooter}>
          <View style={[styles.kenteStrip, { backgroundColor: KENTE.red }]} />
          <View style={[styles.kenteStrip, { backgroundColor: KENTE.gold }]} />
          <View style={[styles.kenteStrip, { backgroundColor: KENTE.green }]} />
        </View>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Designed & Developed by Osborn Hodges | Powered by RSIMD(OHCS)
        </Text>
      </ScrollView>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Hide system status bar in fullscreen */}
      <StatusBar hidden={isFullscreen} />

      {/* Address bar — animated hide on scroll, hidden during fullscreen */}
      {!isFullscreen && (
        <Animated.View style={[
          styles.addressBarContainer,
          { backgroundColor: colors.surface1, paddingTop: insets.top + SPACING.xs, transform: [{ translateY: addressBarTranslateY }] },
        ]}>
          {/* Nav buttons row */}
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={goForward} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={goHome} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="home-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* URL pill */}
            <View style={[styles.urlPill, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.urlInput, { color: colors.text }]}
                placeholder="Search or enter URL"
                placeholderTextColor={colors.textMuted}
                returnKeyType="go"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                onFocus={handleAddressFocus}
                onBlur={handleAddressBlur}
                onChangeText={setAddressBarText}
                onSubmitEditing={handleAddressSubmit}
                value={
                  addressBarFocused
                    ? addressBarText
                    : activeTab?.url
                      ? extractHostname(activeTab.url)
                      : ''
                }
                selectTextOnFocus
              />
              {/* [4] Bookmark star */}
              {activeTab?.url ? (
                <TouchableOpacity onPress={toggleBookmark} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name={activeTabBookmarked ? 'star' : 'star-outline'}
                    size={18}
                    color={activeTabBookmarked ? KENTE.gold : colors.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
              {activeTab?.url ? (
                <TouchableOpacity onPress={reload} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="reload" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* [5] Share button */}
            {activeTab?.url ? (
              <TouchableOpacity style={styles.navBtn} onPress={shareUrl} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="share-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}

            {/* [10] Find in page button */}
            {activeTab?.url ? (
              <TouchableOpacity style={styles.navBtn} onPress={() => { hapticLight(); setShowFindBar(!showFindBar); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="search-outline" size={18} color={showFindBar ? KENTE.gold : colors.textMuted} />
              </TouchableOpacity>
            ) : null}

            {/* Tab count badge */}
            <TouchableOpacity
              style={[styles.tabBadge, { borderColor: colors.textMuted }]}
              onPress={() => { hapticLight(); setShowTabManager(true); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.tabBadgeText, { color: colors.text }]}>{tabs.length}</Text>
            </TouchableOpacity>
          </View>

          {/* [10] Find in page bar */}
          {showFindBar && (
            <View style={[styles.findBar, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <TextInput
                style={[styles.findInput, { color: colors.text }]}
                placeholder="Find in page..."
                placeholderTextColor={colors.textMuted}
                value={findQuery}
                onChangeText={handleFindInPage}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={findNext}
              />
              {findQuery ? (
                <Text style={[styles.findCount, { color: colors.textMuted }]}>
                  {findMatchCount} match{findMatchCount !== 1 ? 'es' : ''}
                </Text>
              ) : null}
              <TouchableOpacity onPress={findPrev} style={styles.findNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-up" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={findNext} style={styles.findNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowFindBar(false); setFindQuery(''); }} style={styles.findNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}

      {/* [3] Page loading progress bar */}
      <Animated.View style={[
        styles.progressBar,
        {
          opacity: progressOpacity,
          width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        },
      ]} />

      {/* WebView area */}
      <View style={styles.webViewContainer}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isNewTab = !tab.url;

          if (isNewTab && isActive) {
            return (
              <View key={tab.id} style={styles.activeWebView}>
                {renderNewTabPage()}
              </View>
            );
          }

          if (!tab.url) return null; // Inactive new tabs don't render

          const injectedScript = getInjectedScript(tab.url);

          return (
            <View
              key={tab.id}
              style={isActive ? styles.activeWebView : styles.hiddenWebView}
              pointerEvents={isActive ? 'auto' : 'none'}
            >
              {/* [8] Custom error page */}
              {isActive && webViewError ? (
                <View style={[styles.errorPage, { backgroundColor: colors.bg }]}>
                  <View style={styles.errorIconWrap}>
                    <Ionicons name="cloud-offline-outline" size={rs(64)} color={KENTE.gold} />
                  </View>
                  <Text style={[styles.errorTitle, { color: colors.text }]}>Page couldn't load</Text>
                  <Text style={[styles.errorDesc, { color: colors.textMuted }]}>
                    {webViewError.description}
                  </Text>
                  <Text style={[styles.errorUrl, { color: colors.textMuted }]} numberOfLines={1}>
                    {tab.url}
                  </Text>
                  <TouchableOpacity
                    style={[styles.errorRetryBtn, { backgroundColor: KENTE.gold }]}
                    onPress={() => { setWebViewError(null); reload(); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="reload" size={18} color="#fff" />
                    <Text style={styles.errorRetryText}>Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.errorHomeBtn, { borderColor: colors.border }]}
                    onPress={goHome}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.errorHomeText, { color: colors.textMuted }]}>Go Home</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <WebView
                  ref={(ref) => { webViewRefs.current[tab.id] = ref; }}
                  source={{ uri: tab.url }}
                  style={styles.webView}
                  injectedJavaScript={injectedScript}
                  onNavigationStateChange={(navState) => handleNavigationStateChange(tab.id, navState)}
                  onMessage={handleWebViewMessage}
                  onLoadProgress={isActive ? handleLoadProgress : undefined}
                  onScroll={isActive ? handleWebViewScroll : undefined}
                  allowsBackForwardNavigationGestures
                  allowsInlineMediaPlayback
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                  domStorageEnabled
                  startInLoadingState
                  onContentProcessDidTerminate={() => {
                    webViewRefs.current[tab.id]?.reload();
                  }}
                  {...(Platform.OS === 'android' ? {
                    onRenderProcessGone: () => {
                      setIsFullscreen(false);
                      webViewRefs.current[tab.id]?.reload();
                    },
                  } : {})}
                  renderLoading={() => (
                    <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
                      <Text style={{ color: colors.textMuted }}>Loading...</Text>
                    </View>
                  )}
                  onError={handleWebViewError}
                  onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    if (nativeEvent.statusCode >= 400) {
                      setWebViewError({ code: nativeEvent.statusCode, description: `HTTP Error ${nativeEvent.statusCode}` });
                    }
                  }}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* [7] Long-press context menu modal */}
      <Modal visible={!!contextMenu} transparent animationType="fade" onRequestClose={() => setContextMenu(null)}>
        <TouchableOpacity style={styles.contextMenuBackdrop} activeOpacity={1} onPress={() => setContextMenu(null)}>
          <View style={[styles.contextMenuCard, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
            <Text style={[styles.contextMenuUrl, { color: colors.textMuted }]} numberOfLines={2}>
              {contextMenu?.url}
            </Text>
            <TouchableOpacity style={styles.contextMenuItem} onPress={() => handleContextMenuAction('newTab')}>
              <Ionicons name="add-circle-outline" size={20} color={colors.text} />
              <Text style={[styles.contextMenuText, { color: colors.text }]}>Open in New Tab</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contextMenuItem} onPress={() => handleContextMenuAction('copy')}>
              <Ionicons name="copy-outline" size={20} color={colors.text} />
              <Text style={[styles.contextMenuText, { color: colors.text }]}>Copy Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contextMenuItem} onPress={() => handleContextMenuAction('share')}>
              <Ionicons name="share-outline" size={20} color={colors.text} />
              <Text style={[styles.contextMenuText, { color: colors.text }]}>Share Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contextMenuItem, { borderBottomWidth: 0 }]} onPress={() => setContextMenu(null)}>
              <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.contextMenuText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tab manager overlay */}
      {showTabManager && renderTabManager()}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Progress bar
  progressBar: {
    height: 3,
    backgroundColor: KENTE.gold,
    zIndex: 50,
  },

  // Find in page bar
  findBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: rs(40),
    paddingHorizontal: SPACING.sm,
    borderTopWidth: 1,
    gap: 4,
    marginTop: SPACING.xs,
  },
  findInput: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    height: rs(36),
    paddingVertical: 0,
  },
  findCount: {
    fontSize: rs(11),
    marginHorizontal: 4,
  },
  findNavBtn: {
    width: rs(32),
    height: rs(32),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Error page
  errorPage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorIconWrap: {
    width: rs(100),
    height: rs(100),
    borderRadius: rs(50),
    backgroundColor: KENTE.gold + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(20),
  },
  errorTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    marginBottom: rs(8),
  },
  errorDesc: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: rs(22),
    marginBottom: rs(8),
  },
  errorUrl: {
    fontSize: rs(11),
    marginBottom: rs(24),
    maxWidth: '90%',
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    paddingHorizontal: rs(28),
    paddingVertical: rs(14),
    borderRadius: RADIUS.pill,
    marginBottom: rs(12),
  },
  errorRetryText: {
    color: '#fff',
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  errorHomeBtn: {
    paddingHorizontal: rs(24),
    paddingVertical: rs(10),
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  errorHomeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },

  // Context menu
  contextMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingBottom: rs(40),
    paddingHorizontal: SPACING.md,
  },
  contextMenuCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: SPACING.md,
  },
  contextMenuUrl: {
    fontSize: rs(12),
    marginBottom: rs(12),
    paddingBottom: rs(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    paddingVertical: rs(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  contextMenuText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },

  // Address bar
  addressBarContainer: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.xs,
    zIndex: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
  },
  urlInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    height: 40,
    paddingVertical: 0,
  },
  tabBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  tabBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },

  // WebView
  webViewContainer: {
    flex: 1,
  },
  activeWebView: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  hiddenWebView: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // New Tab Page — immersive design
  newTabPage: {
    flex: 1,
  },
  newTabPageContent: {
    alignItems: 'center',
    paddingTop: rs(20),
    paddingHorizontal: SPACING.lg,
    paddingBottom: rs(100),
  },

  // Atmospheric glow orbs
  atmosphereGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rs(400),
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowGold: {
    width: rs(300),
    height: rs(300),
    top: rs(-80),
    left: SCREEN_W * 0.2,
    backgroundColor: '#D4A01718',
  },
  glowGreen: {
    width: rs(200),
    height: rs(200),
    top: rs(60),
    right: rs(-40),
    backgroundColor: '#006B3F12',
  },
  glowRed: {
    width: rs(150),
    height: rs(150),
    top: rs(20),
    left: rs(-30),
    backgroundColor: '#CE112610',
  },

  // Hero section
  heroSection: {
    alignItems: 'center',
    marginBottom: rs(24),
    zIndex: 1,
  },
  newTabLogo: {
    width: rs(72),
    height: rs(72),
    marginBottom: rs(8),
  },
  greetingEmoji: {
    fontSize: rs(32),
    marginBottom: rs(4),
  },
  newTabTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: rs(4),
  },
  newTabSubtitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: rs(22),
  },

  // Search bar
  searchWrapper: {
    width: '100%',
    marginBottom: rs(24),
    zIndex: 1,
  },
  searchGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  newTabSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: rs(52),
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    borderWidth: 1.5,
  },
  newTabSearchInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    height: rs(52),
    marginLeft: SPACING.sm,
    paddingVertical: 0,
  },
  shieldBadge: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    backgroundColor: '#006B3F15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ad banner
  adBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    width: '100%',
    padding: rs(14),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: rs(24),
    zIndex: 1,
  },
  adBannerTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  adBannerDesc: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    width: '100%',
    marginBottom: rs(14),
    zIndex: 1,
  },
  sectionDot: {
    width: rs(4),
    height: rs(16),
    borderRadius: rs(2),
  },
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // Quick links grid
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: rs(12),
    width: '100%',
    marginBottom: rs(28),
    zIndex: 1,
  },
  quickLink: {
    width: rs(90),
    alignItems: 'center',
    paddingVertical: rs(14),
    paddingHorizontal: rs(6),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  quickLinkIcon: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(8),
  },
  quickLinkFavicon: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(6),
  },
  quickLinkName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Visit badge on frequent tiles
  visitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(3),
    marginTop: rs(2),
  },
  visitBadgeText: {
    fontSize: rs(10),
  },

  // Recently visited list
  recentList: {
    width: '100%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: rs(28),
    zIndex: 1,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(12),
    paddingHorizontal: rs(14),
    gap: rs(12),
  },
  recentFavicon: {
    width: rs(20),
    height: rs(20),
    borderRadius: rs(4),
  },
  recentTextWrap: {
    flex: 1,
    gap: rs(1),
  },
  recentTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
  recentDomain: {
    fontSize: rs(11),
  },

  // GovPlay banner
  govPlayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: rs(16),
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    marginBottom: rs(24),
    zIndex: 1,
    overflow: 'hidden',
  },
  govPlayBannerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rs(3),
    backgroundColor: '#FF4081',
  },
  govPlayBannerIcon: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(16),
    backgroundColor: '#FF408118',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(14),
  },
  govPlayBannerText: {
    flex: 1,
  },
  govPlayBannerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    marginBottom: rs(2),
  },
  govPlayBannerDesc: {
    fontSize: FONT_SIZE.xs,
    lineHeight: rs(18),
  },
  govPlayBannerArrow: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    backgroundColor: '#FF408112',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: rs(8),
  },

  // Feature shortcut grid
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(12),
    width: '100%',
    marginBottom: rs(32),
    zIndex: 1,
  },
  featureCard: {
    width: (SCREEN_W - rs(60)) / 2,
    padding: rs(16),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: rs(8),
  },
  featureIcon: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: FONT_SIZE.xs,
  },

  // Kente footer
  kenteFooter: {
    flexDirection: 'row',
    width: rs(80),
    height: rs(3),
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: rs(8),
    zIndex: 1,
  },
  kenteStrip: {
    flex: 1,
    height: rs(3),
  },
  footerText: {
    fontSize: FONT_SIZE.xs,
    zIndex: 1,
    marginBottom: rs(20),
  },

  // Tab manager
  tabManagerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  tabManagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  tabManagerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  tabManagerClose: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabManagerList: {
    flex: 1,
  },
  tabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  tabCardContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  tabCardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  tabCardUrl: {
    fontSize: FONT_SIZE.xs,
  },
  tabCloseBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  newTabButtonText: {
    color: '#ffffff',
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
