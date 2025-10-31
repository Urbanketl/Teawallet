import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../services/AuthService';
import { API_BASE_URL, Colors, Spacing, Typography } from '../config/constants';

interface BusinessUnit {
  id: string;
  name: string;
  code: string;
  walletBalance: string;
}

export default function WalletScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<BusinessUnit | null>(null);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [isLoadingBusinessUnits, setIsLoadingBusinessUnits] = useState(true);
  const [isProcessingRecharge, setIsProcessingRecharge] = useState(false);

  const quickAmounts = ['100', '200', '500', '1000'];

  useEffect(() => {
    fetchBusinessUnits();
  }, []);

  const fetchBusinessUnits = async () => {
    try {
      setIsLoadingBusinessUnits(true);
      const response = await fetch(`${API_BASE_URL}/api/business-units`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setBusinessUnits(data);
        if (data.length > 0 && !selectedBusinessUnit) {
          setSelectedBusinessUnit(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching business units:', error);
    } finally {
      setIsLoadingBusinessUnits(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    await fetchBusinessUnits();
    setRefreshing(false);
  };

  const handleQuickAmount = (amount: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRechargeAmount(amount);
  };

  const handleRecharge = async () => {
    if (!selectedBusinessUnit) {
      Alert.alert('Error', 'Please select a business unit');
      return;
    }

    const amount = parseFloat(rechargeAmount);
    if (!amount || amount < 10) {
      Alert.alert('Invalid Amount', 'Please enter a minimum amount of ₹10');
      return;
    }

    setIsProcessingRecharge(true);
    try {
      // Create Razorpay order
      const orderResponse = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: amount,
          businessUnitId: selectedBusinessUnit.id,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderResponse.json();
      
      // In a real implementation, you would integrate Razorpay SDK here
      // For now, show a success message
      Alert.alert(
        'Payment Gateway',
        'Payment gateway integration is available on the web app. Please use the web interface for recharges.',
        [{ text: 'OK' }]
      );
      
      setRechargeAmount('');
    } catch (error) {
      console.error('Recharge error:', error);
      Alert.alert('Error', 'Failed to process recharge. Please try again.');
    } finally {
      setIsProcessingRecharge(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Business Unit Selector */}
      {isLoadingBusinessUnits ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : businessUnits.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Business Unit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {businessUnits.map((bu) => (
              <TouchableOpacity
                key={bu.id}
                style={[
                  styles.businessUnitCard,
                  selectedBusinessUnit?.id === bu.id && styles.businessUnitCardSelected,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedBusinessUnit(bu);
                }}
              >
                <Text style={[
                  styles.businessUnitName,
                  selectedBusinessUnit?.id === bu.id && styles.businessUnitNameSelected,
                ]}>
                  {bu.name}
                </Text>
                <Text style={[
                  styles.businessUnitBalance,
                  selectedBusinessUnit?.id === bu.id && styles.businessUnitBalanceSelected,
                ]}>
                  ₹{parseFloat(bu.walletBalance).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Balance Card */}
      {selectedBusinessUnit && (
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Ionicons name="wallet" size={32} color="white" />
          </View>
          <Text style={styles.balanceAmount}>
            ₹{parseFloat(selectedBusinessUnit.walletBalance).toFixed(2)}
          </Text>
          <Text style={styles.balanceSubtext}>{selectedBusinessUnit.name}</Text>
        </LinearGradient>
      )}

      {/* Recharge Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recharge Amount</Text>

        <View style={styles.quickAmountsContainer}>
          {quickAmounts.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.quickAmountButton,
                rechargeAmount === amount && styles.quickAmountButtonActive,
              ]}
              onPress={() => handleQuickAmount(amount)}
            >
              <Text
                style={[
                  styles.quickAmountText,
                  rechargeAmount === amount && styles.quickAmountTextActive,
                ]}
              >
                ₹{amount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="cash-outline" size={20} color={Colors.gray[500]} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter custom amount"
            placeholderTextColor={Colors.gray[400]}
            value={rechargeAmount}
            onChangeText={setRechargeAmount}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.rechargeButton,
            (!rechargeAmount || isProcessingRecharge) && styles.rechargeButtonDisabled,
          ]}
          onPress={handleRecharge}
          disabled={!rechargeAmount || isProcessingRecharge}
        >
          {isProcessingRecharge ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.rechargeButtonText}>Recharge Wallet</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          Recharges are processed through secure Razorpay payment gateway. Funds are added instantly to your wallet.
        </Text>
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
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.gray[900],
    fontWeight: Typography.fontWeight.bold,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  balanceCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  balanceLabel: {
    fontSize: Typography.fontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: Typography.fontWeight.medium,
  },
  balanceAmount: {
    fontSize: 42,
    color: 'white',
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  balanceSubtext: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.gray[900],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
  },
  businessUnitCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 12,
    marginRight: Spacing.sm,
    minWidth: 150,
    borderWidth: 2,
    borderColor: Colors.gray[200],
  },
  businessUnitCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '20',
  },
  businessUnitName: {
    fontSize: Typography.fontSize.md,
    color: Colors.gray[900],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  businessUnitNameSelected: {
    color: Colors.primary,
  },
  businessUnitBalance: {
    fontSize: Typography.fontSize.lg,
    color: Colors.gray[600],
    fontWeight: Typography.fontWeight.medium,
  },
  businessUnitBalanceSelected: {
    color: Colors.primary,
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  quickAmountButton: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  quickAmountButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickAmountText: {
    fontSize: Typography.fontSize.md,
    color: Colors.gray[700],
    fontWeight: Typography.fontWeight.medium,
  },
  quickAmountTextActive: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.md,
    color: Colors.gray[900],
  },
  rechargeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rechargeButtonDisabled: {
    backgroundColor: Colors.gray[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  rechargeButtonText: {
    color: 'white',
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '20',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[700],
    lineHeight: 20,
  },
});
