import { Express, RequestHandler } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { insertRfidCardSchema, insertTeaMachineSchema } from "@shared/schema";
import { z } from "zod";
import * as csvWriter from 'csv-writer';
import PDFDocument from 'pdfkit';

// B2B Corporate RFID Management Routes
export function registerCorporateRoutes(app: Express) {

  // Get user's assigned business units (with pseudo login support)
  app.get("/api/corporate/business-units", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnits = await storage.getUserBusinessUnits(userId);
      res.json(businessUnits);
    } catch (error) {
      console.error("Error fetching user business units:", error);
      res.status(500).json({ error: "Failed to fetch business units" });
    }
  });

  // Dashboard stats endpoint with business unit filtering
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnitId = req.query.businessUnitId as string;

      if (businessUnitId) {
        // Get stats for specific business unit
        const stats = await storage.getBusinessUnitDashboardStats(businessUnitId);
        res.json(stats);
      } else {
        // Get aggregated stats for all user's business units
        const stats = await storage.getUserDashboardStats(userId);
        res.json(stats);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Enhanced transactions endpoint with business unit filtering
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnitId = req.query.businessUnitId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const page = parseInt(req.query.page as string);
      const paginated = req.query.paginated === 'true';

      // Disable caching for this endpoint
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': false
      });

      console.log(`=== TRANSACTION FILTER DEBUG ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Business Unit ID: ${businessUnitId}`);
      console.log(`Limit: ${limit}`);
      console.log(`Page: ${page}, Paginated: ${paginated}`);
      console.log(`Query params:`, req.query);

      let transactions;
      if (paginated && page && page > 0) {
        // Paginated response
        if (businessUnitId && businessUnitId !== 'null' && businessUnitId !== 'undefined') {
          console.log(`Getting paginated transactions for business unit: ${businessUnitId}`);
          transactions = await storage.getBusinessUnitTransactionsPaginated(businessUnitId, page, limit);
        } else {
          console.log(`Getting paginated transactions for user: ${userId}`);
          transactions = await storage.getUserTransactionsPaginated(userId, page, limit);
        }
        res.json(transactions);
      } else {
        // Legacy non-paginated response
        if (businessUnitId && businessUnitId !== 'null' && businessUnitId !== 'undefined') {
          console.log(`Filtering transactions for business unit: ${businessUnitId}`);
          transactions = await storage.getBusinessUnitTransactions(businessUnitId, limit);
          console.log(`Found ${transactions.length} transactions for business unit ${businessUnitId}`);
        } else {
          console.log(`Getting all transactions for user: ${userId}`);
          transactions = await storage.getUserTransactions(userId, limit);
          console.log(`Found ${transactions.length} transactions for user ${userId}`);
        }
        res.json(transactions);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Enhanced dispensing history endpoint with business unit filtering
  app.get('/api/dispensing/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnitId = req.query.businessUnitId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const page = parseInt(req.query.page as string);
      const paginated = req.query.paginated === 'true';

      let dispensingLogs;
      if (paginated && page && page > 0) {
        // Paginated response
        if (businessUnitId) {
          dispensingLogs = await storage.getBusinessUnitDispensingLogsPaginated(businessUnitId, page, limit);
        } else {
          dispensingLogs = await storage.getUserDispensingLogsPaginated(userId, page, limit);
        }
        res.json(dispensingLogs);
      } else {
        // Legacy non-paginated response
        if (businessUnitId) {
          dispensingLogs = await storage.getBusinessUnitDispensingLogs(businessUnitId, limit);
        } else {
          dispensingLogs = await storage.getUserDispensingLogs(userId, limit);
        }
        res.json(dispensingLogs);
      }
    } catch (error) {
      console.error("Error fetching dispensing history:", error);
      res.status(500).json({ message: "Failed to fetch dispensing history" });
    }
  });
  
  // Get RFID cards for specific business unit (with pseudo login support)
  app.get("/api/corporate/rfid-cards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnitId = req.query.businessUnitId as string;
      
      if (businessUnitId) {
        // Get cards for specific business unit
        const cards = await storage.getBusinessUnitRfidCards(businessUnitId);
        res.json(cards);
      } else {
        // Get all managed cards (for backward compatibility)
        const cards = await storage.getManagedRfidCards(userId);
        res.json(cards);
      }
    } catch (error) {
      console.error("Error fetching RFID cards:", error);
      res.status(500).json({ error: "Failed to fetch RFID cards" });
    }
  });

  // Create new RFID card for business unit
  app.post("/api/corporate/rfid-cards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const cardData = insertRfidCardSchema.parse({
        ...req.body,
        businessUnitAdminId: userId
      });
      
      const newCard = await storage.createRfidCard(cardData);
      res.json(newCard);
    } catch (error) {
      console.error("Error creating RFID card:", error);
      res.status(500).json({ error: "Failed to create RFID card" });
    }
  });

  // Deactivate RFID card
  app.delete("/api/corporate/rfid-cards/:cardId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const cardId = parseInt(req.params.cardId);
      
      // Verify the card belongs to this business unit admin
      const cards = await storage.getManagedRfidCards(userId);
      const card = cards.find(c => c.id === cardId);
      
      if (!card) {
        return res.status(404).json({ error: "RFID card not found or not owned by your business unit" });
      }
      
      await storage.deactivateRfidCard(cardId);
      res.json({ message: "RFID card deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating RFID card:", error);
      res.status(500).json({ error: "Failed to deactivate RFID card" });
    }
  });

  // Activate RFID card
  app.put("/api/corporate/rfid-cards/:cardId/activate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const cardId = parseInt(req.params.cardId);
      
      // Verify the card belongs to this business unit admin
      const cards = await storage.getManagedRfidCards(userId);
      const card = cards.find(c => c.id === cardId);
      
      if (!card) {
        return res.status(404).json({ error: "RFID card not found or not owned by your business unit" });
      }
      
      await storage.activateRfidCard(cardId);
      res.json({ message: "RFID card activated successfully" });
    } catch (error) {
      console.error("Error activating RFID card:", error);
      res.status(500).json({ error: "Failed to activate RFID card" });
    }
  });

  // Get machines for specific business unit (with pseudo login support)
  app.get("/api/corporate/machines", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnitId = req.query.businessUnitId as string;
      
      console.log(`=== MACHINES API DEBUG ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Business Unit ID: ${businessUnitId}`);
      console.log(`Query params:`, req.query);
      
      if (businessUnitId) {
        // Get machines for specific business unit
        console.log(`Getting machines for business unit: ${businessUnitId}`);
        const machines = await storage.getBusinessUnitMachines(businessUnitId);
        console.log(`Found ${machines.length} machines for business unit ${businessUnitId}:`, machines);
        res.json(machines);
      } else {
        // Get all managed machines (for backward compatibility)
        console.log(`Getting all managed machines for user: ${userId}`);
        const machines = await storage.getManagedMachines(userId);
        console.log(`Found ${machines.length} managed machines for user ${userId}:`, machines);
        res.json(machines);
      }
    } catch (error) {
      console.error("Error fetching machines:", error);
      res.status(500).json({ error: "Failed to fetch machines" });
    }
  });

  // Removed duplicate route - proper implementation is below with business unit filtering and pagination

  // Create new tea machine for business unit
  app.post("/api/corporate/machines", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const machineData = insertTeaMachineSchema.parse({
        ...req.body,
        businessUnitAdminId: userId
      });
      
      const newMachine = await storage.createTeaMachine(machineData);
      res.json(newMachine);
    } catch (error) {
      console.error("Error creating tea machine:", error);
      res.status(500).json({ error: "Failed to create tea machine" });
    }
  });

  // Update machine status (activate/deactivate)
  app.patch("/api/corporate/machines/:machineId/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { machineId } = req.params;
      const { isActive } = req.body;
      
      // Verify the machine belongs to this business unit admin
      const machines = await storage.getManagedMachines(userId);
      const machine = machines.find(m => m.id === machineId);
      
      if (!machine) {
        return res.status(404).json({ error: "Machine not found or not owned by your business unit" });
      }
      
      await storage.updateMachineStatus(machineId, isActive);
      res.json({ message: "Machine status updated successfully" });
    } catch (error) {
      console.error("Error updating machine status:", error);
      res.status(500).json({ error: "Failed to update machine status" });
    }
  });

  // Get dispensing logs for specific business unit (with pseudo login support, pagination, and date filtering)
  app.get("/api/corporate/dispensing-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnitId = req.query.businessUnitId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const paginated = req.query.paginated === 'true';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      console.log('=== DISPENSING LOGS API DEBUG ===');
      console.log('User ID:', userId);
      console.log('Business Unit ID:', businessUnitId);
      console.log('Page:', page, 'Limit:', limit, 'Paginated:', paginated);
      console.log('Date Filter - Start:', startDate, 'End:', endDate);
      console.log('Full Query params:', req.query);
      console.log('Raw URL:', req.url);
      console.log('Business Unit ID exists:', !!businessUnitId);
      console.log('Paginated check:', paginated, typeof paginated);
      
      if (businessUnitId) {
        // Get logs for specific business unit
        console.log(`Getting dispensing logs for business unit: ${businessUnitId}`);
        
        if (paginated) {
          const result = await storage.getBusinessUnitDispensingLogsPaginated(businessUnitId, page, limit, startDate, endDate);
          console.log(`Found ${result.logs.length} dispensing logs (page ${page}) for business unit ${businessUnitId}, total: ${result.total}`);
          res.json(result);
        } else {
          const logs = await storage.getBusinessUnitDispensingLogs(businessUnitId, limit, startDate, endDate);
          console.log(`Found ${logs.length} dispensing logs for business unit ${businessUnitId}`);
          res.json(logs);
        }
      } else {
        // Get all managed logs (for backward compatibility)
        console.log(`Getting all managed dispensing logs for user: ${userId}`);
        
        if (paginated) {
          const result = await storage.getUserDispensingLogsPaginated(userId, page, limit, startDate, endDate);
          console.log(`Found ${result.logs.length} managed dispensing logs (page ${page}) for user ${userId}, total: ${result.total}`);
          res.json(result);
        } else {
          const logs = await storage.getManagedDispensingLogs(userId, limit, startDate, endDate);
          console.log(`Found ${logs.length} managed dispensing logs for user ${userId}`);
          res.json(logs);
        }
      }
    } catch (error) {
      console.error("Error fetching dispensing logs:", error);
      res.status(500).json({ error: "Failed to fetch dispensing logs" });
    }
  });

  // Get monthly transaction summary - with custom date range support (query parameters)
  app.get("/api/corporate/monthly-summary/:businessUnitId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;  
      const businessUnitId = req.params.businessUnitId as string;
      const { startDate, endDate } = req.query;

      if (!businessUnitId) {
        return res.status(400).json({ error: "businessUnitId is required" });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate query parameters are required" });
      }

      // Verify business unit belongs to user
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      const businessUnit = userBusinessUnits.find(bu => bu.id === businessUnitId);
      
      if (!businessUnit) {
        return res.status(403).json({ error: "Access denied to this business unit" });
      }

      const summary = await storage.getCustomDateRangeTransactionSummary(businessUnitId, startDate as string, endDate as string);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching custom date range summary:", error);
      res.status(500).json({ error: "Failed to fetch transaction summary" });
    }
  });

  // Monthly transaction summary for reporting - with path parameter support (backward compatibility)
  app.get("/api/corporate/monthly-summary/:businessUnitId/:month", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;  
      const businessUnitId = req.params.businessUnitId as string;
      const month = req.params.month as string; // Format: YYYY-MM

      if (!businessUnitId || !month) {
        return res.status(400).json({ error: "businessUnitId and month are required" });
      }

      // Verify business unit belongs to user
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      const businessUnit = userBusinessUnits.find(bu => bu.id === businessUnitId);
      
      if (!businessUnit) {
        return res.status(403).json({ error: "Access denied to this business unit" });
      }

      const summary = await storage.getMonthlyTransactionSummary(businessUnitId, month);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching monthly summary:", error);
      res.status(500).json({ error: "Failed to fetch monthly summary" });
    }
  });

  // Export CSV transactions - with custom date range support (query parameters)
  app.get("/api/corporate/monthly-export/:businessUnitId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnitId = req.params.businessUnitId as string;
      const { startDate, endDate } = req.query;

      console.log('=== CSV EXPORT DEBUG (Custom Date Range) ===');
      console.log('User ID:', userId);
      console.log('Business Unit ID:', businessUnitId);
      console.log('Start Date:', startDate);
      console.log('End Date:', endDate);
      console.log('Query params:', req.query);

      if (!businessUnitId) {
        console.log('ERROR: Missing businessUnitId');
        return res.status(400).json({ error: "businessUnitId is required" });
      }

      if (!startDate || !endDate) {
        console.log('ERROR: Missing startDate or endDate');
        return res.status(400).json({ error: "startDate and endDate query parameters are required" });
      }

      // Verify business unit belongs to user
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      const businessUnit = userBusinessUnits.find(bu => bu.id === businessUnitId);
      
      if (!businessUnit) {
        return res.status(403).json({ error: "Access denied to this business unit" });
      }

      const transactions = await storage.getCustomDateRangeTransactions(businessUnitId, startDate as string, endDate as string);
      
      // Create CSV
      const csv = csvWriter.createObjectCsvStringifier({
        header: [
          { id: 'date', title: 'Date' },
          { id: 'time', title: 'Time' },
          { id: 'cardNumber', title: 'Employee Card' },
          { id: 'machineName', title: 'Machine' },
          { id: 'machineLocation', title: 'Location' },
          { id: 'teaType', title: 'Tea Type' },
          { id: 'amount', title: 'Amount (₹)' },
          { id: 'status', title: 'Status' },
          { id: 'errorMessage', title: 'Error Details' }
        ]
      });

      const csvData = transactions.map((t: any) => ({
        date: new Date(t.createdAt).toLocaleDateString('en-IN'),
        time: new Date(t.createdAt).toLocaleTimeString('en-IN'),
        cardNumber: t.cardNumber || t.rfidCardId,
        machineName: t.machineName || t.machineId,
        machineLocation: t.machineLocation || '',
        teaType: t.teaType,
        amount: t.amount,
        status: t.success ? 'Success' : 'Failed',
        errorMessage: t.errorMessage || ''
      }));

      const csvString = csv.getHeaderString() + csv.stringifyRecords(csvData);

      const startDateStr = new Date(startDate as string).toISOString().split('T')[0];
      const endDateStr = new Date(endDate as string).toISOString().split('T')[0];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${businessUnit.name}-transactions-${startDateStr}-to-${endDateStr}.csv"`);
      res.send(csvString);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  // Export CSV transactions for a month - with path parameter support (backward compatibility)
  app.get("/api/corporate/monthly-export/:businessUnitId/:month", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnitId = req.params.businessUnitId as string;
      const month = req.params.month as string; // Format: YYYY-MM

      console.log('=== CSV EXPORT DEBUG ===');
      console.log('User ID:', userId);
      console.log('Business Unit ID:', businessUnitId);
      console.log('Month:', month);
      console.log('Query params:', req.query);

      if (!businessUnitId || !month) {
        console.log('ERROR: Missing businessUnitId or month');
        return res.status(400).json({ error: "businessUnitId and month are required" });
      }

      // Verify business unit belongs to user
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      const businessUnit = userBusinessUnits.find(bu => bu.id === businessUnitId);
      
      if (!businessUnit) {
        return res.status(403).json({ error: "Access denied to this business unit" });
      }

      const transactions = await storage.getMonthlyTransactions(businessUnitId, month);
      
      // Create CSV
      const csv = csvWriter.createObjectCsvStringifier({
        header: [
          { id: 'date', title: 'Date' },
          { id: 'time', title: 'Time' },
          { id: 'cardNumber', title: 'Employee Card' },
          { id: 'machineName', title: 'Machine' },
          { id: 'machineLocation', title: 'Location' },
          { id: 'teaType', title: 'Tea Type' },
          { id: 'amount', title: 'Amount (₹)' },
          { id: 'status', title: 'Status' },
          { id: 'errorMessage', title: 'Error Details' }
        ]
      });

      const csvData = transactions.map((t: any) => ({
        date: new Date(t.createdAt).toLocaleDateString('en-IN'),
        time: new Date(t.createdAt).toLocaleTimeString('en-IN'),
        cardNumber: t.cardNumber || t.rfidCardId,
        machineName: t.machineName || t.machineId,
        machineLocation: t.machineLocation || '',
        teaType: t.teaType,
        amount: t.amount,
        status: t.success ? 'Success' : 'Failed',
        errorMessage: t.errorMessage || ''
      }));

      const csvString = csv.getHeaderString() + csv.stringifyRecords(csvData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${businessUnit.name}-transactions-${month}.csv"`);
      res.send(csvString);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  // Generate PDF invoice - with custom date range support (query parameters)
  app.get("/api/corporate/monthly-invoice/:businessUnitId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnitId = req.params.businessUnitId as string;
      const { startDate, endDate } = req.query;

      if (!businessUnitId) {
        return res.status(400).json({ error: "businessUnitId is required" });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate query parameters are required" });
      }

      // Verify business unit belongs to user
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      const businessUnit = userBusinessUnits.find(bu => bu.id === businessUnitId);
      
      if (!businessUnit) {
        return res.status(403).json({ error: "Access denied to this business unit" });
      }

      const summary = await storage.getCustomDateRangeTransactionSummary(businessUnitId, startDate as string, endDate as string);
      const transactions = await storage.getCustomDateRangeTransactions(businessUnitId, startDate as string, endDate as string);

      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      
      const startDateStr = new Date(startDate as string).toISOString().split('T')[0];
      const endDateStr = new Date(endDate as string).toISOString().split('T')[0];
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${businessUnit.name}-invoice-${startDateStr}-to-${endDateStr}.pdf"`);
      doc.pipe(res);

      // Header
      doc.fontSize(20).text('UrbanKetl Tea Service Invoice', { align: 'center' });
      doc.moveDown();

      // Invoice details
      const periodText = `${new Date(startDate as string).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} to ${new Date(endDate as string).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      
      doc.fontSize(14);
      doc.text(`Invoice for: ${businessUnit.name}`, { align: 'left' });
      doc.text(`Business Unit Code: ${businessUnit.code}`);
      doc.text(`Period: ${periodText}`);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`);
      doc.moveDown();

      // Summary section
      doc.fontSize(16).text('Period Summary', { underline: true });
      doc.fontSize(12);
      doc.text(`Total Transactions: ${String(summary.totalTransactions || 0)}`);
      doc.text(`Total Amount: Rs.${parseFloat(String(summary.totalAmount || '0')).toFixed(2)}`);
      doc.text(`Machines Used: ${String(summary.uniqueMachines || 0)}`);
      doc.text(`Employee Cards Active: ${String(summary.uniqueCards || 0)}`);
      doc.moveDown();

      // Transaction details
      if (transactions.length > 0) {
        doc.fontSize(16).text('Transaction Details', { underline: true });
        doc.fontSize(10);
        
        // Table header with expanded card column
        const startY = doc.y;
        doc.text('Date', 50, startY);
        doc.text('Time', 105, startY);
        doc.text('Card', 150, startY);
        doc.text('Machine', 260, startY);
        doc.text('Tea Type', 400, startY);
        doc.text('Amount', 470, startY);
        doc.text('Status', 530, startY);
        
        doc.moveTo(50, doc.y + 5).lineTo(580, doc.y + 5).stroke();
        doc.moveDown(0.5);

        // Transaction rows with full card numbers
        transactions.slice(0, 50).forEach((t: any, index: number) => {
          const y = doc.y;
          doc.text(new Date(t.createdAt).toLocaleDateString('en-IN'), 50, y);
          doc.text(new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), 105, y);
          doc.text(String(t.cardNumber || t.rfidCardId), 150, y);
          doc.text(String(t.machineName || t.machineId).substring(0, 25), 260, y);
          doc.text(String(t.teaType).substring(0, 12), 400, y);
          doc.text(`Rs.${t.amount}`, 470, y);
          doc.text(t.success ? 'OK' : 'Failed', 530, y);
          doc.moveDown(0.3);
          
          if (index % 20 === 19 && index < transactions.length - 1) {
            doc.addPage();
          }
        });

        if (transactions.length > 50) {
          doc.moveDown();
          doc.fontSize(10).text(`... and ${transactions.length - 50} more transactions`, { align: 'center' });
        }
      }

      // Footer
      doc.fontSize(8).text('This is a system-generated invoice from UrbanKetl Tea Service Platform.', 50, doc.page.height - 50, { align: 'center' });
      
      doc.end();
    } catch (error) {
      console.error("Error generating custom date range invoice:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });

  // Generate PDF invoice for a month - with path parameter support (backward compatibility)
  app.get("/api/corporate/monthly-invoice/:businessUnitId/:month", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const businessUnitId = req.params.businessUnitId as string;
      const month = req.params.month as string; // Format: YYYY-MM

      if (!businessUnitId || !month) {
        return res.status(400).json({ error: "businessUnitId and month are required" });
      }

      // Verify business unit belongs to user
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      const businessUnit = userBusinessUnits.find(bu => bu.id === businessUnitId);
      
      if (!businessUnit) {
        return res.status(403).json({ error: "Access denied to this business unit" });
      }

      const summary = await storage.getMonthlyTransactionSummary(businessUnitId, month);
      const transactions = await storage.getMonthlyTransactions(businessUnitId, month);

      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${businessUnit.name}-invoice-${month}.pdf"`);
      doc.pipe(res);

      // Header
      doc.fontSize(20).text('UrbanKetl Tea Service Invoice', { align: 'center' });
      doc.moveDown();

      // Invoice details
      const [year, monthNum] = month.split('-');
      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      doc.fontSize(14);
      doc.text(`Invoice for: ${businessUnit.name}`, { align: 'left' });
      doc.text(`Business Unit Code: ${businessUnit.code}`);
      doc.text(`Period: ${monthName}`);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`);
      doc.moveDown();

      // Summary section
      doc.fontSize(16).text('Monthly Summary', { underline: true });
      doc.fontSize(12);
      doc.text(`Total Transactions: ${String(summary.totalTransactions || 0)}`);
      doc.text(`Total Amount: Rs.${parseFloat(String(summary.totalAmount || '0')).toFixed(2)}`);
      doc.text(`Machines Used: ${String(summary.uniqueMachines || 0)}`);
      doc.text(`Employee Cards Active: ${String(summary.uniqueCards || 0)}`);
      doc.moveDown();

      // Transaction details
      if (transactions.length > 0) {
        doc.fontSize(16).text('Transaction Details', { underline: true });
        doc.fontSize(10);
        
        // Table header with expanded card column
        const startY = doc.y;
        doc.text('Date', 50, startY);
        doc.text('Time', 105, startY);
        doc.text('Card', 150, startY);
        doc.text('Machine', 260, startY);
        doc.text('Tea Type', 400, startY);
        doc.text('Amount', 470, startY);
        doc.text('Status', 530, startY);
        
        doc.moveTo(50, doc.y + 5).lineTo(580, doc.y + 5).stroke();
        doc.moveDown(0.5);

        // Transaction rows with full card numbers
        transactions.slice(0, 50).forEach((t: any, index: number) => {
          const y = doc.y;
          doc.text(new Date(t.createdAt).toLocaleDateString('en-IN'), 50, y);
          doc.text(new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), 105, y);
          doc.text(String(t.cardNumber || t.rfidCardId), 150, y);
          doc.text(String(t.machineName || t.machineId).substring(0, 25), 260, y);
          doc.text(String(t.teaType).substring(0, 12), 400, y);
          doc.text(`Rs.${t.amount}`, 470, y);
          doc.text(t.success ? 'OK' : 'Failed', 530, y);
          doc.moveDown(0.3);
          
          if (index % 20 === 19 && index < transactions.length - 1) {
            doc.addPage();
          }
        });

        if (transactions.length > 50) {
          doc.moveDown();
          doc.fontSize(10).text(`... and ${transactions.length - 50} more transactions`, { align: 'center' });
        }
      }

      // Footer
      doc.fontSize(8).text('This is a system-generated invoice from UrbanKetl Tea Service Platform.', 50, doc.page.height - 50, { align: 'center' });
      
      doc.end();
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });

  // Get business unit summary with date filtering
  app.get("/api/corporate/business-unit-summary/:businessUnitId", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const { businessUnitId } = req.params;
      const { startDate, endDate } = req.query;

      console.log(`=== BUSINESS UNIT SUMMARY API DEBUG ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Business Unit ID: ${businessUnitId}`);
      console.log(`Date Filter - Start: ${startDate} End: ${endDate}`);

      // Verify user has access to this business unit
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      const hasAccess = userBusinessUnits.some(unit => unit.id === businessUnitId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this business unit' });
      }

      const summary = await storage.getBusinessUnitSummary(
        businessUnitId,
        startDate as string,
        endDate as string
      );

      console.log(`Summary data:`, summary);
      res.json(summary);
    } catch (error) {
      console.error('Error getting business unit summary:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}