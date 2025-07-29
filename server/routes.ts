import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
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
    console.warn("Razorpay initialization failed:", (error as Error).message);
  }
  
  // Auth middleware
  await setupAuth(app);

  // Register route modules
  app.use('/api/auth', authRoutes);
  // Note: /api/transactions is now handled by corporateRoutes with business unit filtering
  app.use('/api/support', supportRoutes);
  app.use('/api/analytics', analyticsRoutes);
  
  // Register B2B Corporate routes
  registerCorporateRoutes(app);

  // Admin routes - require authentication and admin privileges
  app.get('/api/admin/users', requireAuth, requireAdmin, adminController.getAllUsers);
  app.post('/api/admin/users', requireAuth, requireAdmin, adminController.createUserAccount);
  app.delete('/api/admin/users/:userId', requireAuth, requireAdmin, adminController.deleteUserAccount);
  app.patch('/api/admin/users/:userId/admin-status', requireAuth, requireAdmin, adminController.updateUserAdminStatus);
  app.get('/api/admin/stats', requireAuth, requireAdmin, adminController.getDashboardStats);
  app.get('/api/admin/rfid/cards', requireAuth, requireAdmin, async (req: any, res) => {
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
        const result = await storage.getAllRfidCardsPaginatedWithFilters({
          page,
          limit,
          search,
          status,
          assignment,
          businessUnitId,
          sortBy,
          sortOrder
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
  
  // NEW: Centralized RFID Card Creation & Assignment (Platform Admin Only)
  app.post('/api/admin/rfid/cards/create-batch', requireAuth, requireAdmin, adminController.createRfidCardBatch);
  app.post('/api/admin/rfid/cards/assign', requireAuth, requireAdmin, adminController.assignRfidCard);
  app.get('/api/admin/business-units', requireAuth, requireAdmin, adminController.getBusinessUnits);
  
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

  // Wallet routes - DEPRECATED: Use business unit wallet endpoints instead
  app.post('/api/wallet/create-order', isAuthenticated, async (req: any, res) => {
    try {
      return res.status(400).json({ 
        message: "This endpoint is deprecated. Use /api/wallet/create-order with businessUnitId parameter instead" 
      });
    } catch (error) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  app.post('/api/wallet/verify-payment', isAuthenticated, async (req: any, res) => {
    try {
      return res.status(400).json({ 
        message: "This endpoint is deprecated. Use business unit wallet endpoints instead" 
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  app.post('/api/wallet/recharge', isAuthenticated, async (req: any, res) => {
    try {
      return res.status(400).json({ 
        message: "This endpoint is deprecated. Use business unit wallet endpoints instead" 
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

      return res.status(400).json({ 
        message: "This endpoint is deprecated. Use business unit wallet endpoints instead" 
      });
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      res.status(500).json({ message: "Failed to fetch wallet balance" });
    }
  });

  // Transaction routes are now handled in corporateRoutes.ts with enhanced business unit filtering

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

  // RFID validation endpoint for tea machines
  app.post('/api/rfid/validate', async (req, res) => {
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

      // Get business unit and check balance (cards belong to business units)
      const businessUnit = await storage.getBusinessUnit(card.businessUnitId);
      if (!businessUnit) {
        return res.status(404).json({ 
          success: false, 
          message: "Business unit not found" 
        });
      }

      const balance = parseFloat(businessUnit.walletBalance || "0");

      // CRITICAL: Use atomic transaction for billing accuracy
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
      const userId = req.user.claims.sub;
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

  // Get next available machine ID (Admin only)
  app.get('/api/admin/machines/next-id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Update machine tea pricing (Admin only)
  app.patch('/api/admin/machines/:machineId/pricing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin && !user?.isSuperAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { machineId } = req.params;
      const { teaTypes } = req.body;

      if (!teaTypes || !Array.isArray(teaTypes)) {
        return res.status(400).json({ message: "teaTypes array is required" });
      }

      // Validate tea types format
      for (const tea of teaTypes) {
        if (!tea.name || !tea.price || isNaN(parseFloat(tea.price))) {
          return res.status(400).json({ message: "Each tea type must have name and valid price" });
        }
      }

      await storage.updateMachineTeaTypes(machineId, teaTypes);
      res.json({ success: true, message: "Machine pricing updated successfully" });
    } catch (error) {
      console.error("Error updating machine pricing:", error);
      res.status(500).json({ message: "Failed to update machine pricing" });
    }
  });


  // Loyalty and badge features not implemented yet

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

  // Analytics routes for admin (removed popular tea types - only serve Regular Tea)

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

  // Enhanced Analytics Routes
  app.get('/api/analytics/business-unit-comparison', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
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

  app.get('/api/analytics/revenue-trends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
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

  app.get('/api/analytics/usage-trends/:businessUnitId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
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
  app.get('/api/admin/business-units', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user.claims.sub;
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
      const userId = req.session?.user?.id || req.user.claims.sub;
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
      const userId = req.session?.user?.id || req.user.claims.sub;
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
      const userId = req.session?.user?.id || req.user.claims.sub;
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
      const userId = req.session?.user?.id || req.user.claims.sub;
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
      const userId = req.session?.user?.id || req.user.claims.sub;
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
      const userId = req.session?.user?.id || req.user.claims.sub;
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
      const adminUserId = req.session?.user?.id || req.user.claims.sub;
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
      const userId = req.session?.user?.id || req.user.claims.sub;
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
      const userId = req.session?.user?.id || req.user.claims.sub;
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
      
      const adminId = req.user.claims.sub;
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
      const adminId = req.user.claims.sub;
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
      const adminId = req.user.claims.sub;
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

  // Serve tea machine simulator directly from server
  app.get('/tea-machine-simulator', (req, res) => {
    res.sendFile(path.join(__dirname, '../tea-machine-simulator.html'));
  });

  const httpServer = createServer(app);
  return httpServer;
}
