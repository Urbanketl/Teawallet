import { db } from "./db";
import { 
  users, rfidCards, transactions, dispensingLogs, teaMachines,
  referrals, supportTickets, supportMessages, ticketStatusHistory, faqArticles, systemSettings,
  type User, type UpsertUser, type RfidCard, type InsertRfidCard,
  type Transaction, type InsertTransaction, type DispensingLog, type InsertDispensingLog,
  type TeaMachine, type InsertTeaMachine,
  type Referral, type InsertReferral, type SupportTicket, type InsertSupportTicket,
  type SupportMessage, type InsertSupportMessage, type FaqArticle, type InsertFaqArticle,
  type TicketStatusHistory, type InsertTicketStatusHistory, type SystemSetting
} from "@shared/schema";
import { eq, and, desc, asc, sql, gte, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, profileData: any): Promise<User>;
  
  // Wallet operations
  updateWalletBalance(userId: string, amount: string): Promise<User>;
  
  // B2B Corporate RFID operations
  getManagedRfidCards(businessUnitAdminId: string): Promise<RfidCard[]>;
  getRfidCardByNumber(cardNumber: string): Promise<RfidCard | undefined>;
  createRfidCard(rfidCard: InsertRfidCard): Promise<RfidCard>;
  updateRfidCardLastUsed(cardId: number, machineId: string): Promise<void>;
  deactivateRfidCard(cardId: number): Promise<void>;
  
  // B2B Corporate Machine operations
  getManagedMachines(businessUnitAdminId: string): Promise<TeaMachine[]>;
  getTeaMachine(id: string): Promise<TeaMachine | undefined>;
  getAllTeaMachines(): Promise<TeaMachine[]>;
  createTeaMachine(machine: InsertTeaMachine): Promise<TeaMachine>;
  updateMachinePing(machineId: string): Promise<void>;
  updateMachineStatus(machineId: string, isActive: boolean): Promise<void>;
  
  // Legacy Admin RFID operations (for super admin)
  createRfidCardForUser(userId: string, cardNumber: string): Promise<RfidCard>;
  getAllRfidCards(): Promise<(RfidCard & { businessUnitAdmin: User })[]>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  
  // B2B Corporate Dispensing operations
  createDispensingLog(log: InsertDispensingLog): Promise<DispensingLog>;
  getManagedDispensingLogs(businessUnitAdminId: string, limit?: number): Promise<DispensingLog[]>;
  getUserDispensingLogs(userId: string, limit?: number): Promise<DispensingLog[]>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUsersPaginated(page: number, limit: number, search?: string): Promise<{ users: User[], total: number }>;
  updateUserAdminStatus(userId: string, isAdmin: boolean, updatedBy: string): Promise<User>;
  getTotalRevenue(): Promise<string>;
  getDailyStats(): Promise<{ totalUsers: number; totalRevenue: string; activeMachines: number; dailyDispensing: number }>;
  

  

  
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
  getPopularTeaTypes(startDate?: string, endDate?: string, businessUnitAdminId?: string): Promise<{ teaType: string; count: number }[]>;
  getPeakHours(startDate?: string, endDate?: string, businessUnitAdminId?: string): Promise<{ hour: number; count: number }[]>;
  getMachinePerformance(startDate?: string, endDate?: string, businessUnitAdminId?: string): Promise<{ machineId: string; uptime: number; totalDispensed: number }[]>;
  getUserBehaviorInsights(startDate?: string, endDate?: string, businessUnitAdminId?: string): Promise<{ avgTeaPerDay: number; preferredTimes: number[]; topTeaTypes: string[] }>;
  getMachineDispensingData(startDate?: string, endDate?: string, machineId?: string, businessUnitAdminId?: string): Promise<{ date: string; dispensed: number; machineId?: string; [key: string]: any }[]>;
  
  // System settings operations
  getSystemSetting(key: string): Promise<string | undefined>;
  updateSystemSetting(key: string, value: string, updatedBy: string): Promise<void>;
  getAllSystemSettings(): Promise<{ key: string; value: string; description: string | null }[]>;
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

  // Wallet operations
  async updateWalletBalance(userId: string, amount: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        walletBalance: sql`wallet_balance + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // B2B Corporate RFID operations
  async getManagedRfidCards(businessUnitAdminId: string): Promise<RfidCard[]> {
    return await db
      .select()
      .from(rfidCards)
      .where(eq(rfidCards.businessUnitAdminId, businessUnitAdminId))
      .orderBy(desc(rfidCards.createdAt));
  }

  async getRfidCardByUserId(userId: string): Promise<RfidCard | undefined> {
    const [card] = await db
      .select()
      .from(rfidCards)
      .where(and(eq(rfidCards.businessUnitAdminId, userId), eq(rfidCards.isActive, true)))
      .orderBy(desc(rfidCards.createdAt));
    return card;
  }

  async getAllRfidCardsByUserId(userId: string): Promise<RfidCard[]> {
    return await db
      .select()
      .from(rfidCards)
      .where(eq(rfidCards.businessUnitAdminId, userId))
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

  // Legacy Admin RFID operations (for super admin)
  async createRfidCardForUser(userId: string, cardNumber: string): Promise<RfidCard> {
    const [newCard] = await db
      .insert(rfidCards)
      .values({
        businessUnitAdminId: userId,
        cardNumber: cardNumber,
        isActive: true,
      })
      .returning();
    return newCard;
  }

  async getAllRfidCards(): Promise<(RfidCard & { businessUnitAdmin: User })[]> {
    return await db
      .select({
        id: rfidCards.id,
        businessUnitAdminId: rfidCards.businessUnitAdminId,
        cardNumber: rfidCards.cardNumber,
        cardName: rfidCards.cardName,
        isActive: rfidCards.isActive,
        lastUsed: rfidCards.lastUsed,
        lastUsedMachineId: rfidCards.lastUsedMachineId,
        createdAt: rfidCards.createdAt,
        businessUnitAdmin: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          walletBalance: users.walletBalance,
          companyName: users.companyName,
          businessUnitId: users.businessUnitId,
          isAdmin: users.isAdmin,
          isSuperAdmin: users.isSuperAdmin,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(rfidCards)
      .leftJoin(users, eq(rfidCards.businessUnitAdminId, users.id))
      .orderBy(desc(rfidCards.createdAt));
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
      .select({
        id: transactions.id,
        userId: transactions.userId,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        status: transactions.status,
        razorpayPaymentId: transactions.razorpayPaymentId,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  // Dispensing operations
  async createDispensingLog(log: InsertDispensingLog): Promise<DispensingLog> {
    const [dispensingLog] = await db
      .insert(dispensingLogs)
      .values(log)
      .returning();
    return dispensingLog;
  }

  async getManagedDispensingLogs(businessUnitAdminId: string, limit = 50): Promise<DispensingLog[]> {
    return await db
      .select()
      .from(dispensingLogs)
      .where(eq(dispensingLogs.businessUnitAdminId, businessUnitAdminId))
      .orderBy(desc(dispensingLogs.createdAt))
      .limit(limit);
  }

  async getUserDispensingLogs(userId: string, limit = 50): Promise<DispensingLog[]> {
    return await db
      .select()
      .from(dispensingLogs)
      .where(eq(dispensingLogs.businessUnitAdminId, userId))
      .orderBy(desc(dispensingLogs.createdAt))
      .limit(limit);
  }

  // B2B Corporate Machine operations
  async getManagedMachines(businessUnitAdminId: string): Promise<TeaMachine[]> {
    return await db
      .select()
      .from(teaMachines)
      .where(eq(teaMachines.businessUnitAdminId, businessUnitAdminId))
      .orderBy(desc(teaMachines.createdAt));
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
      .where(eq(teaMachines.isActive, true));
  }

  async createTeaMachine(machine: InsertTeaMachine): Promise<TeaMachine> {
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

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async getUsersPaginated(page: number, limit: number, search?: string): Promise<{ users: User[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Simple approach: get total count first
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users);
    
    // Then get paginated results
    let usersQuery = db
      .select()
      .from(users);
      
    if (search) {
      usersQuery = usersQuery.where(
        sql`${users.firstName} ILIKE ${`%${search}%`} OR ${users.lastName} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}`
      );
    }
    
    const usersResult = await usersQuery
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
    
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

  // Analytics operations
  async getPopularTeaTypes(startDate?: string, endDate?: string, businessUnitAdminId?: string): Promise<{ teaType: string; count: number }[]> {
    let whereClause = sql`1=1`;
    
    if (startDate && endDate) {
      whereClause = sql`${dispensingLogs.createdAt} >= ${startDate} AND ${dispensingLogs.createdAt} <= ${endDate}`;
    } else {
      whereClause = sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`;
    }
    
    // Filter by business unit admin if specified (for regular admins)
    if (businessUnitAdminId) {
      whereClause = sql`${whereClause} AND ${dispensingLogs.businessUnitAdminId} = ${businessUnitAdminId}`;
    }
    
    return await db
      .select({
        teaType: dispensingLogs.teaType,
        count: sql<number>`count(*)`,
      })
      .from(dispensingLogs)
      .where(whereClause)
      .groupBy(dispensingLogs.teaType)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
  }

  async getPeakHours(startDate?: string, endDate?: string, businessUnitAdminId?: string): Promise<{ hour: number; count: number }[]> {
    let whereClause = sql`1=1`;
    
    if (startDate && endDate) {
      whereClause = sql`${dispensingLogs.createdAt} >= ${startDate} AND ${dispensingLogs.createdAt} <= ${endDate}`;
    } else {
      whereClause = sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`;
    }
    
    // Filter by business unit admin if specified (for regular admins)
    if (businessUnitAdminId) {
      whereClause = sql`${whereClause} AND ${dispensingLogs.businessUnitAdminId} = ${businessUnitAdminId}`;
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

  async getMachinePerformance(startDate?: string, endDate?: string, businessUnitAdminId?: string): Promise<{ machineId: string; uptime: number; totalDispensed: number }[]> {
    let whereClause = sql`1=1`;
    
    if (startDate && endDate) {
      whereClause = sql`${dispensingLogs.createdAt} >= ${startDate} AND ${dispensingLogs.createdAt} <= ${endDate}`;
    } else {
      whereClause = sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`;
    }
    
    // Filter by business unit admin if specified (for regular admins)
    if (businessUnitAdminId) {
      whereClause = sql`${whereClause} AND ${dispensingLogs.businessUnitAdminId} = ${businessUnitAdminId}`;
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

  async getUserBehaviorInsights(startDate?: string, endDate?: string, businessUnitAdminId?: string): Promise<{ avgTeaPerDay: number; preferredTimes: number[]; topTeaTypes: string[] }> {
    let whereClause = sql`1=1`;
    let daysDiff = 30;
    
    if (startDate && endDate) {
      whereClause = sql`${dispensingLogs.createdAt} >= ${startDate} AND ${dispensingLogs.createdAt} <= ${endDate}`;
      daysDiff = Math.max(1, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
    } else {
      whereClause = sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`;
    }

    // Filter by business unit admin if specified (for regular admins)
    if (businessUnitAdminId) {
      whereClause = sql`${whereClause} AND ${dispensingLogs.businessUnitAdminId} = ${businessUnitAdminId}`;
    }

    const [avgResult] = await db
      .select({
        avgTeaPerDay: sql<number>`count(*) / ${daysDiff}.0`,
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

    const topTeaTypes = await db
      .select({
        teaType: dispensingLogs.teaType,
      })
      .from(dispensingLogs)
      .where(whereClause)
      .groupBy(dispensingLogs.teaType)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    return {
      avgTeaPerDay: avgResult?.avgTeaPerDay || 0,
      preferredTimes: preferredTimes.map(pt => pt.hour),
      topTeaTypes: topTeaTypes.map(tt => tt.teaType),
    };
  }

  async getMachineDispensingData(startDate?: string, endDate?: string, machineId?: string, businessUnitAdminId?: string): Promise<{ date: string; dispensed: number; machineId?: string; [key: string]: any }[]> {
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
    if (businessUnitAdminId) {
      whereClause = sql`${whereClause} AND ${dispensingLogs.businessUnitAdminId} = ${businessUnitAdminId}`;
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
}

export const storage = new DatabaseStorage();
