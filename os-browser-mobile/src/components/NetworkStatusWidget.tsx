import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { useNetworkStore } from '../store/network';
import { COLORS, KENTE, type ThemeColors } from '../constants/theme';

interface Props {
  isDark: boolean;
}

export function NetworkStatusWidget({ isDark }: Props) {
  const theme: ThemeColors = isDark ? COLORS.dark : COLORS.light;
  const {
    isConnected, connectionType, cellularGeneration,
    sessionDataMB, todayDataMB, totalDataMB, pageLoads,
    setConnection,
  } = useNetworkStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Poll network status
  useEffect(() => {
    let mounted = true;

    const checkNetwork = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!mounted) return;

        const type = state.type === Network.NetworkStateType.WIFI
          ? 'wifi'
          : state.type === Network.NetworkStateType.CELLULAR
            ? 'cellular'
            : state.isConnected ? 'other' : 'none';

        // Expo doesn't expose cellular generation directly, infer from type
        let gen: string | null = null;
        if (type === 'cellular') {
          gen = '4G'; // Default assumption for modern devices
        }

        setConnection(state.isConnected ?? false, type, gen);
      } catch {
        // Fallback
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 10000); // Check every 10s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [setConnection]);

  // Pulse animation for the connection dot
  useEffect(() => {
    if (isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isConnected, pulseAnim]);

  // Connection label
  const connectionLabel = connectionType === 'wifi'
    ? 'Wi-Fi'
    : connectionType === 'cellular'
      ? cellularGeneration || 'Mobile Data'
      : connectionType === 'none'
        ? 'Offline'
        : 'Unknown';

  const connectionIcon = connectionType === 'wifi'
    ? 'wifi'
    : connectionType === 'cellular'
      ? 'cellular'
      : 'cloud-offline';

  const statusColor = isConnected ? '#22c55e' : '#EF4444';
  const statusLabel = isConnected ? 'Connected' : 'No Connection';

  const formatMB = (mb: number): string => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface1, borderColor: theme.border }]}>
      {/* Top row: connection status */}
      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          {/* Pulsing dot */}
          <View style={styles.dotContainer}>
            <Animated.View
              style={[
                styles.dotPulse,
                {
                  backgroundColor: statusColor + '30',
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
          </View>
          <View>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            <View style={styles.connectionRow}>
              <Ionicons name={connectionIcon as any} size={12} color={theme.textMuted} />
              <Text style={[styles.connectionLabel, { color: theme.textMuted }]}>{connectionLabel}</Text>
            </View>
          </View>
        </View>

        {/* Signal strength visual */}
        <View style={styles.signalBars}>
          {[1, 2, 3, 4].map(bar => (
            <View
              key={bar}
              style={[
                styles.signalBar,
                {
                  height: 6 + bar * 4,
                  backgroundColor: isConnected
                    ? (connectionType === 'wifi' || bar <= 3 ? statusColor : theme.border)
                    : theme.border,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Data usage stats */}
      <View style={styles.dataRow}>
        <DataStat
          icon="today-outline"
          label="Today"
          value={formatMB(todayDataMB)}
          color={KENTE.gold}
          theme={theme}
        />
        <View style={[styles.dataDivider, { backgroundColor: theme.border }]} />
        <DataStat
          icon="time-outline"
          label="Session"
          value={formatMB(sessionDataMB)}
          color={KENTE.green}
          theme={theme}
        />
        <View style={[styles.dataDivider, { backgroundColor: theme.border }]} />
        <DataStat
          icon="analytics-outline"
          label="Total"
          value={formatMB(totalDataMB)}
          color="#3B82F6"
          theme={theme}
        />
        <View style={[styles.dataDivider, { backgroundColor: theme.border }]} />
        <DataStat
          icon="layers-outline"
          label="Pages"
          value={String(pageLoads)}
          color="#a855f7"
          theme={theme}
        />
      </View>

      {/* Data usage bar */}
      {todayDataMB > 0 && (
        <View style={styles.usageBarContainer}>
          <View style={[styles.usageBarBg, { backgroundColor: theme.surface2 }]}>
            <View
              style={[
                styles.usageBarFill,
                {
                  width: `${Math.min((todayDataMB / 100) * 100, 100)}%`,
                  backgroundColor: todayDataMB > 80
                    ? '#EF4444'
                    : todayDataMB > 50
                      ? KENTE.gold
                      : KENTE.green,
                },
              ]}
            />
          </View>
          <Text style={[styles.usageBarLabel, { color: theme.textMuted }]}>
            {formatMB(todayDataMB)} of ~100 MB daily estimate
          </Text>
        </View>
      )}
    </View>
  );
}

function DataStat({
  icon, label, value, color, theme,
}: {
  icon: string; label: string; value: string; color: string; theme: ThemeColors;
}) {
  return (
    <View style={styles.dataStat}>
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={[styles.dataValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.dataLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },

  /* Status row */
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dotContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  connectionLabel: {
    fontSize: 14,
  },

  /* Signal bars */
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 5,
    borderRadius: 2,
  },

  /* Divider */
  divider: {
    height: 1,
    marginVertical: 12,
  },

  /* Data stats */
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  dataStat: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  dataValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dataDivider: {
    width: 1,
    height: 28,
  },

  /* Usage bar */
  usageBarContainer: {
    marginTop: 12,
  },
  usageBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: 4,
    borderRadius: 2,
  },
  usageBarLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
