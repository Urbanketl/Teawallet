import cron from 'node-cron';
import { storage } from '../storage';
import { whatsAppService, BalanceAlertData } from './smsService';

export class NotificationScheduler {
  private isEnabled: boolean = true;

  constructor() {
    console.log('NotificationScheduler initialized');
  }

  start() {
    if (!this.isEnabled) {
      console.log('Notification scheduler is disabled');
      return;
    }

    console.log('Starting notification scheduler...');

    // Check for critical balance alerts every hour
    cron.schedule('0 * * * *', () => {
      this.checkCriticalBalanceAlerts();
    });

    // Check for low balance alerts every day at 9 AM
    cron.schedule('0 9 * * *', () => {
      this.checkLowBalanceAlerts();
    });

    console.log('Notification scheduler started with cron jobs');
  }

  async checkCriticalBalanceAlerts() {
    try {
      console.log('Checking critical balance alerts...');
      
      // Get critical balance threshold from settings
      const settings = await storage.getSystemSettings();
      const criticalThreshold = settings.find(s => s.key === 'critical_balance_threshold')?.value || '100';
      
      // Get business units with low balance
      const businessUnits = await storage.getAllBusinessUnits();
      const criticalUnits = businessUnits.filter(unit => {
        const balance = parseFloat(unit.walletBalance || '0');
        return balance < parseFloat(criticalThreshold);
      });

      console.log(`Found ${criticalUnits.length} business units with critical balance`);

      for (const unit of criticalUnits) {
        await this.sendCriticalBalanceAlert(unit, criticalThreshold);
      }
    } catch (error) {
      console.error('Error checking critical balance alerts:', error);
    }
  }

  async checkLowBalanceAlerts() {
    try {
      console.log('Checking low balance alerts...');
      
      // Get low balance threshold from settings  
      const settings = await storage.getSystemSettings();
      const lowThreshold = settings.find(s => s.key === 'low_balance_threshold')?.value || '500';
      const criticalThreshold = settings.find(s => s.key === 'critical_balance_threshold')?.value || '100';
      
      // Get business units with low balance (but not critical)
      const businessUnits = await storage.getAllBusinessUnits();
      const lowBalanceUnits = businessUnits.filter(unit => {
        const balance = parseFloat(unit.walletBalance || '0');
        return balance < parseFloat(lowThreshold) && balance >= parseFloat(criticalThreshold);
      });

      console.log(`Found ${lowBalanceUnits.length} business units with low balance`);

      for (const unit of lowBalanceUnits) {
        // Check if we sent low balance alert in last 2 days
        const shouldSend = await this.shouldSendLowBalanceAlert(unit.id);
        if (shouldSend) {
          await this.sendLowBalanceAlert(unit, lowThreshold);
        }
      }
    } catch (error) {
      console.error('Error checking low balance alerts:', error);
    }
  }

  private async sendCriticalBalanceAlert(businessUnit: any, threshold: string) {
    try {
      // Get business unit admin and platform admins
      const recipients = await this.getAlertRecipients(businessUnit.id, true);
      
      if (recipients.length === 0) {
        console.log(`No recipients found for critical alert: ${businessUnit.name}`);
        return;
      }

      // Check if we already sent critical WhatsApp alert today
      const lastSent = await storage.getLastEmailLog(businessUnit.id, 'critical_balance_whatsapp');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (lastSent && lastSent.sentAt && new Date(lastSent.sentAt) >= today) {
        console.log(`Critical alert already sent today for ${businessUnit.name}`);
        return;
      }

      const alertData: BalanceAlertData = {
        businessUnit,
        currentBalance: businessUnit.walletBalance || '0',
        threshold,
        alertType: 'critical'
      };

      const result = await whatsAppService.sendBalanceAlert(recipients, alertData);
      
      if (result.success) {
        console.log(`Critical balance WhatsApp alert sent for ${businessUnit.name}`);
        
        // Log the WhatsApp message for each recipient
        for (const recipient of recipients) {
          await storage.logEmailSent({
            userId: recipient.id,
            businessUnitId: businessUnit.id,
            emailType: 'critical_balance_whatsapp',
            subject: `CRITICAL WhatsApp Alert: ${businessUnit.name} - ₹${alertData.currentBalance}`,
            deliveryStatus: 'sent'
          });
        }
      } else {
        console.error(`Failed to send critical balance WhatsApp alert for ${businessUnit.name}:`, result.error);
      }
    } catch (error) {
      console.error(`Error sending critical balance alert for ${businessUnit.name}:`, error);
    }
  }

