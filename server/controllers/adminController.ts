import { Request, Response } from "express";
import { storage } from "../storage";
import { generatePassword, hashPassword } from "../auth";
import { v4 as uuidv4 } from "uuid";

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

export async function getBusinessUnitBalances(req: any, res: Response) {
  try {
    const businessUnits = await storage.getAllBusinessUnits();
    
    // Map business units to include balance and last activity information
    const businessUnitBalances = businessUnits.map((unit: any) => ({
      id: unit.id,
      name: unit.name,
      code: unit.code,
      balance: parseFloat(unit.walletBalance || '0'),
      walletBalance: unit.walletBalance,
      contactEmail: unit.contactEmail,
      contactPhone: unit.contactPhone,
      address: unit.address,
      isActive: unit.isActive,
      createdAt: unit.createdAt,
      // Calculate status based on balance
      status: parseFloat(unit.walletBalance || '0') === 0 ? 'empty' 
             : parseFloat(unit.walletBalance || '0') <= 100 ? 'critical'
             : parseFloat(unit.walletBalance || '0') <= 500 ? 'low'
             : 'healthy'
    }));

    res.json(businessUnitBalances);
  } catch (error) {
    console.error('Error fetching business unit balances:', error);
    res.status(500).json({ message: 'Failed to fetch business unit balances' });
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

// Create user with password generation
export async function createUser(req: any, res: Response) {
  try {
    const { email, firstName, lastName, role } = req.body;
    
    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'Email, first name, last name, and role are required' });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Generate secure password
    const generatedPassword = generatePassword();
    const hashedPassword = await hashPassword(generatedPassword);

    // Generate user ID
    const userId = uuidv4();

    // Determine admin privileges based on role
    let isAdmin = false;
    let isSuperAdmin = false;
    
    switch (role) {
      case 'platform_admin':
        isAdmin = true;
        isSuperAdmin = true;
        break;
      case 'business_unit_admin':
        isAdmin = true;
        isSuperAdmin = false;
        break;
      case 'viewer':
        isAdmin = false;
        isSuperAdmin = false;
        break;
      default:
        return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Create user
    const user = await storage.upsertUser({
      id: userId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isAdmin,
      isSuperAdmin,
      requiresPasswordReset: true, // User must reset password on first login
    });

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
      },
      generatedPassword // Admin needs to share this with the user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

// Delete user
export async function deleteUser(req: any, res: Response) {
  try {
    const { userId } = req.params;
    
    // Check if user has business unit assignments
    const businessUnits = await storage.getUserBusinessUnits(userId);
    if (businessUnits.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with business unit assignments. Please transfer ownership first.' 
      });
    }

    await storage.deleteUser(userId);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

export async function getSupportTicketsPaginated(req: any, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const userId = req.query.userId as string;
    const dateFilter = req.query.dateFilter as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';
    const paginated = req.query.paginated === 'true';
    
    // Build filters object
    const filters = {
      status: status !== 'all' ? status : undefined,
      userId: userId !== 'all' ? userId : undefined,
      dateFilter,
      startDate,
      endDate,
      sortBy,
      sortOrder
    };
    
    // Debug: Log filter parsing
    console.log('Support tickets filters:', { status, userId, dateFilter, sortBy, sortOrder });
    
    if (paginated) {
      const result = await storage.getSupportTicketsPaginated(page, limit, filters);
      // Also get all tickets for unique users extraction
      const allTickets = await storage.getAllSupportTickets();
      res.json({ ...result, allTickets });
    } else {
      const tickets = await storage.getAllSupportTickets();
      res.json(tickets);
    }
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ message: 'Failed to fetch support tickets' });
  }
}

export async function updateUserAdminStatus(req: any, res: Response) {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;
    const currentUserId = req.user.id;
    
    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Prevent users from changing their own admin status
    if (userId === currentUserId) {
      return res.status(400).json({ message: 'Cannot change your own admin status' });
    }
    
    const updatedUser = await storage.updateUserAdminStatus(userId, isAdmin, currentUserId);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user admin status:', error);
    res.status(500).json({ message: 'Failed to update user admin status' });
  }
}

// Admin-only user creation
export async function createUserAccount(req: any, res: Response) {
  try {
    const { id, email, firstName, lastName, role } = req.body;
    const createdBy = req.user.id;

    if (!id || !email || !firstName || !lastName || !role) {
      return res.status(400).json({ 
        message: 'User ID, email, first name, last name, and role are required' 
      });
    }

    // Convert role to boolean flags
    const isAdmin = role === 'platform_admin' || role === 'business_unit_admin';
    const isSuperAdmin = role === 'platform_admin';

    const newUser = await storage.createUserAccount({
      id,
      email,
      firstName,
      lastName,
      isAdmin,
      isSuperAdmin,
      createdBy
    });

    res.json({ 
      user: newUser, 
      message: 'User account created successfully',
      credentials: {
        message: 'Share these Replit Auth credentials with the user',
        replitId: id,
        email: email,
        loginUrl: '/api/login'
      }
    });
  } catch (error) {
    console.error('Error creating user account:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to create user account' 
    });
  }
}

export async function deleteUserAccount(req: any, res: Response) {
  try {
    const { userId } = req.params;
    const deletedBy = req.user.id;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const result = await storage.deleteUserAccount(userId, deletedBy);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ message: 'Failed to delete user account' });
  }
}

// NEW: Centralized RFID Card Creation & Assignment
export async function createRfidCardBatch(req: any, res: Response) {
  try {
    const { businessUnitId, cardNumber, cardName, batchSize } = req.body;
    
    // Validate card number format for single card creation
    if (batchSize === 1) {
      if (!cardNumber || cardNumber.length < 6 || cardNumber.length > 20) {
        return res.status(400).json({ 
          message: 'Card number must be 6-20 characters long' 
        });
      }
      
      // Check format: only letters, numbers, underscore, hyphen
      if (!/^[A-Z0-9_-]+$/.test(cardNumber)) {
        return res.status(400).json({ 
          message: 'Card number can only contain letters, numbers, underscore, and hyphen' 
        });
      }
    }
    
    const result = await storage.createRfidCardBatch({
      businessUnitId,
      cardNumber,
      cardName,
      batchSize
    });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error creating RFID card batch:', error);
    res.status(500).json({ message: 'Failed to create RFID cards' });
  }
}

export async function assignRfidCard(req: any, res: Response) {
  try {
    const { cardId, businessUnitId } = req.body;
    
    if (!cardId || !businessUnitId) {
      return res.status(400).json({ message: 'Card ID and Business Unit ID are required' });
    }
    
    const result = await storage.assignRfidCardToBusinessUnit(cardId, businessUnitId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error assigning RFID card:', error);
    res.status(500).json({ message: 'Failed to assign RFID card' });
  }
}

export async function getBusinessUnits(req: any, res: Response) {
  try {
    const businessUnits = await storage.getAllBusinessUnits();
    res.json(businessUnits);
  } catch (error) {
    console.error('Error fetching business units:', error);
    res.status(500).json({ message: 'Failed to fetch business units' });
  }
}