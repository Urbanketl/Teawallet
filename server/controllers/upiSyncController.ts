import { Request, Response } from 'express';
import { upiSyncService } from '../services/upiSyncService';
import { db } from '../db';
import { upiSyncLogs, dispensingLogs } from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export class UpiSyncController {

  // Get UPI sync status and statistics
  async getSyncStatus(req: Request, res: Response) {
    try {
      const stats = await upiSyncService.getSyncStats();
      
      // Get recent sync logs
      const recentLogs = await db
        .select()
        .from(upiSyncLogs)
        .orderBy(desc(upiSyncLogs.createdAt))
        .limit(5);

      // Get total UPI transactions count
      const totalUpiTransactions = await db
        .select({ count: dispensingLogs.id })
        .from(dispensingLogs)
        .where(eq(dispensingLogs.paymentType, 'upi'));

      res.json({
        stats,
        recentLogs,
        totalUpiTransactions: totalUpiTransactions.length,
      });
    } catch (error) {
      console.error('Error fetching UPI sync status:', error);
      res.status(500).json({ error: 'Failed to fetch UPI sync status' });
    }
  }

  // Trigger initial UPI sync (historical data)
  async triggerInitialSync(req: Request, res: Response) {
    try {
      const { daysBack = 90 } = req.body;
      
      console.log(`Admin triggered initial UPI sync for ${daysBack} days`);
      
      const result = await upiSyncService.performInitialSync(daysBack);
      
      if (result.success) {
        res.json({
          success: true,
          message: `Initial sync completed: ${result.recordsProcessed} transactions processed, ${result.recordsSkipped} skipped`,
          result
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Initial sync failed: ${result.errorMessage}`,
          result
        });
      }
    } catch (error) {
      console.error('Error triggering initial UPI sync:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to trigger initial UPI sync',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Trigger daily UPI sync
  async triggerDailySync(req: Request, res: Response) {
    try {
      console.log('Admin triggered daily UPI sync');
      
      const result = await upiSyncService.performDailySync();
      
      if (result.success) {
        res.json({
          success: true,
          message: `Daily sync completed: ${result.recordsProcessed} transactions processed, ${result.recordsSkipped} skipped`,
          result
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Daily sync failed: ${result.errorMessage}`,
          result
        });
      }
    } catch (error) {
      console.error('Error triggering daily UPI sync:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to trigger daily UPI sync',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Trigger manual UPI sync for specific date range
  async triggerManualSync(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          error: 'startDate and endDate are required' 
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid date format' 
        });
      }
      
      if (start >= end) {
        return res.status(400).json({ 
          success: false, 
          error: 'startDate must be before endDate' 
        });
      }
      
      console.log(`Admin triggered manual UPI sync from ${start.toISOString()} to ${end.toISOString()}`);
      
      const result = await upiSyncService.performManualSync(start, end);
      
      if (result.success) {
        res.json({
          success: true,
          message: `Manual sync completed: ${result.recordsProcessed} transactions processed, ${result.recordsSkipped} skipped`,
          result
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Manual sync failed: ${result.errorMessage}`,
          result
        });
      }
    } catch (error) {
      console.error('Error triggering manual UPI sync:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to trigger manual UPI sync',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get UPI sync logs with optional filtering
  async getSyncLogs(req: Request, res: Response) {
    try {
      const { syncType, syncStatus, limit = 50, offset = 0 } = req.query;
      
      // Build conditions array
      const conditions = [];
      if (syncType) {
        conditions.push(eq(upiSyncLogs.syncType, syncType as string));
      }
      if (syncStatus) {
        conditions.push(eq(upiSyncLogs.syncStatus, syncStatus as string));
      }
      
      // Build query with or without conditions
      let logs;
      if (conditions.length > 0) {
        logs = await db
          .select()
          .from(upiSyncLogs)
          .where(and(...conditions))
          .orderBy(desc(upiSyncLogs.createdAt))
          .limit(parseInt(limit as string))
          .offset(parseInt(offset as string));
      } else {
        logs = await db
          .select()
          .from(upiSyncLogs)
          .orderBy(desc(upiSyncLogs.createdAt))
          .limit(parseInt(limit as string))
          .offset(parseInt(offset as string));
      }
      
      res.json(logs);
    } catch (error) {
      console.error('Error fetching UPI sync logs:', error);
      res.status(500).json({ error: 'Failed to fetch UPI sync logs' });
    }
  }

  // Get UPI transactions with optional filtering
  async getUpiTransactions(req: Request, res: Response) {
    try {
      const { 
        machineId, 
        status, 
        startDate, 
        endDate, 
        limit = 50, 
        offset = 0 
      } = req.query;
      
      // Build conditions array
      const conditions = [eq(dispensingLogs.paymentType, 'upi')];
      
      if (machineId) {
        conditions.push(eq(dispensingLogs.machineId, machineId as string));
      }
      
      if (status === 'paid') {
        conditions.push(eq(dispensingLogs.success, true));
      } else if (status === 'failed') {
        conditions.push(eq(dispensingLogs.success, false));
      }
      
      if (startDate) {
        conditions.push(gte(dispensingLogs.createdAt, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(dispensingLogs.createdAt, new Date(endDate as string)));
      }
      
      const transactions = await db
        .select()
        .from(dispensingLogs)
        .where(and(...conditions))
        .orderBy(desc(dispensingLogs.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
      
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching UPI transactions:', error);
      res.status(500).json({ error: 'Failed to fetch UPI transactions' });
    }
  }

  // Get UPI sync analytics/statistics
  async getSyncAnalytics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      // Default to last 30 days if no date range specified
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Get UPI transactions in date range
      const upiTransactions = await db
        .select()
        .from(dispensingLogs)
        .where(
          and(
            eq(dispensingLogs.paymentType, 'upi'),
            gte(dispensingLogs.createdAt, start),
            lte(dispensingLogs.createdAt, end)
          )
        );
      
      // Calculate analytics
      const totalTransactions = upiTransactions.length;
      const successfulTransactions = upiTransactions.filter(t => t.success).length;
      const failedTransactions = totalTransactions - successfulTransactions;
      const totalRevenue = upiTransactions
        .filter(t => t.success)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalCups = upiTransactions
        .filter(t => t.success)
        .reduce((sum, t) => sum + (t.cups || 1), 0);
      
      // Machine-wise breakdown
      const machineStats = upiTransactions.reduce((acc, transaction) => {
        const machineId = transaction.machineId;
        if (!acc[machineId]) {
          acc[machineId] = {
            machineId,
            totalTransactions: 0,
            successfulTransactions: 0,
            revenue: 0,
            cups: 0
          };
        }
        
        acc[machineId].totalTransactions++;
        if (transaction.success) {
          acc[machineId].successfulTransactions++;
          acc[machineId].revenue += parseFloat(transaction.amount);
          acc[machineId].cups += transaction.cups || 1;
        }
        
        return acc;
      }, {} as Record<string, any>);
      
      res.json({
        dateRange: { start, end },
        summary: {
          totalTransactions,
          successfulTransactions,
          failedTransactions,
          successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions * 100).toFixed(2) : 0,
          totalRevenue: totalRevenue.toFixed(2),
          totalCups,
          averageRevenuePerTransaction: totalTransactions > 0 ? (totalRevenue / successfulTransactions).toFixed(2) : 0
        },
        machineStats: Object.values(machineStats)
      });
    } catch (error) {
      console.error('Error fetching UPI sync analytics:', error);
      res.status(500).json({ error: 'Failed to fetch UPI sync analytics' });
    }
  }
}

export const upiSyncController = new UpiSyncController();