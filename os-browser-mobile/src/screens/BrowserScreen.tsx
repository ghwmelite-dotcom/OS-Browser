import React, { useCallback, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBrowserStore } from '../store/browser';
import { useSettingsStore, buildSearchUrl } from '../store/settings';
import { getAdBlockScript, isVideoHost } from '../services/adblock';
import { COLORS, KENTE, SPACING, FONT_SIZE, RADIUS, MIN_TOUCH_TARGET, rs } from '../constants/theme';
import { useNetworkStore } from '../store/network';

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
  { id: 'govchat', label: 'GovChat', desc: 'Secure messaging', icon: 'chatbubbles', color: '#D4A017', gradient: ['#D4A017', '#E8B830'] },
  { id: 'askozzy', label: 'AskOzzy', desc: 'AI assistant', icon: 'sparkles', color: '#8B5CF6', gradient: ['#8B5CF6', '#A78BFA'] },
  { id: 'settings', label: 'Settings', desc: 'Customize browser', icon: 'settings', color: '#3B82F6', gradient: ['#3B82F6', '#60A5FA'] },
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

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId), [tabs, activeTabId]);

  const [addressBarText, setAddressBarText] = useState('');
  const [addressBarFocused, setAddressBarFocused] = useState(false);
  const [showTabManager, setShowTabManager] = useState(false);

  // WebView refs — one per tab
  const webViewRefs = useRef<Record<string, WebView | null>>({});

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
      const { url, title } = navState;
      updateTab(tabId, { url, title: title || extractHostname(url) });

      // Record in history + track data usage
      if (url && url !== 'about:blank' && !url.startsWith('data:')) {
        addHistoryEntry({ url, title: title || extractHostname(url), favicon: '' });
        useNetworkStore.getState().recordPageLoad();
      }

      // Re-inject ad blocker on navigation to video platforms
      if (adBlockEnabled && url) {
        try {
          const host = new URL(url).hostname;
          if (isVideoHost(host)) {
            const script = getAdBlockScript(host);
            if (script) {
              webViewRefs.current[tabId]?.injectJavaScript(script + '; true;');
            }
          }
        } catch {}
      }
    },
    [updateTab, addHistoryEntry, adBlockEnabled],
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
    if (activeTab) webViewRefs.current[activeTab.id]?.goBack();
  }, [activeTab]);

  const goForward = useCallback(() => {
    if (activeTab) webViewRefs.current[activeTab.id]?.goForward();
  }, [activeTab]);

  const reload = useCallback(() => {
    if (activeTab) webViewRefs.current[activeTab.id]?.reload();
  }, [activeTab]);

  const goHome = useCallback(() => {
    if (activeTab) {
      updateTab(activeTab.id, { url: '', title: 'New Tab' });
    }
  }, [activeTab, updateTab]);

  // ── Injected script per tab ───────────────────────────────────────────────

  const getInjectedScript = useCallback(
    (url: string): string | undefined => {
      if (!adBlockEnabled || !url) return undefined;
      try {
        const host = new URL(url).hostname;
        return getAdBlockScript(host) ?? undefined;
      } catch {
        return undefined;
      }
    },
    [adBlockEnabled],
  );

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
      {/* Address bar */}
      <View style={[styles.addressBarContainer, { backgroundColor: colors.surface1, paddingTop: insets.top + SPACING.xs }]}>
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
            {activeTab?.url ? (
              <TouchableOpacity onPress={reload} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="reload" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Tab count badge */}
          <TouchableOpacity
            style={[styles.tabBadge, { borderColor: colors.textMuted }]}
            onPress={() => setShowTabManager(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.tabBadgeText, { color: colors.text }]}>{tabs.length}</Text>
          </TouchableOpacity>
        </View>
      </View>

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
              <WebView
                ref={(ref) => { webViewRefs.current[tab.id] = ref; }}
                source={{ uri: tab.url }}
                style={styles.webView}
                injectedJavaScript={injectedScript}
                onNavigationStateChange={(navState) => handleNavigationStateChange(tab.id, navState)}
                allowsBackForwardNavigationGestures
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                renderLoading={() => (
                  <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
                    <Text style={{ color: colors.textMuted }}>Loading...</Text>
                  </View>
                )}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('WebView error:', nativeEvent.description);
                }}
                // Performance: limit background tab resource usage
                {...(!isActive && Platform.OS === 'android' ? { overScrollMode: 'never' } : {})}
              />
            </View>
          );
        })}
      </View>

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

  // Address bar
  addressBarContainer: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.xs,
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
