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
  private apiToken: string = '';
  private xApiKey: string = '';
  private companyId: string = '';
  private apiUrl: string = 'https://api.myoperator.co/whatsapp/send';

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const apiToken = process.env.MYOPERATOR_API_TOKEN;
      const xApiKey = process.env.MYOPERATOR_X_API_KEY;
      const companyId = process.env.MYOPERATOR_COMPANY_ID;
      
      if (apiToken && xApiKey && companyId) {
        this.apiToken = apiToken;
        this.xApiKey = xApiKey;
        this.companyId = companyId;
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

  private extractTemplateParameters(data: BalanceAlertData): Record<string, string> {
    const { businessUnit, currentBalance, threshold } = data;
    
    // MyOperator template parameters matching the approved templates:
    // uk_critical_balance_template and uk_low_balance_template
    return {
      business_unit: businessUnit.name || businessUnit.code,
      current_balance: currentBalance,
      threshold: threshold
    };
  }

  private getTemplateId(alertType: 'critical' | 'low'): string {
    // Template IDs must be configured in environment variables and created in MyOperator dashboard
    const templateId = alertType === 'critical' 
      ? process.env.MYOPERATOR_CRITICAL_BALANCE_TEMPLATE_ID
      : process.env.MYOPERATOR_LOW_BALANCE_TEMPLATE_ID;
    
    if (!templateId) {
      throw new Error(`Missing template ID configuration for ${alertType} balance alert. Please set MYOPERATOR_${alertType.toUpperCase()}_BALANCE_TEMPLATE_ID environment variable.`);
    }
    
    return templateId;
  }

  async sendBalanceAlert(recipients: User[], data: BalanceAlertData): Promise<{ success: boolean; messageIds?: string[]; error?: string }> {
    try {
      if (!this.isConfigured) {
        throw new Error('WhatsApp service not configured - MyOperator credentials missing');
      }

      const message = this.generateBalanceAlertMessage(data);
      console.log('Generated balance alert message (for logging):', message);
      
      const templateId = this.getTemplateId(data.alertType);
      const templateParameters = this.extractTemplateParameters(data);
      
      const validRecipients = recipients.filter(user => user.mobileNumber && user.mobileNumber.trim() !== '');
      
      if (validRecipients.length === 0) {
        throw new Error('No valid mobile numbers found for recipients');
      }

      // Send WhatsApp message to each recipient using MyOperator API
      const sendPromises = validRecipients.map(async (user) => {
        try {
          const result = await this.sendWhatsAppMessage(user.mobileNumber, templateId, templateParameters);
          
          const messageId = result.message_id || result.id || 'sent';
          console.log(`Balance alert WhatsApp sent to ${user.mobileNumber}:`, messageId);
          
          return {
            userId: user.id,
            messageId: messageId,
            status: 'sent',
            to: user.mobileNumber
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Failed to send WhatsApp to ${user.mobileNumber}:`, errorMessage);
          return {
            userId: user.id,
            messageId: null,
            status: 'failed',
            to: user.mobileNumber,
            error: errorMessage
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to send balance alert WhatsApp:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters (spaces, +, -, etc.)
    return phoneNumber.replace(/\D/g, '');
  }

  private async sendWhatsAppMessage(phoneNumber: string, templateId: string, parameters: Record<string, string>): Promise<any> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    const payload = {
      company_id: this.companyId,
      to: normalizedPhone,
      template_id: templateId,
      parameters: parameters
    };

    console.log('=== MYOPERATOR WHATSAPP API CALL ===');
    console.log('URL:', this.apiUrl);
    console.log('Original phone:', phoneNumber);
    console.log('Normalized phone:', normalizedPhone);
    console.log('Template ID:', templateId);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'x-api-key': this.xApiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log('MyOperator WhatsApp API SUCCESS:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('=== MYOPERATOR WHATSAPP API ERROR ===');
      
      if (error.response) {
        // API returned an error response
        console.error('Status:', error.response.status);
        console.error('Status Text:', error.response.statusText);
        
        // Log only error data, NOT the full response (which contains sensitive headers/credentials)
        if (error.response.data) {
          try {
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
          } catch {
            console.error('Error Data (stringified):', String(error.response.data));
          }
        }
        
        throw new Error(`MyOperator API error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received from MyOperator API');
        throw new Error('MyOperator API error: No response received');
      } else {
        // Error in request setup
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Request setup error:', errorMessage);
        throw new Error(`MyOperator API error: ${errorMessage}`);
      }
    }
  }

  async sendTestWhatsApp(phoneNumber: string, message: string = 'Test message from UrbanKetl WhatsApp service'): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        throw new Error('WhatsApp service not configured');
      }

      // Use a test template ID - must be configured in MyOperator dashboard
      const testTemplateId = process.env.MYOPERATOR_TEST_TEMPLATE_ID;
      
      if (!testTemplateId) {
        throw new Error('Missing test template ID configuration. Please set MYOPERATOR_TEST_TEMPLATE_ID environment variable.');
      }
      
      const testParameters = {
        message: message,
        service_name: 'UrbanKetl'
      };

      const result = await this.sendWhatsAppMessage(phoneNumber, testTemplateId, testParameters);
      const messageId = result.message_id || result.id || 'sent';

      console.log(`Test WhatsApp sent to ${phoneNumber}:`, messageId);
      
      return {
        success: true,
        messageId: messageId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to send test WhatsApp:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async testWhatsAppConnection(): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        console.log('WhatsApp service not configured - MyOperator credentials missing');
        return false;
      }

      // MyOperator doesn't have a dedicated health check endpoint
      // Verify that all required credentials are present
      if (!this.apiToken || !this.xApiKey || !this.companyId) {
        console.log('WhatsApp service connection test failed: Missing required credentials');
        return false;
      }

      console.log('MyOperator WhatsApp service connection verified - All credentials present');
      console.log('Company ID:', this.companyId);
      console.log('API configured with:', this.apiUrl);
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