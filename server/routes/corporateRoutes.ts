import { Express, RequestHandler } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { insertRfidCardSchema, insertTeaMachineSchema } from "@shared/schema";
import { z } from "zod";
import * as csvWriter from 'csv-writer';
import * as PDFDocument from 'pdfkit';

// B2B Corporate RFID Management Routes
export function registerCorporateRoutes(app: Express) {

  // Get user's assigned business units (with pseudo login support)
  app.get("/api/corporate/business-units", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
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
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
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
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
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
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
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
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
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
      const userId = req.session?.user?.id || req.user?.claims?.sub;
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
      const userId = req.session?.user?.id || req.user?.claims?.sub;
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

  // Get machines for specific business unit (with pseudo login support)
  app.get("/api/corporate/machines", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
      const businessUnitId = req.query.businessUnitId as string;
      
      if (businessUnitId) {
        // Get machines for specific business unit
        const machines = await storage.getBusinessUnitMachines(businessUnitId);
        res.json(machines);
      } else {
        // Get all managed machines (for backward compatibility)
        const machines = await storage.getManagedMachines(userId);
        res.json(machines);
      }
    } catch (error) {
      console.error("Error fetching machines:", error);
      res.status(500).json({ error: "Failed to fetch machines" });
    }
  });

  // Get business unit admin's dispensing logs (with pseudo login support)
  app.get("/api/corporate/dispensing-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
      const logs = await storage.getManagedDispensingLogs(userId, 100);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching managed dispensing logs:", error);
      res.status(500).json({ error: "Failed to fetch dispensing logs" });
    }
  });

  // Create new tea machine for business unit
  app.post("/api/corporate/machines", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub;
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
      const userId = req.session?.user?.id || req.user?.claims?.sub;
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

  // Get dispensing logs for specific business unit (with pseudo login support)
  app.get("/api/corporate/dispensing-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
      const businessUnitId = req.query.businessUnitId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      if (businessUnitId) {
        // Get logs for specific business unit
        const logs = await storage.getBusinessUnitDispensingLogs(businessUnitId, limit);
        res.json(logs);
      } else {
        // Get all managed logs (for backward compatibility)
        const logs = await storage.getManagedDispensingLogs(userId, limit);
        res.json(logs);
      }
    } catch (error) {
      console.error("Error fetching dispensing logs:", error);
      res.status(500).json({ error: "Failed to fetch dispensing logs" });
    }
  });

  // Monthly transaction summary for reporting
  app.get("/api/corporate/monthly-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;  
      const businessUnitId = req.query.businessUnitId as string;
      const month = req.query.month as string; // Format: YYYY-MM

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

  // Export CSV transactions for a month
  app.get("/api/corporate/export/csv", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
      const businessUnitId = req.query.businessUnitId as string;
      const month = req.query.month as string; // Format: YYYY-MM

      if (!businessUnitId || !month) {
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

  // Generate PDF invoice for a month
  app.get("/api/corporate/export/invoice", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
      const businessUnitId = req.query.businessUnitId as string;
      const month = req.query.month as string; // Format: YYYY-MM

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
      doc.text(`Total Transactions: ${summary.totalTransactions || 0}`);
      doc.text(`Total Amount: ₹${parseFloat(summary.totalAmount || 0).toFixed(2)}`);
      doc.text(`Machines Used: ${summary.uniqueMachines || 0}`);
      doc.text(`Employee Cards Active: ${summary.uniqueCards || 0}`);
      doc.moveDown();

      // Transaction details
      if (transactions.length > 0) {
        doc.fontSize(16).text('Transaction Details', { underline: true });
        doc.fontSize(10);
        
        // Table header
        const startY = doc.y;
        doc.text('Date', 50, startY);
        doc.text('Time', 120, startY);
        doc.text('Card', 180, startY);
        doc.text('Machine', 220, startY);
        doc.text('Tea Type', 300, startY);
        doc.text('Amount', 380, startY);
        doc.text('Status', 430, startY);
        
        doc.moveTo(50, doc.y + 5).lineTo(500, doc.y + 5).stroke();
        doc.moveDown(0.5);

        // Transaction rows
        transactions.slice(0, 50).forEach((t: any, index: number) => {
          const y = doc.y;
          doc.text(new Date(t.createdAt).toLocaleDateString('en-IN'), 50, y);
          doc.text(new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), 120, y);
          doc.text(String(t.cardNumber || t.rfidCardId).substring(0, 8), 180, y);
          doc.text(String(t.machineName || t.machineId).substring(0, 12), 220, y);
          doc.text(String(t.teaType).substring(0, 12), 300, y);
          doc.text(`₹${t.amount}`, 380, y);
          doc.text(t.success ? 'OK' : 'Failed', 430, y);
          doc.moveDown(0.3);
          
          if (index % 20 === 19 && index < transactions.length - 1) {
            doc.addPage();
          }
        });

        if (transactions.length > 50) {
          doc.moveDown();
          doc.fontSize(10).text(`... and ${transactions.length - 50} more transactions`, { align: 'center', color: 'gray' });
        }
      }

      // Footer
      doc.fontSize(8).text('This is a system-generated invoice from UrbanKetl Tea Service Platform.', 50, doc.page.height - 50, { align: 'center', color: 'gray' });
      
      doc.end();
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });
}