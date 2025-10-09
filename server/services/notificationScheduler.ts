import cron from 'node-cron';
import { storage } from '../storage';
import { whatsAppService, BalanceAlertData } from './smsService';
import { emailService } from './emailService';

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

    // Check for critical balance alerts every hour (IST timezone)
    cron.schedule('0 * * * *', () => {
      this.checkCriticalBalanceAlerts();
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Check for low balance alerts every day at 9 AM IST
    cron.schedule('0 9 * * *', () => {
      this.checkLowBalanceAlerts();
    }, {
      timezone: 'Asia/Kolkata'
    });

    console.log('Notification scheduler started with cron jobs (IST timezone)');
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

  private async sendCriticalBalanceAlert(businessUnit: any, threshold: string, forceBypassDuplicateCheck: boolean = false) {
    try {
      // Get business unit admin and platform admins
      const recipients = await this.getAlertRecipients(businessUnit.id, true);
      
      if (recipients.length === 0) {
        console.log(`No recipients found for critical alert: ${businessUnit.name}`);
        return;
      }

      // Check if we already sent critical alert today (skip check if forced for testing)
      if (!forceBypassDuplicateCheck) {
        const lastSent = await storage.getLastEmailLog(businessUnit.id, 'critical_balance_email');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (lastSent && lastSent.sentAt && new Date(lastSent.sentAt) >= today) {
          console.log(`Critical alert already sent today for ${businessUnit.name}`);
          return;
        }
      } else {
        console.log(`Force bypass enabled - sending test email regardless of duplicate check`);
      }

      const alertData: BalanceAlertData = {
        businessUnit,
        currentBalance: businessUnit.walletBalance || '0',
        threshold,
        alertType: 'critical'
      };

      // Send email to all recipients
      const emailResult = await emailService.sendBalanceAlert(recipients, alertData);
      
      if (emailResult.success) {
        console.log(`Critical balance emails sent for ${businessUnit.name}`);
        
        // Log the email for each recipient
        for (const recipient of recipients) {
          await storage.logEmailSent({
            userId: recipient.id,
            businessUnitId: businessUnit.id,
            emailType: 'critical_balance_email',
            subject: `CRITICAL Alert: ${businessUnit.name} - ₹${alertData.currentBalance}`,
            deliveryStatus: 'sent'
          });
        }
      } else {
        console.error(`Failed to send critical balance emails for ${businessUnit.name}:`, emailResult.error);
        
        // Log failed emails
        for (const recipient of recipients) {
          await storage.logEmailSent({
            userId: recipient.id,
            businessUnitId: businessUnit.id,
            emailType: 'critical_balance_email',
            subject: `CRITICAL Alert: ${businessUnit.name} - ₹${alertData.currentBalance}`,
            deliveryStatus: 'failed'
          });
        }
      }

      // Also try to send WhatsApp if enabled
      try {
        const result = await whatsAppService.sendBalanceAlert(recipients, alertData);
        if (result.success) {
          console.log(`Critical balance WhatsApp alert sent for ${businessUnit.name}`);
        }
      } catch (whatsappError: any) {
        console.log(`WhatsApp notification skipped (non-critical):`, whatsappError?.message || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error sending critical balance alert for ${businessUnit.name}:`, error);
    }
  }

  private async sendLowBalanceAlert(businessUnit: any, threshold: string, forceBypassDuplicateCheck: boolean = false) {
    try {
      // Get business unit admin only (not platform admins for low balance)
      const recipients = await this.getAlertRecipients(businessUnit.id, false);
      
      if (recipients.length === 0) {
        console.log(`No recipients found for low balance alert: ${businessUnit.name}`);
        return;
      }
      
      if (forceBypassDuplicateCheck) {
        console.log(`Force bypass enabled - sending test email regardless of duplicate check`);
      }

      const alertData: BalanceAlertData = {
        businessUnit,
        currentBalance: businessUnit.walletBalance || '0',
        threshold,
        alertType: 'low'
      };

      // Send email to all recipients
      const emailResult = await emailService.sendBalanceAlert(recipients, alertData);
      
      if (emailResult.success) {
        console.log(`Low balance emails sent for ${businessUnit.name}`);
        
        // Log the email for each recipient
        for (const recipient of recipients) {
          await storage.logEmailSent({
            userId: recipient.id,
            businessUnitId: businessUnit.id,
            emailType: 'low_balance_email',
            subject: `LOW Alert: ${businessUnit.name} - ₹${alertData.currentBalance}`,
            deliveryStatus: 'sent'
          });
        }
      } else {
        console.error(`Failed to send low balance emails for ${businessUnit.name}:`, emailResult.error);
        
        // Log failed emails
        for (const recipient of recipients) {
          await storage.logEmailSent({
            userId: recipient.id,
            businessUnitId: businessUnit.id,
            emailType: 'low_balance_email',
            subject: `LOW Alert: ${businessUnit.name} - ₹${alertData.currentBalance}`,
            deliveryStatus: 'failed'
          });
        }
      }

      // Also try to send WhatsApp if enabled
      try {
        const result = await whatsAppService.sendBalanceAlert(recipients, alertData);
        if (result.success) {
          console.log(`Low balance WhatsApp alert sent for ${businessUnit.name}`);
        }
      } catch (whatsappError: any) {
        console.log(`WhatsApp notification skipped (non-critical):`, whatsappError?.message || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error sending low balance alert for ${businessUnit.name}:`, error);
    }
  }

  private async getAlertRecipients(businessUnitId: string, includePlatformAdmins: boolean = false) {
    try {
      const recipients = [];
      
      // Get business unit admin - find users who have this business unit assigned
      const businessUnitUsers = await storage.getUsersWithBusinessUnits();
      for (const user of businessUnitUsers) {
        // Check if user has this business unit in their businessUnits array
        const matchingBU = user.businessUnits?.find((bu: any) => bu.id === businessUnitId);
        if (matchingBU && matchingBU.role === 'Business Unit Admin') {
          // Get full user details with mobile number
          const fullUser = await storage.getUser(user.id);
          if (fullUser) {
            recipients.push(fullUser);
          }
        }
      }
      
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

  async manualTriggerBalanceAlert(businessUnitId: string, alertType: 'critical' | 'low'): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      console.log(`Manual trigger: ${alertType} balance alert for business unit ${businessUnitId}`);
      
      // Get the business unit
      const businessUnit = await storage.getBusinessUnit(businessUnitId);
      if (!businessUnit) {
        return { success: false, message: 'Business unit not found' };
      }

      // Get threshold from settings
      const settings = await storage.getSystemSettings();
      const thresholdKey = alertType === 'critical' ? 'critical_balance_threshold' : 'low_balance_threshold';
      const threshold = settings.find(s => s.key === thresholdKey)?.value || (alertType === 'critical' ? '100' : '500');

      // Send the alert (force bypass duplicate check for manual testing)
      if (alertType === 'critical') {
        await this.sendCriticalBalanceAlert(businessUnit, threshold, true);
      } else {
        await this.sendLowBalanceAlert(businessUnit, threshold, true);
      }

      return { 
        success: true, 
        message: `${alertType === 'critical' ? 'Critical' : 'Low'} balance alert sent successfully for ${businessUnit.name}` 
      };
    } catch (error) {
      console.error('Error in manual trigger:', error);
      return { 
        success: false, 
        message: 'Failed to send alert', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  stop() {
    console.log('Notification scheduler stopped');
    this.isEnabled = false;
  }
}

export const notificationScheduler = new NotificationScheduler();