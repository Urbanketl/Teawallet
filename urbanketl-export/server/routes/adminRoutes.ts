import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/authController";
import { storage } from "../storage";

const router = Router();

// All admin routes require admin access
router.use(requireAuth);
router.use(requireAdmin);

// Admin user management
router.get('/users', async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Admin stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await storage.getDailyStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Failed to fetch admin stats" });
  }
});

// Admin machine management
router.get('/machines', async (req, res) => {
  try {
    const machines = await storage.getAllTeaMachines();
    res.json(machines);
  } catch (error) {
    console.error("Error fetching machines:", error);
    res.status(500).json({ message: "Failed to fetch machines" });
  }
});

// Admin support ticket management
router.get('/support/tickets', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const tickets = await storage.getAllSupportTickets();
    
    let filteredTickets = tickets;
    if (dateFrom || dateTo) {
      filteredTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        if (dateFrom && ticketDate < new Date(dateFrom as string)) return false;
        if (dateTo && ticketDate > new Date(dateTo as string)) return false;
        return true;
      });
    }
    
    res.json(filteredTickets);
  } catch (error) {
    console.error("Error fetching admin support tickets:", error);
    res.status(500).json({ message: "Failed to fetch support tickets" });
  }
});

router.put('/support/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const updates = req.body;
    
    const updatedTicket = await storage.updateSupportTicket(Number(ticketId), updates);
    res.json(updatedTicket);
  } catch (error) {
    console.error("Error updating support ticket:", error);
    res.status(500).json({ message: "Failed to update support ticket" });
  }
});

export default router;