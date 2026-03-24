import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore, type SearchEngine } from '../store/settings';
import { useBrowserStore } from '../store/browser';
import { COLORS, type ThemeColors } from '../constants/theme';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SettingsScreenProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const SEARCH_ENGINES: { key: SearchEngine; label: string; icon: string }[] = [
  { key: 'google', label: 'Google', icon: 'logo-google' },
  { key: 'bing', label: 'Bing', icon: 'search' },
  { key: 'duckduckgo', label: 'DuckDuckGo', icon: 'shield-checkmark' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsScreen({ isDark, onToggleTheme }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const theme: ThemeColors = isDark ? COLORS.dark : COLORS.light;

  // Zustand stores — single source of truth
  const searchEngine = useSettingsStore((s) => s.searchEngine);
  const setSearchEngine = useSettingsStore((s) => s.setSearchEngine);
  const adBlockEnabled = useSettingsStore((s) => s.adBlockEnabled);
  const setAdBlockEnabled = useSettingsStore((s) => s.setAdBlockEnabled);
  const clearHistory = useBrowserStore((s) => s.clearHistory);

  const handleClearData = useCallback(() => {
    Alert.alert(
      'Clear Browsing Data',
      'This will clear all browsing history and cached data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearHistory();
            Alert.alert('Done', 'Browsing data has been cleared.');
          },
        },
      ],
    );
  }, [clearHistory]);

  /* ---- Row component ---- */
  const SettingsRow = ({
    icon,
    iconColor,
    label,
    right,
    onPress,
    isLast = false,
  }: {
    icon: string;
    iconColor?: string;
    label: string;
    right?: React.ReactNode;
    onPress?: () => void;
    isLast?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon as any}
          size={20}
          color={iconColor ?? theme.accent}
          style={styles.rowIcon}
        />
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      </View>
      {right}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.surface1,
            borderBottomColor: theme.border,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <Ionicons name="settings" size={24} color={theme.accent} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Appearance ---- */}
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: theme.surface1 }]}>
          <SettingsRow
            icon="moon"
            label="Dark Mode"
            isLast
            right={
              <Switch
                value={isDark}
                onValueChange={onToggleTheme}
                trackColor={{ false: theme.border, true: theme.accent + '66' }}
                thumbColor={isDark ? theme.accent : '#f4f4f4'}
                ios_backgroundColor={theme.border}
              />
            }
          />
        </View>

        {/* Theme preview */}
        <View style={[styles.themePreview, { backgroundColor: theme.surface1 }]}>
          <View style={[styles.previewBar, { backgroundColor: theme.surface2 }]}>
            <View style={[styles.previewDot, { backgroundColor: theme.accent }]} />
            <View style={[styles.previewLine, { backgroundColor: theme.textMuted + '44' }]} />
          </View>
          <Text style={[styles.previewLabel, { color: theme.textMuted }]}>
            {isDark ? 'Dark' : 'Light'} theme active
          </Text>
        </View>

        {/* ---- Search Engine ---- */}
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>SEARCH ENGINE</Text>
        <View style={[styles.card, { backgroundColor: theme.surface1 }]}>
          {SEARCH_ENGINES.map((engine, i) => (
            <SettingsRow
              key={engine.key}
              icon={engine.icon}
              label={engine.label}
              isLast={i === SEARCH_ENGINES.length - 1}
              onPress={() => setSearchEngine(engine.key)}
              right={
                searchEngine === engine.key ? (
                  <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
                ) : (
                  <View style={[styles.radioEmpty, { borderColor: theme.border }]} />
                )
              }
            />
          ))}
        </View>

        {/* ---- Browsing ---- */}
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>BROWSING</Text>
        <View style={[styles.card, { backgroundColor: theme.surface1 }]}>
          <SettingsRow
            icon="shield-checkmark"
            label="Ad Blocker"
            isLast
            right={
              <Switch
                value={adBlockEnabled}
                onValueChange={setAdBlockEnabled}
                trackColor={{ false: theme.border, true: theme.accent + '66' }}
                thumbColor={adBlockEnabled ? theme.accent : '#f4f4f4'}
                ios_backgroundColor={theme.border}
              />
            }
          />
        </View>
        <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
          Blocks ads on YouTube, Twitch, Facebook, Twitter, and Dailymotion
        </Text>

        {/* ---- Privacy ---- */}
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>PRIVACY</Text>
        <View style={[styles.card, { backgroundColor: theme.surface1 }]}>
          <SettingsRow
            icon="trash"
            iconColor="#EF4444"
            label="Clear Browsing Data"
            isLast
            onPress={handleClearData}
            right={<Ionicons name="chevron-forward" size={18} color={theme.textMuted} />}
          />
        </View>

        {/* ---- About ---- */}
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: theme.surface1 }]}>
          <SettingsRow icon="globe" label="OS Mini" isLast={false} />
          <SettingsRow icon="information-circle" label="Version" isLast={false} right={
            <Text style={[styles.rowValue, { color: theme.textMuted }]}>1.0.0</Text>
          } />
          <SettingsRow
            icon="heart"
            label="Designed & Developed by Osborn Hodges | Powered by RSIMD(OHCS)"
            isLast
          />
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  flex: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '700' },

  /* Scroll */
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  /* Sections */
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 20,
  },
  sectionHint: {
    fontSize: 15,
    marginTop: 6,
    marginLeft: 4,
    lineHeight: 20,
  },

  /* Card */
  card: {
    borderRadius: 14,
    overflow: 'hidden',
  },

  /* Row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: { marginRight: 12, width: 24, textAlign: 'center' },
  rowLabel: { fontSize: 18, fontWeight: '500' },
  rowValue: { fontSize: 17 },

  radioEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },

  /* Theme preview */
  themePreview: {
    marginTop: 8,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  previewBar: {
    width: '60%',
    height: 32,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 8,
  },
  previewDot: { width: 12, height: 12, borderRadius: 6 },
  previewLine: { flex: 1, height: 6, borderRadius: 3 },
  previewLabel: { fontSize: 15 },
});
