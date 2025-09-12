import twilio from 'twilio';

export interface BalanceAlertData {
  businessUnit: any;
  currentBalance: string;
  threshold: string;
  alertType: 'critical' | 'low';
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
}

export class SMSService {
  private client: any = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (accountSid && authToken) {
        this.client = twilio(accountSid, authToken);
        this.isConfigured = true;
        console.log('Twilio SMS service initialized successfully');
      } else {
        console.log('Twilio credentials not configured - SMS service disabled');
        this.isConfigured = false;
      }
    } catch (error) {
      console.error('Failed to initialize Twilio SMS service:', error);
      this.isConfigured = false;
    }
  }

  private generateBalanceAlertMessage(data: BalanceAlertData): string {
    const { businessUnit, currentBalance, threshold, alertType } = data;
    const isCritical = alertType === 'critical';
    
    if (isCritical) {
      return `🚨 CRITICAL ALERT: ${businessUnit.name} wallet balance is critically low at ₹${currentBalance} (below ₹${threshold}). URGENT: Recharge immediately to avoid service disruption. Visit your UrbanKetl dashboard to recharge now.`;
    } else {
      return `⚠️ LOW BALANCE: ${businessUnit.name} wallet balance is ₹${currentBalance} (below ₹${threshold}). Please consider recharging soon to ensure uninterrupted tea service. Visit your UrbanKetl dashboard to recharge.`;
    }
  }

  async sendBalanceAlert(recipients: User[], data: BalanceAlertData): Promise<{ success: boolean; messageIds?: string[]; error?: string }> {
    try {
      if (!this.isConfigured) {
        throw new Error('SMS service not configured - Twilio credentials missing');
      }

      if (!process.env.TWILIO_PHONE_NUMBER) {
        throw new Error('Twilio phone number not configured');
      }

      const message = this.generateBalanceAlertMessage(data);
      const validRecipients = recipients.filter(user => user.mobileNumber && user.mobileNumber.trim() !== '');
      
      if (validRecipients.length === 0) {
        throw new Error('No valid mobile numbers found for recipients');
      }

      // Send SMS to each recipient
      const sendPromises = validRecipients.map(async (user) => {
        try {
          const result = await this.client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.mobileNumber
          });
          
          console.log(`Balance alert SMS sent to ${user.mobileNumber}:`, result.sid);
          
          return {
            userId: user.id,
            messageId: result.sid,
            status: 'sent',
            to: user.mobileNumber
          };
        } catch (error) {
          console.error(`Failed to send SMS to ${user.mobileNumber}:`, error);
          return {
            userId: user.id,
            messageId: null,
            status: 'failed',
            to: user.mobileNumber,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const results = await Promise.all(sendPromises);
      const successfulSends = results.filter(r => r.status === 'sent');
      const failedSends = results.filter(r => r.status === 'failed');

      if (failedSends.length > 0) {
        console.warn(`SMS sending failed for ${failedSends.length} recipients:`, failedSends);
      }

      return {
        success: successfulSends.length > 0,
        messageIds: successfulSends.map(r => r.messageId).filter(Boolean) as string[]
      };
    } catch (error) {
      console.error('Failed to send balance alert SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendTestSMS(phoneNumber: string, message: string = 'Test message from UrbanKetl SMS service'): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        throw new Error('SMS service not configured');
      }

      if (!process.env.TWILIO_PHONE_NUMBER) {
        throw new Error('Twilio phone number not configured');
      }

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`Test SMS sent to ${phoneNumber}:`, result.sid);
      
      return {
        success: true,
        messageId: result.sid
      };
    } catch (error) {
      console.error('Failed to send test SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async testSMSConnection(): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        console.log('SMS service not configured');
        return false;
      }

      // Test by validating the client configuration
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      console.log(`SMS service connection verified. Account: ${account.friendlyName}`);
      return true;
    } catch (error) {
      console.error('SMS service connection test failed:', error);
      return false;
    }
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

export const smsService = new SMSService();