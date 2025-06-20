import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Low balance alert threshold (should be configurable via admin settings)
const LOW_BALANCE_THRESHOLD = 50.00;

async function checkAndSendLowBalanceAlert(user: any) {
  const balance = parseFloat(user.walletBalance || '0');
  
  if (balance <= LOW_BALANCE_THRESHOLD) {
    console.log(`Low balance alert for user ${user.id}: ₹${balance}`);
    
    // In a real implementation, this would:
    // 1. Send push notification via Firebase/Expo
    // 2. Send email notification
    // 3. Create in-app notification
    // 4. Log the alert event
    
    // For now, we'll create a notification record
    try {
      await storage.createTransaction({
        userId: user.id,
        type: 'system_alert',
        amount: '0.00',
        description: `Low balance alert: ₹${balance}`,
        status: 'completed',
      });
    } catch (error) {
      console.error('Failed to log low balance alert:', error);
    }
  }
}
import { insertTransactionSchema, insertDispensingLogSchema } from "@shared/schema";
import { createOrder, verifyPayment, initializeRazorpay } from "./razorpay";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Razorpay
  initializeRazorpay();
  
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

  // Profile routes
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Wallet routes
  app.post('/api/wallet/create-order', isAuthenticated, async (req: any, res) => {
    try {
      const { amount } = req.body;
      const userId = req.user.claims.sub;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      const order = await createOrder(amount);
      
      res.json({
        success: true,
        order,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  app.post('/api/wallet/verify-payment', isAuthenticated, async (req: any, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
      const userId = req.user.claims.sub;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
        return res.status(400).json({ message: "Missing payment verification data" });
      }

      const isValidSignature = await verifyPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValidSignature) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      // Create transaction record
      await storage.createTransaction({
        userId,
        type: 'recharge',
        amount: amount.toString(),
        description: 'Wallet Recharge',
        method: 'razorpay',
        razorpayPaymentId: razorpay_payment_id,
        status: 'completed',
      });

      // Update wallet balance
      const updatedUser = await storage.updateWalletBalance(userId, amount.toString());

      res.json({ 
        success: true, 
        balance: updatedUser.walletBalance,
        message: 'Payment verified and wallet recharged successfully'
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

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

      // Check for low balance after recharge (in case it's still low)
      await checkAndSendLowBalanceAlert(updatedUser);

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
