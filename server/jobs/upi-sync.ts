/**
 * Standalone UPI Sync Job
 * 
 * This job is designed to run as a Replit Scheduled Deployment.
 * It performs daily synchronization of UPI payment transactions from the Kulhad API.
 * 
 * Usage: npm run job:upi-sync
 * 
 * Scheduled via Replit Scheduled Deployment:
 * - Schedule: "Every day at 8 PM IST" (cron: 0 20 * * *)
 * - Timezone: Asia/Kolkata
 */

import { UpiSyncService } from '../services/upiSyncService';

async function runUpiSync() {
  console.log('='.repeat(60));
  console.log('UPI SYNC JOB STARTED');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('='.repeat(60));

  const upiSyncService = new UpiSyncService();

  try {
    const result = await upiSyncService.performDailySync();
    
    console.log('\n' + '='.repeat(60));
    console.log('UPI SYNC JOB COMPLETED');
    console.log('Status:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Records Found:', result.recordsFound);
    console.log('Records Processed:', result.recordsProcessed);
    console.log('Records Skipped:', result.recordsSkipped);
    console.log('Response Time:', `${result.responseTime}ms`);
    
    if (result.errorMessage) {
      console.error('Error Message:', result.errorMessage);
    }
    
    console.log('Completed at:', new Date().toISOString());
    console.log('='.repeat(60));

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('UPI SYNC JOB FAILED WITH EXCEPTION');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('Failed at:', new Date().toISOString());
    console.error('='.repeat(60));
    
    process.exit(1);
  }
}

// Run the sync job
runUpiSync();
