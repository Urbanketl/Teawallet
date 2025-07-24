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
import analyticsRoutes from "./routes/analyticsRoutes";
import * as adminController from "./controllers/adminController";
import { requireAuth, requireAdmin } from "./controllers/authController";
import { registerCorporateRoutes } from "./routes/corporateRoutes";

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
  app.use('/api/analytics', analyticsRoutes);
  
  // Register B2B Corporate routes
  registerCorporateRoutes(app);

  // Admin routes - require authentication and admin privileges
  app.get('/api/admin/users', requireAuth, requireAdmin, adminController.getAllUsers);
  app.patch('/api/admin/users/:userId/admin-status', requireAuth, requireAdmin, adminController.updateUserAdminStatus);
  app.get('/api/admin/stats', requireAuth, requireAdmin, adminController.getDashboardStats);
  app.get('/api/admin/rfid/cards', requireAuth, requireAdmin, adminController.getAllRfidCards);
  app.post('/api/admin/rfid/cards', requireAuth, requireAdmin, adminController.createRfidCard);
  app.delete('/api/admin/rfid/cards/:cardId', requireAuth, requireAdmin, adminController.deleteRfidCard);
  app.get('/api/admin/rfid/suggest-card-number', requireAuth, requireAdmin, adminController.getSuggestedCardNumber);
  
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
      const userId = req.session?.user?.id || req.user.claims.sub;
      
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
      const userId = req.session?.user?.id || req.user.claims.sub;
      
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

      // Check max wallet limit before creating order
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const maxWalletBalanceStr = await storage.getSystemSetting('max_wallet_balance') || '5000.00';
      const maxWalletBalance = parseFloat(maxWalletBalanceStr);
      const currentBalance = parseFloat(user.walletBalance || '0');
      const newBalance = currentBalance + amount;

      if (newBalance > maxWalletBalance) {
        return res.status(400).json({ 
          message: `Cannot recharge. Maximum wallet balance is ₹${maxWalletBalance}. Current balance: ₹${currentBalance}. You can add up to ₹${(maxWalletBalance - currentBalance).toFixed(2)} more.`,
          maxBalance: maxWalletBalance,
          currentBalance: currentBalance,
          maxAllowedRecharge: maxWalletBalance - currentBalance
        });
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

  app.put('/api/rfid/card/:cardId/deactivate', isAuthenticated, async (req: any, res) => {
    try {
      const { cardId } = req.params;
      const userId = req.user.claims.sub;
      
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

  // Get tea prices for a specific machine
  app.get('/api/machines/:machineId/tea-prices', async (req, res) => {
    try {
      const { machineId } = req.params;
      const machine = await storage.getTeaMachine(machineId);
      
      if (!machine) {
        return res.status(404).json({ 
          success: false, 
          message: "Machine not found" 
        });
      }

      res.json({ 
        success: true, 
        machineId: machine.id,
        teaTypes: machine.teaTypes || [],
        location: machine.location
      });
    } catch (error) {
      console.error("Error fetching tea prices:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch tea prices" 
      });
    }
  });

  // RFID validation endpoint for tea machines
  app.post('/api/rfid/validate', async (req, res) => {
    try {
      const { cardNumber, machineId, teaType, amount } = req.body;

      if (!cardNumber || !machineId || !teaType) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required parameters" 
        });
      }

      // Get machine details to validate tea type and price
      const machine = await storage.getTeaMachine(machineId);
      if (!machine) {
        return res.status(404).json({ 
          success: false, 
          message: "Machine not found" 
        });
      }

      // Validate tea type and get correct price from machine configuration
      let teaAmount = 0;
      if (machine.teaTypes && Array.isArray(machine.teaTypes)) {
        const teaConfig = machine.teaTypes.find((tea: any) => tea.name === teaType);
        if (!teaConfig) {
          return res.status(400).json({ 
            success: false, 
            message: `Tea type '${teaType}' not available on this machine` 
          });
        }
        teaAmount = parseFloat(teaConfig.price);
      } else {
        // Fallback to provided amount if machine doesn't have price configuration
        if (!amount) {
          return res.status(400).json({ 
            success: false, 
            message: "Amount required when machine has no price configuration" 
          });
        }
        teaAmount = parseFloat(amount);
      }

      // Get RFID card
      const card = await storage.getRfidCardByNumber(cardNumber);
      if (!card) {
        return res.status(404).json({ 
          success: false, 
          message: "Invalid RFID card" 
        });
      }

      // Get user and check balance (using business unit admin ID since cards belong to business units)
      const user = await storage.getUser(card.businessUnitAdminId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      const balance = parseFloat(user.walletBalance || "0");

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
        amount: teaAmount.toString(),
        description: `${teaType} Tea`,
        method: 'rfid',
        rfidCardId: card.id,
        machineId,
        status: 'completed',
      });

      // Create dispensing log (business unit admin is charged)
      await storage.createDispensingLog({
        businessUnitAdminId: user.id,
        rfidCardId: card.id,
        machineId,
        teaType,
        amount: teaAmount.toString(),
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

  // Note: Support routes are now handled by the supportRoutes module above

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

      const { start, end } = req.query;
      
      // Super admins see all data, regular admins see only their business unit data
      const businessUnitAdminId = user.isSuperAdmin ? undefined : userId;
      
      const popularTeas = await storage.getPopularTeaTypes(start as string, end as string, businessUnitAdminId);
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

  app.get('/api/analytics/machine-performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
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

  app.get('/api/analytics/user-behavior', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
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

  app.get('/api/analytics/machine-dispensing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
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

  const httpServer = createServer(app);
  return httpServer;
}
