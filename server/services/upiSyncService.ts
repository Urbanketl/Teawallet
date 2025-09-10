import { db } from "../db";
import { dispensingLogs, upiSyncLogs } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

interface KulhadTransaction {
  _creationTime: number;
  _id: string;
  amount: number;
  amountPerCup: number;
  createdAt: number;
  cups: number;
  customTransactionId: string;
  description: string;
  expiresAt: number;
  imageUrl?: string;
  machineId: string;
  status: string;
  transactionId: string;
  updatedAt: number;
  paymentId?: string;
  vpa?: string;
  rating?: number;
}

interface KulhadApiResponse {
  success: boolean;
  data: KulhadTransaction[];
}

interface SyncResult {
  success: boolean;
  recordsFound: number;
  recordsProcessed: number;
  recordsSkipped: number;
  errorMessage?: string;
  responseTime: number;
}

export class UpiSyncService {
  private readonly KULHAD_API_BASE = 'https://kulhad.vercel.app/api';

  /**
   * Perform initial full sync - pull historical data
   */
  async performInitialSync(daysBack: number = 90): Promise<SyncResult> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    console.log(`Starting initial UPI sync - pulling ${daysBack} days of data`);
    
    return await this.performSync(startDate, endDate, 'initial', 'admin');
  }

  /**
   * Perform daily sync with 2-hour overlap window to prevent data gaps
   */
  async performDailySync(): Promise<SyncResult> {
    console.log('Starting daily UPI sync with overlap window');
    
    // Get last sync timestamp from database
    const lastSync = await this.getLastSyncTimestamp();
    
    // Use 2-hour overlap window to catch late-arriving transactions
    const startDate = new Date((lastSync?.getTime() || Date.now() - 24 * 60 * 60 * 1000) - (2 * 60 * 60 * 1000));
    const endDate = new Date();
    
    return await this.performSync(startDate, endDate, 'daily', 'cron');
  }

  /**
   * Perform manual sync for specific date range
   */
  async performManualSync(startDate: Date, endDate: Date): Promise<SyncResult> {
    console.log(`Starting manual UPI sync from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    return await this.performSync(startDate, endDate, 'manual', 'admin');
  }

  /**
   * Core sync logic - fetch and process transactions
   */
  private async performSync(
    startDate: Date, 
    endDate: Date, 
    syncType: 'initial' | 'daily' | 'manual',
    triggeredBy: string
  ): Promise<SyncResult> {
    const syncStartTime = Date.now();
    let recordsFound = 0;
    let recordsProcessed = 0;
    let recordsSkipped = 0;
    let errorMessage: string | undefined;

    try {
      // Fetch data from kulhad API
      const transactions = await this.fetchTransactionsFromAPI(startDate, endDate);
      recordsFound = transactions.length;

      console.log(`Fetched ${recordsFound} transactions from kulhad API`);

      // Process each transaction
      for (const transaction of transactions) {
        try {
          const processed = await this.processTransaction(transaction);
          if (processed) {
            recordsProcessed++;
          } else {
            recordsSkipped++;
          }
        } catch (error) {
          console.error(`Error processing transaction ${transaction._id}:`, error);
          recordsSkipped++;
        }
      }

      const responseTime = Date.now() - syncStartTime;
      const syncResult: SyncResult = {
        success: true,
        recordsFound,
        recordsProcessed,
        recordsSkipped,
        responseTime
      };

      // Log the sync operation
      await this.logSyncOperation({
        syncType,
        startDate,
        endDate,
        ...syncResult,
        syncStatus: 'success',
        triggeredBy,
        apiResponse: transactions.slice(0, 3) // Sample for debugging
      });

      console.log(`UPI sync completed: ${recordsProcessed} processed, ${recordsSkipped} skipped`);
      
      return syncResult;

    } catch (error) {
      const responseTime = Date.now() - syncStartTime;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('UPI sync failed:', error);

      const syncResult: SyncResult = {
        success: false,
        recordsFound,
        recordsProcessed,
        recordsSkipped,
        errorMessage,
        responseTime
      };

      // Log the failed sync operation
      await this.logSyncOperation({
        syncType,
        startDate,
        endDate,
        ...syncResult,
        syncStatus: 'failed',
        triggeredBy,
        apiResponse: null
      });

      return syncResult;
    }
  }

  /**
   * Fetch transactions from kulhad API
   */
  private async fetchTransactionsFromAPI(startDate: Date, endDate: Date): Promise<KulhadTransaction[]> {
    const fromDate = startDate.toISOString().split('T')[0];
    const toDate = endDate.toISOString().split('T')[0];
    
    const url = `${this.KULHAD_API_BASE}/getTransactionsByDateRange?fromDate=${fromDate}&toDate=${toDate}`;
    
    console.log(`Fetching from kulhad API: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Kulhad API request failed: ${response.status} ${response.statusText}`);
    }
    
    const apiResponse: KulhadApiResponse = await response.json();
    
    if (!apiResponse.success) {
      throw new Error('Kulhad API returned success: false');
    }
    
    return apiResponse.data || [];
  }

  /**
   * Process individual transaction - check for duplicates and insert/update
   */
  private async processTransaction(transaction: KulhadTransaction): Promise<boolean> {
    try {
      // Check if transaction already exists (using external ID for deduplication)
      const existingLog = await db
        .select()
        .from(dispensingLogs)
        .where(eq(dispensingLogs.externalId, transaction._id))
        .limit(1);

      if (existingLog.length > 0) {
        // Update existing transaction if status changed or new data
        const existing = existingLog[0];
        
        // Check if status changed from active/expired to paid
        if (existing.success === false && transaction.status === 'paid') {
          await db
            .update(dispensingLogs)
            .set({
              success: true,
              upiPaymentId: transaction.paymentId,
              upiVpa: transaction.vpa,
              externalCreatedAt: new Date(transaction.createdAt),
            })
            .where(eq(dispensingLogs.id, existing.id));
          
          console.log(`Updated transaction ${transaction._id} status to paid`);
          return true;
        }
        
        return false; // Already processed, no update needed
      }

      // Insert new transaction
      await db.insert(dispensingLogs).values({
        paymentType: 'upi',
        businessUnitId: null, // UPI transactions are direct consumer payments
        rfidCardId: null,
        upiPaymentId: transaction.paymentId || null,
        upiVpa: transaction.vpa || null,
        externalTransactionId: transaction.transactionId,
        externalId: transaction._id,
        machineId: transaction.machineId,
        teaType: 'Regular Tea', // Default tea type
        amount: transaction.amount.toString(),
        cups: transaction.cups,
        success: transaction.status === 'paid',
        errorMessage: transaction.status === 'expired' ? 'Payment expired' : null,
        externalCreatedAt: new Date(transaction.createdAt),
      });

      console.log(`Inserted new UPI transaction ${transaction._id} for machine ${transaction.machineId}`);
      return true;

    } catch (error) {
      console.error(`Error processing transaction ${transaction._id}:`, error);
      throw error;
    }
  }

  /**
   * Get timestamp of last successful sync
   */
  private async getLastSyncTimestamp(): Promise<Date | null> {
    try {
      const lastSync = await db
        .select({ createdAt: upiSyncLogs.createdAt })
        .from(upiSyncLogs)
        .where(eq(upiSyncLogs.syncStatus, 'success'))
        .orderBy(upiSyncLogs.createdAt)
        .limit(1);

      return lastSync.length > 0 ? lastSync[0].createdAt : null;
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }

  /**
   * Log sync operation to database
   */
  private async logSyncOperation(data: {
    syncType: string;
    startDate: Date;
    endDate: Date;
    recordsFound: number;
    recordsProcessed: number;
    recordsSkipped: number;
    syncStatus: string;
    errorMessage?: string;
    responseTime: number;
    triggeredBy: string;
    apiResponse: any;
  }): Promise<void> {
    try {
      await db.insert(upiSyncLogs).values({
        syncType: data.syncType,
        startDate: data.startDate,
        endDate: data.endDate,
        recordsFound: data.recordsFound,
        recordsProcessed: data.recordsProcessed,
        recordsSkipped: data.recordsSkipped,
        syncStatus: data.syncStatus,
        errorMessage: data.errorMessage || null,
        responseTime: data.responseTime,
        apiResponse: data.apiResponse,
        triggeredBy: data.triggeredBy,
      });
    } catch (error) {
      console.error('Error logging sync operation:', error);
    }
  }

  /**
   * Get UPI sync statistics for admin dashboard
   */
  async getSyncStats(): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    lastSyncDate: Date | null;
    totalTransactionsProcessed: number;
  }> {
    try {
      const stats = await db
        .select({
          syncStatus: upiSyncLogs.syncStatus,
          recordsProcessed: upiSyncLogs.recordsProcessed,
          createdAt: upiSyncLogs.createdAt,
        })
        .from(upiSyncLogs);

      const totalSyncs = stats.length;
      const successfulSyncs = stats.filter(s => s.syncStatus === 'success').length;
      const lastSyncDate = stats.length > 0 ? stats[stats.length - 1].createdAt : null;
      const totalTransactionsProcessed = stats.reduce((sum, s) => sum + (s.recordsProcessed || 0), 0);

      return {
        totalSyncs,
        successfulSyncs,
        lastSyncDate,
        totalTransactionsProcessed,
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        lastSyncDate: null,
        totalTransactionsProcessed: 0,
      };
    }
  }
}

export const upiSyncService = new UpiSyncService();