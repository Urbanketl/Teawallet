import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { initializeRazorpay, createOrder, verifyPayment } from "./razorpay";
import { storage } from "./storage";
import { insertDispensingLogSchema } from "@shared/schema";

// Import route modules
import authRoutes from "./routes/authRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import supportRoutes from "./routes/supportRoutes";
import adminRoutes from "./routes/adminRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Razorpay
  try {
    initializeRazorpay();
  } catch (error) {
    console.warn("Razorpay initialization failed:", error.message);
  }
  
  // Auth middleware
  await setupAuth(app);

  // Register route modules
  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Legacy routes (keeping for backward compatibility)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Handle demo session
      if (req.session?.user) {
        return res.json(req.session.user);
      }
      
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

  app.get('/api/rfid/cards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cards = await storage.getAllRfidCardsByUserId(userId);
      res.json(cards);
    } catch (error) {
      console.error("Error fetching RFID cards:", error);
      res.status(500).json({ message: "Failed to fetch RFID cards" });
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


  // Loyalty routes
  app.get('/api/loyalty/points', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
      const points = await storage.getUserLoyaltyPoints(userId);
      res.json({ points });
    } catch (error) {
      console.error("Error fetching loyalty points:", error);
      res.status(500).json({ message: "Failed to fetch loyalty points" });
    }
  });

  app.get('/api/loyalty/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getLoyaltyHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching loyalty history:", error);
      res.status(500).json({ message: "Failed to fetch loyalty history" });
    }
  });

  // Badge routes
  app.get('/api/badges', async (req, res) => {
    try {
      const badges = await storage.getAllBadges();
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  app.get('/api/badges/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
      const userBadges = await storage.getUserBadges(userId);
      res.json(userBadges);
    } catch (error) {
      console.error("Error fetching user badges:", error);
      res.status(500).json({ message: "Failed to fetch user badges" });
    }
  });

  // Support routes
  app.post('/api/support/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
      const { subject, description, category, priority } = req.body;
      
      if (!subject || !description) {
        return res.status(400).json({ message: "Subject and description are required" });
      }
      
      const ticket = await storage.createSupportTicket({
        userId,
        subject,
        description,
        category,
        priority: priority || 'medium',
      });

      console.log('Ticket created successfully:', ticket);
      res.json(ticket);
    } catch (error) {
      console.error("Error creating support ticket:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ message: "Failed to create support ticket", error: error.message });
    }
  });

  app.get('/api/support/tickets/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
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
      const userId = req.session?.user?.id || req.user.claims.sub;
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

  // Analytics routes for admin
  app.get('/api/analytics/popular-teas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const popularTeas = await storage.getPopularTeaTypes();
      res.json(popularTeas);
    } catch (error) {
      console.error("Error fetching popular tea types:", error);
      res.status(500).json({ message: "Failed to fetch popular tea types" });
    }
  });

  app.get('/api/analytics/peak-hours', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const peakHours = await storage.getPeakHours();
      res.json(peakHours);
    } catch (error) {
      console.error("Error fetching peak hours:", error);
      res.status(500).json({ message: "Failed to fetch peak hours" });
    }
  });

  app.get('/api/analytics/machine-performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const performance = await storage.getMachinePerformance();
      res.json(performance);
    } catch (error) {
      console.error("Error fetching machine performance:", error);
      res.status(500).json({ message: "Failed to fetch machine performance" });
    }
  });

  app.get('/api/analytics/user-behavior', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const insights = await storage.getUserBehaviorInsights();
      res.json(insights);
    } catch (error) {
      console.error("Error fetching user behavior insights:", error);
      res.status(500).json({ message: "Failed to fetch user behavior insights" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
