import nodemailer from 'nodemailer';
import { BusinessUnit, User } from '@shared/schema';

export interface BalanceAlertData {
  businessUnit: BusinessUnit;
  currentBalance: string;
  threshold: string;
  alertType: 'critical' | 'low';
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const port = parseInt(process.env.EMAIL_PORT || '465');
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
      port: port,
      secure: port === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  private generatePasswordResetTemplate(user: User, resetToken: string): { subject: string, html: string } {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://ukteawallet.com'}/reset-password?token=${resetToken}`;
    
    const subject = 'Reset Your UKteawallet Password';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Password Reset Request</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">UKteawallet by UrbanKetl</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 32px 24px;">
            <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Hello ${user.firstName},</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              We received a request to reset the password for your UKteawallet account. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 24px 0 0 0;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 8px 0 0 0;">
              ${resetUrl}
            </p>
          </div>
          
          <!-- Security Notice -->
          <div style="margin: 0 24px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px;">
            <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
              <strong>⚠️ Security Notice:</strong><br>
              This link will expire in <strong>1 hour</strong> for your security.<br>
              If you didn't request this reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px 24px; margin-top: 24px; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
              This is an automated email from UKteawallet by UrbanKetl.
              <br>Please do not reply to this email.
            </p>
            <p style="color: #94a3b8; font-size: 11px; margin: 8px 0 0 0; text-align: center;">
              © ${new Date().getFullYear()} UrbanKetl. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return { subject, html };
  }

  private generateBalanceAlertTemplate(data: BalanceAlertData, user: User): { subject: string, html: string } {
    const isCritical = data.alertType === 'critical';
    const alertColor = isCritical ? '#ef4444' : '#f59e0b';
    const alertText = isCritical ? 'CRITICAL' : 'LOW';
    
    const subject = `${alertText} Balance Alert: ${data.businessUnit.name} - ₹${data.currentBalance}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Balance Alert</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">UrbanKetl Balance Alert</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Automated notification system</p>
          </div>
          
          <!-- Alert Badge -->
          <div style="padding: 24px 24px 16px 24px;">
            <div style="background-color: ${alertColor}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; font-size: 14px; margin-bottom: 20px;">
              ${alertText} BALANCE ALERT
            </div>
            
            <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Hello ${user.firstName},</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
              ${isCritical ? 
                'Your business unit wallet balance has dropped below the critical threshold and requires immediate attention.' :
                'Your business unit wallet balance is running low and may need a recharge soon.'
              }
            </p>
          </div>
          
          <!-- Balance Details -->
          <div style="margin: 0 24px; background-color: #f1f5f9; border-radius: 8px; padding: 20px;">
            <h3 style="color: #1e293b; margin: 0 0 16px 0; font-size: 18px;">Balance Details</h3>
            
            <div style="display: grid; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-weight: 500;">Business Unit:</span>
                <span style="color: #1e293b; font-weight: 600;">${data.businessUnit.name}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-weight: 500;">Current Balance:</span>
                <span style="color: ${alertColor}; font-weight: 700; font-size: 18px;">₹${data.currentBalance}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                <span style="color: #64748b; font-weight: 500;">${alertText} Threshold:</span>
                <span style="color: #1e293b; font-weight: 600;">₹${data.threshold}</span>
              </div>
            </div>
          </div>
          
          <!-- Action Required -->
          <div style="padding: 20px 24px;">
            <h3 style="color: #1e293b; margin: 0 0 12px 0; font-size: 18px;">Action Required</h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
              ${isCritical ? 
                'Please recharge your wallet immediately to avoid service interruption. Tea dispensing may be affected if the balance reaches zero.' :
                'Consider recharging your wallet in the next few days to ensure uninterrupted service.'
              }
            </p>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://your-domain.replit.app'}/wallet" 
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Recharge Wallet Now
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px 24px; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
              This is an automated notification from UrbanKetl. 
              <br>If you believe this is an error, please contact support.
            </p>
            <p style="color: #94a3b8; font-size: 11px; margin: 8px 0 0 0; text-align: center;">
              © ${new Date().getFullYear()} UrbanKetl. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return { subject, html };
  }

  async sendBalanceAlert(recipients: User[], data: BalanceAlertData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        throw new Error('Email credentials not configured');
      }

      // Send to each recipient
      const sendPromises = recipients.map(async (user) => {
        const { subject, html } = this.generateBalanceAlertTemplate(data, user);
        
        const mailOptions = {
          from: {
            name: 'UrbanKetl Team',
            address: process.env.EMAIL_USER!
          },
          to: user.email,
          subject,
          html
        };
        
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`Balance alert sent to ${user.email}:`, info.messageId);
        
        return {
          userId: user.id,
          messageId: info.messageId,
          status: 'sent'
        };
      });

      const results = await Promise.all(sendPromises);
      
      return {
        success: true,
        messageId: results.map(r => r.messageId).join(', ')
      };
    } catch (error) {
      console.error('Failed to send balance alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendPasswordResetEmail(user: User, resetToken: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        throw new Error('Email credentials not configured');
      }

      const { subject, html } = this.generatePasswordResetTemplate(user, resetToken);
      
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'UKteawallet Support',
          address: process.env.EMAIL_USER!
        },
        to: user.email,
        subject,
        html
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${user.email}:`, info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async testEmailConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();