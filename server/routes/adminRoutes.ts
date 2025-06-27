import { Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth, requireAdmin } from '../controllers/authController';
import { z } from 'zod';

// Validation schemas
const createRfidCardSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  cardNumber: z.string().min(1, 'Card number is required').max(20, 'Card number too long'),
});

// Get all users for admin management
export async function getAllUsers(req: Request, res: Response) {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
}

// Get all RFID cards for admin management
export async function getAllRfidCards(req: Request, res: Response) {
  try {
    const cards = await storage.getAllRfidCards();
    res.json(cards);
  } catch (error) {
    console.error('Error fetching RFID cards:', error);
    res.status(500).json({ message: 'Failed to fetch RFID cards' });
  }
}

// Create new RFID card for a user
export async function createRfidCard(req: Request, res: Response) {
  try {
    const validation = createRfidCardSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid input', 
        errors: validation.error.errors 
      });
    }

    const { userId, cardNumber } = validation.data;

    // Check if card number already exists
    const existingCard = await storage.getRfidCardByNumber(cardNumber);
    if (existingCard) {
      return res.status(400).json({ message: 'Card number already exists' });
    }

    // Check if user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create the card
    const newCard = await storage.createRfidCardForUser(userId, cardNumber);
    
    res.status(201).json({
      message: 'RFID card created successfully',
      card: newCard
    });
  } catch (error) {
    console.error('Error creating RFID card:', error);
    res.status(500).json({ message: 'Failed to create RFID card' });
  }
}

// Generate card number helper function
export function generateCardNumber(companyInitials: string, userInitials: string, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(4, '0');
  return `${companyInitials.toUpperCase()}${userInitials.toUpperCase()}${paddedSequence}`;
}

// Get suggested card number
export async function getSuggestedCardNumber(req: Request, res: Response) {
  try {
    const { userId, companyInitials, userInitials } = req.query;

    if (!userId || !companyInitials || !userInitials) {
      return res.status(400).json({ 
        message: 'userId, companyInitials, and userInitials are required' 
      });
    }

    // Get existing cards for this user to find next sequence number
    const existingCards = await storage.getAllRfidCardsByUserId(userId as string);
    const sequenceNumber = existingCards.length + 1;

    const suggestedCardNumber = generateCardNumber(
      companyInitials as string, 
      userInitials as string, 
      sequenceNumber
    );

    // Check if this number already exists and increment if needed
    let finalCardNumber = suggestedCardNumber;
    let counter = sequenceNumber;
    
    while (await storage.getRfidCardByNumber(finalCardNumber)) {
      counter++;
      finalCardNumber = generateCardNumber(
        companyInitials as string, 
        userInitials as string, 
        counter
      );
    }

    res.json({ suggestedCardNumber: finalCardNumber });
  } catch (error) {
    console.error('Error generating card number:', error);
    res.status(500).json({ message: 'Failed to generate card number' });
  }
}

export async function deleteRfidCard(req: Request, res: Response) {
  try {
    const { cardId } = req.params;
    
    if (!cardId) {
      return res.status(400).json({ message: "Card ID is required" });
    }

    await storage.deactivateRfidCard(parseInt(cardId));
    res.json({ message: "RFID card deleted successfully" });
  } catch (error) {
    console.error('Error deleting RFID card:', error);
    res.status(500).json({ message: "Failed to delete RFID card" });
  }
}

export { getAllUsers, getAllRfidCards, createRfidCard, generateCardNumber, getSuggestedCardNumber, getDashboardStats, deleteRfidCard };

// Get admin dashboard stats
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const stats = await storage.getDailyStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
}