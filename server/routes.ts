import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTransactionSchema, insertDispensingLogSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Wallet routes
  app.post('/api/wallet/recharge', isAuthenticated, async (req: any, res) => {
    try {
      const { amount, razorpayPaymentId } = req.body;
      const userId = req.user.claims.sub;

      // Validate input
      if (!amount || !razorpayPaymentId) {
        return res.status(400).json({ message: "Amount and payment ID are required" });
      }

      // Create transaction record
      await storage.createTransaction({
        userId,
        type: 'recharge',
        amount: amount.toString(),
        description: 'Wallet Recharge',
        method: 'razorpay',
        razorpayPaymentId,
        status: 'completed',
      });

      // Update wallet balance
      const updatedUser = await storage.updateWalletBalance(userId, amount.toString());

      res.json({ 
        success: true, 
        balance: updatedUser.walletBalance,
        message: 'Wallet recharged successfully'
      });
    } catch (error) {
      console.error("Error recharging wallet:", error);
      res.status(500).json({ message: "Failed to recharge wallet" });
    }
  });

  app.get('/api/wallet/balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ balance: user.walletBalance });
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      res.status(500).json({ message: "Failed to fetch wallet balance" });
    }
  });

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const transactions = await storage.getUserTransactions(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // RFID routes
  app.get('/api/rfid/card', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/rfid/assign', isAuthenticated, async (req: any, res) => {
    try {
      const { cardNumber } = req.body;
      const userId = req.user.claims.sub;

      if (!cardNumber) {
        return res.status(400).json({ message: "Card number is required" });
      }

      // Check if card already exists
      const existingCard = await storage.getRfidCardByNumber(cardNumber);
      if (existingCard) {
        return res.status(400).json({ message: "Card already assigned" });
      }

      // Create new RFID card
      const newCard = await storage.createRfidCard({
        userId,
        cardNumber,
        isActive: true,
      });

      res.json(newCard);
    } catch (error) {
      console.error("Error assigning RFID card:", error);
      res.status(500).json({ message: "Failed to assign RFID card" });
    }
  });

  // RFID validation endpoint for tea machines
  app.post('/api/rfid/validate', async (req, res) => {
    try {
      const { cardNumber, machineId, teaType, amount } = req.body;

      if (!cardNumber || !machineId || !teaType || !amount) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required parameters" 
        });
      }

      // Get RFID card
      const card = await storage.getRfidCardByNumber(cardNumber);
      if (!card) {
        return res.status(404).json({ 
          success: false, 
          message: "Invalid RFID card" 
        });
      }

      // Get user and check balance
      const user = await storage.getUser(card.userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      const balance = parseFloat(user.walletBalance || "0");
      const teaAmount = parseFloat(amount);

      if (balance < teaAmount) {
        return res.status(400).json({ 
          success: false, 
          message: "Insufficient wallet balance" 
        });
      }

      // Deduct amount from wallet
      await storage.updateWalletBalance(user.id, (-teaAmount).toString());

      // Create transaction record
      await storage.createTransaction({
        userId: user.id,
        type: 'dispensing',
        amount: amount.toString(),
        description: `${teaType} Tea`,
        method: 'rfid',
        rfidCardId: card.id,
        machineId,
        status: 'completed',
      });

      // Create dispensing log
      await storage.createDispensingLog({
        userId: user.id,
        rfidCardId: card.id,
        machineId,
        teaType,
        amount: amount.toString(),
        success: true,
      });

      // Update card last used
      await storage.updateRfidCardLastUsed(card.id, machineId);

      // Update machine ping
      await storage.updateMachinePing(machineId);

      res.json({ 
        success: true, 
        message: "Tea dispensed successfully",
        remainingBalance: (balance - teaAmount).toFixed(2)
      });

    } catch (error) {
      console.error("Error validating RFID:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  });

  // Dispensing history
  app.get('/api/dispensing/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const logs = await storage.getUserDispensingLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching dispensing history:", error);
      res.status(500).json({ message: "Failed to fetch dispensing history" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = await storage.getDailyStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/machines', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const machines = await storage.getAllTeaMachines();
      res.json(machines);
    } catch (error) {
      console.error("Error fetching machines:", error);
      res.status(500).json({ message: "Failed to fetch machines" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
