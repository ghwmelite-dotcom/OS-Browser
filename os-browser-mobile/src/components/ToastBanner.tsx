import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationStore, type InAppNotification } from '../store/notifications';
import { COLORS, KENTE } from '../constants/theme';
import { useSettingsStore } from '../store/settings';

function ToastItem({
  toast,
  onDismiss,
  onPress,
}: {
  toast: InAppNotification;
  onDismiss: () => void;
  onPress?: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const theme = useSettingsStore((s) => s.theme);
  const colors = COLORS[theme];

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss after 4s
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -100, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const iconMap: Record<string, { name: string; color: string }> = {
    message: { name: 'chatbubble', color: KENTE.gold },
    info: { name: 'information-circle', color: '#3B82F6' },
    success: { name: 'checkmark-circle', color: '#22c55e' },
    warning: { name: 'warning', color: '#F97316' },
  };
  const iconInfo = iconMap[toast.type] || iconMap.info;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.surface1,
          borderColor: iconInfo.color + '33',
          borderLeftColor: iconInfo.color,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={() => {
          onPress?.();
          onDismiss();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.toastIcon, { backgroundColor: iconInfo.color + '18' }]}>
          <Ionicons name={iconInfo.name as any} size={18} color={iconInfo.color} />
        </View>
        <View style={styles.toastText}>
          <Text style={[styles.toastTitle, { color: colors.text }]} numberOfLines={1}>
            {toast.title}
          </Text>
          <Text style={[styles.toastBody, { color: colors.textMuted }]} numberOfLines={2}>
            {toast.body}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastBanner({ onGoToChat }: { onGoToChat?: (roomId?: string) => void }) {
  const insets = useSafeAreaInsets();
  const toasts = useNotificationStore((s) => s.toasts);
  const dismissToast = useNotificationStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + 4 }]} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
          onPress={() => {
            if (toast.type === 'message' && toast.roomId) {
              onGoToChat?.(toast.roomId);
            }
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 6,
  },
  toast: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  toastIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    flex: 1,
    minWidth: 0,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 1,
  },
  toastBody: {
    fontSize: 15,
    lineHeight: 18,
  },
});
