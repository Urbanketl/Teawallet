import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../services/AuthService';
import { NotificationService } from '../services/NotificationService';
import { Colors, Spacing, Typography } from '../config/constants';

interface QuickAction {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

interface RecentActivity {
  id: string;
  type: 'recharge' | 'purchase' | 'rfid';
  amount?: number;
  location?: string;
  timestamp: Date;
}

export default function HomeScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Recharge Wallet',
      icon: 'wallet',
      color: Colors.primary,
      onPress: () => navigation.navigate('Wallet'),
    },
    {
      id: '2',
      title: 'View History',
      icon: 'time',
      color: Colors.primary,
      onPress: () => navigation.navigate('History'),
    },
    {
      id: '3',
      title: 'Profile Settings',
      icon: 'person',
      color: Colors.warning,
      onPress: () => navigation.navigate('Profile'),
    },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    // Fetch recent activity
    setRefreshing(false);
  };

  const handleQuickAction = (action: QuickAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action.onPress();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return 'add-circle';
      case 'purchase':
        return 'cafe';
      case 'rfid':
        return 'card';
      default:
        return 'ellipse';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!
          </Text>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => {
            // Show notifications or navigate to notifications screen
          }}
        >
          <Ionicons name="notifications-outline" size={24} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Wallet Balance Card */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.walletCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.walletHeader}>
          <Text style={styles.walletLabel}>Wallet Balance</Text>
          <Ionicons name="wallet" size={24} color="white" />
        </View>
        <Text style={styles.walletAmount}>₹{parseFloat(user?.walletBalance || '0').toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.rechargeButton}
          onPress={() => navigation.navigate('Wallet')}
        >
          <Text style={styles.rechargeButtonText}>Recharge Now</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.quickActionCard, { borderLeftColor: action.color }]}
              onPress={() => handleQuickAction(action)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentActivity.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cafe-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyStateText}>No recent activity</Text>
            <Text style={styles.emptyStateSubtext}>Your tea purchases and recharges will appear here</Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {recentActivity.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons
                    name={getActivityIcon(activity.type)}
                    size={20}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>
                    {activity.type === 'recharge' && 'Wallet Recharged'}
                    {activity.type === 'purchase' && 'Tea Purchased'}
                    {activity.type === 'rfid' && 'RFID Card Used'}
                  </Text>
                  <Text style={styles.activitySubtitle}>
                    {activity.amount && `₹${activity.amount}`}
                    {activity.location && ` • ${activity.location}`}
                  </Text>
                </View>
                <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Tea Tip of the Day */}
      <View style={styles.section}>
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb" size={20} color={Colors.warning} />
            <Text style={styles.tipTitle}>Tip of the Day</Text>
          </View>
          <Text style={styles.tipText}>
            Green tea is best brewed at 80°C for 2-3 minutes to preserve its delicate flavors and antioxidants.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  greeting: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    fontWeight: Typography.fontWeight.normal,
  },
  userName: {
    fontSize: Typography.fontSize.xl,
    color: Colors.gray[900],
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.xs,
  },
  notificationButton: {
    padding: Spacing.sm,
  },
  walletCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  walletLabel: {
    fontSize: Typography.fontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: Typography.fontWeight.medium,
  },
  walletAmount: {
    fontSize: Typography.fontSize.xxxl,
    color: 'white',
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
  },
  rechargeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  rechargeButtonText: {
    color: 'white',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.gray[900],
    fontWeight: Typography.fontWeight.bold,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    marginRight: '2%',
    borderLeftWidth: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[700],
    fontWeight: Typography.fontWeight.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.md,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.md,
    color: Colors.gray[500],
    fontWeight: Typography.fontWeight.medium,
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[400],
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  activityList: {
    paddingHorizontal: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.gray[900],
    fontWeight: Typography.fontWeight.medium,
  },
  activitySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
    marginTop: Spacing.xs,
  },
  activityTime: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[400],
  },
  tipCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tipTitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.gray[900],
    fontWeight: Typography.fontWeight.bold,
    marginLeft: Spacing.sm,
  },
  tipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    lineHeight: 20,
  },
});