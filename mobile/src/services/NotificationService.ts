import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/constants';

export class NotificationService {
  static async registerPushToken(token: string) {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ pushToken: token }),
      });
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  static async sendNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null,
    });
  }

  static async sendWalletNotification(amount: number, type: 'recharge' | 'deduct') {
    const title = type === 'recharge' ? 'Wallet Recharged!' : 'Payment Successful!';
    const body = type === 'recharge' 
      ? `₹${amount} added to your wallet successfully`
      : `₹${amount} deducted for your tea purchase`;

    await this.sendNotification(title, body, { type: 'wallet', amount });
  }

  static async sendRFIDNotification(machineLocation: string) {
    await this.sendNotification(
      'Tea Dispensed!',
      `Enjoy your tea from ${machineLocation}`,
      { type: 'rfid', location: machineLocation }
    );
  }

  static async sendLowBalanceNotification(balance: number) {
    await this.sendNotification(
      'Low Wallet Balance',
      `Your balance is ₹${balance}. Recharge now to avoid interruption!`,
      { type: 'low_balance', balance }
    );
  }
}