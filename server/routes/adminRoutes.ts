import { Request, Response } from "express";
import { storage } from "../storage";

// Get all users
export async function getAllUsers(req: Request, res: Response) {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
}

// Get all RFID cards
export async function getAllRfidCards(req: Request, res: Response) {
  try {
    const cards = await storage.getAllRfidCards();
    res.json(cards);
  } catch (error) {
    console.error('Error fetching RFID cards:', error);
    res.status(500).json({ message: "Failed to fetch RFID cards" });
  }
}

// Create RFID card
export async function createRfidCard(req: Request, res: Response) {
  try {
    const { userId, cardNumber } = req.body;
    
    if (!userId || !cardNumber) {
      return res.status(400).json({ message: "User ID and card number are required" });
    }

    // Check if card number already exists
    const existingCard = await storage.getRfidCardByNumber(cardNumber);
    if (existingCard) {
      return res.status(400).json({ message: "Card number already exists" });
    }

    const newCard = await storage.createRfidCardForUser(userId, cardNumber);
    res.json(newCard);
  } catch (error) {
    console.error('Error creating RFID card:', error);
    res.status(500).json({ message: "Failed to create RFID card" });
  }
}

// Generate card number
export function generateCardNumber(companyInitials: string, userInitials: string, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(4, '0');
  return `${companyInitials}${userInitials}${paddedSequence}`;
}

// Get suggested card number
export async function getSuggestedCardNumber(req: Request, res: Response) {
  try {
    const { userId, companyInitials, userInitials } = req.query;
    
    if (!userId || !companyInitials || !userInitials) {
      return res.status(400).json({ message: "User ID, company initials, and user initials are required" });
    }

    // Get existing cards for this user to determine sequence
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

// Delete RFID card
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

// System Settings Management
export async function getSystemSettings(req: Request, res: Response) {
  try {
    const settings = await storage.getAllSystemSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ message: 'Failed to fetch system settings' });
  }
}

export async function updateSystemSetting(req: Request, res: Response) {
  try {
    const { key, value } = req.body;
    const userId = (req as any).user?.id;
    
    if (!key || !value) {
      return res.status(400).json({ message: 'Key and value are required' });
    }

    await storage.updateSystemSetting(key, value, userId || 'admin');
    res.json({ message: 'System setting updated successfully' });
  } catch (error) {
    console.error('Error updating system setting:', error);
    res.status(500).json({ message: 'Failed to update system setting' });
  }
}