import { Request, Response } from "express";
import { storage } from "../storage";

export async function getAllUsers(req: any, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const paginated = req.query.paginated === 'true';
    
    if (paginated) {
      const result = await storage.getUsersPaginated(page, limit, search);
      res.json(result);
    } else {
      const users = await storage.getAllUsers();
      res.json(users);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
}

export async function getDashboardStats(req: any, res: Response) {
  try {
    const stats = await storage.getDailyStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
}

export async function getAllRfidCards(req: any, res: Response) {
  try {
    const cards = await storage.getAllRfidCards();
    res.json(cards);
  } catch (error) {
    console.error('Error fetching RFID cards:', error);
    res.status(500).json({ message: 'Failed to fetch RFID cards' });
  }
}

export async function createRfidCard(req: any, res: Response) {
  try {
    const { userId, cardNumber } = req.body;
    const card = await storage.createRfidCardForUser(userId, cardNumber);
    res.json(card);
  } catch (error) {
    console.error('Error creating RFID card:', error);
    res.status(500).json({ message: 'Failed to create RFID card' });
  }
}

export async function deleteRfidCard(req: any, res: Response) {
  try {
    const cardId = parseInt(req.params.cardId);
    await storage.deactivateRfidCard(cardId);
    res.json({ message: 'RFID card deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating RFID card:', error);
    res.status(500).json({ message: 'Failed to deactivate RFID card' });
  }
}

export async function getSuggestedCardNumber(req: any, res: Response) {
  try {
    // Generate a suggested card number (UKTP + 4 digits)
    const timestamp = Date.now().toString().slice(-4);
    const cardNumber = `UKTP${timestamp}`;
    res.json({ cardNumber });
  } catch (error) {
    console.error('Error generating card number:', error);
    res.status(500).json({ message: 'Failed to generate card number' });
  }
}

export async function getSupportTicketsPaginated(req: any, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const paginated = req.query.paginated === 'true';
    
    if (paginated) {
      const result = await storage.getSupportTicketsPaginated(page, limit, status);
      res.json(result);
    } else {
      const tickets = await storage.getAllSupportTickets();
      res.json(tickets);
    }
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ message: 'Failed to fetch support tickets' });
  }
}