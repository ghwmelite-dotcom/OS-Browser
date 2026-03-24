import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, type ThemeColors } from '../constants/theme';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDark: boolean;
}

interface TabDef {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabDef[] = [
  { key: 'browse', label: 'Browse', icon: 'globe-outline', iconActive: 'globe' },
  { key: 'govchat', label: 'GovChat', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { key: 'askozzy', label: 'AskOzzy', icon: 'sparkles-outline', iconActive: 'sparkles' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TabBar({ activeTab, onTabChange, isDark }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const theme: ThemeColors = isDark ? COLORS.dark : COLORS.light;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface1,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, 4),
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const color = isActive ? theme.accent : theme.textMuted;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={24}
              color={color}
            />
            <Text
              style={[
                styles.label,
                { color },
                isActive && styles.labelActive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: '700',
  },
});
