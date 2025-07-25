import { Express, RequestHandler } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { insertRfidCardSchema, insertTeaMachineSchema } from "@shared/schema";
import { z } from "zod";

// B2B Corporate RFID Management Routes
export function registerCorporateRoutes(app: Express) {
  
  // Get business unit admin's managed RFID cards (with pseudo login support)
  app.get("/api/corporate/rfid-cards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
      const cards = await storage.getManagedRfidCards(userId);
      res.json(cards);
    } catch (error) {
      console.error("Error fetching managed RFID cards:", error);
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

  // Get business unit admin's managed machines (with pseudo login support)
  app.get("/api/corporate/machines", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
      const machines = await storage.getManagedMachines(userId);
      res.json(machines);
    } catch (error) {
      console.error("Error fetching managed machines:", error);
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

  // Get business unit admin's dispensing logs (with pseudo login support)
  app.get("/api/corporate/dispensing-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.query.pseudo || req.session?.user?.id || req.user?.claims?.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getManagedDispensingLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching managed dispensing logs:", error);
      res.status(500).json({ error: "Failed to fetch dispensing logs" });
    }
  });
}