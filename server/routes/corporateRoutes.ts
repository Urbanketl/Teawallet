import { Express, RequestHandler } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { insertRfidCardSchema, insertTeaMachineSchema } from "@shared/schema";
import { z } from "zod";

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
      console.log(`Query params:`, req.query);

      let transactions;
      if (businessUnitId && businessUnitId !== 'null' && businessUnitId !== 'undefined') {
        // Get transactions for specific business unit
        console.log(`Filtering transactions for business unit: ${businessUnitId}`);
        transactions = await storage.getBusinessUnitTransactions(businessUnitId, limit);
        console.log(`Found ${transactions.length} transactions for business unit ${businessUnitId}`);
        console.log(`Sample transaction IDs:`, transactions.slice(0, 3).map(t => `${t.id}(${t.description?.substring(0, 30)})`));
      } else {
        // Get transactions for all user's business units
        console.log(`Getting all transactions for user: ${userId}`);
        transactions = await storage.getUserTransactions(userId, limit);
        console.log(`Found ${transactions.length} transactions for user ${userId}`);
      }
      res.json(transactions);
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

      let dispensingLogs;
      if (businessUnitId) {
        // Get dispensing logs for specific business unit
        dispensingLogs = await storage.getBusinessUnitDispensingLogs(businessUnitId, limit);
      } else {
        // Get dispensing logs for all user's business units
        dispensingLogs = await storage.getUserDispensingLogs(userId, limit);
      }
      res.json(dispensingLogs);
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
}