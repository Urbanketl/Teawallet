import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography } from '../config/constants';

export default function SplashScreen() {
  return (
    <LinearGradient
      colors={[Colors.primary, Colors.primaryDark]}
      style={styles.container}
    >
      <Ionicons name="cafe" size={80} color="white" />
      <Text style={styles.appName}>UrbanKetl</Text>
      <Text style={styles.tagline}>Your Tea, Your Way</Text>
      <ActivityIndicator size="large" color="white" style={styles.loader} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: Typography.fontSize.xxxl,
    color: 'white',
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.lg,
  },
  tagline: {
    fontSize: Typography.fontSize.lg,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: Spacing.sm,
  },
  loader: {
    marginTop: Spacing.xxl,
  },
});