  private async sendLowBalanceAlert(businessUnit: any, threshold: string) {
    try {
      // Get business unit admin only (not platform admins for low balance)
      const recipients = await this.getAlertRecipients(businessUnit.id, false);
      
      if (recipients.length === 0) {
        console.log(`No recipients found for low balance alert: ${businessUnit.name}`);
        return;
      }

      const alertData: BalanceAlertData = {
        businessUnit,
        currentBalance: businessUnit.walletBalance || '0',
        threshold,
        alertType: 'low'
      };

      const result = await whatsAppService.sendBalanceAlert(recipients, alertData);
      
      if (result.success) {
        console.log(`Low balance WhatsApp alert sent for ${businessUnit.name}`);
        
        // Log the WhatsApp message for each recipient
        for (const recipient of recipients) {
          await storage.logEmailSent({
            userId: recipient.id,
            businessUnitId: businessUnit.id,
            emailType: 'low_balance_whatsapp',
            subject: `LOW WhatsApp Alert: ${businessUnit.name} - ₹${alertData.currentBalance}`,
            deliveryStatus: 'sent'
          });
        }
      } else {
        console.error(`Failed to send low balance WhatsApp alert for ${businessUnit.name}:`, result.error);
      }
    } catch (error) {
      console.error(`Error sending low balance alert for ${businessUnit.name}:`, error);
    }
  }

  private async getAlertRecipients(businessUnitId: string, includePlatformAdmins: boolean = false) {
    try {
      const recipients = [];
      
      // Get business unit admin
      const businessUnitUsers = await storage.getUsersWithBusinessUnits();
      const unitAdmins = businessUnitUsers.filter(user => 
        user.businessUnitId === businessUnitId && user.isAdmin
      );
      
      recipients.push(...unitAdmins);
      
      // Add platform admins for critical alerts
      if (includePlatformAdmins) {
        const allUsers = await storage.getAllUsers();
        const platformAdmins = allUsers.filter(user => user.isSuperAdmin);
        recipients.push(...platformAdmins);
      }
      
      // Filter users who have WhatsApp notifications enabled and have mobile numbers
      const enabledRecipients = [];
      for (const user of recipients) {
        const preferences = await storage.getNotificationPreferences(user.id);
        // For now, use email preferences as WhatsApp preferences aren't implemented in schema yet
        const whatsAppEnabled = preferences?.emailEnabled;
        if (whatsAppEnabled && preferences?.balanceAlerts && user.mobileNumber && user.mobileNumber.trim() !== '') {
          enabledRecipients.push(user);
        }
      }
      
      return enabledRecipients;
    } catch (error) {
      console.error('Error getting alert recipients:', error);
      return [];
    }
  }

  private async shouldSendLowBalanceAlert(businessUnitId: string): Promise<boolean> {
    try {
      // Check if we sent low balance WhatsApp alert in last 2 days
      const lastSent = await storage.getLastEmailLog(businessUnitId, 'low_balance_whatsapp');
      
      if (!lastSent) return true;
      
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      return lastSent.sentAt ? new Date(lastSent.sentAt) < twoDaysAgo : true;
    } catch (error) {
      console.error('Error checking if should send low balance alert:', error);
      return false;
    }
  }

  stop() {
    console.log('Notification scheduler stopped');
    this.isEnabled = false;
  }
}

export const notificationScheduler = new NotificationScheduler();