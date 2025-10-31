import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { setupAuth, isAuthenticated, attachAccessControl } from "./auth";
import { initializeRazorpay, createOrder, verifyPayment } from "./razorpay";
import { storage } from "./storage";
import { insertDispensingLogSchema } from "@shared/schema";
import * as csvWriter from 'csv-writer';
import PDFDocument from 'pdfkit';

// Import route modules
import authRoutes from "./routes/authRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import supportRoutes from "./routes/supportRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import * as adminController from "./controllers/adminController";
import { requireAuth, requireAdmin } from "./controllers/authController";
import { requireAdmin as requireAdminAuth } from "./auth";
import * as transactionController from "./controllers/transactionController";
import { registerCorporateRoutes } from "./routes/corporateRoutes";
import { registerRechargeRoutes } from "./routes/rechargeRoutes";
import { monitoringController } from "./controllers/monitoringController";
import { ChallengeResponseController } from "./controllers/challengeResponseController";
import { upiSyncController } from "./controllers/upiSyncController";
import { notificationScheduler } from "./services/notificationScheduler";
import { timeoutMiddleware, TIMEOUT_CONFIGS } from "./middleware/timeoutMiddleware";
import * as desfireAuth from "./services/desfire-auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Razorpay
  try {
    initializeRazorpay();
  } catch (error) {
    console.warn("Razorpay initialization failed:", (error as Error).message);
  }
  
  // Auth middleware
  setupAuth(app);

  // Register route modules
  app.use('/api/auth', authRoutes);
  // Note: /api/transactions is now handled by corporateRoutes with business unit filtering
  app.use('/api/support', supportRoutes);
  // Add access control to analytics routes
  app.use('/api/analytics', isAuthenticated, attachAccessControl, analyticsRoutes);
  
  // Register B2B Corporate routes
  registerCorporateRoutes(app);
  
  // Register recharge history routes
  registerRechargeRoutes(app);

  // Admin user management
  app.post("/api/admin/users", isAuthenticated, requireAdminAuth, adminController.createUser);
  app.delete("/api/admin/users/:userId", isAuthenticated, requireAdminAuth, adminController.deleteUser);
  app.patch("/api/admin/users/:userId/password", isAuthenticated, requireAdminAuth, adminController.resetUserPassword);

  // Admin routes - require authentication and admin privileges
  app.get('/api/admin/users', requireAuth, requireAdmin, adminController.getAllUsers);
  app.post('/api/admin/users', requireAuth, requireAdmin, adminController.createUserAccount);
  app.delete('/api/admin/users/:userId', requireAuth, requireAdmin, adminController.deleteUserAccount);
  app.patch('/api/admin/users/:userId/admin-status', requireAuth, requireAdmin, adminController.updateUserAdminStatus);
  app.get('/api/admin/stats', requireAuth, requireAdmin, adminController.getDashboardStats);
  
  // Timeout monitoring endpoint (admin only)
  app.get('/api/admin/timeout-stats', isAuthenticated, requireAdminAuth, async (req, res) => {
    try {
      const { timeoutMonitor } = await import('./services/timeoutMonitor');
      const stats = timeoutMonitor.getStats();
      const recentEvents = timeoutMonitor.getRecentEvents(100);
      const exceededEvents = timeoutMonitor.getExceededEvents(50);
      
      res.json({
        success: true,
        stats,
        recentEvents,
        exceededEvents
      });
    } catch (error) {
      console.error('Error fetching timeout stats:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch timeout statistics' 
      });
    }
  });
  app.get('/api/admin/business-unit-balances', requireAuth, requireAdmin, adminController.getBusinessUnitBalances);
  app.get('/api/admin/rfid/cards', requireAuth, requireAdmin, attachAccessControl, async (req: any, res) => {
    try {
      const page = parseInt(req.query.page as string);
      const limit = parseInt(req.query.limit as string) || 20;
      const paginated = req.query.paginated === 'true';
      
      // New filter and sort parameters
      const search = req.query.search as string;
      const status = req.query.status as string; // all, active, inactive
      const assignment = req.query.assignment as string; // all, assigned, unassigned
      const businessUnitId = req.query.businessUnitId as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as string || 'desc';

      if (paginated && page && page > 0) {
        // Paginated response with filters
        // SECURITY: Validate businessUnitId is within user's accessible business units
        let validatedBusinessUnitId = businessUnitId;
        if (businessUnitId && !req.isSuperAdmin) {
          if (!req.accessibleBusinessUnitIds || !req.accessibleBusinessUnitIds.includes(businessUnitId)) {
            return res.status(403).json({ message: "Access denied to this business unit" });
          }
        }
        // For non-super admins, if no specific businessUnitId is requested, limit to their accessible business units
        if (!req.isSuperAdmin && !validatedBusinessUnitId) {
          // We'll need to modify the storage call to handle multiple business unit filtering
          validatedBusinessUnitId = undefined as any; // Will be handled in the storage layer filtering
        }

        const result = await storage.getAllRfidCardsPaginatedWithFilters({
          page,
          limit,
          search,
          status,
          assignment,
          businessUnitId: validatedBusinessUnitId,
          sortBy,
          sortOrder,
          accessibleBusinessUnitIds: req.isSuperAdmin ? undefined : req.accessibleBusinessUnitIds
        });
        res.json(result);
      } else {
        // Legacy non-paginated response
        const cards = await storage.getAllRfidCards();
        res.json(cards);
      }
    } catch (error) {
      console.error('Error fetching RFID cards:', error);
      res.status(500).json({ message: 'Failed to fetch RFID cards' });
    }
  });
  app.post('/api/admin/rfid/cards', requireAuth, requireAdmin, adminController.createRfidCard);
  app.delete('/api/admin/rfid/cards/:cardId', requireAuth, requireAdmin, adminController.deleteRfidCard);
  app.get('/api/admin/rfid/suggest-card-number', requireAuth, requireAdmin, adminController.getSuggestedCardNumber);
  
  // NEW: Single RFID Card Creation (Platform Admin Only)
  app.post('/api/admin/rfid/cards/create', requireAuth, requireAdmin, adminController.createRfidCard);
  app.post('/api/admin/rfid/cards/assign', requireAuth, requireAdmin, adminController.assignRfidCard);
  app.get('/api/admin/business-units', requireAuth, requireAdmin, attachAccessControl, adminController.getBusinessUnits);
  
  // Admin support routes
  app.get('/api/admin/support/tickets', requireAuth, requireAdmin, adminController.getSupportTicketsPaginated);

  // Admin support ticket history
  app.get('/api/admin/support/tickets/:ticketId/history', requireAuth, requireAdmin, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      console.log('Fetching history for ticket:', ticketId);
      const history = await storage.getTicketStatusHistory(ticketId);
      console.log('History result:', history);
      res.json(history);
    } catch (error) {
      console.error('Error fetching ticket history:', error);
      res.status(500).json({ message: 'Failed to fetch ticket history' });
    }
  });

  // Admin update support ticket
  app.patch('/api/admin/support/tickets/:ticketId', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const { status, assignedTo, comment } = req.body;
      const userId = req.user.id;
      
      const updatedTicket = await storage.updateSupportTicket(ticketId, {
        status,
        assignedTo,
        comment,
        updatedBy: userId
      });
      
      res.json(updatedTicket);
    } catch (error) {
      console.error('Error updating support ticket:', error);
      res.status(500).json({ message: 'Failed to update support ticket' });
    }
  });

  // Admin FAQ management routes
  app.post('/api/admin/faq', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { question, answer, category } = req.body;
      const newFaq = await storage.createFaqArticle({
        question,
        answer,
        category: category || 'general'
      });
      res.json(newFaq);
    } catch (error) {
      console.error('Error creating FAQ:', error);
      res.status(500).json({ message: 'Failed to create FAQ article' });
    }
  });

  app.patch('/api/admin/faq/:articleId', requireAuth, requireAdmin, async (req, res) => {
    try {
      const articleId = parseInt(req.params.articleId);
      const { question, answer, category } = req.body;
      const updatedFaq = await storage.updateFaqArticle(articleId, {
        question,
        answer,
        category
      });
      res.json(updatedFaq);
    } catch (error) {
      console.error('Error updating FAQ:', error);
      res.status(500).json({ message: 'Failed to update FAQ article' });
    }
  });

  app.delete('/api/admin/faq/:articleId', requireAuth, requireAdmin, async (req, res) => {
    try {
      const articleId = parseInt(req.params.articleId);
      await storage.deleteFaqArticle(articleId);
      res.json({ message: 'FAQ article deleted successfully' });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      res.status(500).json({ message: 'Failed to delete FAQ article' });
    }
  });

  // System Settings Routes
  app.get('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({ message: 'Failed to fetch system settings' });
    }
  });

  app.patch('/api/admin/settings', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { key, value } = req.body;
      const userId = req.user.id;
      
      if (!key || !value) {
        return res.status(400).json({ message: 'Key and value are required' });
      }

      await storage.updateSystemSetting(key, value, userId || 'admin');
      res.json({ message: 'System setting updated successfully' });
    } catch (error) {
      console.error('Error updating system setting:', error);
      res.status(500).json({ message: 'Failed to update system setting' });
    }
  });

  // Manual Balance Alert Testing Route
  app.post('/api/admin/test-balance-alert', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { businessUnitId, alertType } = req.body;
      
      if (!businessUnitId || !alertType) {
        return res.status(400).json({ message: 'businessUnitId and alertType are required' });
      }

      if (alertType !== 'critical' && alertType !== 'low') {
        return res.status(400).json({ message: 'alertType must be either "critical" or "low"' });
      }

      const result = await notificationScheduler.manualTriggerBalanceAlert(businessUnitId, alertType);
      
      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(500).json({ message: result.message, error: result.error });
      }
    } catch (error) {
      console.error('Error testing balance alert:', error);
      res.status(500).json({ message: 'Failed to send test alert' });
    }
  });

  // Admin report generation routes
  // New route for multiple business units summary
  app.get('/api/admin/business-units/summary', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { businessUnitIds, month, startDate, endDate } = req.query;
      
      if (!businessUnitIds) {
        return res.status(400).json({ error: "businessUnitIds parameter is required" });
      }
      
      const unitIds = (businessUnitIds as string).split(',').filter(id => id);
      
      if (unitIds.length === 0) {
        return res.status(400).json({ error: "At least one business unit ID is required" });
      }
      
      let summary;
      if (unitIds.length === 1) {
        // Single business unit
        if (month) {
          summary = await storage.getMonthlyTransactionSummary(unitIds[0], month as string);
        } else if (startDate && endDate) {
          const start = new Date(startDate as string);
          const end = new Date(endDate as string);
          summary = await storage.getTransactionSummaryByDateRange(unitIds[0], start, end);
        } else {
          return res.status(400).json({ error: "Either month or both startDate and endDate are required" });
        }
      } else {
        // Multiple business units - aggregate data
        if (month) {
          summary = await storage.getMultipleBusinessUnitsSummary(unitIds, month as string);
        } else if (startDate && endDate) {
          const start = new Date(startDate as string);
          const end = new Date(endDate as string);
          summary = await storage.getMultipleBusinessUnitsSummaryByDateRange(unitIds, start, end);
        } else {
          return res.status(400).json({ error: "Either month or both startDate and endDate are required" });
        }
      }
      
      res.json(summary);
    } catch (error) {
      console.error('Error getting business units summary:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Keep existing route for backward compatibility
  app.get('/api/admin/business-units/:businessUnitId/summary', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { businessUnitId } = req.params;
      const { month, startDate, endDate } = req.query;

      let summary;
      if (month) {
        // Single month mode (backward compatibility)
        summary = await storage.getMonthlyTransactionSummary(businessUnitId, month as string);
      } else if (startDate && endDate) {
        // Date range mode
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        summary = await storage.getTransactionSummaryByDateRange(businessUnitId, start, end);
      } else {
        return res.status(400).json({ error: "Either month or both startDate and endDate are required" });
      }

      res.json(summary);
    } catch (error) {
      console.error('Error getting business unit summary:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Admin CSV export for multiple business units
  app.get('/api/admin/business-units/export', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { businessUnitIds, month, startDate, endDate } = req.query;
      
      if (!businessUnitIds) {
        return res.status(400).json({ error: "businessUnitIds parameter is required" });
      }
      
      const unitIds = (businessUnitIds as string).split(',').filter(id => id);
      
      if (unitIds.length === 0) {
        return res.status(400).json({ error: "At least one business unit ID is required" });
      }
      
      // Get business unit names for filename
      const businessUnits = await Promise.all(unitIds.map(id => storage.getBusinessUnit(id)));
      const validUnits = businessUnits.filter(unit => unit !== undefined);
      
      if (validUnits.length === 0) {
        return res.status(404).json({ error: "No valid business units found" });
      }
      
      let transactions, periodStr, periodDisplay;
      
      if (month) {
        // Single month mode
        if (unitIds.length === 1) {
          transactions = await storage.getMonthlyTransactions(unitIds[0], month as string);
        } else {
          transactions = await storage.getMultipleBusinessUnitsTransactions(unitIds, month as string);
        }
        periodStr = month as string;
        const [year, monthNum] = (month as string).split('-');
        periodDisplay = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else if (startDate && endDate) {
        // Date range mode
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        if (unitIds.length === 1) {
          transactions = await storage.getTransactionsByDateRange(unitIds[0], start, end);
        } else {
          transactions = await storage.getMultipleBusinessUnitsTransactionsByDateRange(unitIds, start, end);
        }
        periodStr = `${startDate}_to_${endDate}`;
        periodDisplay = `${start.toLocaleDateString('en-IN')} to ${end.toLocaleDateString('en-IN')}`;
      } else {
        return res.status(400).json({ error: "Either month or both startDate and endDate are required" });
      }
      
      // Create filename
      const businessUnitName = unitIds.length === 1 ? validUnits[0]?.name : 'Multiple_Units';
      
      // Create CSV string using simple concatenation
      let csvString = 'Date,Business Unit,Card Number,Machine Name,Machine Location,Amount,Status\n';
      
      transactions.forEach((t: any) => {
        const date = new Date(t.createdAt).toLocaleString('en-IN');
        const businessUnit = validUnits.find(u => u?.id === t.businessUnitId)?.name || t.businessUnitId;
        const cardNumber = t.cardNumber || 'N/A';
        const machineName = t.machineName || 'N/A';
        const machineLocation = t.machineLocation || 'N/A';
        const amount = t.amount || '0';
        const status = t.success ? 'Success' : 'Failed';
        
        // Escape values that might contain commas
        const escapeCsv = (val: string) => val.includes(',') ? `"${val}"` : val;
        
        csvString += `${escapeCsv(date)},${escapeCsv(businessUnit)},${escapeCsv(cardNumber)},${escapeCsv(machineName)},${escapeCsv(machineLocation)},₹${amount},${status}\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${businessUnitName}-transactions-${periodStr}.csv"`);
      res.send(csvString);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });
  
  // Keep existing route for backward compatibility
  app.get('/api/admin/business-units/:businessUnitId/export', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { businessUnitId } = req.params;
      const { month, startDate, endDate } = req.query;

      const businessUnit = await storage.getBusinessUnit(businessUnitId);
      if (!businessUnit) {
        return res.status(404).json({ error: "Business unit not found" });
      }

      let transactions;
      let periodStr;
      
      if (month) {
        // Single month mode
        transactions = await storage.getMonthlyTransactions(businessUnitId, month as string);
        periodStr = month as string;
      } else if (startDate && endDate) {
        // Date range mode
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        transactions = await storage.getTransactionsByDateRange(businessUnitId, start, end);
        periodStr = `${startDate}_to_${endDate}`;
      } else {
        return res.status(400).json({ error: "Either month or both startDate and endDate are required" });
      }

      // Create CSV header
      const csvHeader = ['Date', 'Time', 'Card Number', 'Machine Name', 'Location', 'Tea Type', 'Amount (₹)', 'Status', 'Error'].join(',');
      
      // Create CSV rows
      const csvRows = transactions.map((t: any) => {
        const row = [
          new Date(t.createdAt).toLocaleDateString('en-IN'),
          new Date(t.createdAt).toLocaleTimeString('en-IN'),
          t.cardNumber || t.rfidCardId || '',
          t.machineName || t.machineId || '',
          t.machineLocation || '',
          t.teaType || 'Regular Tea',
          t.amount || 0,
          t.success ? 'Success' : 'Failed',
          t.errorMessage || ''
        ];
        return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
      });

      const csvString = [csvHeader, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${businessUnit.name}-transactions-${periodStr}.csv"`);
      res.send(csvString);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  // Admin PDF invoice for multiple business units
  app.get('/api/admin/business-units/invoice', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { businessUnitIds, month, startDate, endDate } = req.query;
      
      if (!businessUnitIds) {
        return res.status(400).json({ error: "businessUnitIds parameter is required" });
      }
      
      const unitIds = (businessUnitIds as string).split(',').filter(id => id);
      
      if (unitIds.length === 0) {
        return res.status(400).json({ error: "At least one business unit ID is required" });
      }
      
      // Get business unit details
      const businessUnits = await Promise.all(unitIds.map(id => storage.getBusinessUnit(id)));
      const validUnits = businessUnits.filter(unit => unit !== undefined);
      
      if (validUnits.length === 0) {
        return res.status(404).json({ error: "No valid business units found" });
      }
      
      let summary, transactions, periodStr, periodDisplay;
      
      if (month) {
        // Single month mode
        if (unitIds.length === 1) {
          summary = await storage.getMonthlyTransactionSummary(unitIds[0], month as string);
          transactions = await storage.getMonthlyTransactions(unitIds[0], month as string);
        } else {
          summary = await storage.getMultipleBusinessUnitsSummary(unitIds, month as string);
          transactions = await storage.getMultipleBusinessUnitsTransactions(unitIds, month as string);
        }
        periodStr = month as string;
        const [year, monthNum] = (month as string).split('-');
        periodDisplay = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else if (startDate && endDate) {
        // Date range mode
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        if (unitIds.length === 1) {
          summary = await storage.getTransactionSummaryByDateRange(unitIds[0], start, end);
          transactions = await storage.getTransactionsByDateRange(unitIds[0], start, end);
        } else {
          summary = await storage.getMultipleBusinessUnitsSummaryByDateRange(unitIds, start, end);
          transactions = await storage.getMultipleBusinessUnitsTransactionsByDateRange(unitIds, start, end);
        }
        periodStr = `${startDate}_to_${endDate}`;
        periodDisplay = `${start.toLocaleDateString('en-IN')} to ${end.toLocaleDateString('en-IN')}`;
      } else {
        return res.status(400).json({ error: "Either month or both startDate and endDate are required" });
      }

      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      const businessUnitName = unitIds.length === 1 ? validUnits[0]?.name : 'Multiple Business Units';
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${businessUnitName}-invoice-${periodStr}.pdf"`);
      doc.pipe(res);

      // Header
      doc.fontSize(20).text('UrbanKetl Invoice', { align: 'center' });
      doc.moveDown();
      
      // Business Unit Info
      doc.fontSize(14).text('Invoice Details', { underline: true });
      doc.fontSize(12);
      doc.text(`Business Unit${unitIds.length > 1 ? 's' : ''}: ${validUnits.map(u => u?.name).join(', ')}`);
      doc.text(`Period: ${periodDisplay}`);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`);
      doc.moveDown();

      // Summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(12);
      doc.text(`Total Cups Dispensed: ${summary.totalTransactions}`);
      doc.text(`Total Amount: ₹${parseFloat(summary.totalAmount).toFixed(2)}`);
      doc.text(`Unique Machines Used: ${summary.uniqueMachines}`);
      doc.text(`Unique Cards Used: ${summary.uniqueCards}`);
      doc.moveDown();

      // Machine breakdown
      doc.fontSize(14).text('Machine Usage Summary', { underline: true });
      doc.moveDown(0.5);

      // Group transactions by business unit and machine
      const unitMachineGroups = transactions.reduce((acc: any, t: any) => {
        const unitKey = t.businessUnitId;
        if (!acc[unitKey]) {
          const unit = validUnits.find(u => u?.id === unitKey);
          acc[unitKey] = {
            unitName: unit?.name || unitKey,
            machines: {}
          };
        }
        
        const machineKey = t.machineId;
        if (!acc[unitKey].machines[machineKey]) {
          acc[unitKey].machines[machineKey] = {
            machineName: t.machineName || t.machineId,
            location: t.machineLocation || 'N/A',
            transactions: [],
            totalAmount: 0,
            cupCount: 0
          };
        }
        
        acc[unitKey].machines[machineKey].transactions.push(t);
        acc[unitKey].machines[machineKey].totalAmount += t.amount || 0;
        acc[unitKey].machines[machineKey].cupCount += 1;
        
        return acc;
      }, {});

      // Display by business unit
      doc.fontSize(10);
      Object.values(unitMachineGroups).forEach((unit: any) => {
        if (unitIds.length > 1) {
          doc.fontSize(12).text(`${unit.unitName}:`, { underline: true });
          doc.moveDown(0.5);
        }
        
        Object.values(unit.machines).forEach((machine: any) => {
          doc.fontSize(10);
          doc.text(`${machine.machineName} (${machine.location})`);
          doc.text(`  - Cups: ${machine.cupCount}, Amount: ₹${machine.totalAmount.toFixed(2)}`);
          doc.moveDown(0.5);
        });
        
        if (unitIds.length > 1) {
          doc.moveDown();
        }
      });

      // Footer
      doc.y = doc.page.height - 100;
      doc.fontSize(10).fillColor('gray');
      doc.text('This is a computer generated invoice.', { align: 'center' });
      doc.text('For queries, contact support@urbanketl.com', { align: 'center' });

      doc.end();
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });
  
  // Keep existing route for backward compatibility
  app.get('/api/admin/business-units/:businessUnitId/invoice', requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { businessUnitId } = req.params;
      const { month, startDate, endDate } = req.query;

      const businessUnit = await storage.getBusinessUnit(businessUnitId);
      if (!businessUnit) {
        return res.status(404).json({ error: "Business unit not found" });
      }

      let summary, transactions, periodStr, periodDisplay;
      
      if (month) {
        // Single month mode
        summary = await storage.getMonthlyTransactionSummary(businessUnitId, month as string);
        transactions = await storage.getMonthlyTransactions(businessUnitId, month as string);
        periodStr = month as string;
        const [year, monthNum] = (month as string).split('-');
        periodDisplay = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else if (startDate && endDate) {
        // Date range mode
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        summary = await storage.getTransactionSummaryByDateRange(businessUnitId, start, end);
        transactions = await storage.getTransactionsByDateRange(businessUnitId, start, end);
        periodStr = `${startDate}_to_${endDate}`;
        periodDisplay = `${start.toLocaleDateString('en-IN')} to ${end.toLocaleDateString('en-IN')}`;
      } else {
        return res.status(400).json({ error: "Either month or both startDate and endDate are required" });
      }

      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${businessUnit.name}-invoice-${periodStr}.pdf"`);
      doc.pipe(res);

      // Header
      doc.fontSize(20).text('UrbanKetl Tea Service Invoice', { align: 'center' });
      doc.moveDown();

      // Invoice details
      doc.fontSize(14);
      doc.text(`Invoice for: ${businessUnit.name}`, { align: 'left' });
      doc.text(`Business Unit Code: ${businessUnit.code}`);
      doc.text(`Period: ${periodDisplay}`);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`);
      doc.moveDown();

      // Summary box
      doc.rect(50, doc.y, doc.page.width - 100, 100).stroke();
      const summaryY = doc.y;
      doc.y += 10;
      doc.x = 60;
      
      doc.fontSize(12);
      doc.text(`Total Cups Dispensed: ${summary.totalTransactions || 0}`);
      doc.text(`Total Amount: ₹${parseFloat(summary.totalAmount || '0').toFixed(2)}`);
      doc.text(`Number of Transactions: ${summary.totalTransactions || 0}`);
      doc.text(`Active Machines: ${summary.uniqueMachines || 0}`);
      
      doc.x = 50;
      doc.y = summaryY + 110;

      // Transaction details header
      doc.moveDown();
      doc.fontSize(16).text('Transaction Summary by Machine', { underline: true });
      doc.moveDown();

      // Group transactions by machine
      const machineGroups = transactions.reduce((acc: any, t: any) => {
        const machineKey = t.machineName || t.machineId;
        if (!acc[machineKey]) {
          acc[machineKey] = {
            machineName: t.machineName || t.machineId,
            location: t.machineLocation || 'N/A',
            transactions: [],
            totalAmount: 0,
            cupCount: 0
          };
        }
        acc[machineKey].transactions.push(t);
        acc[machineKey].totalAmount += t.amount || 0;
        acc[machineKey].cupCount += 1;
        return acc;
      }, {});

      // Display machine summaries
      doc.fontSize(10);
      Object.values(machineGroups).forEach((machine: any) => {
        doc.text(`${machine.machineName} (${machine.location})`);
        doc.text(`  - Cups: ${machine.cupCount}, Amount: ₹${machine.totalAmount.toFixed(2)}`);
        doc.moveDown(0.5);
      });

      // Footer
      doc.y = doc.page.height - 100;
      doc.fontSize(10).fillColor('gray');
      doc.text('This is a computer generated invoice.', { align: 'center' });
      doc.text('For queries, contact support@urbanketl.com', { align: 'center' });

      doc.end();
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });

  // Authentication user route
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profileData = req.body;
      
      // Update user profile
      await storage.updateUserProfile(userId, profileData);
      
      // Get updated user data
      const updatedUser = await storage.getUser(userId);
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Wallet routes - supports both legacy user wallet and business unit wallet operations
  app.post('/api/wallet/create-order', isAuthenticated, transactionController.createPaymentOrder);
  app.post('/api/wallet/create-payment-link', isAuthenticated, transactionController.createPaymentLinkForWallet);

  app.post('/api/wallet/verify-payment', isAuthenticated, transactionController.verifyPaymentAndAddFunds);
  // Payment link verification doesn't require auth - signature verification provides security
  app.post('/api/wallet/verify-payment-link', transactionController.verifyPaymentLinkAndAddFunds);
  
  // Razorpay payment callback handler (receives GET from Razorpay Payment Link)
  // Note: This route must be different from frontend route to avoid conflicts
  app.get('/api/razorpay-callback', async (req, res) => {
    try {
      console.log('=== RAZORPAY PAYMENT LINK CALLBACK RECEIVED ===');
      console.log('Query params:', req.query);
      
      const { razorpay_payment_id, razorpay_payment_link_id, razorpay_payment_link_reference_id, razorpay_payment_link_status, razorpay_signature } = req.query;
      
      // Redirect to frontend route with query params - Vite SPA will handle it
      const queryString = new URLSearchParams(req.query as any).toString();
      res.redirect(`/wallet/payment-callback?${queryString}`);
    } catch (error) {
      console.error('Payment callback error:', error);
      res.redirect('/wallet?payment_error=true');
    }
  });
  
  // Test payment endpoint (dev mode - bypasses Razorpay)
  app.post('/api/wallet/test-payment', isAuthenticated, transactionController.testPayment);

  // Legacy recharge endpoint - use /api/wallet/create-order instead
  app.post('/api/wallet/recharge', isAuthenticated, async (req: any, res) => {
    res.status(400).json({ 
      message: "Use /api/wallet/create-order and /api/wallet/verify-payment instead" 
    });
  });

  // Legacy balance endpoint - use /api/corporate/business-units instead
  app.get('/api/wallet/balance', isAuthenticated, async (req: any, res) => {
    res.status(400).json({ 
      message: "Use /api/corporate/business-units to get business unit wallet balances" 
    });
  });

  // Transaction routes are now handled in corporateRoutes.ts with enhanced business unit filtering

  // RFID routes
  app.get('/api/rfid/card', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const card = await storage.getRfidCardByUserId(userId);
      
      if (!card) {
        return res.status(404).json({ message: "No RFID card found" });
      }

      res.json(card);
    } catch (error) {
      console.error("Error fetching RFID card:", error);
      res.status(500).json({ message: "Failed to fetch RFID card" });
    }
  });

  app.get('/api/rfid/cards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const cards = await storage.getAllRfidCardsByUserId(userId);
      res.json(cards);
    } catch (error) {
      console.error("Error fetching RFID cards:", error);
      res.status(500).json({ message: "Failed to fetch RFID cards" });
    }
  });

  app.put('/api/rfid/card/:cardId/deactivate', isAuthenticated, async (req: any, res) => {
    try {
      const { cardId } = req.params;
      const userId = req.user.id;
      
      // Get all user cards and verify this card belongs to them
      const userCards = await storage.getAllRfidCardsByUserId(userId);
      const cardToDeactivate = userCards.find(card => card.id === parseInt(cardId));
      
      if (!cardToDeactivate) {
        return res.status(403).json({ message: "Unauthorized to modify this card" });
      }

      await storage.deactivateRfidCard(parseInt(cardId));
      res.json({ success: true, message: "Card deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating RFID card:", error);
      res.status(500).json({ message: "Failed to deactivate RFID card" });
    }
  });

  app.post('/api/rfid/assign', isAuthenticated, async (req: any, res) => {
    try {
      const { cardNumber } = req.body;
      const userId = req.user.id;

      if (!cardNumber) {
        return res.status(400).json({ message: "Card number is required" });
      }

      // Check if card already exists
      const existingCard = await storage.getRfidCardByNumber(cardNumber);
      if (existingCard) {
        return res.status(400).json({ message: "Card already assigned" });
      }

      // Get user's first business unit to assign card
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      if (userBusinessUnits.length === 0) {
        return res.status(400).json({ message: "No business units assigned to user" });
      }
      
      // Create new RFID card
      const newCard = await storage.createRfidCard({
        businessUnitId: userBusinessUnits[0].id,
        cardNumber,
        isActive: true,
      });

      res.json(newCard);
    } catch (error) {
      console.error("Error assigning RFID card:", error);
      res.status(500).json({ message: "Failed to assign RFID card" });
    }
  });

  // Get tea price for a specific machine
  app.get('/api/machines/:machineId/tea-price', async (req, res) => {
    try {
      const { machineId } = req.params;
      const machine = await storage.getTeaMachine(machineId);
      
      if (!machine) {
        return res.status(404).json({ 
          success: false, 
          message: "Machine not found" 
        });
      }

      // Get the price from machine's single price field (simplified pricing system)
      const price = machine.price || "5.00";

      res.json({ 
        success: true, 
        machineId: machine.id,
        teaType: "Regular Tea",
        price: price,
        location: machine.location
      });
    } catch (error) {
      console.error("Error fetching tea price:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch tea price" 
      });
    }
  });

  // ==============================================================================
  // DESFIRE AES MUTUAL AUTHENTICATION ENDPOINTS (for Raspberry Pi machines)
  // ==============================================================================

  /**
   * Step 1: Start DESFire Authentication
   * 
   * Pi calls this to initiate authentication with a card.
   * Returns the APDU command to send to the card.
   * 
   * Request: { cardId: "04:12:34:56:78:90:AB", keyNumber: 0, machineId: 123 }
   * Response: { sessionId: "abc123", apduCommand: "90AA00000100" }
   */
  app.post('/api/rfid/auth/start', timeoutMiddleware(TIMEOUT_CONFIGS.RFID), async (req, res) => {
    try {
      const { cardId, keyNumber = 0, machineId } = req.body;

      if (!cardId) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing cardId parameter" 
        });
      }

      // Get RFID card from database
      const card = await storage.getRfidCardByNumber(cardId);
      if (!card) {
        return res.status(404).json({ 
          success: false, 
          error: "Card not found" 
        });
      }

      // Get AES key for the card (stored encrypted in database)
      if (!card.aesKeyEncrypted) {
        return res.status(400).json({ 
          success: false, 
          error: "Card has no AES key configured" 
        });
      }

      // TODO: Decrypt the AES key (currently stored encrypted)
      // For now, assuming aesKeyEncrypted contains the hex key directly
      // In production, implement proper decryption using a master key
      const aesKeyBuffer = Buffer.from(card.aesKeyEncrypted.replace(/:/g, ''), 'hex');
      
      if (aesKeyBuffer.length !== 16) {
        return res.status(500).json({ 
          success: false, 
          error: "Invalid AES key length" 
        });
      }

      // Start authentication
      const result = await desfireAuth.startAuthentication(
        { cardId, keyNumber, machineId },
        aesKeyBuffer
      );

      if (!result.success) {
        return res.status(500).json({ 
          success: false, 
          error: result.error 
        });
      }

      res.json({
        success: true,
        sessionId: result.sessionId,
        apduCommand: result.apduCommand,
      });

    } catch (error) {
      console.error("Error starting DESFire auth:", error);
      res.status(500).json({ 
        success: false, 
        error: "Internal server error" 
      });
    }
  });

  /**
   * Step 2: Process Card Response (Enc(RndB))
   * 
   * Pi sends the card's encrypted RndB response.
   * Backend decrypts, generates challenge, returns next APDU command.
   * 
   * Request: { sessionId: "abc123", cardResponse: "8734...FE11" }
   * Response: { apduCommand: "90AF000020..." }
   */
  app.post('/api/rfid/auth/step2', timeoutMiddleware(TIMEOUT_CONFIGS.RFID), async (req, res) => {
    try {
      const { sessionId, cardResponse } = req.body;

      if (!sessionId || !cardResponse) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing sessionId or cardResponse" 
        });
      }

      const result = await desfireAuth.processStep2({ sessionId, cardResponse });

      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: result.error 
        });
      }

      res.json({
        success: true,
        apduCommand: result.apduCommand,
      });

    } catch (error) {
      console.error("Error processing DESFire step 2:", error);
      res.status(500).json({ 
        success: false, 
        error: "Internal server error" 
      });
    }
  });

  /**
   * Step 3: Verify Final Response
   * 
   * Pi sends the card's final response (Enc(Rot(RndA))).
   * Backend verifies and returns authentication result + session key.
   * 
   * Request: { sessionId: "abc123", cardResponse: "72A1C40D..." }
   * Response: { authenticated: true, sessionKey: "...", cardId: "..." }
   */
  app.post('/api/rfid/auth/verify', timeoutMiddleware(TIMEOUT_CONFIGS.RFID), async (req, res) => {
    try {
      const { sessionId, cardResponse } = req.body;

      if (!sessionId || !cardResponse) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing sessionId or cardResponse" 
        });
      }

      const result = await desfireAuth.verifyFinal({ sessionId, cardResponse });

      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          authenticated: false,
          error: result.error 
        });
      }

      // Log successful authentication
      if (result.authenticated) {
        console.log(`[DESFire Auth] Card ${result.cardId} authenticated successfully`);
      } else {
        console.warn(`[DESFire Auth] Card authentication failed: ${result.error}`);
      }

      res.json({
        success: true,
        authenticated: result.authenticated,
        sessionKey: result.sessionKey,
        cardId: result.cardId,
        error: result.error,
      });

    } catch (error) {
      console.error("Error verifying DESFire auth:", error);
      res.status(500).json({ 
        success: false, 
        authenticated: false,
        error: "Internal server error" 
      });
    }
  });

  // ==============================================================================
  // LEGACY RFID ENDPOINTS (kept for backward compatibility)
  // ==============================================================================

  // RFID validation endpoint for tea machines (VALIDATION ONLY - NO DISPENSING)
  app.post('/api/rfid/validate', timeoutMiddleware(TIMEOUT_CONFIGS.RFID), async (req, res) => {
    try {
      const { cardNumber, machineId } = req.body;

      if (!cardNumber || !machineId) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required parameters" 
        });
      }

      // Get machine details to validate and get price
      const machine = await storage.getTeaMachine(machineId);
      if (!machine) {
        return res.status(404).json({ 
          success: false, 
          message: "Machine not found" 
        });
      }

      // CRITICAL: Check if machine is active/enabled
      if (!machine.isActive) {
        return res.status(400).json({ 
          success: false, 
          message: "Machine is disabled" 
        });
      }

      // Get price from machine's single price field (simplified pricing system)
      const teaAmount = parseFloat(machine.price || "5.00");

      // Get RFID card
      const card = await storage.getRfidCardByNumber(cardNumber);
      if (!card) {
        return res.status(404).json({ 
          success: false, 
          message: "Invalid RFID card" 
        });
      }

      // CRITICAL: Validate business unit ownership BEFORE checking balance
      // This ensures proper "Invalid card" error instead of "Insufficient balance"
      if (card.businessUnitId !== machine.businessUnitId) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid card for this machine" 
        });
      }

      // Get business unit and check balance (cards belong to business units)
      const businessUnit = await storage.getBusinessUnit(card.businessUnitId);
      if (!businessUnit) {
        return res.status(404).json({ 
          success: false, 
          message: "Business unit not found" 
        });
      }

      const balance = parseFloat(businessUnit.walletBalance || "0");

      // Check if sufficient balance (validation only - no deduction)
      if (balance < teaAmount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance"
        });
      }

      // VALIDATION SUCCESS - Return card/machine info (NO DISPENSING OR BALANCE DEDUCTION)
      res.json({
        success: true,
        valid: true,
        message: "Card validation successful",
        cardNumber: card.cardNumber,
        businessUnitId: businessUnit.id,
        businessUnitName: businessUnit.name,
        currentBalance: balance,
        teaAmount: teaAmount,
        machineId: machine.id,
        machineName: machine.name,
        machineLocation: machine.location
      });

    } catch (error) {
      console.error("Error validating RFID:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  });

  // RFID dispensing endpoint for tea machines (ACTUAL DISPENSING WITH BALANCE DEDUCTION)
  app.post('/api/rfid/dispense', timeoutMiddleware(TIMEOUT_CONFIGS.RFID), async (req, res) => {
    try {
      const { cardNumber, machineId } = req.body;

      if (!cardNumber || !machineId) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required parameters" 
        });
      }

      // Get machine details to validate and get price
      const machine = await storage.getTeaMachine(machineId);
      if (!machine || !machine.isActive) {
        return res.status(400).json({ 
          success: false, 
          message: "Machine not found or disabled" 
        });
      }

      // Get price from machine's single price field (simplified pricing system)
      const teaAmount = parseFloat(machine.price || "5.00");

      // Get RFID card
      const card = await storage.getRfidCardByNumber(cardNumber);
      if (!card) {
        return res.status(404).json({ 
          success: false, 
          message: "Invalid RFID card" 
        });
      }

      // CRITICAL: Validate business unit ownership BEFORE checking balance
      if (card.businessUnitId !== machine.businessUnitId) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid card for this machine" 
        });
      }

      // Get business unit and check balance (cards belong to business units)
      const businessUnit = await storage.getBusinessUnit(card.businessUnitId);
      if (!businessUnit) {
        return res.status(404).json({ 
          success: false, 
          message: "Business unit not found" 
        });
      }

      // CRITICAL: Use atomic transaction for billing accuracy (ACTUAL DISPENSING)
      const result = await storage.processRfidTransaction({
        businessUnitId: businessUnit.id,
        cardId: card.id,
        machineId,
        teaType: "Regular Tea", // Always use "Regular Tea" as the tea type
        amount: teaAmount.toString()
      });

      if (result.success) {
        res.json({
          success: true,
          message: "Tea dispensed successfully", 
          remainingBalance: result.remainingBalance
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error("Error dispensing tea:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  });

  // Dispensing history
  app.get('/api/dispensing/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const businessUnitId = req.query.businessUnitId as string;
      
      if (businessUnitId) {
        // Get dispensing logs for specific business unit
        const history = await storage.getBusinessUnitDispensingLogs(businessUnitId, limit);
        res.json(history);
      } else {
        // Get all dispensing logs for user's business units
        const logs = await storage.getUserDispensingLogs(userId, limit);
        res.json(logs);
      }
    } catch (error) {
      console.error("Error fetching dispensing history:", error);
      res.status(500).json({ message: "Failed to fetch dispensing history" });
    }
  });

  // Dashboard stats with business unit filtering
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnitId = req.query.businessUnitId as string;
      
      let stats;
      if (businessUnitId) {
        // Get stats for specific business unit
        stats = await storage.getBusinessUnitDashboardStats(businessUnitId);
      } else {
        // Get aggregated stats for all user's business units
        stats = await storage.getUserDashboardStats(userId);
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Admin routes

  app.get('/api/admin/machines', isAuthenticated, attachAccessControl, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      let machines: any[];
      if (req.isSuperAdmin) {
        // Super admins see all machines
        machines = await storage.getAllTeaMachines();
      } else {
        // Business unit admins only see machines from their assigned business units
        if (req.accessibleBusinessUnitIds && req.accessibleBusinessUnitIds.length > 0) {
          const allMachines = await storage.getAllTeaMachines();
          machines = allMachines.filter(machine => 
            machine.businessUnitId && req.accessibleBusinessUnitIds.includes(machine.businessUnitId)
          );
        } else {
          machines = []; // No accessible business units
        }
      }

      res.json(machines);
    } catch (error) {
      console.error("Error fetching machines:", error);
      res.status(500).json({ message: "Failed to fetch machines" });
    }
  });

  // Get next available machine ID (Admin only)
  app.get('/api/admin/machines/next-id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const nextId = await storage.generateNextMachineId();
      res.json({ nextId });
    } catch (error: any) {
      console.error('Error generating machine ID:', error);
      res.status(500).json({ message: error.message || "Failed to generate machine ID" });
    }
  });

  // Create new machine (Admin only)
  app.post('/api/admin/machines', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { name, location, businessUnitId, isActive = true } = req.body;

      if (!name || !location) {
        return res.status(400).json({ message: "Name and location are required" });
      }

      // Verify business unit exists if provided
      if (businessUnitId) {
        const businessUnit = await storage.getBusinessUnit(businessUnitId);
        if (!businessUnit) {
          return res.status(400).json({ message: "Business unit not found" });
        }
      }

      const machineData = {
        id: `MACHINE_${Date.now().toString(36)}_${Math.random().toString(36).substring(2)}`,
        name,
        location,
        businessUnitId,
        isActive,
        lastPing: null
      };

      const newMachine = await storage.createTeaMachine(machineData);
      res.json(newMachine);
    } catch (error) {
      console.error("Error creating machine:", error);
      res.status(500).json({ message: "Failed to create machine" });
    }
  });

  // Update machine details (Admin only)
  app.patch('/api/admin/machines/:machineId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { machineId } = req.params;
      const { name, location, isActive } = req.body;

      if (!name || !location) {
        return res.status(400).json({ message: "Machine name and location are required" });
      }

      const updatedMachine = await storage.updateMachine(machineId, {
        name,
        location,
        isActive
      });

      if (!updatedMachine) {
        return res.status(404).json({ message: "Machine not found" });
      }

      res.json(updatedMachine);
    } catch (error) {
      console.error("Error updating machine:", error);
      res.status(500).json({ message: "Failed to update machine" });
    }
  });

  // Update machine status (Admin only)
  app.patch('/api/admin/machines/:machineId/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { machineId } = req.params;
      const { isActive } = req.body;

      await storage.updateMachineStatus(machineId, isActive);
      res.json({ message: "Machine status updated successfully" });
    } catch (error) {
      console.error("Error updating machine status:", error);
      res.status(500).json({ message: "Failed to update machine status" });
    }
  });

  // Assign machine to business unit (Admin only)
  app.patch('/api/admin/machines/:machineId/assign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { machineId } = req.params;
      const { businessUnitId } = req.body;

      if (!businessUnitId) {
        return res.status(400).json({ message: "Business unit ID is required" });
      }

      // Verify the business unit exists
      const businessUnit = await storage.getBusinessUnit(businessUnitId);
      if (!businessUnit) {
        return res.status(400).json({ message: "Business unit not found" });
      }

      const updatedMachine = await storage.assignMachineToBusinessUnit(machineId, businessUnitId);
      
      if (!updatedMachine) {
        return res.status(404).json({ message: "Machine not found" });
      }

      res.json(updatedMachine);
    } catch (error) {
      console.error("Error assigning machine:", error);
      res.status(500).json({ message: "Failed to assign machine" });
    }
  });




  // Loyalty and badge features not implemented yet

  // Note: Support routes are now handled by the supportRoutes module above

  app.get('/api/support/tickets/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const ticketId = parseInt(req.params.id);
      
      // Verify user owns this ticket or is admin
      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      const user = await storage.getUser(userId);
      if (ticket.userId !== userId && !user?.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getSupportMessages(ticketId);
      console.log('Returning messages for ticket', ticketId, ':', messages);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching support messages:", error);
      res.status(500).json({ message: "Failed to fetch support messages" });
    }
  });

  app.post('/api/support/tickets/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const ticketId = parseInt(req.params.id);
      const { message, attachments, isFromSupport } = req.body;
      
      const newMessage = await storage.createSupportMessage({
        ticketId,
        senderId: userId,
        message,
        attachments: attachments || [],
        isFromSupport: isFromSupport || false,
      });

      res.json(newMessage);
    } catch (error) {
      console.error("Error creating support message:", error);
      res.status(500).json({ message: "Failed to create support message" });
    }
  });

  // Machine heartbeat endpoint (no authentication required for machines)
  app.post('/api/machines/heartbeat', async (req, res) => {
    try {
      const { machineId, status, dailyDispensed, totalDispensed, timestamp } = req.body;
      
      if (!machineId) {
        return res.status(400).json({
          success: false,
          message: 'Machine ID required'
        });
      }

      // Update machine status
      const machine = await storage.getTeaMachine(machineId);
      
      if (!machine) {
        return res.status(404).json({
          success: false,
          message: 'Machine not found'
        });
      }

      // Log heartbeat for monitoring
      console.log(`Heartbeat from ${machineId}: ${status}, dispensed today: ${dailyDispensed || 0}`);

      return res.status(200).json({
        success: true,
        machineId: machineId,
        serverTime: new Date().toISOString(),
        message: 'Heartbeat received'
      });

    } catch (error) {
      console.error('Machine heartbeat error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error processing heartbeat'
      });
    }
  });

  // FAQ routes
  app.get('/api/faq', async (req, res) => {
    try {
      const category = req.query.category as string;
      const articles = await storage.getFaqArticles(category);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching FAQ articles:", error);
      res.status(500).json({ message: "Failed to fetch FAQ articles" });
    }
  });

  app.post('/api/faq/:id/view', async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      await storage.incrementFaqViews(articleId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing FAQ views:", error);
      res.status(500).json({ message: "Failed to increment FAQ views" });
    }
  });

  // Analytics routes for admin (removed popular tea types - only serve Regular Tea)

  app.get('/api/analytics/peak-hours', isAuthenticated, timeoutMiddleware(TIMEOUT_CONFIGS.ANALYTICS), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { start, end } = req.query;
      
      // Super admins see all data, regular admins see only their business unit data
      const businessUnitAdminId = user.isSuperAdmin ? undefined : userId;

      const peakHours = await storage.getPeakHours(start as string, end as string, businessUnitAdminId);
      res.json(peakHours);
    } catch (error) {
      console.error("Error fetching peak hours:", error);
      res.status(500).json({ message: "Failed to fetch peak hours" });
    }
  });

  app.get('/api/analytics/machine-performance', isAuthenticated, timeoutMiddleware(TIMEOUT_CONFIGS.ANALYTICS), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { start, end } = req.query;
      
      // Super admins see all data, regular admins see only their business unit data
      const businessUnitAdminId = user.isSuperAdmin ? undefined : userId;

      const performance = await storage.getMachinePerformance(start as string, end as string, businessUnitAdminId);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching machine performance:", error);
      res.status(500).json({ message: "Failed to fetch machine performance" });
    }
  });

  app.get('/api/analytics/user-behavior', isAuthenticated, timeoutMiddleware(TIMEOUT_CONFIGS.ANALYTICS), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { start, end } = req.query;
      
      // Super admins see all data, regular admins see only their business unit data
      const businessUnitAdminId = user.isSuperAdmin ? undefined : userId;

      const insights = await storage.getUserBehaviorInsights(start as string, end as string, businessUnitAdminId);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching user behavior insights:", error);
      res.status(500).json({ message: "Failed to fetch user behavior insights" });
    }
  });

  app.get('/api/analytics/machine-dispensing', isAuthenticated, timeoutMiddleware(TIMEOUT_CONFIGS.ANALYTICS), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { start, end, machineId } = req.query;
      
      // Super admins see all data, regular admins see only their business unit data
      const businessUnitAdminId = user.isSuperAdmin ? undefined : userId;

      const dispensingData = await storage.getMachineDispensingData(start as string, end as string, machineId as string, businessUnitAdminId);
      res.json(dispensingData);
    } catch (error) {
      console.error("Error fetching machine dispensing data:", error);
      res.status(500).json({ message: "Failed to fetch machine dispensing data" });
    }
  });

  // Enhanced Analytics Routes
  app.get('/api/analytics/business-unit-comparison', isAuthenticated, timeoutMiddleware(TIMEOUT_CONFIGS.ANALYTICS), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Only super admins can see business unit comparisons
      if (!user.isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for business unit comparisons" });
      }

      const { start, end } = req.query;
      const comparison = await storage.getBusinessUnitComparison(start as string, end as string);
      res.json(comparison);
    } catch (error) {
      console.error("Error fetching business unit comparison:", error);
      res.status(500).json({ message: "Failed to fetch business unit comparison" });
    }
  });

  app.get('/api/analytics/revenue-trends', isAuthenticated, timeoutMiddleware(TIMEOUT_CONFIGS.ANALYTICS), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { start, end } = req.query;
      
      // Super admins see all data, regular admins see only their business unit data
      const businessUnitAdminId = user.isSuperAdmin ? undefined : userId;

      const trends = await storage.getRevenueTrends(start as string, end as string, businessUnitAdminId);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching revenue trends:", error);
      res.status(500).json({ message: "Failed to fetch revenue trends" });
    }
  });

  app.get('/api/analytics/usage-trends/:businessUnitId', isAuthenticated, timeoutMiddleware(TIMEOUT_CONFIGS.ANALYTICS), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { businessUnitId } = req.params;
      const { start, end } = req.query;

      // Regular admins can only see their own business units
      if (!user.isSuperAdmin) {
        const userUnits = await storage.getUserBusinessUnits(userId);
        const canAccess = userUnits.some(unit => unit.id === businessUnitId);
        if (!canAccess) {
          return res.status(403).json({ message: "Access denied to this business unit" });
        }
      }

      const trends = await storage.getUsageTrendsByBusinessUnit(businessUnitId, start as string, end as string);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching usage trends:", error);
      res.status(500).json({ message: "Failed to fetch usage trends" });
    }
  });

  // Business Units routes
  app.get('/api/admin/business-units', isAuthenticated, attachAccessControl, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const businessUnits = await storage.getAllBusinessUnits();
      res.json(businessUnits);
    } catch (error) {
      console.error("Error fetching business units:", error);
      res.status(500).json({ message: "Failed to fetch business units" });
    }
  });

  app.post('/api/admin/business-units', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('Creating business unit with data:', req.body);
      
      // Validate required fields
      if (!req.body.name || !req.body.code) {
        return res.status(400).json({ message: "Name and code are required" });
      }

      const businessUnit = await storage.createBusinessUnit({
        id: `BU_${Date.now().toString(36)}_${Math.random().toString(36).substring(2)}`,
        name: req.body.name,
        code: req.body.code,
        description: req.body.description || null,
        walletBalance: req.body.walletBalance || "0.00",
        isActive: true,
      });
      
      console.log('Created business unit:', businessUnit);
      res.json(businessUnit);
    } catch (error) {
      console.error("Error creating business unit:", error);
      res.status(500).json({ message: "Failed to create business unit", error: (error as Error).message });
    }
  });



  app.post('/api/admin/business-units/:unitId/machines', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { unitId } = req.params;
      const { machineId } = req.body;
      
      const machine = await storage.assignMachineToBusinessUnit(machineId, unitId);
      res.json(machine);
    } catch (error: any) {
      console.error("Error assigning machine to business unit:", error);
      res.status(500).json({ message: "Failed to assign machine to business unit" });
    }
  });

  // Get users assigned to a business unit
  app.get('/api/admin/business-units/:unitId/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { unitId } = req.params;
      console.log(`=== GET BUSINESS UNIT USERS API DEBUG ===`);
      console.log(`Unit ID: ${unitId}`);
      console.log(`Requesting user: ${userId}`);
      
      const assignments = await storage.getBusinessUnitUsers(unitId);
      console.log(`Found ${assignments.length} assignments:`, assignments);
      
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching business unit users:", error);
      res.status(500).json({ message: "Failed to fetch business unit users" });
    }
  });

  // Assign user to business unit
  app.post('/api/admin/business-units/:unitId/assign-user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { unitId } = req.params;
      const { userId: targetUserId, role } = req.body;

      if (!targetUserId || !role) {
        return res.status(400).json({ message: "User ID and role are required" });
      }

      // Verify business unit exists
      const businessUnit = await storage.getBusinessUnit(unitId);
      if (!businessUnit) {
        return res.status(400).json({ message: "Business unit not found" });
      }

      // Verify user exists
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(400).json({ message: "User not found" });
      }

      // CRITICAL: Check for existing Business Unit Admin if trying to assign admin role
      if (role === 'Business Unit Admin') {
        const existingAssignments = await storage.getBusinessUnitUsers(unitId);
        const hasExistingAdmin = existingAssignments.some((assignment: any) => 
          assignment.role === 'Business Unit Admin' && assignment.userId !== targetUserId
        );
        
        if (hasExistingAdmin) {
          return res.status(400).json({ 
            message: "This business unit already has a Business Unit Admin. Only one admin is allowed per unit." 
          });
        }
      }

      await storage.assignUserToBusinessUnit(targetUserId, unitId, role);
      res.json({ message: "User assigned successfully" });
    } catch (error) {
      console.error("Error assigning user to business unit:", error);
      res.status(500).json({ message: "Failed to assign user to business unit" });
    }
  });

  // Unassign user from business unit
  app.post('/api/admin/business-units/:unitId/unassign-user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { unitId } = req.params;
      const { userId: targetUserId } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      await storage.removeUserFromBusinessUnit(targetUserId, unitId);
      res.json({ message: "User unassigned successfully" });
    } catch (error) {
      console.error("Error unassigning user from business unit:", error);
      res.status(500).json({ message: "Failed to unassign user from business unit" });
    }
  });

  // Get all users with their business unit assignments for pseudo login
  app.get('/api/admin/users-with-business-units', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const usersWithUnits = await storage.getUsersWithBusinessUnits();
      res.json(usersWithUnits);
    } catch (error) {
      console.error("Error fetching users with business units:", error);
      res.status(500).json({ message: "Failed to fetch users with business units" });
    }
  });

  // Get specific user for pseudo login display
  app.get('/api/admin/user/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const adminUser = await storage.getUser(adminUserId);
      
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });



  app.get('/api/admin/machines/unassigned', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const machines = await storage.getUnassignedMachines();
      res.json(machines);
    } catch (error) {
      console.error("Error fetching unassigned machines:", error);
      res.status(500).json({ message: "Failed to fetch unassigned machines" });
    }
  });

  // Update machine pricing (simplified single price field)
  app.patch('/api/admin/machines/:machineId/pricing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { machineId } = req.params;
      const { price } = req.body;

      if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        return res.status(400).json({ message: "Valid price is required" });
      }

      // Update machine price using simplified pricing system
      const result = await storage.updateMachinePrice(machineId, parseFloat(price).toFixed(2));
      
      if (!result.success) {
        return res.status(404).json({ message: result.message || "Machine not found" });
      }

      res.json({ 
        success: true, 
        message: "Machine price updated successfully",
        machineId,
        price: parseFloat(price).toFixed(2) 
      });
    } catch (error) {
      console.error("Error updating machine price:", error);
      res.status(500).json({ message: "Failed to update machine price" });
    }
  });

  // Payment redirect fallback for popup blockers
  app.post('/payment-redirect', (req, res) => {
    const { order_id, key, amount, currency, name, description } = req.body;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment - ${name}</title>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            padding: 40px; 
            text-align: center; 
            background: #f8fafc;
          }
          .container { 
            max-width: 400px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .pay-btn { 
            background: #3b82f6; 
            color: white; 
            padding: 16px 32px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px; 
            font-weight: 600;
            width: 100%;
            margin-top: 20px;
          }
          .pay-btn:hover { background: #2563eb; }
          .amount { 
            font-size: 32px; 
            font-weight: 700; 
            color: #1f2937; 
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>UrbanKetl Payment</h1>
          <div class="amount">₹${parseInt(amount) / 100}</div>
          <p style="color: #6b7280; margin-bottom: 30px;">Complete your wallet recharge</p>
          <button class="pay-btn" onclick="initiatePayment()">Pay Now</button>
        </div>
        
        <script>
          function initiatePayment() {
            var options = {
              key: '${key}',
              amount: ${amount},
              currency: '${currency}',
              order_id: '${order_id}',
              name: '${name}',
              description: '${description}',
              handler: function(response) {
                // Send success back to parent window
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'PAYMENT_SUCCESS',
                    data: response
                  }, '*');
                  window.close();
                } else {
                  // If no parent window, show success message
                  document.body.innerHTML = '<div class="container"><h1>Payment Successful!</h1><p>You may close this window.</p></div>';
                }
              },
              modal: {
                ondismiss: function() {
                  window.close();
                }
              }
            };
            
            var rzp = new Razorpay(options);
            rzp.open();
          }
          
          // Auto-initiate payment after 1 second
          setTimeout(initiatePayment, 1000);
        </script>
      </body>
      </html>
    `);
  });

  // Admin Transfer Interface Routes
  app.post('/api/admin/business-units/:id/transfer', isAuthenticated, async (req: any, res) => {
    try {
      console.log('=== TRANSFER DEBUG ===');
      console.log('Request params:', req.params);
      console.log('Request body:', req.body);
      console.log('User:', req.user?.claims?.sub);
      
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);
      
      console.log('Admin user:', admin);
      
      if (!admin?.isAdmin) {
        console.log('Admin check failed:', { admin: !!admin, isAdmin: admin?.isAdmin });
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const { id: businessUnitId } = req.params;
      const { newAdminId, reason } = req.body;

      console.log('Transfer parameters:', { businessUnitId, newAdminId, reason });

      if (!newAdminId || !reason) {
        console.log('Missing parameters:', { newAdminId: !!newAdminId, reason: !!reason });
        return res.status(400).json({ message: "New admin ID and reason are required" });
      }

      const result = await storage.transferBusinessUnitAdmin({
        businessUnitId,
        newAdminId,
        transferredBy: adminId,
        reason
      });

      console.log('Transfer result:', result);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error transferring business unit:", error);
      res.status(500).json({ message: "Failed to transfer business unit" });
    }
  });

  // Get transfer history for a business unit
  app.get('/api/admin/business-units/:id/transfers', isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const { id: businessUnitId } = req.params;
      const transfers = await storage.getBusinessUnitTransferHistory(businessUnitId);
      
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfer history:", error);
      res.status(500).json({ message: "Failed to fetch transfer history" });
    }
  });

  // Get all business unit transfers (admin dashboard)
  app.get('/api/admin/transfers', isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const transfers = await storage.getAllBusinessUnitTransfers();
      
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching all transfers:", error);
      res.status(500).json({ message: "Failed to fetch transfers" });
    }
  });

  // **Monitoring API Routes**
  
  // Get RFID authentication logs (Admin only)
  app.get('/api/admin/sync/auth-logs', isAuthenticated, requireAdminAuth, monitoringController.getAuthLogs.bind(monitoringController));
  
  // Machine heartbeat endpoint (no auth required - used by machines)
  app.post('/api/sync/heartbeat', monitoringController.heartbeat.bind(monitoringController));

  // ========== PHASE 4: CHALLENGE-RESPONSE AUTHENTICATION ROUTES ==========
  const challengeResponseController = new ChallengeResponseController();
  
  // Machine authentication endpoints (No auth required - used by tea machines)
  app.post('/api/machine/auth/challenge', timeoutMiddleware(TIMEOUT_CONFIGS.MACHINE_AUTH), challengeResponseController.generateChallenge.bind(challengeResponseController));
  app.post('/api/machine/auth/validate', timeoutMiddleware(TIMEOUT_CONFIGS.MACHINE_AUTH), challengeResponseController.validateResponse.bind(challengeResponseController));
  app.post('/api/machine/auth/dispense', timeoutMiddleware(TIMEOUT_CONFIGS.MACHINE_AUTH), challengeResponseController.processDispensing.bind(challengeResponseController));
  
  // Combined: validate AND dispense in one call (faster, saves one round-trip)
  app.post('/api/machine/auth/validate-and-dispense', timeoutMiddleware(TIMEOUT_CONFIGS.MACHINE_AUTH), challengeResponseController.validateAndDispense.bind(challengeResponseController));
  
  // Admin authentication management
  app.get('/api/admin/auth/logs', isAuthenticated, requireAdminAuth, challengeResponseController.getAuthLogs.bind(challengeResponseController));
  app.get('/api/admin/auth/service-status', isAuthenticated, requireAdminAuth, challengeResponseController.getServiceStatus.bind(challengeResponseController));

  // ========== UPI SYNC SYSTEM ROUTES ==========
  
  // UPI sync status and management (Admin only)
  app.get('/api/admin/upi-sync/status', isAuthenticated, requireAdminAuth, upiSyncController.getSyncStatus.bind(upiSyncController));
  
  // UPI sync triggers (Admin only)
  app.post('/api/admin/upi-sync/initial', isAuthenticated, requireAdminAuth, upiSyncController.triggerInitialSync.bind(upiSyncController));
  app.post('/api/admin/upi-sync/daily', isAuthenticated, requireAdminAuth, upiSyncController.triggerDailySync.bind(upiSyncController));
  app.post('/api/admin/upi-sync/manual', isAuthenticated, requireAdminAuth, upiSyncController.triggerManualSync.bind(upiSyncController));
  
  // UPI sync logs and data (Admin only)
  app.get('/api/admin/upi-sync/logs', isAuthenticated, requireAdminAuth, upiSyncController.getSyncLogs.bind(upiSyncController));
  app.get('/api/admin/upi-sync/transactions', isAuthenticated, requireAdminAuth, attachAccessControl, upiSyncController.getUpiTransactions.bind(upiSyncController));
  app.get('/api/admin/upi-sync/analytics', isAuthenticated, requireAdminAuth, upiSyncController.getSyncAnalytics.bind(upiSyncController));
  
  // UPI export endpoints (Admin only)
  app.get('/api/admin/upi-sync/export/excel', isAuthenticated, requireAdminAuth, timeoutMiddleware(TIMEOUT_CONFIGS.EXPORT), upiSyncController.exportToExcel.bind(upiSyncController));
  app.get('/api/admin/upi-sync/export/pdf', isAuthenticated, requireAdminAuth, timeoutMiddleware(TIMEOUT_CONFIGS.EXPORT), upiSyncController.exportToPdf.bind(upiSyncController));





  const httpServer = createServer(app);
  return httpServer;
}
