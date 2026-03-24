import React from 'react';
import { View, StyleSheet } from 'react-native';
import { KENTE } from '../constants/theme';

/**
 * A thin 3px Kente-inspired gradient bar.
 * Uses 5 horizontal segments (gold → green → red → green → gold) since
 * expo-linear-gradient is not installed.
 */
export function KenteCrown() {
  return (
    <View style={styles.container}>
      <View style={[styles.segment, { backgroundColor: KENTE.gold, flex: 1 }]} />
      <View style={[styles.segment, { backgroundColor: KENTE.green, flex: 1 }]} />
      <View style={[styles.segment, { backgroundColor: KENTE.red, flex: 1 }]} />
      <View style={[styles.segment, { backgroundColor: KENTE.green, flex: 1 }]} />
      <View style={[styles.segment, { backgroundColor: KENTE.gold, flex: 1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 3,
    flexDirection: 'row',
    width: '100%',
  },
  segment: {
    height: 3,
  },
});
