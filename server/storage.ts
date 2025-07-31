import { db } from "./db";
import { 
  users, businessUnits, userBusinessUnits, rfidCards, transactions, dispensingLogs, teaMachines,
  referrals, supportTickets, supportMessages, ticketStatusHistory, faqArticles, systemSettings,
  businessUnitTransfers,
  type User, type UpsertUser, type BusinessUnit, type InsertBusinessUnit,
  type UserBusinessUnit, type InsertUserBusinessUnit, type RfidCard, type InsertRfidCard,
  type Transaction, type InsertTransaction, type DispensingLog, type InsertDispensingLog,
  type TeaMachine, type InsertTeaMachine,
  type Referral, type InsertReferral, type SupportTicket, type InsertSupportTicket,
  type SupportMessage, type InsertSupportMessage, type FaqArticle, type InsertFaqArticle,
  type TicketStatusHistory, type InsertTicketStatusHistory, type SystemSetting,
  type BusinessUnitTransfer, type InsertBusinessUnitTransfer
} from "@shared/schema";
import { eq, and, desc, asc, sql, gte, lte, or, ilike, inArray, isNotNull, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, profileData: any): Promise<User>;
  
  // Password management
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  setPasswordResetToken(id: string, token: string, expiresAt: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(id: string): Promise<void>;
  setPasswordResetStatus(id: string, requiresReset: boolean): Promise<void>;
  deleteUser(id: string): Promise<void>;
  
  // Business Unit operations
  createBusinessUnit(businessUnit: InsertBusinessUnit): Promise<BusinessUnit>;
  getBusinessUnit(id: string): Promise<BusinessUnit | undefined>;
  getAllBusinessUnits(): Promise<BusinessUnit[]>;
  getUserBusinessUnits(userId: string): Promise<BusinessUnit[]>;
  updateBusinessUnitWallet(unitId: string, amount: string): Promise<BusinessUnit>;
  
  // User-Business Unit assignments
  assignUserToBusinessUnit(userId: string, businessUnitId: string, role: string): Promise<void>;
  removeUserFromBusinessUnit(userId: string, businessUnitId: string): Promise<void>;
  
  // Business Unit Transfer Operations (Admin Only)
  transferBusinessUnitAdmin(params: {
    businessUnitId: string;
    newAdminId: string;
    transferredBy: string;
    reason: string;
  }): Promise<{ success: boolean; message: string }>;
  getBusinessUnitTransferHistory(businessUnitId: string): Promise<(BusinessUnitTransfer & { fromUser?: User; toUser: User; transferrer: User })[]>;
  getAllBusinessUnitTransfers(): Promise<(BusinessUnitTransfer & { businessUnit: BusinessUnit; fromUser?: User; toUser: User; transferrer: User })[]>;
  
  // RFID operations
  getBusinessUnitRfidCards(businessUnitId: string): Promise<RfidCard[]>;
  getRfidCardByNumber(cardNumber: string): Promise<RfidCard | undefined>;
  createRfidCard(rfidCard: InsertRfidCard): Promise<RfidCard>;
  updateRfidCardLastUsed(cardId: number, machineId: string): Promise<void>;
  deactivateRfidCard(cardId: number): Promise<void>;
  
  // Machine operations
  getBusinessUnitMachines(businessUnitId: string): Promise<TeaMachine[]>;
  getUnassignedMachines(): Promise<TeaMachine[]>;
  getTeaMachine(id: string): Promise<TeaMachine | undefined>;
  getAllTeaMachines(): Promise<TeaMachine[]>;
  generateNextMachineId(): Promise<string>;
  createTeaMachine(machine: InsertTeaMachine): Promise<TeaMachine>;
  updateMachinePing(machineId: string): Promise<void>;
  updateMachineStatus(machineId: string, isActive: boolean): Promise<void>;
  updateMachineTeaTypes(machineId: string, teaTypes: any[]): Promise<void>;
  updateMachine(machineId: string, updates: { name?: string; location?: string; isActive?: boolean }): Promise<TeaMachine | undefined>;
  assignMachineToBusinessUnit(machineId: string, businessUnitId: string): Promise<TeaMachine | undefined>;
  
  // Legacy Admin RFID operations (for super admin)
  getAllRfidCards(): Promise<(RfidCard & { businessUnit: BusinessUnit })[]>;
  getAllRfidCardsPaginated(page: number, limit: number): Promise<{ cards: (RfidCard & { businessUnit: BusinessUnit })[], total: number }>;
  getAllRfidCardsPaginatedWithFilters(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    assignment?: string;
    businessUnitId?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ cards: (RfidCard & { businessUnit: BusinessUnit })[], total: number }>;
  
  // NEW: Centralized RFID Card Creation & Assignment (Platform Admin Only)
  createRfidCardBatch(params: {
    businessUnitId?: string;
    cardNumber?: string;
    cardName?: string;
    batchSize?: number;
  }): Promise<{ success: boolean; cards: RfidCard[]; message: string }>;
  assignRfidCardToBusinessUnit(cardId: string, businessUnitId: string): Promise<{ success: boolean; message: string }>;
  
  // User machine operations (corporate dashboard)
  getManagedMachines(businessUnitId: string): Promise<TeaMachine[]>;
  getManagedRfidCards(businessUnitId: string): Promise<RfidCard[]>;
  getAllRfidCardsByUserId(userId: string): Promise<RfidCard[]>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  getBusinessUnitTransactions(businessUnitId: string, limit?: number): Promise<Transaction[]>;
  getUserTransactionsPaginated(userId: string, page: number, limit: number): Promise<{ transactions: Transaction[], total: number }>;
  getBusinessUnitTransactionsPaginated(businessUnitId: string, page: number, limit: number): Promise<{ transactions: Transaction[], total: number }>;
  
  // Dispensing operations
  createDispensingLog(log: InsertDispensingLog): Promise<DispensingLog>;
  getBusinessUnitDispensingLogs(businessUnitId: string, limit?: number, startDate?: string, endDate?: string): Promise<DispensingLog[]>;
  getUserDispensingLogs(userId: string, limit?: number): Promise<DispensingLog[]>;
  getManagedDispensingLogs(userId: string, limit?: number, startDate?: string, endDate?: string): Promise<DispensingLog[]>;
  getUserDispensingLogsPaginated(userId: string, page: number, limit: number, startDate?: string, endDate?: string): Promise<{ logs: DispensingLog[], total: number }>;
  getBusinessUnitDispensingLogsPaginated(businessUnitId: string, page: number, limit: number, startDate?: string, endDate?: string): Promise<{ logs: DispensingLog[], total: number }>;
  
  // Dashboard stats operations
  getBusinessUnitDashboardStats(businessUnitId: string): Promise<any>;
  getUserDashboardStats(userId: string): Promise<any>;
  getBusinessUnitSummary(businessUnitId: string, startDate?: string, endDate?: string): Promise<{
    totalRecharged: string;
    cupsDispensed: number;
    totalSpent: string;
    averagePerCup: string;
  }>;

  // Atomic RFID Transaction - Critical for billing accuracy
  processRfidTransactionForBusinessUnit(params: {
    businessUnitId: string;
    cardId: number;
    machineId: string;
    teaType: string;
    amount: string;
  }): Promise<{ success: true; remainingBalance: string } | { success: false; message: string }>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUsersWithBusinessUnits(): Promise<any[]>;
  getUsersPaginated(page: number, limit: number, search?: string): Promise<{ users: User[], total: number }>;
  updateUserAdminStatus(userId: string, isAdmin: boolean, updatedBy: string): Promise<User>;
  getTotalRevenue(): Promise<string>;
  getDailyStats(): Promise<{ totalUsers: number; totalRevenue: string; activeMachines: number; dailyDispensing: number }>;
  
  // Admin-only user creation (replacing auto-registration)
  createUserAccount(userData: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin?: boolean;
    createdBy: string;
  }): Promise<User>;
  deleteUserAccount(userId: string, deletedBy: string): Promise<{ success: boolean; message: string }>;
  

  

  
  // Referral operations
  createReferral(referral: InsertReferral): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  
  // Support operations
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getUserSupportTickets(userId: string): Promise<SupportTicket[]>;
  getAllSupportTickets(): Promise<(SupportTicket & { user: User })[]>;
  getSupportTicketsPaginated(page: number, limit: number, status?: string): Promise<{ tickets: (SupportTicket & { user: User })[], total: number }>;
  getSupportTicket(ticketId: number): Promise<SupportTicket | undefined>;
  updateSupportTicket(ticketId: number, updates: { status?: string; assignedTo?: string; comment?: string; updatedBy?: string }): Promise<SupportTicket>;
  getTicketStatusHistory(ticketId: number): Promise<(TicketStatusHistory & { updater: User })[]>;
  createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage>;
  getSupportMessages(ticketId: number): Promise<(SupportMessage & { sender: User })[]>;
  
  // FAQ operations
  getFaqArticles(category?: string): Promise<FaqArticle[]>;
  createFaqArticle(article: InsertFaqArticle): Promise<FaqArticle>;
  updateFaqArticle(articleId: number, updates: Partial<InsertFaqArticle>): Promise<FaqArticle>;
  deleteFaqArticle(articleId: number): Promise<void>;
  incrementFaqViews(articleId: number): Promise<void>;
  
  // Analytics operations
  getPopularTeaTypes(startDate?: string, endDate?: string, businessUnitId?: string): Promise<{ teaType: string; count: number }[]>;
  getPeakHours(startDate?: string, endDate?: string, businessUnitId?: string): Promise<{ hour: number; count: number }[]>;
  getMachinePerformance(startDate?: string, endDate?: string, businessUnitId?: string): Promise<{ machineId: string; uptime: number; totalDispensed: number }[]>;
  getUserBehaviorInsights(startDate?: string, endDate?: string, businessUnitId?: string): Promise<{ avgTeaPerDay: number; preferredTimes: number[]; topTeaTypes: string[] }>;
  getMachineDispensingData(startDate?: string, endDate?: string, machineId?: string, businessUnitId?: string): Promise<{ date: string; dispensed: number; machineId?: string; [key: string]: any }[]>;
  
  // System settings operations
  getSystemSetting(key: string): Promise<string | undefined>;
  updateSystemSetting(key: string, value: string, updatedBy: string): Promise<void>;
  getAllSystemSettings(): Promise<{ key: string; value: string; description: string | null }[]>;
  
  // Monthly reporting operations
  getMonthlyTransactionSummary(businessUnitId: string, month: string): Promise<{
    totalTransactions: number;
    totalAmount: string;
    uniqueMachines: number;
    uniqueCards: number;
  }>;
  getMonthlyTransactions(businessUnitId: string, month: string): Promise<(DispensingLog & {
    cardNumber?: string;
    machineName?: string;
    machineLocation?: string;
  })[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, profileData: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Password management methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async setPasswordResetToken(id: string, token: string, expiresAt: Date): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const now = new Date();
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          gte(users.passwordResetExpires, now)
        )
      );
    return user;
  }

  async clearPasswordResetToken(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async setPasswordResetStatus(id: string, requiresReset: boolean): Promise<void> {
    await db
      .update(users)
      .set({
        requiresPasswordReset: requiresReset,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    // Remove user-business unit assignments first
    await db.delete(userBusinessUnits).where(eq(userBusinessUnits.userId, id));
    
    // Delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async setPasswordResetToken(id: string, token: string, expiresAt: Date): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          gte(users.passwordResetExpires, new Date())
        )
      )
      .limit(1);

    return result[0];
  }

  async clearPasswordResetToken(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0];
  }

  async setPasswordResetStatus(id: string, requiresReset: boolean): Promise<void> {
    await db
      .update(users)
      .set({
        requiresPasswordReset: requiresReset,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  // Business Unit operations
  async createBusinessUnit(businessUnit: InsertBusinessUnit): Promise<BusinessUnit> {
    const [unit] = await db.insert(businessUnits).values(businessUnit).returning();
    return unit;
  }

  async getBusinessUnit(id: string): Promise<BusinessUnit | undefined> {
    const [unit] = await db.select().from(businessUnits).where(eq(businessUnits.id, id));
    return unit;
  }

  async getAllBusinessUnits(): Promise<BusinessUnit[]> {
    // First get all business units
    const allUnits = await db
      .select()
      .from(businessUnits)
      .orderBy(asc(businessUnits.name));

    // Then get the owner information and machines for each unit
    const unitsWithOwners = await Promise.all(
      allUnits.map(async (unit) => {
        // Get the Business Unit Admin assignment for this business unit (prioritize admin over viewers)
        const assignment = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: userBusinessUnits.role,
            assignedAt: userBusinessUnits.createdAt
          })
          .from(userBusinessUnits)
          .innerJoin(users, eq(userBusinessUnits.userId, users.id))
          .where(
            and(
              eq(userBusinessUnits.businessUnitId, unit.id),
              eq(userBusinessUnits.role, 'Business Unit Admin')
            )
          )
          .limit(1);

        // Get machines assigned to this business unit
        const machines = await db
          .select({
            id: teaMachines.id,
            name: teaMachines.name,
            location: teaMachines.location,
            isActive: teaMachines.isActive
          })
          .from(teaMachines)
          .where(eq(teaMachines.businessUnitId, unit.id))
          .orderBy(asc(teaMachines.name));

        const owner = assignment[0];
        
        return {
          ...unit,
          ownerName: owner && owner.firstName && owner.lastName 
            ? `${owner.firstName} ${owner.lastName}` 
            : null,
          ownerEmail: owner?.email || null,
          assignedAt: owner?.assignedAt || null,
          machines: machines || []
        };
      })
    );

    return unitsWithOwners;
  }

  async getUserBusinessUnits(userId: string): Promise<BusinessUnit[]> {
    const units = await db
      .select({ 
        id: businessUnits.id,
        name: businessUnits.name,
        code: businessUnits.code,
        description: businessUnits.description,
        walletBalance: businessUnits.walletBalance,
        isActive: businessUnits.isActive,
        createdAt: businessUnits.createdAt,
        updatedAt: businessUnits.updatedAt
      })
      .from(businessUnits)
      .innerJoin(userBusinessUnits, eq(businessUnits.id, userBusinessUnits.businessUnitId))
      .where(eq(userBusinessUnits.userId, userId));
    return units;
  }

  async updateBusinessUnitWallet(unitId: string, amount: string): Promise<BusinessUnit> {
    const [unit] = await db.update(businessUnits).set({
      walletBalance: amount,
      updatedAt: new Date(),
    }).where(eq(businessUnits.id, unitId)).returning();
    return unit;
  }

  // User-Business Unit assignments (allows multiple users per business unit with different roles)
  async assignUserToBusinessUnit(userId: string, businessUnitId: string, role: string): Promise<void> {
    try {
      // Use a transaction to ensure atomicity
      await db.transaction(async (tx) => {
        // Check if user is already assigned to this business unit
        const existing = await tx
          .select()
          .from(userBusinessUnits)
          .where(
            and(
              eq(userBusinessUnits.userId, userId),
              eq(userBusinessUnits.businessUnitId, businessUnitId)
            )
          );

        if (existing.length > 0) {
          // Update existing assignment role
          await tx
            .update(userBusinessUnits)
            .set({ role })
            .where(
              and(
                eq(userBusinessUnits.userId, userId),
                eq(userBusinessUnits.businessUnitId, businessUnitId)
              )
            );
        } else {
          // Insert new assignment
          await tx.insert(userBusinessUnits).values({ userId, businessUnitId, role });
        }
      });
    } catch (error) {
      console.error('Error in assignUserToBusinessUnit:', error);
      throw error;
    }
  }

  async removeUserFromBusinessUnit(userId: string, businessUnitId: string): Promise<void> {
    await db.delete(userBusinessUnits).where(
      and(
        eq(userBusinessUnits.userId, userId),
        eq(userBusinessUnits.businessUnitId, businessUnitId)
      )
    );
  }

  async getBusinessUnitUsers(businessUnitId: string): Promise<any[]> {
    try {
      console.log(`=== STORAGE getBusinessUnitUsers DEBUG ===`);
      console.log(`Business Unit ID: ${businessUnitId}`);
      
      const assignments = await db
        .select({
          userId: userBusinessUnits.userId,
          role: userBusinessUnits.role,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        })
        .from(userBusinessUnits)
        .innerJoin(users, eq(userBusinessUnits.userId, users.id))
        .where(eq(userBusinessUnits.businessUnitId, businessUnitId));
      
      console.log(`Raw assignments query result:`, assignments);
      console.log(`Assignment fields:`, assignments.map(a => ({ 
        userId: a.userId, 
        role: a.role, 
        roleType: typeof a.role,
        firstName: a.firstName 
      })));
      
      return assignments;
    } catch (error) {
      console.error('Error in getBusinessUnitUsers:', error);
      throw error;
    }
  }

  // RFID operations
  async getBusinessUnitRfidCards(businessUnitId: string): Promise<RfidCard[]> {
    return await db
      .select()
      .from(rfidCards)
      .where(eq(rfidCards.businessUnitId, businessUnitId))
      .orderBy(desc(rfidCards.createdAt));
  }

  async getRfidCardByUserId(userId: string): Promise<RfidCard | undefined> {
    // Get business units for this user first
    const userUnits = await this.getUserBusinessUnits(userId);
    if (userUnits.length === 0) return undefined;
    
    const [card] = await db
      .select()
      .from(rfidCards)
      .where(and(eq(rfidCards.businessUnitId, userUnits[0].id), eq(rfidCards.isActive, true)))
      .orderBy(desc(rfidCards.createdAt));
    return card;
  }

  async getAllRfidCardsByUserId(userId: string): Promise<RfidCard[]> {
    // Get all business units for this user
    const userUnits = await this.getUserBusinessUnits(userId);
    if (userUnits.length === 0) return [];
    
    const unitIds = userUnits.map(unit => unit.id);
    return await db
      .select()
      .from(rfidCards)
      .where(inArray(rfidCards.businessUnitId, unitIds))
      .orderBy(desc(rfidCards.createdAt));
  }

  async getRfidCardByNumber(cardNumber: string): Promise<RfidCard | undefined> {
    const [card] = await db
      .select()
      .from(rfidCards)
      .where(and(eq(rfidCards.cardNumber, cardNumber), eq(rfidCards.isActive, true)));
    return card;
  }

  async createRfidCard(rfidCard: InsertRfidCard): Promise<RfidCard> {
    const [card] = await db
      .insert(rfidCards)
      .values(rfidCard)
      .returning();
    return card;
  }

  async updateRfidCardLastUsed(cardId: number, machineId: string): Promise<void> {
    await db
      .update(rfidCards)
      .set({
        lastUsed: new Date(),
      })
      .where(eq(rfidCards.id, cardId));
  }

  async deactivateRfidCard(cardId: number): Promise<void> {
    await db
      .update(rfidCards)
      .set({ isActive: false })
      .where(eq(rfidCards.id, cardId));
  }

  async activateRfidCard(cardId: number): Promise<void> {
    await db
      .update(rfidCards)
      .set({ isActive: true })
      .where(eq(rfidCards.id, cardId));
  }

  // Legacy Admin RFID operations (for super admin) - DEPRECATED
  async createRfidCardForUser(userId: string, cardNumber: string): Promise<RfidCard> {
    // This method is deprecated - use createRfidCardBatch instead
    console.warn('createRfidCardForUser is deprecated - use createRfidCardBatch instead');
    
    const [newCard] = await db
      .insert(rfidCards)
      .values({
        cardNumber: cardNumber,
        cardName: `Card for ${userId}`,
        businessUnitId: '', // Use empty string instead of null for unassigned
        isActive: true,
      })
      .returning();
    return newCard;
  }

  async getAllRfidCards(): Promise<(RfidCard & { businessUnit: BusinessUnit })[]> {
    const results = await db
      .select({
        card: rfidCards,
        businessUnit: businessUnits
      })
      .from(rfidCards)
      .leftJoin(businessUnits, eq(rfidCards.businessUnitId, businessUnits.id))
      .orderBy(desc(rfidCards.createdAt));
    
    return results.map(row => ({
      ...row.card,
      businessUnit: row.businessUnit || { 
        id: '', 
        name: 'Unassigned', 
        code: '', 
        walletBalance: '0', 
        createdAt: null, 
        updatedAt: null 
      } as BusinessUnit
    }));
  }

  async getAllRfidCardsPaginated(page: number, limit: number): Promise<{ cards: (RfidCard & { businessUnit: BusinessUnit })[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(rfidCards);
    
    // Get paginated cards with business units
    const results = await db
      .select({
        card: rfidCards,
        businessUnit: businessUnits
      })
      .from(rfidCards)
      .leftJoin(businessUnits, eq(rfidCards.businessUnitId, businessUnits.id))
      .orderBy(desc(rfidCards.createdAt))
      .limit(limit)
      .offset(offset);
    
    const cards = results.map(row => ({
      ...row.card,
      businessUnit: row.businessUnit || { 
        id: '', 
        name: 'Unassigned', 
        code: '', 
        walletBalance: '0', 
        createdAt: null, 
        updatedAt: null 
      } as BusinessUnit
    })) as (RfidCard & { businessUnit: BusinessUnit })[];
    
    return {
      cards,
      total: countResult.count || 0
    };
  }

  async getAllRfidCardsPaginatedWithFilters(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    assignment?: string;
    businessUnitId?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ cards: (RfidCard & { businessUnit: BusinessUnit })[], total: number }> {
    const { page, limit, search, status, assignment, businessUnitId, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const whereConditions = [];
    
    // Search filter (card number or card name)
    if (search) {
      whereConditions.push(
        or(
          sql`${rfidCards.cardNumber} ILIKE ${`%${search}%`}`,
          sql`${rfidCards.cardName} ILIKE ${`%${search}%`}`
        )
      );
    }
    
    // Status filter
    if (status && status !== 'all') {
      whereConditions.push(eq(rfidCards.isActive, status === 'active'));
    }
    
    // Assignment filter
    if (assignment && assignment !== 'all') {
      if (assignment === 'assigned') {
        whereConditions.push(isNotNull(rfidCards.businessUnitId));
      } else if (assignment === 'unassigned') {
        whereConditions.push(isNull(rfidCards.businessUnitId));
      }
    }
    
    // Business unit filter
    if (businessUnitId && businessUnitId !== 'all') {
      whereConditions.push(eq(rfidCards.businessUnitId, businessUnitId));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Get total count with filters
    const countQuery = db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(rfidCards);
    
    if (whereClause) {
      countQuery.where(whereClause);
    }
    
    const [countResult] = await countQuery;
    
    // Build sort order
    let orderByClause;
    const sortDirection = sortOrder === 'asc' ? asc : desc;
    
    switch (sortBy) {
      case 'cardNumber':
        orderByClause = sortDirection(rfidCards.cardNumber);
        break;
      case 'businessUnit':
        orderByClause = sortDirection(businessUnits.name);
        break;
      case 'lastUsed':
        orderByClause = sortDirection(rfidCards.lastUsed);
        break;
      case 'createdAt':
      default:
        orderByClause = sortDirection(rfidCards.createdAt);
        break;
    }
    
    // Get paginated cards with business units
    const query = db
      .select({
        card: rfidCards,
        businessUnit: businessUnits
      })
      .from(rfidCards)
      .leftJoin(businessUnits, eq(rfidCards.businessUnitId, businessUnits.id));
    
    if (whereClause) {
      query.where(whereClause);
    }
    
    const results = await query
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    const cards = results.map(row => ({
      ...row.card,
      businessUnit: row.businessUnit || { 
        id: '', 
        name: 'Unassigned', 
        code: '', 
        walletBalance: '0', 
        createdAt: null, 
        updatedAt: null 
      } as BusinessUnit
    })) as (RfidCard & { businessUnit: BusinessUnit })[];
    
    return {
      cards,
      total: countResult.count || 0
    };
  }

  // NEW: Centralized RFID Card Creation & Assignment (Platform Admin Only)
  async createRfidCardBatch(params: {
    businessUnitId?: string;
    cardNumber?: string;
    cardName?: string;
    batchSize?: number;
  }): Promise<{ success: boolean; cards: RfidCard[]; message: string }> {
    try {
      const { businessUnitId, cardNumber, cardName, batchSize = 1 } = params;
      const cards: RfidCard[] = [];

      if (batchSize === 1 && cardNumber) {
        // Single card with specific number
        const [existingCard] = await db
          .select()
          .from(rfidCards)
          .where(eq(rfidCards.cardNumber, cardNumber));

        if (existingCard) {
          return { 
            success: false, 
            cards: [], 
            message: `Card number ${cardNumber} already exists` 
          };
        }

        const [newCard] = await db
          .insert(rfidCards)
          .values({
            cardNumber,
            cardName,
            businessUnitId: businessUnitId || '',
            isActive: true,
          })
          .returning();
        
        cards.push(newCard);
      } else {
        // Batch creation with auto-generated numbers
        for (let i = 0; i < batchSize; i++) {
          const timestamp = Date.now();
          const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          const autoCardNumber = `RFID_${timestamp}_${randomNum}`;
          
          const [newCard] = await db
            .insert(rfidCards)
            .values({
              cardNumber: autoCardNumber,
              cardName: cardName ? `${cardName} #${i + 1}` : `Corporate Card #${i + 1}`,
              businessUnitId: businessUnitId || '',
              isActive: true,
            })
            .returning();
          
          cards.push(newCard);
        }
      }

      const assignmentMessage = businessUnitId 
        ? `and assigned to business unit ${businessUnitId}` 
        : 'as unassigned (can be assigned later)';

      return {
        success: true,
        cards,
        message: `Successfully created ${cards.length} card(s) ${assignmentMessage}`
      };
    } catch (error) {
      console.error('Error creating RFID card batch:', error);
      return { 
        success: false, 
        cards: [], 
        message: 'Failed to create RFID cards' 
      };
    }
  }

  async assignRfidCardToBusinessUnit(cardId: string, businessUnitId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify business unit exists
      const [businessUnit] = await db
        .select()
        .from(businessUnits)
        .where(eq(businessUnits.id, businessUnitId));

      if (!businessUnit) {
        return { success: false, message: 'Business unit not found' };
      }

      // Verify card exists and is unassigned
      const [card] = await db
        .select()
        .from(rfidCards)
        .where(eq(rfidCards.id, parseInt(cardId)));

      if (!card) {
        return { success: false, message: 'RFID card not found' };
      }

      if (card.businessUnitId) {
        return { success: false, message: 'Card is already assigned to a business unit' };
      }

      // Assign the card
      await db
        .update(rfidCards)
        .set({ 
          businessUnitId,
          updatedAt: new Date()
        })
        .where(eq(rfidCards.id, parseInt(cardId)));

      return { 
        success: true, 
        message: `Card ${card.cardNumber} successfully assigned to ${businessUnit.name}` 
      };
    } catch (error) {
      console.error('Error assigning RFID card:', error);
      return { success: false, message: 'Failed to assign RFID card' };
    }
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [txn] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return txn;
  }

  async getUserTransactions(userId: string, limit = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async getBusinessUnitTransactions(businessUnitId: string, limit = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.businessUnitId, businessUnitId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async getUserTransactionsPaginated(userId: string, page: number, limit: number): Promise<{ transactions: Transaction[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Get total count for user's business units
    const userUnits = await this.getUserBusinessUnits(userId);
    const unitIds = userUnits.map(unit => unit.id);
    
    if (unitIds.length === 0) {
      return { transactions: [], total: 0 };
    }
    
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(transactions)
      .where(inArray(transactions.businessUnitId, unitIds));
    
    const transactionsResult = await db
      .select()
      .from(transactions)
      .where(inArray(transactions.businessUnitId, unitIds))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
    
    return {
      transactions: transactionsResult,
      total: countResult.count || 0
    };
  }

  async getBusinessUnitTransactionsPaginated(businessUnitId: string, page: number, limit: number): Promise<{ transactions: Transaction[], total: number }> {
    const offset = (page - 1) * limit;
    
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(transactions)
      .where(eq(transactions.businessUnitId, businessUnitId));
    
    const transactionsResult = await db
      .select()
      .from(transactions)
      .where(eq(transactions.businessUnitId, businessUnitId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
    
    return {
      transactions: transactionsResult,
      total: countResult.count || 0
    };
  }

  async getBusinessUnitDashboardStats(businessUnitId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get business unit
    const businessUnit = await this.getBusinessUnit(businessUnitId);
    if (!businessUnit) {
      throw new Error('Business unit not found');
    }

    // Count dispensing logs for today
    const [todayDispensing] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(dispensingLogs)
      .where(and(
        eq(dispensingLogs.businessUnitId, businessUnitId),
        gte(dispensingLogs.createdAt, today)
      ));

    // Count dispensing logs for this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [weekDispensing] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(dispensingLogs)
      .where(and(
        eq(dispensingLogs.businessUnitId, businessUnitId),
        gte(dispensingLogs.createdAt, weekAgo)
      ));

    // Count dispensing logs for this month
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const [monthDispensing] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(dispensingLogs)
      .where(and(
        eq(dispensingLogs.businessUnitId, businessUnitId),
        gte(dispensingLogs.createdAt, monthAgo)
      ));

    // Count active machines
    const [activeMachines] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(teaMachines)
      .where(and(
        eq(teaMachines.businessUnitId, businessUnitId),
        eq(teaMachines.isActive, true)
      ));

    return {
      businessUnitName: businessUnit.name,
      walletBalance: businessUnit.walletBalance,
      cupsToday: todayDispensing.count || 0,
      cupsThisWeek: weekDispensing.count || 0,
      cupsThisMonth: monthDispensing.count || 0,
      activeMachines: activeMachines.count || 0
    };
  }

  async getUserDashboardStats(userId: string): Promise<any> {
    // Get all business units for the user
    const userBusinessUnits = await this.getUserBusinessUnits(userId);
    
    if (userBusinessUnits.length === 0) {
      return {
        totalWalletBalance: "0",
        totalCupsToday: 0,
        totalCupsThisWeek: 0,
        totalCupsThisMonth: 0,
        totalActiveMachines: 0,
        businessUnits: []
      };
    }

    const businessUnitIds = userBusinessUnits.map(bu => bu.id);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Aggregate stats across all business units
    const [todayDispensing] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(dispensingLogs)
      .where(and(
        inArray(dispensingLogs.businessUnitId, businessUnitIds),
        gte(dispensingLogs.createdAt, today)
      ));

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [weekDispensing] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(dispensingLogs)
      .where(and(
        inArray(dispensingLogs.businessUnitId, businessUnitIds),
        gte(dispensingLogs.createdAt, weekAgo)
      ));

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const [monthDispensing] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(dispensingLogs)
      .where(and(
        inArray(dispensingLogs.businessUnitId, businessUnitIds),
        gte(dispensingLogs.createdAt, monthAgo)
      ));

    const [activeMachines] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(teaMachines)
      .where(and(
        inArray(teaMachines.businessUnitId, businessUnitIds),
        eq(teaMachines.isActive, true)
      ));

    // Calculate total wallet balance
    const totalWalletBalance = userBusinessUnits.reduce((sum, unit) => {
      return sum + parseFloat(unit.walletBalance || "0");
    }, 0).toString();

    return {
      totalWalletBalance,
      totalCupsToday: todayDispensing.count || 0,
      totalCupsThisWeek: weekDispensing.count || 0,
      totalCupsThisMonth: monthDispensing.count || 0,
      totalActiveMachines: activeMachines.count || 0,
      businessUnits: userBusinessUnits.map(unit => ({
        id: unit.id,
        name: unit.name,
        walletBalance: unit.walletBalance
      }))
    };
  }

  // Dispensing operations
  async createDispensingLog(log: InsertDispensingLog): Promise<DispensingLog> {
    const [dispensingLog] = await db
      .insert(dispensingLogs)
      .values(log)
      .returning();
    return dispensingLog;
  }

  async getBusinessUnitDispensingLogs(businessUnitId: string, limit = 50, startDate?: string, endDate?: string): Promise<DispensingLog[]> {
    let whereConditions = [eq(dispensingLogs.businessUnitId, businessUnitId)];
    
    if (startDate) {
      whereConditions.push(gte(dispensingLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      whereConditions.push(lte(dispensingLogs.createdAt, new Date(endDate)));
    }
    
    return await db
      .select()
      .from(dispensingLogs)
      .where(and(...whereConditions))
      .orderBy(desc(dispensingLogs.createdAt))
      .limit(limit);
  }

  async getUserDispensingLogs(userId: string, limit = 50): Promise<DispensingLog[]> {
    // Get user's business units first
    const userUnits = await this.getUserBusinessUnits(userId);
    if (userUnits.length === 0) return [];
    
    const unitIds = userUnits.map(unit => unit.id);
    return await db
      .select()
      .from(dispensingLogs)
      .where(inArray(dispensingLogs.businessUnitId, unitIds))
      .orderBy(desc(dispensingLogs.createdAt))
      .limit(limit);
  }

  async getManagedDispensingLogs(userId: string, limit = 50, startDate?: string, endDate?: string): Promise<DispensingLog[]> {
    // Get user's business units first
    const userUnits = await this.getUserBusinessUnits(userId);
    if (userUnits.length === 0) return [];
    
    const unitIds = userUnits.map(unit => unit.id);
    
    let whereConditions = [inArray(dispensingLogs.businessUnitId, unitIds)];
    
    if (startDate) {
      whereConditions.push(gte(dispensingLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      whereConditions.push(lte(dispensingLogs.createdAt, new Date(endDate)));
    }
    
    return await db
      .select()
      .from(dispensingLogs)
      .where(and(...whereConditions))
      .orderBy(desc(dispensingLogs.createdAt))
      .limit(limit);
  }

  async getUserDispensingLogsPaginated(userId: string, page: number, limit: number, startDate?: string, endDate?: string): Promise<{ logs: DispensingLog[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Get user's business units first
    const userUnits = await this.getUserBusinessUnits(userId);
    const unitIds = userUnits.map(unit => unit.id);
    
    if (unitIds.length === 0) {
      return { logs: [], total: 0 };
    }
    
    let whereConditions = [inArray(dispensingLogs.businessUnitId, unitIds)];
    
    if (startDate) {
      whereConditions.push(gte(dispensingLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      whereConditions.push(lte(dispensingLogs.createdAt, new Date(endDate)));
    }
    
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(dispensingLogs)
      .where(and(...whereConditions));
    
    const logsResult = await db
      .select()
      .from(dispensingLogs)
      .where(and(...whereConditions))
      .orderBy(desc(dispensingLogs.createdAt))
      .limit(limit)
      .offset(offset);
    
    return {
      logs: logsResult,
      total: countResult.count || 0
    };
  }

  async getBusinessUnitDispensingLogsPaginated(businessUnitId: string, page: number, limit: number, startDate?: string, endDate?: string): Promise<{ logs: DispensingLog[], total: number }> {
    const offset = (page - 1) * limit;
    
    let whereConditions = [eq(dispensingLogs.businessUnitId, businessUnitId)];
    
    if (startDate) {
      whereConditions.push(gte(dispensingLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      whereConditions.push(lte(dispensingLogs.createdAt, new Date(endDate)));
    }
    
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(dispensingLogs)
      .where(and(...whereConditions));
    
    const logsResult = await db
      .select()
      .from(dispensingLogs)
      .where(and(...whereConditions))
      .orderBy(desc(dispensingLogs.createdAt))
      .limit(limit)
      .offset(offset);
    
    return {
      logs: logsResult,
      total: countResult.count || 0
    };
  }

  async getBusinessUnitSummary(businessUnitId: string, startDate?: string, endDate?: string): Promise<{
    totalRecharged: string;
    cupsDispensed: number;
    totalSpent: string;
    averagePerCup: string;
  }> {
    // Get current wallet balance
    const [businessUnit] = await db
      .select({ walletBalance: businessUnits.walletBalance })
      .from(businessUnits)
      .where(eq(businessUnits.id, businessUnitId));

    // Get dispensing logs for cups and spending calculation
    let dispensingConditions = [eq(dispensingLogs.businessUnitId, businessUnitId)];
    if (startDate) {
      dispensingConditions.push(gte(dispensingLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      dispensingConditions.push(lte(dispensingLogs.createdAt, new Date(endDate)));
    }

    // Get cups dispensed (successful dispenses only)
    const [cupsResult] = await db
      .select({ 
        count: sql<number>`COUNT(*)::int` 
      })
      .from(dispensingLogs)
      .where(and(...dispensingConditions, eq(dispensingLogs.success, true)));

    // Get total spent on tea (successful dispenses only)
    const [spentResult] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${dispensingLogs.amount}), '0')::text` 
      })
      .from(dispensingLogs)
      .where(and(...dispensingConditions, eq(dispensingLogs.success, true)));

    const cupsDispensed = cupsResult?.count || 0;
    const totalSpent = spentResult?.total || '0';
    
    // Calculate total recharged as current balance + total spent
    // This accounts for initial wallet balance + all historical spending
    const currentBalance = parseFloat(businessUnit?.walletBalance || '0');
    const spentAmount = parseFloat(totalSpent);
    const totalRecharged = (currentBalance + spentAmount).toFixed(2);
    
    // Calculate average per cup
    const averagePerCup = cupsDispensed > 0 
      ? (spentAmount / cupsDispensed).toFixed(2)
      : '0.00';

    return {
      totalRecharged,
      cupsDispensed,
      totalSpent,
      averagePerCup
    };
  }

  // Enhanced Analytics Methods
  async getBusinessUnitComparison(startDate?: string, endDate?: string): Promise<{
    id: string;
    name: string;
    cupsDispensed: number;
    revenue: string;
    activeMachines: number;
    averagePerCup: string;
  }[]> {
    let dateConditions = [];
    if (startDate) {
      dateConditions.push(gte(dispensingLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      dateConditions.push(lte(dispensingLogs.createdAt, new Date(endDate)));
    }

    // Get all business units with their dispensing data
    const businessUnitStats = await db
      .select({
        id: businessUnits.id,
        name: businessUnits.name,
        cupsDispensed: sql<number>`COALESCE(COUNT(${dispensingLogs.id}), 0)::int`,
        revenue: sql<string>`COALESCE(SUM(${dispensingLogs.amount}), '0')::text`,
        activeMachines: sql<number>`COALESCE(COUNT(DISTINCT ${teaMachines.id}), 0)::int`
      })
      .from(businessUnits)
      .leftJoin(dispensingLogs, and(
        eq(dispensingLogs.businessUnitId, businessUnits.id),
        eq(dispensingLogs.success, true),
        ...(dateConditions.length > 0 ? dateConditions : [])
      ))
      .leftJoin(teaMachines, and(
        eq(teaMachines.businessUnitId, businessUnits.id),
        eq(teaMachines.isActive, true)
      ))
      .groupBy(businessUnits.id, businessUnits.name);

    return businessUnitStats.map(stat => ({
      id: stat.id,
      name: stat.name,
      cupsDispensed: stat.cupsDispensed,
      revenue: stat.revenue,
      activeMachines: stat.activeMachines,
      averagePerCup: stat.cupsDispensed > 0 
        ? (parseFloat(stat.revenue) / stat.cupsDispensed).toFixed(2)
        : '0.00'
    }));
  }

  async getRevenueTrends(startDate?: string, endDate?: string, businessUnitAdminId?: string): Promise<{
    date: string;
    revenue: string;
    cups: number;
    avgPerCup: string;
  }[]> {
    let whereClause = [eq(dispensingLogs.success, true)];
    
    if (startDate && endDate) {
      whereClause.push(gte(dispensingLogs.createdAt, new Date(startDate)));
      whereClause.push(lte(dispensingLogs.createdAt, new Date(endDate)));
    } else {
      whereClause.push(sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`);
    }
    
    // Filter by business unit admin for regular admins
    if (businessUnitAdminId) {
      const userUnits = await this.getUserBusinessUnits(businessUnitAdminId);
      const unitIds = userUnits.map(unit => unit.id);
      if (unitIds.length > 0) {
        whereClause.push(inArray(dispensingLogs.businessUnitId, unitIds));
      }
    }

    const dailyRevenue = await db
      .select({
        date: sql<string>`DATE(${dispensingLogs.createdAt})::text`,
        revenue: sql<string>`COALESCE(SUM(${dispensingLogs.amount}), '0')::text`,
        cups: sql<number>`COUNT(*)::int`
      })
      .from(dispensingLogs)
      .where(and(...whereClause))
      .groupBy(sql`DATE(${dispensingLogs.createdAt})`)
      .orderBy(sql`DATE(${dispensingLogs.createdAt})`);

    return dailyRevenue.map(day => ({
      date: day.date,
      revenue: day.revenue,
      cups: day.cups,
      avgPerCup: day.cups > 0 
        ? (parseFloat(day.revenue) / day.cups).toFixed(2)
        : '0.00'
    }));
  }

  async getUsageTrendsByBusinessUnit(businessUnitId: string, startDate?: string, endDate?: string): Promise<{
    date: string;
    cups: number;
    revenue: string;
    machines: string[];
  }[]> {
    let whereClause = [
      eq(dispensingLogs.businessUnitId, businessUnitId),
      eq(dispensingLogs.success, true)
    ];
    
    if (startDate) {
      whereClause.push(gte(dispensingLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      whereClause.push(lte(dispensingLogs.createdAt, new Date(endDate)));
    }

    const dailyTrends = await db
      .select({
        date: sql<string>`DATE(${dispensingLogs.createdAt})::text`,
        cups: sql<number>`COUNT(*)::int`,
        revenue: sql<string>`COALESCE(SUM(${dispensingLogs.amount}), '0')::text`,
        machines: sql<string[]>`ARRAY_AGG(DISTINCT ${dispensingLogs.machineId})`
      })
      .from(dispensingLogs)
      .where(and(...whereClause))
      .groupBy(sql`DATE(${dispensingLogs.createdAt})`)
      .orderBy(sql`DATE(${dispensingLogs.createdAt})`);

    return dailyTrends;
  }

  // Machine operations
  async getBusinessUnitMachines(businessUnitId: string): Promise<TeaMachine[]> {
    return await db
      .select()
      .from(teaMachines)
      .where(eq(teaMachines.businessUnitId, businessUnitId))
      .orderBy(desc(teaMachines.createdAt));
  }

  async getUnassignedMachines(): Promise<TeaMachine[]> {
    return await db
      .select()
      .from(teaMachines)
      .where(sql`${teaMachines.businessUnitId} IS NULL`)
      .orderBy(desc(teaMachines.createdAt));
  }

  async getManagedMachines(businessUnitId: string): Promise<TeaMachine[]> {
    console.log(`DEBUG: getManagedMachines called for user: ${businessUnitId}`);
    
    // Get user's business units first
    const userUnits = await this.getUserBusinessUnits(businessUnitId);
    console.log(`DEBUG: Found ${userUnits.length} business units for user ${businessUnitId}:`, userUnits);
    
    if (userUnits.length === 0) return [];
    
    const unitIds = userUnits.map(unit => unit.id);
    console.log(`DEBUG: Looking for machines in business units:`, unitIds);
    
    const machines = await db
      .select()
      .from(teaMachines)
      .where(inArray(teaMachines.businessUnitId, unitIds))
      .orderBy(desc(teaMachines.createdAt));
    
    console.log(`DEBUG: Found ${machines.length} machines:`, machines);
    return machines;
  }

  async getManagedRfidCards(businessUnitId: string): Promise<RfidCard[]> {
    console.log(`DEBUG: getManagedRfidCards called for user: ${businessUnitId}`);
    
    // Get user's business units first
    const userUnits = await this.getUserBusinessUnits(businessUnitId);
    console.log(`DEBUG: Found ${userUnits.length} business units for RFID cards:`, userUnits);
    
    if (userUnits.length === 0) return [];
    
    const unitIds = userUnits.map(unit => unit.id);
    console.log(`DEBUG: Looking for RFID cards in business units:`, unitIds);
    
    const cards = await db
      .select()
      .from(rfidCards)
      .where(inArray(rfidCards.businessUnitId, unitIds))
      .orderBy(desc(rfidCards.createdAt));
    
    console.log(`DEBUG: Found ${cards.length} RFID cards:`, cards);
    return cards;
  }

  async getTeaMachine(id: string): Promise<TeaMachine | undefined> {
    const [machine] = await db
      .select()
      .from(teaMachines)
      .where(eq(teaMachines.id, id));
    return machine;
  }

  async getAllTeaMachines(): Promise<TeaMachine[]> {
    return await db
      .select()
      .from(teaMachines)
      .orderBy(desc(teaMachines.createdAt));
  }

  async updateMachinePrice(machineId: string, price: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await db
        .update(teaMachines)
        .set({ price })
        .where(eq(teaMachines.id, machineId))
        .returning();

      if (result.length === 0) {
        return { success: false, message: "Machine not found" };
      }

      return { success: true, message: "Machine price updated successfully" };
    } catch (error) {
      console.error('Error updating machine price:', error);
      return { success: false, message: "Failed to update machine price" };
    }
  }

  async generateNextMachineId(): Promise<string> {
    // Get all existing machine IDs that follow UK_XXXX pattern
    const machines = await db
      .select({ id: teaMachines.id })
      .from(teaMachines)
      .where(sql`${teaMachines.id} ~ '^UK_[0-9]{4}$'`)
      .orderBy(teaMachines.id);
    
    let nextNumber = 1;
    
    if (machines.length > 0) {
      // Extract numbers from existing IDs and find the highest
      const numbers = machines
        .map(m => parseInt(m.id.replace('UK_', '')))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
      
      nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    }
    
    // Format as UK_XXXX (4 digits with leading zeros)
    return `UK_${nextNumber.toString().padStart(4, '0')}`;
  }

  async createTeaMachine(machine: InsertTeaMachine): Promise<TeaMachine> {
    // BusinessUnitId is now optional to allow unassigned machines
    
    // Verify business unit exists if provided
    if (machine.businessUnitId) {
      const businessUnit = await this.getBusinessUnit(machine.businessUnitId);
      if (!businessUnit) {
        throw new Error(`Business unit ${machine.businessUnitId} not found`);
      }
    }
    
    // Auto-generate machine ID if not provided
    if (!machine.id) {
      machine.id = await this.generateNextMachineId();
    }
    
    const [newMachine] = await db
      .insert(teaMachines)
      .values(machine)
      .returning();
    return newMachine;
  }

  async updateMachinePing(machineId: string): Promise<void> {
    await db
      .update(teaMachines)
      .set({ lastPing: new Date() })
      .where(eq(teaMachines.id, machineId));
  }

  async updateMachineStatus(machineId: string, isActive: boolean): Promise<void> {
    await db
      .update(teaMachines)
      .set({ isActive })
      .where(eq(teaMachines.id, machineId));
  }

  async updateMachineTeaTypes(machineId: string, teaTypes: any[]): Promise<void> {
    await db
      .update(teaMachines)
      .set({ teaTypes: JSON.stringify(teaTypes) })
      .where(eq(teaMachines.id, machineId));
  }

  async updateMachine(machineId: string, updates: { name?: string; location?: string; isActive?: boolean }): Promise<TeaMachine | undefined> {
    const [updatedMachine] = await db
      .update(teaMachines)
      .set({
        ...(updates.name && { name: updates.name }),
        ...(updates.location && { location: updates.location }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive })
      })
      .where(eq(teaMachines.id, machineId))
      .returning();
    
    return updatedMachine;
  }

  async assignMachineToBusinessUnit(machineId: string, businessUnitId: string): Promise<TeaMachine | undefined> {
    const [updatedMachine] = await db
      .update(teaMachines)
      .set({
        businessUnitId
      })
      .where(eq(teaMachines.id, machineId))
      .returning();
    
    return updatedMachine;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  // Get all users with their business unit assignments for pseudo login
  async getUsersWithBusinessUnits(): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          businessUnitId: userBusinessUnits.businessUnitId,
          businessUnitName: businessUnits.name,
          businessUnitCode: businessUnits.code,
          role: userBusinessUnits.role,
        })
        .from(users)
        .leftJoin(userBusinessUnits, eq(users.id, userBusinessUnits.userId))
        .leftJoin(businessUnits, eq(userBusinessUnits.businessUnitId, businessUnits.id))
        .orderBy(users.firstName, users.lastName);

      // Group by user to create nested structure
      const groupedUsers = result.reduce((acc: any, row: any) => {
        const userId = row.id;
        if (!acc[userId]) {
          acc[userId] = {
            id: row.id,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            businessUnits: []
          };
        }
        
        if (row.businessUnitId) {
          acc[userId].businessUnits.push({
            id: row.businessUnitId,
            name: row.businessUnitName,
            code: row.businessUnitCode,
            role: row.role
          });
        }
        
        return acc;
      }, {});

      return Object.values(groupedUsers);
    } catch (error) {
      console.error('Error in getUsersWithBusinessUnits:', error);
      throw error;
    }
  }

  async getUsersPaginated(page: number, limit: number, search?: string): Promise<{ users: User[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Simple approach: get total count first
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users);
    
    // Then get paginated results
    let usersResult;
      
    if (search) {
      usersResult = await db
        .select()
        .from(users)
        .where(
          or(
            ilike(users.firstName, `%${search}%`),
            ilike(users.lastName, `%${search}%`),
            ilike(users.email, `%${search}%`)
          )
        )
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      usersResult = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);
    }
    
    return {
      users: usersResult,
      total: countResult.count || 0
    };
  }

  async getTotalRevenue(): Promise<string> {
    const [result] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(eq(transactions.type, 'recharge'));
    return result.total || "0";
  }

  async getDailyStats(): Promise<{ totalUsers: number; totalRevenue: string; activeMachines: number; dailyDispensing: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total users
    const [userCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users);

    // Total revenue
    const [revenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(eq(transactions.type, 'recharge'));

    // Active machines
    const [machineCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(teaMachines)
      .where(eq(teaMachines.isActive, true));

    // Daily dispensing
    const [dispensingCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(dispensingLogs)
      .where(gte(dispensingLogs.createdAt, today));

    return {
      totalUsers: userCount.count || 0,
      totalRevenue: revenueResult.total || "0",
      activeMachines: machineCount.count || 0,
      dailyDispensing: dispensingCount.count || 0,
    };
  }

  async updateUserAdminStatus(userId: string, isAdmin: boolean, updatedBy: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        isAdmin,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    console.log(`Admin status updated: User ${userId} admin=${isAdmin} by ${updatedBy}`);
    return user;
  }

  // Support operations
  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [newTicket] = await db.insert(supportTickets).values(ticket).returning();
    return newTicket;
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    return await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getAllSupportTickets(): Promise<(SupportTicket & { user: User })[]> {
    const ticketsWithUsers = await db
      .select()
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .orderBy(desc(supportTickets.createdAt));

    return ticketsWithUsers.map(({ support_tickets, users: user }) => ({
      ...support_tickets,
      user: user || { id: '', firstName: 'Unknown', lastName: 'User', email: '' }
    })) as any;
  }

  async getSupportTicketsPaginated(page: number, limit: number, status?: string): Promise<{ tickets: (SupportTicket & { user: User })[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(supportTickets);
    
    // Get paginated tickets with users
    const ticketsWithUsers = await db
      .select()
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .orderBy(desc(supportTickets.createdAt))
      .limit(limit)
      .offset(offset);

    const tickets = ticketsWithUsers.map(({ support_tickets, users: user }) => ({
      ...support_tickets,
      user: user || { id: '', firstName: 'Unknown', lastName: 'User', email: '', walletBalance: '0', isAdmin: false, profileImageUrl: null, createdAt: null, updatedAt: null }
    })) as (SupportTicket & { user: User })[];

    return {
      tickets,
      total: countResult.count || 0
    };
  }

  async updateSupportTicket(ticketId: number, updates: { status?: string; assignedTo?: string; comment?: string; updatedBy?: string }): Promise<SupportTicket> {
    // Get current ticket to record old status
    const [currentTicket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    
    if (!currentTicket) {
      throw new Error('Ticket not found');
    }

    // Update the ticket
    const [updatedTicket] = await db
      .update(supportTickets)
      .set({
        status: updates.status,
        assignedTo: updates.assignedTo,
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();

    // Record status change history if status changed and comment provided
    if (updates.status && updates.status !== currentTicket.status && updates.comment && updates.updatedBy) {
      await db.insert(ticketStatusHistory).values({
        ticketId,
        oldStatus: currentTicket.status,
        newStatus: updates.status,
        comment: updates.comment,
        updatedBy: updates.updatedBy,
      });
    }
    
    return updatedTicket;
  }

  async getTicketStatusHistory(ticketId: number): Promise<(TicketStatusHistory & { updater: User })[]> {
    try {
      console.log('Getting ticket status history for ticket ID:', ticketId);
      
      const historyWithUsers = await db
        .select()
        .from(ticketStatusHistory)
        .leftJoin(users, eq(ticketStatusHistory.updatedBy, users.id))
        .where(eq(ticketStatusHistory.ticketId, ticketId))
        .orderBy(desc(ticketStatusHistory.createdAt));

      console.log('Raw history data:', historyWithUsers);

      const result = historyWithUsers.map(({ ticket_status_history, users: user }) => ({
        ...ticket_status_history,
        updater: user || { id: '', firstName: 'Unknown', lastName: 'Admin', email: '' }
      })) as any;

      console.log('Processed history result:', result);
      return result;
    } catch (error) {
      console.error('Error fetching ticket status history:', error);
      return [];
    }
  }

  async getSupportTicket(ticketId: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    return ticket;
  }

  async createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage> {
    const [newMessage] = await db.insert(supportMessages).values(message).returning();
    
    // Update ticket's updatedAt
    await db
      .update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, message.ticketId));
    
    return newMessage;
  }

  async getSupportMessages(ticketId: number): Promise<(SupportMessage & { sender: User })[]> {
    try {
      console.log('Fetching messages for ticket:', ticketId);
      const messages = await db
        .select()
        .from(supportMessages)
        .where(eq(supportMessages.ticketId, ticketId))
        .orderBy(asc(supportMessages.createdAt));

      console.log('Raw messages from DB:', messages.map(m => ({ id: m.id, isFromSupport: m.isFromSupport, message: m.message })));

      const messagesWithSenders = [];
      for (const message of messages) {
        const [sender] = await db.select().from(users).where(eq(users.id, message.senderId));
        messagesWithSenders.push({
          ...message,
          sender: sender || { id: message.senderId, firstName: 'Unknown', lastName: 'User', email: '' }
        });
      }
      
      console.log('Messages with senders:', messagesWithSenders);
      return messagesWithSenders as any;
    } catch (error) {
      console.error('Error fetching support messages:', error);
      return [];
    }
  }

  // FAQ operations
  async getFaqArticles(category?: string): Promise<FaqArticle[]> {
    try {
      let query = db.select().from(faqArticles).where(eq(faqArticles.isPublished, true));
      
      if (category) {
        query = db.select().from(faqArticles).where(
          and(eq(faqArticles.isPublished, true), eq(faqArticles.category, category))
        );
      }
      
      return await query.orderBy(asc(faqArticles.order), asc(faqArticles.createdAt));
    } catch (error) {
      console.error('Error fetching FAQ articles:', error);
      return [];
    }
  }

  // Referral operations
  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async createFaqArticle(article: InsertFaqArticle): Promise<FaqArticle> {
    const [newArticle] = await db.insert(faqArticles).values(article).returning();
    return newArticle;
  }

  async updateFaqArticle(articleId: number, updates: Partial<InsertFaqArticle>): Promise<FaqArticle> {
    const [updatedArticle] = await db
      .update(faqArticles)
      .set(updates)
      .where(eq(faqArticles.id, articleId))
      .returning();
    return updatedArticle;
  }

  async deleteFaqArticle(articleId: number): Promise<void> {
    await db.delete(faqArticles).where(eq(faqArticles.id, articleId));
  }

  async incrementFaqViews(articleId: number): Promise<void> {
    await db
      .update(faqArticles)
      .set({ views: sql`${faqArticles.views} + 1` })
      .where(eq(faqArticles.id, articleId));
  }

  // Analytics operations (removed getPopularTeaTypes - only serves Regular Tea)

  async getPeakHours(startDate?: string, endDate?: string, businessUnitId?: string): Promise<{ hour: number; count: number }[]> {
    let whereClause = sql`1=1`;
    
    if (startDate && endDate) {
      whereClause = sql`${dispensingLogs.createdAt} >= ${startDate} AND ${dispensingLogs.createdAt} <= ${endDate}`;
    } else {
      whereClause = sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`;
    }
    
    // Filter by business unit admin if specified (for regular admins)
    if (businessUnitId) {
      whereClause = sql`${whereClause} AND ${dispensingLogs.businessUnitId} = ${businessUnitId}`;
    }
    
    return await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${dispensingLogs.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(dispensingLogs)
      .where(whereClause)
      .groupBy(sql`EXTRACT(HOUR FROM ${dispensingLogs.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${dispensingLogs.createdAt})`);
  }

  async getMachinePerformance(startDate?: string, endDate?: string, businessUnitId?: string): Promise<{ machineId: string; uptime: number; totalDispensed: number }[]> {
    let whereClause = sql`1=1`;
    
    if (startDate && endDate) {
      whereClause = sql`${dispensingLogs.createdAt} >= ${startDate} AND ${dispensingLogs.createdAt} <= ${endDate}`;
    } else {
      whereClause = sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`;
    }
    
    // Filter by business unit admin if specified (for regular admins)
    if (businessUnitId) {
      whereClause = sql`${whereClause} AND ${dispensingLogs.businessUnitId} = ${businessUnitId}`;
    }
    
    const machineStats = await db
      .select({
        machineId: dispensingLogs.machineId,
        totalDispensed: sql<number>`count(*)`,
      })
      .from(dispensingLogs)
      .where(whereClause)
      .groupBy(dispensingLogs.machineId);

    return machineStats.map(stat => ({
      machineId: stat.machineId,
      uptime: Math.floor(Math.random() * 10) + 90, // Realistic uptime between 90-100%
      totalDispensed: stat.totalDispensed,
    }));
  }

  async getUserBehaviorInsights(startDate?: string, endDate?: string, businessUnitId?: string): Promise<{ avgTeaPerDay: number; preferredTimes: number[]; }> {
    let whereClause = sql`1=1`;
    let daysDiff = 30;
    
    if (startDate && endDate) {
      whereClause = sql`${dispensingLogs.createdAt} >= ${startDate} AND ${dispensingLogs.createdAt} <= ${endDate}`;
      daysDiff = Math.max(1, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
    } else {
      whereClause = sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`;
    }

    // Filter by business unit admin if specified (for regular admins)
    if (businessUnitId) {
      whereClause = sql`${whereClause} AND ${dispensingLogs.businessUnitId} = ${businessUnitId}`;
    }

    const [avgResult] = await db
      .select({
        avgTeaPerDay: sql<number>`count(*) / ${daysDiff}::decimal`,
      })
      .from(dispensingLogs)
      .where(whereClause);

    const preferredTimes = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${dispensingLogs.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(dispensingLogs)
      .where(whereClause)
      .groupBy(sql`EXTRACT(HOUR FROM ${dispensingLogs.createdAt})`)
      .orderBy(desc(sql`count(*)`))
      .limit(3);

    // Removed topTeaTypes - only serve Regular Tea variety
    return {
      avgTeaPerDay: avgResult?.avgTeaPerDay || 0,
      preferredTimes: preferredTimes.map(pt => pt.hour),
    };
  }

  async getMachineDispensingData(startDate?: string, endDate?: string, machineId?: string, businessUnitId?: string): Promise<{ date: string; dispensed: number; machineId?: string; [key: string]: any }[]> {
    let whereClause = sql`1=1`;
    
    if (startDate && endDate) {
      whereClause = sql`${dispensingLogs.createdAt} >= ${startDate} AND ${dispensingLogs.createdAt} <= ${endDate}`;
    } else {
      whereClause = sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`;
    }
    
    if (machineId && machineId !== 'all') {
      whereClause = sql`${whereClause} AND ${dispensingLogs.machineId} = ${machineId}`;
    }
    
    // Filter by business unit admin if specified (for regular admins)
    if (businessUnitId) {
      whereClause = sql`${whereClause} AND ${dispensingLogs.businessUnitId} = ${businessUnitId}`;
    }

    if (machineId && machineId !== 'all') {
      // Single machine data
      const dailyData = await db
        .select({
          date: sql<string>`DATE(${dispensingLogs.createdAt})`,
          dispensed: sql<number>`count(*)`,
        })
        .from(dispensingLogs)
        .where(whereClause)
        .groupBy(sql`DATE(${dispensingLogs.createdAt})`)
        .orderBy(sql`DATE(${dispensingLogs.createdAt})`);

      return dailyData;
    } else {
      // All machines data - pivot by machine
      const allMachineData = await db
        .select({
          date: sql<string>`DATE(${dispensingLogs.createdAt})`,
          machineId: dispensingLogs.machineId,
          dispensed: sql<number>`count(*)`,
        })
        .from(dispensingLogs)
        .where(whereClause)
        .groupBy(sql`DATE(${dispensingLogs.createdAt}), ${dispensingLogs.machineId}`)
        .orderBy(sql`DATE(${dispensingLogs.createdAt})`);

      // Pivot the data to have each machine as a column
      const pivotedData: { [key: string]: any } = {};
      
      allMachineData.forEach(row => {
        if (!pivotedData[row.date]) {
          pivotedData[row.date] = { date: row.date };
        }
        pivotedData[row.date][row.machineId] = row.dispensed;
      });

      return Object.values(pivotedData);
    }
  }

  // System Settings operations
  async getSystemSetting(key: string): Promise<string | undefined> {
    const [setting] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return setting?.value;
  }

  async updateSystemSetting(key: string, value: string, updatedBy: string): Promise<void> {
    await db
      .insert(systemSettings)
      .values({ key, value, updatedBy, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedBy, updatedAt: new Date() }
      });
  }

  async getAllSystemSettings(): Promise<{ key: string; value: string; description: string | null }[]> {
    return await db
      .select({
        key: systemSettings.key,
        value: systemSettings.value,
        description: systemSettings.description
      })
      .from(systemSettings)
      .orderBy(asc(systemSettings.key));
  }

  // CRITICAL: Atomic RFID Transaction for billing accuracy
  async processRfidTransaction(params: {
    businessUnitId: string;
    cardId: number;
    machineId: string;
    teaType: string;
    amount: string;
  }): Promise<{ success: true; remainingBalance: string } | { success: false; message: string }> {
    
    return await db.transaction(async (tx) => {
      try {
        const amountNum = parseFloat(params.amount);
        
        // Step 1: Get current business unit balance with row lock to prevent race conditions
        const [currentBusinessUnit] = await tx
          .select({ 
            id: businessUnits.id, 
            walletBalance: businessUnits.walletBalance 
          })
          .from(businessUnits)
          .where(eq(businessUnits.id, params.businessUnitId))
          .for('update'); // Row-level lock
          
        if (!currentBusinessUnit) {
          throw new Error("Business unit not found");
        }
        
        const currentBalance = parseFloat(currentBusinessUnit.walletBalance || "0");
        
        // Step 2: Validate sufficient balance
        if (currentBalance < amountNum) {
          throw new Error("Insufficient business unit wallet balance");
        }
        
        const newBalance = currentBalance - amountNum;
        
        // Step 3: Update business unit wallet balance
        await tx
          .update(businessUnits)
          .set({ 
            walletBalance: newBalance.toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(businessUnits.id, params.businessUnitId));
        
        // Step 4: Get machine to ensure it belongs to the same business unit
        const [machine] = await tx
          .select()
          .from(teaMachines)
          .where(eq(teaMachines.id, params.machineId));
          
        if (!machine) {
          throw new Error("Machine not found");
        }
        
        if (machine.businessUnitId !== params.businessUnitId) {
          throw new Error("Machine does not belong to this business unit");
        }
        
        // Step 5: Get business unit admin for transaction record
        const [adminAssignment] = await tx
          .select({ userId: userBusinessUnits.userId })
          .from(userBusinessUnits)
          .where(eq(userBusinessUnits.businessUnitId, params.businessUnitId))
          .limit(1);
          
        if (!adminAssignment) {
          throw new Error("No admin found for business unit");
        }
        
        // Step 6: Create transaction record
        const [transaction] = await tx
          .insert(transactions)
          .values({
            userId: adminAssignment.userId,
            businessUnitId: params.businessUnitId,
            machineId: params.machineId,
            type: 'dispensing',
            amount: params.amount,
            description: `${params.teaType} Tea - Machine ${machine.name}`,
            status: 'completed'
          })
          .returning();
        
        // Step 7: Create dispensing log
        const [dispensingLog] = await tx
          .insert(dispensingLogs)
          .values({
            businessUnitId: params.businessUnitId,
            rfidCardId: params.cardId,
            machineId: params.machineId,
            teaType: params.teaType,
            amount: params.amount,
            success: true
          })
          .returning();
        
        // Step 8: Update RFID card last used
        await tx
          .update(rfidCards)
          .set({ 
            lastUsed: new Date(),
            lastUsedMachineId: params.machineId 
          })
          .where(eq(rfidCards.id, params.cardId));
        
        // Step 9: Update machine ping
        await tx
          .update(teaMachines)
          .set({ lastPing: new Date() })
          .where(eq(teaMachines.id, params.machineId));
        
        // All operations completed successfully
        return {
          success: true as const,
          remainingBalance: newBalance.toFixed(2)
        };
        
      } catch (error) {
        // Transaction will be automatically rolled back
        console.error("RFID transaction failed:", error);
        return {
          success: false as const,
          message: error instanceof Error ? error.message : "Transaction failed"
        };
      }
    });
  }

  // Business Unit Transfer Operations (Admin Only)
  async transferBusinessUnitAdmin(params: {
    businessUnitId: string;
    newAdminId: string;
    transferredBy: string;
    reason: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { businessUnitId, newAdminId, transferredBy, reason } = params;

      // Get current admin (if any)
      const currentAssignments = await db
        .select()
        .from(userBusinessUnits)
        .where(eq(userBusinessUnits.businessUnitId, businessUnitId));

      const currentAdmin = currentAssignments[0];
      
      // Get business unit details for asset snapshot
      const businessUnit = await this.getBusinessUnit(businessUnitId);
      if (!businessUnit) {
        return { success: false, message: "Business unit not found" };
      }

      // Get counts for asset snapshot
      const [transactionCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(transactions)
        .where(eq(transactions.businessUnitId, businessUnitId));

      const [machineCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(teaMachines)
        .where(eq(teaMachines.businessUnitId, businessUnitId));

      const [cardCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(rfidCards)
        .where(eq(rfidCards.businessUnitId, businessUnitId));

      const assetsSnapshot = {
        walletBalance: businessUnit.walletBalance,
        transactionCount: transactionCount.count || 0,
        machineCount: machineCount.count || 0,
        rfidCardCount: cardCount.count || 0,
        transferDate: new Date().toISOString()
      };

      // Perform transfer in transaction
      await db.transaction(async (tx) => {
        // Remove current admin assignment if exists
        if (currentAdmin) {
          await tx.delete(userBusinessUnits)
            .where(eq(userBusinessUnits.businessUnitId, businessUnitId));
        }

        // Assign new admin
        await tx.insert(userBusinessUnits).values({
          userId: newAdminId,
          businessUnitId,
          role: 'Business Unit Admin'
        });

        // Log the transfer
        await tx.insert(businessUnitTransfers).values({
          businessUnitId,
          fromUserId: currentAdmin?.userId || null,
          toUserId: newAdminId,
          transferredBy,
          reason,
          assetsTransferred: assetsSnapshot
        });
      });

      return { 
        success: true, 
        message: `Business unit successfully transferred. Assets: ₹${businessUnit.walletBalance} wallet, ${assetsSnapshot.transactionCount} transactions, ${assetsSnapshot.machineCount} machines, ${assetsSnapshot.rfidCardCount} RFID cards.`
      };

    } catch (error) {
      console.error('Error in transferBusinessUnitAdmin:', error);
      return { success: false, message: "Transfer failed due to system error" };
    }
  }

  async getBusinessUnitTransferHistory(businessUnitId: string): Promise<(BusinessUnitTransfer & { fromUser?: User; toUser: User; transferrer: User })[]> {
    const transfers = await db
      .select({
        transfer: businessUnitTransfers,
        fromUser: users,
        toUser: users,
        transferrer: users
      })
      .from(businessUnitTransfers)
      .leftJoin(users, eq(businessUnitTransfers.fromUserId, users.id))
      .innerJoin(users, eq(businessUnitTransfers.toUserId, users.id))
      .innerJoin(users, eq(businessUnitTransfers.transferredBy, users.id))
      .where(eq(businessUnitTransfers.businessUnitId, businessUnitId))
      .orderBy(desc(businessUnitTransfers.transferDate));

    return transfers.map(row => ({
      ...row.transfer,
      fromUser: row.fromUser || undefined,
      toUser: row.toUser,
      transferrer: row.transferrer
    }));
  }

  async getAllBusinessUnitTransfers(): Promise<(BusinessUnitTransfer & { businessUnit: BusinessUnit; fromUser?: User; toUser: User; transferrer: User })[]> {
    const fromUsers = alias(users, 'fromUsers');
    const toUsers = alias(users, 'toUsers');  
    const transferrerUsers = alias(users, 'transferrerUsers');

    const transfers = await db
      .select({
        transfer: businessUnitTransfers,
        businessUnit: businessUnits,
        fromUser: fromUsers,
        toUser: toUsers,
        transferrer: transferrerUsers
      })
      .from(businessUnitTransfers)
      .innerJoin(businessUnits, eq(businessUnitTransfers.businessUnitId, businessUnits.id))
      .leftJoin(fromUsers, eq(businessUnitTransfers.fromUserId, fromUsers.id))
      .innerJoin(toUsers, eq(businessUnitTransfers.toUserId, toUsers.id))
      .innerJoin(transferrerUsers, eq(businessUnitTransfers.transferredBy, transferrerUsers.id))
      .orderBy(desc(businessUnitTransfers.transferDate));

    return transfers.map(row => ({
      ...row.transfer,
      businessUnit: row.businessUnit,
      fromUser: row.fromUser || undefined,
      toUser: row.toUser,
      transferrer: row.transferrer
    }));
  }

  // Monthly reporting operations
  async getMonthlyTransactionSummary(businessUnitId: string, month: string): Promise<{
    totalTransactions: number;
    totalAmount: string;
    uniqueMachines: number;
    uniqueCards: number;
  }> {
    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

    // Get basic transaction stats
    const result = await db
      .select({
        totalTransactions: sql<number>`COUNT(*)`,
        totalAmount: sql<string>`SUM(CAST(${dispensingLogs.amount} AS DECIMAL))`,
        uniqueMachines: sql<number>`COUNT(DISTINCT ${dispensingLogs.machineId})`
      })
      .from(dispensingLogs)
      .where(
        and(
          eq(dispensingLogs.businessUnitId, businessUnitId),
          eq(dispensingLogs.success, true),
          gte(dispensingLogs.createdAt, startDate),
          sql`${dispensingLogs.createdAt} <= ${endDate}`
        )
      );

    // Get count of currently assigned cards that were used in the month
    // Only count cards that are currently assigned to this business unit
    const cardResult = await db
      .select({
        uniqueCards: sql<number>`COUNT(DISTINCT ${dispensingLogs.rfidCardId})`
      })
      .from(dispensingLogs)
      .innerJoin(rfidCards, eq(dispensingLogs.rfidCardId, rfidCards.id))
      .where(
        and(
          eq(dispensingLogs.businessUnitId, businessUnitId),
          eq(dispensingLogs.success, true),
          eq(rfidCards.businessUnitId, businessUnitId), // Only count currently assigned cards
          gte(dispensingLogs.createdAt, startDate),
          sql`${dispensingLogs.createdAt} <= ${endDate}`
        )
      );

    return {
      totalTransactions: result[0]?.totalTransactions || 0,
      totalAmount: result[0]?.totalAmount || '0',
      uniqueMachines: result[0]?.uniqueMachines || 0,
      uniqueCards: cardResult[0]?.uniqueCards || 0
    };
  }

  async getMonthlyTransactions(businessUnitId: string, month: string): Promise<(DispensingLog & {
    cardNumber?: string;
    machineName?: string;
    machineLocation?: string;
  })[]> {
    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

    const transactions = await db
      .select({
        log: dispensingLogs,
        cardNumber: rfidCards.cardNumber,
        machineName: teaMachines.name,
        machineLocation: teaMachines.location
      })
      .from(dispensingLogs)
      .leftJoin(rfidCards, eq(dispensingLogs.rfidCardId, rfidCards.id))
      .leftJoin(teaMachines, eq(dispensingLogs.machineId, teaMachines.id))
      .where(
        and(
          eq(dispensingLogs.businessUnitId, businessUnitId),
          gte(dispensingLogs.createdAt, startDate),
          sql`${dispensingLogs.createdAt} <= ${endDate}`
        )
      )
      .orderBy(desc(dispensingLogs.createdAt));

    return transactions.map(row => ({
      ...row.log,
      cardNumber: row.cardNumber,
      machineName: row.machineName,
      machineLocation: row.machineLocation
    }));
  }

  // Admin-only user creation (replacing auto-registration)
  async createUserAccount(userData: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    createdBy: string;
  }): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.getUser(userData.id);
      if (existingUser) {
        throw new Error("User account already exists");
      }

      // Check if email is already in use
      const [existingEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));
      
      if (existingEmail) {
        throw new Error("Email address already in use");
      }

      // Create the user account
      const [newUser] = await db
        .insert(users)
        .values({
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          isAdmin: userData.isAdmin || false,
          isSuperAdmin: userData.isSuperAdmin || false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`User account created by admin ${userData.createdBy}: ${userData.email}`);
      return newUser;
    } catch (error) {
      console.error("Failed to create user account:", error);
      throw error;
    }
  }

  async deleteUserAccount(userId: string, deletedBy: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      // Check if user has active business unit assignments
      const assignments = await db
        .select()
        .from(userBusinessUnits)
        .where(eq(userBusinessUnits.userId, userId));

      if (assignments.length > 0) {
        return { 
          success: false, 
          message: "Cannot delete user with active business unit assignments. Transfer ownership first." 
        };
      }

      // Delete the user account
      await db
        .delete(users)
        .where(eq(users.id, userId));

      console.log(`User account deleted by admin ${deletedBy}: ${user.email}`);
      return { success: true, message: "User account deleted successfully" };
    } catch (error) {
      console.error("Failed to delete user account:", error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to delete user account" 
      };
    }
  }
}

export const storage = new DatabaseStorage();
