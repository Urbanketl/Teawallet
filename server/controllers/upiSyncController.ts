import { Request, Response } from 'express';
import { upiSyncService } from '../services/upiSyncService';
import { db } from '../db';
import { upiSyncLogs, dispensingLogs, teaMachines } from '@shared/schema';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import PDFDocument from 'pdfkit';
import * as path from 'path';

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

  // Get UPI transactions with optional filtering and pagination
  async getUpiTransactions(req: any, res: Response) {
    try {
      const { 
        machineId, 
        status, 
        startDate, 
        endDate, 
        limit = 50, 
        offset = 0,
        page = 1 
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
        conditions.push(gte(dispensingLogs.externalCreatedAt, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(dispensingLogs.externalCreatedAt, new Date(endDate as string)));
      }

      // Add business unit filtering for non-super admins
      if (!req.isSuperAdmin && req.accessibleBusinessUnitIds) {
        if (req.accessibleBusinessUnitIds.length === 0) {
          // User has no accessible business units, return empty result
          return res.json({
            transactions: [],
            pagination: {
              page: 1,
              limit: parseInt(limit as string),
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            }
          });
        }
        conditions.push(inArray(teaMachines.businessUnitId, req.accessibleBusinessUnitIds));
      }
      
      // Get total count for pagination with business unit filtering
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(dispensingLogs)
        .leftJoin(teaMachines, eq(dispensingLogs.machineId, teaMachines.id))
        .where(and(...conditions));
      
      const totalCount = countResult.count || 0;
      const limitNum = parseInt(limit as string);
      const pageNum = parseInt(page as string);
      const offsetNum = (pageNum - 1) * limitNum;
      const totalPages = Math.ceil(totalCount / limitNum);
      
      const transactionResults = await db
        .select({
          id: dispensingLogs.id,
          businessUnitId: dispensingLogs.businessUnitId,
          rfidCardId: dispensingLogs.rfidCardId,
          machineId: dispensingLogs.machineId,
          teaType: dispensingLogs.teaType,
          amount: dispensingLogs.amount,
          cups: dispensingLogs.cups,
          success: dispensingLogs.success,
          paymentType: dispensingLogs.paymentType,
          upiVpa: dispensingLogs.upiVpa,
          externalTransactionId: dispensingLogs.externalTransactionId,
          createdAt: dispensingLogs.createdAt,
          externalCreatedAt: dispensingLogs.externalCreatedAt,
          // Include machine name with fallback
          machineName: sql<string>`COALESCE(${teaMachines.name}, ${dispensingLogs.machineId})`
        })
        .from(dispensingLogs)
        .leftJoin(teaMachines, eq(dispensingLogs.machineId, teaMachines.id))
        .where(and(...conditions))
        .orderBy(desc(dispensingLogs.externalCreatedAt))
        .limit(limitNum)
        .offset(offsetNum);
        
      // Transform to match expected frontend structure
      const transactions = transactionResults;
      
      res.json({
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
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

  // Export UPI transactions to Excel
  async exportToExcel(req: Request, res: Response) {
    try {
      const { 
        machineId, 
        status, 
        startDate, 
        endDate 
      } = req.query;

      // Build conditions array (same as getUpiTransactions)
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

      // Get all transactions (no limit for export)
      const transactions = await db
        .select()
        .from(dispensingLogs)
        .where(and(...conditions))
        .orderBy(desc(dispensingLogs.createdAt));

      // Prepare data for CSV
      const csvData = transactions.map(transaction => ({
        'Transaction ID': transaction.id,
        'Machine ID': transaction.machineId,
        'Amount': transaction.amount,
        'Cups': transaction.cups,
        'Status': transaction.success ? 'Paid' : 'Failed',
        'UPI Payment ID': transaction.upiPaymentId || '',
        'UPI VPA': transaction.upiVpa || '',
        'External Transaction ID': transaction.externalTransactionId || '',
        'Error Message': transaction.errorMessage || '',
        'Date Created': transaction.createdAt?.toISOString().split('T')[0] || '',
        'Time Created': transaction.createdAt?.toTimeString().split(' ')[0] || ''
      }));

      // Create temporary CSV file
      const fileName = `upi-transactions-${Date.now()}.csv`;
      const filePath = path.join('/tmp', fileName);

      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'Transaction ID', title: 'Transaction ID' },
          { id: 'Machine ID', title: 'Machine ID' },
          { id: 'Amount', title: 'Amount (₹)' },
          { id: 'Cups', title: 'Cups' },
          { id: 'Status', title: 'Status' },
          { id: 'UPI Payment ID', title: 'UPI Payment ID' },
          { id: 'UPI VPA', title: 'UPI VPA' },
          { id: 'External Transaction ID', title: 'External Transaction ID' },
          { id: 'Error Message', title: 'Error Message' },
          { id: 'Date Created', title: 'Date Created' },
          { id: 'Time Created', title: 'Time Created' }
        ]
      });

      await csvWriter.writeRecords(csvData);

      // Send file
      res.download(filePath, `UPI-Transactions-${new Date().toISOString().split('T')[0]}.csv`, (err) => {
        if (err) {
          console.error('Error sending CSV file:', err);
        }
        // Clean up temporary file
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
        });
      });

    } catch (error) {
      console.error('Error exporting UPI transactions to Excel:', error);
      res.status(500).json({ error: 'Failed to export transactions to Excel' });
    }
  }

  // Export UPI transactions to PDF
  async exportToPdf(req: Request, res: Response) {
    try {
      const { 
        machineId, 
        status, 
        startDate, 
        endDate 
      } = req.query;

      // Build conditions array (same as getUpiTransactions)
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

      // Get all transactions
      const transactions = await db
        .select()
        .from(dispensingLogs)
        .where(and(...conditions))
        .orderBy(desc(dispensingLogs.createdAt));

      // Create PDF
      const doc = new PDFDocument();
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="UPI-Transactions-${new Date().toISOString().split('T')[0]}.pdf"`);
      
      doc.pipe(res);

      // Add header
      doc.fontSize(20).text('UrbanKetl - UPI Transactions Report', { align: 'center' });
      doc.moveDown();
      
      // Add date range
      const dateRange = startDate && endDate 
        ? `${startDate} to ${endDate}`
        : 'Last 30 days';
      doc.fontSize(12).text(`Period: ${dateRange}`, { align: 'center' });
      doc.moveDown();

      // Add summary
      const totalTransactions = transactions.length;
      const successfulTransactions = transactions.filter(t => t.success).length;
      const totalRevenue = transactions
        .filter(t => t.success)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      doc.text(`Total Transactions: ${totalTransactions}`);
      doc.text(`Successful Transactions: ${successfulTransactions}`);
      doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`);
      doc.moveDown();

      // Add table headers
      doc.fontSize(10);
      const tableTop = doc.y;
      const rowHeight = 20;
      
      doc.text('Transaction ID', 50, tableTop);
      doc.text('Machine ID', 150, tableTop);
      doc.text('Amount', 220, tableTop);
      doc.text('Status', 270, tableTop);
      doc.text('Date', 320, tableTop);
      doc.text('Time', 400, tableTop);

      // Add horizontal line
      doc.strokeColor('#000')
         .lineWidth(1)
         .moveTo(50, tableTop + 15)
         .lineTo(500, tableTop + 15)
         .stroke();

      // Add transaction rows
      let currentY = tableTop + 25;
      
      transactions.slice(0, 50).forEach((transaction, index) => { // Limit to 50 for PDF
        if (currentY > 700) { // New page if needed
          doc.addPage();
          currentY = 50;
        }

        doc.text(transaction.id.toString(), 50, currentY);
        doc.text(transaction.machineId || '', 150, currentY);
        doc.text(`₹${transaction.amount}`, 220, currentY);
        doc.text(transaction.success ? 'Paid' : 'Failed', 270, currentY);
        doc.text(transaction.createdAt?.toISOString().split('T')[0] || '', 320, currentY);
        doc.text(transaction.createdAt?.toTimeString().split(' ')[0] || '', 400, currentY);
        
        currentY += rowHeight;
      });

      if (transactions.length > 50) {
        doc.text(`... and ${transactions.length - 50} more transactions`, 50, currentY + 20);
      }

      doc.end();

    } catch (error) {
      console.error('Error exporting UPI transactions to PDF:', error);
      res.status(500).json({ error: 'Failed to export transactions to PDF' });
    }
  }
}

export const upiSyncController = new UpiSyncController();