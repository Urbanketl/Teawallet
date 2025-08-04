// Initialize notification scheduler
import { notificationScheduler } from './notificationScheduler';
import { emailService } from './emailService';

export function initializeServices() {
  console.log('Initializing UrbanKetl services...');
  
  // Test email connection
  emailService.testEmailConnection().then(success => {
    if (success) {
      console.log('✓ Email service ready');
      // Start notification scheduler only if email service is working
      notificationScheduler.start();
    } else {
      console.log('⚠ Email service not configured - skipping notification scheduler');
    }
  });
}

export { emailService, notificationScheduler };