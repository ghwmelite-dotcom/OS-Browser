import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Animated,
  StyleSheet,
  Image,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';

// ── Global font override: Bookman Old Style (serif) ─────────────────────────
// Apply serif font family to ALL Text and TextInput components app-wide.
const originalTextRender = (Text as any).render;
if (originalTextRender) {
  (Text as any).render = function (...args: any[]) {
    const origin = originalTextRender.call(this, ...args);
    return React.cloneElement(origin, {
      style: [{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, origin.props.style],
    });
  };
}
// TextInput also needs the font
const originalInputRender = (TextInput as any).render;
if (originalInputRender) {
  (TextInput as any).render = function (...args: any[]) {
    const origin = originalInputRender.call(this, ...args);
    return React.cloneElement(origin, {
      style: [{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, origin.props.style],
    });
  };
}
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { COLORS, KENTE, SPACING, FONT_SIZE, MIN_TOUCH_TARGET } from './src/constants/theme';
import { useSettingsStore } from './src/store/settings';
import { KenteCrown } from './src/components/KenteCrown';
import { BrowserScreen } from './src/screens/BrowserScreen';
import GovChatScreen from './src/screens/GovChatScreen';
import AskOzzyScreen from './src/screens/AskOzzyScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import GovHubScreen from './src/screens/GovHubScreen';
import GovPlayScreen from './src/games/GovPlayScreen';
import Game2048Screen from './src/games/game2048/Game2048Screen';
import SnakeScreen from './src/games/snake/SnakeScreen';
import MinesweeperScreen from './src/games/minesweeper/MinesweeperScreen';
import TriviaScreen from './src/games/trivia/TriviaScreen';
import SudokuScreen from './src/games/sudoku/SudokuScreen';
import SolitaireScreen from './src/games/solitaire/SolitaireScreen';
import WordScrambleScreen from './src/games/wordscramble/WordScrambleScreen';
import TypingSpeedScreen from './src/games/typing/TypingSpeedScreen';
import OwareScreen from './src/games/oware/OwareScreen';
import ChessScreen from './src/games/chess/ChessScreen';
import CheckersScreen from './src/games/checkers/CheckersScreen';
import LudoScreen from './src/games/ludo/LudoScreen';
import { useNotificationStore } from './src/store/notifications';
import { ToastBanner } from './src/components/ToastBanner';

// Prevent the native splash from auto-hiding — we control dismissal
SplashScreen.preventAutoHideAsync().catch((e) => console.warn('preventAutoHide failed:', e));

// ── Animated Splash Screen ──────────────────────────────────────────────────

function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;

  // Kente weave animation — three bars slide in from left
  const bar1X = useRef(new Animated.Value(-400)).current;
  const bar2X = useRef(new Animated.Value(-400)).current;
  const bar3X = useRef(new Animated.Value(-400)).current;

  // Loading dots
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Hide native splash immediately — our animated one takes over
    const hideNative = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('hideAsync failed:', e);
      }
    };
    hideNative();

    // Set Android nav bar color
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#0f1117').catch(() => {});
    }

    // Phase 1: Logo appears
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Phase 2: Text fades in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Phase 3: Subtitle
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Kente bars slide in staggered
    Animated.stagger(150, [
      Animated.timing(bar1X, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(bar2X, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(bar3X, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // Loading dots pulse
    const pulseDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
      );
    };
    const dotAnimations = Animated.parallel([
      pulseDot(dot1, 0),
      pulseDot(dot2, 200),
      pulseDot(dot3, 400),
    ]);
    dotAnimations.start();

    // After 3s: fade out and show main app
    const timer = setTimeout(() => {
      dotAnimations.stop();
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1117" />

      {/* Kente weave bars */}
      <View style={styles.kenteWeaveContainer}>
        <Animated.View
          style={[styles.kenteBar, { backgroundColor: KENTE.gold, transform: [{ translateX: bar1X }] }]}
        />
        <Animated.View
          style={[styles.kenteBar, { backgroundColor: KENTE.green, transform: [{ translateX: bar2X }] }]}
        />
        <Animated.View
          style={[styles.kenteBar, { backgroundColor: KENTE.red, transform: [{ translateX: bar3X }] }]}
        />
      </View>

      {/* Logo */}
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }}
      >
        <Image
          source={require('./assets/icon.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Title */}
      <Animated.Text style={[styles.splashTitle, { opacity: textOpacity }]}>
        OS Mini
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={[styles.splashSubtitle, { opacity: subtitleOpacity }]}>
        Ghana&apos;s AI-Powered Browser
      </Animated.Text>

      {/* Loading dots */}
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { backgroundColor: KENTE.gold, opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { backgroundColor: KENTE.green, opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { backgroundColor: KENTE.red, opacity: dot3 }]} />
      </View>
    </Animated.View>
  );
}

// ── Bottom Tab Bar ──────────────────────────────────────────────────────────

type TabName = 'browse' | 'govhub' | 'govchat' | 'askozzy' | 'settings';

interface TabConfig {
  name: TabName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
  { name: 'browse', label: 'Browse', icon: 'globe-outline', iconActive: 'globe' },
  { name: 'govhub', label: 'GovHub', icon: 'business-outline', iconActive: 'business' },
  { name: 'govchat', label: 'GovChat', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { name: 'askozzy', label: 'AskOzzy', icon: 'sparkles-outline', iconActive: 'sparkles' },
  { name: 'settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

function BottomTabBar({
  activeTab,
  onTabPress,
}: {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useSettingsStore((s) => s.theme);
  const colors = COLORS[theme];
  const unreadChatCount = useNotificationStore((s) => s.unreadChatCount);

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.surface1,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, SPACING.xs),
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.name;
        const badgeCount = tab.name === 'govchat' ? unreadChatCount : 0;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => onTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <View>
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={24}
                color={isActive ? colors.accent : colors.textMuted}
              />
              {badgeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.accent : colors.textMuted },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Placeholder screens for other tabs ──────────────────────────────────────

function PlaceholderScreen({ name }: { name: string }) {
  const theme = useSettingsStore((s) => s.theme);
  const colors = COLORS[theme];
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.placeholderContainer,
        { backgroundColor: colors.bg, paddingTop: insets.top },
      ]}
    >
      <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
        {name} — Coming Soon
      </Text>
    </View>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────

const GAME_SCREENS: Record<string, React.ComponentType<{ onBack: () => void }>> = {
  '2048': Game2048Screen as any,
  'snake': SnakeScreen as any,
  'minesweeper': MinesweeperScreen as any,
  'trivia': TriviaScreen as any,
  'sudoku': SudokuScreen as any,
  'solitaire': SolitaireScreen as any,
  'word-scramble': WordScrambleScreen as any,
  'typing': TypingSpeedScreen as any,
  'oware': OwareScreen as any,
  'chess': ChessScreen as any,
  'checkers': CheckersScreen as any,
  'ludo': LudoScreen as any,
};

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabName>('browse');
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showGovPlay, setShowGovPlay] = useState(false);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const colors = COLORS[theme];
  const isDark = theme === 'dark';

  const clearUnread = useNotificationStore((s) => s.clearUnread);

  const handleTabPress = useCallback((tab: TabName) => {
    setActiveTab(tab);
    if (tab === 'govchat') clearUnread();
  }, [clearUnread]);

  // Expose tab switcher globally so BrowserScreen feature shortcuts can navigate
  (globalThis as any).__switchTab = useCallback((tab: string) => {
    if (tab === 'govplay') {
      setShowGovPlay(true);
      return;
    }
    if (['browse', 'govhub', 'govchat', 'askozzy', 'settings'].includes(tab)) {
      setActiveTab(tab as TabName);
      if (tab === 'govchat') clearUnread();
    }
  }, [clearUnread]);

  // When GovHub opens a URL, switch to Browse tab and load it
  const handleGovHubOpenUrl = useCallback((url: string) => {
    // Import the browser store to update the active tab URL
    const { useBrowserStore } = require('./src/store/browser');
    const state = useBrowserStore.getState();
    const activeTab = state.tabs.find((t: any) => t.id === state.activeTabId);
    if (activeTab) {
      state.updateTab(activeTab.id, { url, title: 'Loading...' });
    }
    setActiveTab('browse');
  }, []);

  return (
    <View style={[styles.appContainer, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface1}
      />
      <KenteCrown />

      {/* Screen content */}
      <View style={styles.screenContainer}>
        {/* Active game takes over the screen */}
        {activeGame && GAME_SCREENS[activeGame] ? (
          React.createElement(GAME_SCREENS[activeGame], {
            onBack: () => { setActiveGame(null); setShowGovPlay(true); },
          })
        ) : showGovPlay ? (
          <GovPlayScreen
            isDark={isDark}
            onSelectGame={(gameId: string) => { setActiveGame(gameId); setShowGovPlay(false); }}
            onBack={() => setShowGovPlay(false)}
          />
        ) : (
          <>
            {activeTab === 'browse' && <BrowserScreen />}
            {activeTab === 'govhub' && <GovHubScreen isDark={isDark} onOpenUrl={handleGovHubOpenUrl} />}
            {activeTab === 'govchat' && <GovChatScreen isDark={isDark} />}
            {activeTab === 'askozzy' && <AskOzzyScreen isDark={isDark} />}
            {activeTab === 'settings' && <SettingsScreen isDark={isDark} onToggleTheme={toggleTheme} />}
          </>
        )}
      </View>

      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />

      {/* Toast notifications overlay */}
      <ToastBanner
        onGoToChat={() => {
          setActiveTab('govchat');
          clearUnread();
        }}
      />
    </View>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Safety: if splash hasn't dismissed after 6s, force-dismiss it
  useEffect(() => {
    const safety = setTimeout(() => {
      setShowSplash(false);
    }, 6000);
    return () => clearTimeout(safety);
  }, []);

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <AnimatedSplash onFinish={handleSplashFinish} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Splash
  splashContainer: {
    flex: 1,
    backgroundColor: '#0f1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 120,
    height: 120,
    marginBottom: SPACING.lg,
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#e8e6e3',
    letterSpacing: 1,
    marginBottom: 6,
  },
  splashSubtitle: {
    fontSize: FONT_SIZE.md,
    color: '#8b8d98',
    marginBottom: SPACING.xxl,
  },
  kenteWeaveContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    gap: 8,
  },
  kenteBar: {
    height: 3,
    width: '100%',
    borderRadius: 2,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Main app
  appContainer: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },

  // Bottom tab bar
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: SPACING.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CE1126',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },

  // Placeholder
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: FONT_SIZE.lg,
  },
});
