import axios from 'axios';

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

export class WhatsAppService {
  private isConfigured: boolean = false;
  private accessToken: string = '';
  private phoneNumberId: string = '';
  private apiVersion: string = 'v20.0';

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      
      if (accessToken && phoneNumberId) {
        this.accessToken = accessToken;
        this.phoneNumberId = phoneNumberId;
        this.isConfigured = true;
        console.log('MyOperator WhatsApp service initialized successfully');
      } else {
        console.log('MyOperator WhatsApp credentials not configured - WhatsApp service disabled');
        this.isConfigured = false;
      }
    } catch (error) {
      console.error('Failed to initialize MyOperator WhatsApp service:', error);
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
        throw new Error('WhatsApp service not configured - MyOperator credentials missing');
      }

      const message = this.generateBalanceAlertMessage(data);
      const validRecipients = recipients.filter(user => user.mobileNumber && user.mobileNumber.trim() !== '');
      
      if (validRecipients.length === 0) {
        throw new Error('No valid mobile numbers found for recipients');
      }

      // Send WhatsApp message to each recipient using WhatsApp Cloud API
      const sendPromises = validRecipients.map(async (user) => {
        try {
          const result = await this.sendWhatsAppMessage(user.mobileNumber, message);
          
          console.log(`Balance alert WhatsApp sent to ${user.mobileNumber}:`, result.messages[0].id);
          
          return {
            userId: user.id,
            messageId: result.messages[0].id,
            status: 'sent',
            to: user.mobileNumber
          };
        } catch (error) {
          console.error(`Failed to send WhatsApp to ${user.mobileNumber}:`, error);
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
        console.warn(`WhatsApp sending failed for ${failedSends.length} recipients:`, failedSends);
      }

      return {
        success: successfulSends.length > 0,
        messageIds: successfulSends.map(r => r.messageId).filter(Boolean) as string[]
      };
    } catch (error) {
      console.error('Failed to send balance alert WhatsApp:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters (spaces, +, -, etc.)
    return phoneNumber.replace(/\D/g, '');
  }

  private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<any> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    const payload = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      text: { body: message }
    };

    console.log('=== WHATSAPP API CALL ===');
    console.log('URL:', url);
    console.log('Original phone:', phoneNumber);
    console.log('Normalized phone:', normalizedPhone);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Access Token length:', this.accessToken.length);
    console.log('Phone Number ID:', this.phoneNumberId);

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('WhatsApp API SUCCESS:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('=== WHATSAPP API ERROR ===');
      console.error('Status:', error.response?.status);
      console.error('Status Text:', error.response?.statusText);
      console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Full error response:', error.response);
      throw error;
    }
  }

  async sendTestWhatsApp(phoneNumber: string, message: string = 'Test message from UrbanKetl WhatsApp service'): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        throw new Error('WhatsApp service not configured');
      }

      const result = await this.sendWhatsAppMessage(phoneNumber, message);
      const messageId = result.messages[0].id;

      console.log(`Test WhatsApp sent to ${phoneNumber}:`, messageId);
      
      return {
        success: true,
        messageId: messageId
      };
    } catch (error) {
      console.error('Failed to send test WhatsApp:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async testWhatsAppConnection(): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        console.log('WhatsApp service not configured');
        return false;
      }

      // Test by making a simple API call to verify credentials
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      console.log(`WhatsApp service connection verified. Phone: ${response.data.display_phone_number}`);
      return true;
    } catch (error) {
      console.error('WhatsApp service connection test failed:', error);
      return false;
    }
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

export const whatsAppService = new WhatsAppService();