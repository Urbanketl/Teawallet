import { db } from "./db";
import { 
  users, rfidCards, transactions, dispensingLogs, teaMachines,
  subscriptionPlans, userSubscriptions, loyaltyPoints, badges, userBadges,
  referrals, teaMoments, teaMomentLikes, supportTickets, supportMessages, faqArticles,
  type User, type UpsertUser, type RfidCard, type InsertRfidCard,
  type Transaction, type InsertTransaction, type DispensingLog, type InsertDispensingLog,
  type TeaMachine, type InsertTeaMachine, type SubscriptionPlan, type InsertSubscriptionPlan,
  type UserSubscription, type InsertUserSubscription, type LoyaltyPoint, type InsertLoyaltyPoint,
  type Badge, type InsertBadge, type UserBadge, type InsertUserBadge,
  type Referral, type InsertReferral, type TeaMoment, type InsertTeaMoment,
  type TeaMomentLike, type InsertTeaMomentLike, type SupportTicket, type InsertSupportTicket,
  type SupportMessage, type InsertSupportMessage, type FaqArticle, type InsertFaqArticle
} from "@shared/schema";
import { eq, and, desc, asc, sql, gte } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, profileData: any): Promise<User>;
  
  // Wallet operations
  updateWalletBalance(userId: string, amount: string): Promise<User>;
  
  // RFID operations
  getRfidCardByUserId(userId: string): Promise<RfidCard | undefined>;
  getRfidCardByNumber(cardNumber: string): Promise<RfidCard | undefined>;
  createRfidCard(rfidCard: InsertRfidCard): Promise<RfidCard>;
  updateRfidCardLastUsed(cardId: number, machineId: string): Promise<void>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  
  // Dispensing operations
  createDispensingLog(log: InsertDispensingLog): Promise<DispensingLog>;
  getUserDispensingLogs(userId: string, limit?: number): Promise<DispensingLog[]>;
  
  // Machine operations
  getTeaMachine(id: string): Promise<TeaMachine | undefined>;
  getAllTeaMachines(): Promise<TeaMachine[]>;
  updateMachinePing(machineId: string): Promise<void>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getTotalRevenue(): Promise<string>;
  getDailyStats(): Promise<{ totalUsers: number; totalRevenue: string; activeMachines: number; dailyDispensing: number }>;
  
  // Subscription operations
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getUserSubscription(userId: string): Promise<UserSubscription | undefined>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  
  // Loyalty operations
  getUserLoyaltyPoints(userId: string): Promise<number>;
  addLoyaltyPoints(point: InsertLoyaltyPoint): Promise<LoyaltyPoint>;
  getLoyaltyHistory(userId: string, limit?: number): Promise<LoyaltyPoint[]>;
  
  // Badge operations
  getAllBadges(): Promise<Badge[]>;
  getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]>;
  awardBadge(userBadge: InsertUserBadge): Promise<UserBadge>;
  checkAndAwardBadges(userId: string): Promise<void>;
  
  // Referral operations
  createReferral(referral: InsertReferral): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  
  // Social operations
  createTeaMoment(moment: InsertTeaMoment): Promise<TeaMoment>;
  getTeaMoments(limit?: number): Promise<(TeaMoment & { user: User; likes: number })[]>;
  getUserTeaMoments(userId: string): Promise<TeaMoment[]>;
  likeTeaMoment(like: InsertTeaMomentLike): Promise<TeaMomentLike>;
  
  // Support operations
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getUserSupportTickets(userId: string): Promise<SupportTicket[]>;
  getSupportTicket(ticketId: number): Promise<SupportTicket | undefined>;
  createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage>;
  getSupportMessages(ticketId: number): Promise<(SupportMessage & { sender: User })[]>;
  
  // FAQ operations
  getFaqArticles(category?: string): Promise<FaqArticle[]>;
  createFaqArticle(article: InsertFaqArticle): Promise<FaqArticle>;
  incrementFaqViews(articleId: number): Promise<void>;
  
  // Analytics operations
  getPopularTeaTypes(): Promise<{ teaType: string; count: number }[]>;
  getPeakHours(): Promise<{ hour: number; count: number }[]>;
  getMachinePerformance(): Promise<{ machineId: string; uptime: number; totalDispensed: number }[]>;
  getUserBehaviorInsights(): Promise<{ avgTeaPerDay: number; preferredTimes: number[]; topTeaTypes: string[] }>;
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
        companyName: profileData.companyName,
        mobileNumber: profileData.mobileNumber,
        address: profileData.address,
        buildingDetails: profileData.buildingDetails,
        city: profileData.city,
        state: profileData.state,
        pincode: profileData.pincode,
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

  // RFID operations
  async getRfidCardByUserId(userId: string): Promise<RfidCard | undefined> {
    const [card] = await db
      .select()
      .from(rfidCards)
      .where(and(eq(rfidCards.userId, userId), eq(rfidCards.isActive, true)));
    return card;
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
        lastMachine: machineId,
      })
      .where(eq(rfidCards.id, cardId));
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

  // Dispensing operations
  async createDispensingLog(log: InsertDispensingLog): Promise<DispensingLog> {
    const [dispensingLog] = await db
      .insert(dispensingLogs)
      .values(log)
      .returning();
    return dispensingLog;
  }

  async getUserDispensingLogs(userId: string, limit = 50): Promise<DispensingLog[]> {
    return await db
      .select()
      .from(dispensingLogs)
      .where(eq(dispensingLogs.userId, userId))
      .orderBy(desc(dispensingLogs.createdAt))
      .limit(limit);
  }

  // Machine operations
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

  async updateMachinePing(machineId: string): Promise<void> {
    await db
      .update(teaMachines)
      .set({ lastPing: new Date() })
      .where(eq(teaMachines.id, machineId));
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
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

  // Subscription operations
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [newPlan] = await db.insert(subscriptionPlans).values(plan).returning();
    return newPlan;
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, 'active')));
    return subscription;
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const [newSubscription] = await db.insert(userSubscriptions).values(subscription).returning();
    return newSubscription;
  }

  // Loyalty operations
  async getUserLoyaltyPoints(userId: string): Promise<number> {
    const [user] = await db.select({ points: users.loyaltyPoints }).from(users).where(eq(users.id, userId));
    return user?.points || 0;
  }

  async addLoyaltyPoints(point: InsertLoyaltyPoint): Promise<LoyaltyPoint> {
    const [newPoint] = await db.insert(loyaltyPoints).values(point).returning();
    
    // Update user's total loyalty points
    await db
      .update(users)
      .set({ loyaltyPoints: sql`${users.loyaltyPoints} + ${point.points}` })
      .where(eq(users.id, point.userId));
    
    return newPoint;
  }

  async getLoyaltyHistory(userId: string, limit = 50): Promise<LoyaltyPoint[]> {
    return await db
      .select()
      .from(loyaltyPoints)
      .where(eq(loyaltyPoints.userId, userId))
      .orderBy(desc(loyaltyPoints.createdAt))
      .limit(limit);
  }

  // Badge operations
  async getAllBadges(): Promise<Badge[]> {
    return await db.select().from(badges).where(eq(badges.isActive, true));
  }

  async getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]> {
    try {
      const userBadgeRecords = await db
        .select()
        .from(userBadges)
        .where(eq(userBadges.userId, userId))
        .orderBy(desc(userBadges.earnedAt));

      const badgesWithDetails = [];
      for (const userBadge of userBadgeRecords) {
        const [badge] = await db.select().from(badges).where(eq(badges.id, userBadge.badgeId));
        if (badge) {
          badgesWithDetails.push({ ...userBadge, badge });
        }
      }
      
      return badgesWithDetails as any;
    } catch (error) {
      console.error('Error fetching user badges:', error);
      return [];
    }
  }

  async awardBadge(userBadge: InsertUserBadge): Promise<UserBadge> {
    const [newBadge] = await db.insert(userBadges).values(userBadge).returning();
    
    // Award points for the badge
    const [badge] = await db.select().from(badges).where(eq(badges.id, userBadge.badgeId));
    if (badge?.points && badge.points > 0) {
      await this.addLoyaltyPoints({
        userId: userBadge.userId,
        points: badge.points,
        type: 'earned',
        source: 'badge',
        description: `Badge earned: ${badge.name}`,
      });
    }
    
    return newBadge;
  }

  async checkAndAwardBadges(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const allBadges = await this.getAllBadges();
    const userBadges = await this.getUserBadges(userId);
    const earnedBadgeIds = userBadges.map(ub => ub.badgeId);

    for (const badge of allBadges) {
      if (earnedBadgeIds.includes(badge.id)) continue;

      const requirement = badge.requirement as any;
      let shouldAward = false;

      switch (requirement.type) {
        case 'tea_count':
          shouldAward = user.teaCount >= requirement.value;
          break;
        case 'total_spent':
          shouldAward = parseFloat(user.totalSpent) >= requirement.value;
          break;
        case 'early_bird':
          // Check if user made a purchase before 9 AM in last 7 days
          const earlyBirdCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(dispensingLogs)
            .where(
              and(
                eq(dispensingLogs.userId, userId),
                sql`EXTRACT(HOUR FROM ${dispensingLogs.createdAt}) < 9`,
                sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '7 days'`
              )
            );
          shouldAward = earlyBirdCount[0]?.count >= requirement.value;
          break;
      }

      if (shouldAward) {
        await this.awardBadge({ userId, badgeId: badge.id });
      }
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

  // Social operations
  async createTeaMoment(moment: InsertTeaMoment): Promise<TeaMoment> {
    const [newMoment] = await db.insert(teaMoments).values(moment).returning();
    return newMoment;
  }

  async getTeaMoments(limit = 20): Promise<(TeaMoment & { user: User; likes: number })[]> {
    try {
      console.log('Storage: Fetching tea moments...');
      const moments = await db
        .select()
        .from(teaMoments)
        .where(eq(teaMoments.isPublic, true))
        .orderBy(desc(teaMoments.createdAt))
        .limit(limit);

      console.log('Storage: Found moments:', moments.length);
      const momentsWithUsers = [];
      for (const moment of moments) {
        const [user] = await db.select().from(users).where(eq(users.id, moment.userId));
        momentsWithUsers.push({
          ...moment,
          user: user || { id: moment.userId, firstName: 'Unknown', lastName: 'User', profileImageUrl: null }
        });
      }
      
      console.log('Storage: Returning moments with users:', momentsWithUsers.length);
      return momentsWithUsers as any;
    } catch (error) {
      console.error('Storage error fetching tea moments:', error);
      throw error;
    }
  }

  async getUserTeaMoments(userId: string): Promise<TeaMoment[]> {
    return await db
      .select()
      .from(teaMoments)
      .where(eq(teaMoments.userId, userId))
      .orderBy(desc(teaMoments.createdAt));
  }

  async likeTeaMoment(like: InsertTeaMomentLike): Promise<TeaMomentLike> {
    const [newLike] = await db.insert(teaMomentLikes).values(like).returning();
    
    // Update moment likes count
    await db
      .update(teaMoments)
      .set({ likes: sql`${teaMoments.likes} + 1` })
      .where(eq(teaMoments.id, like.momentId));
    
    return newLike;
  }

  // Support operations
  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    try {
      console.log('Storage: Creating ticket with data:', ticket);
      const [newTicket] = await db.insert(supportTickets).values(ticket).returning();
      console.log('Storage: Ticket created:', newTicket);
      return newTicket;
    } catch (error) {
      console.error('Storage: Error creating ticket:', error);
      throw error;
    }
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    return await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
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
      const messages = await db
        .select()
        .from(supportMessages)
        .where(eq(supportMessages.ticketId, ticketId))
        .orderBy(asc(supportMessages.createdAt));

      const messagesWithSenders = [];
      for (const message of messages) {
        const [sender] = await db.select().from(users).where(eq(users.id, message.senderId));
        messagesWithSenders.push({
          ...message,
          sender: sender || { id: message.senderId, firstName: 'Unknown', lastName: 'User', email: '' }
        });
      }
      
      return messagesWithSenders as any;
    } catch (error) {
      console.error('Error fetching support messages:', error);
      return [];
    }
  }

  // FAQ operations
  async getFaqArticles(category?: string): Promise<FaqArticle[]> {
    const query = db.select().from(faqArticles).where(eq(faqArticles.isPublished, true));
    
    if (category) {
      query.where(and(eq(faqArticles.isPublished, true), eq(faqArticles.category, category)));
    }
    
    return await query.orderBy(asc(faqArticles.order), asc(faqArticles.createdAt));
  }

  async createFaqArticle(article: InsertFaqArticle): Promise<FaqArticle> {
    const [newArticle] = await db.insert(faqArticles).values(article).returning();
    return newArticle;
  }

  async incrementFaqViews(articleId: number): Promise<void> {
    await db
      .update(faqArticles)
      .set({ views: sql`${faqArticles.views} + 1` })
      .where(eq(faqArticles.id, articleId));
  }

  // Analytics operations
  async getPopularTeaTypes(): Promise<{ teaType: string; count: number }[]> {
    return await db
      .select({
        teaType: dispensingLogs.teaType,
        count: sql<number>`count(*)`,
      })
      .from(dispensingLogs)
      .where(sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`)
      .groupBy(dispensingLogs.teaType)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
  }

  async getPeakHours(): Promise<{ hour: number; count: number }[]> {
    return await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${dispensingLogs.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(dispensingLogs)
      .where(sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`)
      .groupBy(sql`EXTRACT(HOUR FROM ${dispensingLogs.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${dispensingLogs.createdAt})`);
  }

  async getMachinePerformance(): Promise<{ machineId: string; uptime: number; totalDispensed: number }[]> {
    const machineStats = await db
      .select({
        machineId: dispensingLogs.machineId,
        totalDispensed: sql<number>`count(*)`,
      })
      .from(dispensingLogs)
      .where(sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`)
      .groupBy(dispensingLogs.machineId);

    return machineStats.map(stat => ({
      machineId: stat.machineId,
      uptime: 95, // Mock uptime calculation
      totalDispensed: stat.totalDispensed,
    }));
  }

  async getUserBehaviorInsights(): Promise<{ avgTeaPerDay: number; preferredTimes: number[]; topTeaTypes: string[] }> {
    const [avgResult] = await db
      .select({
        avgTeaPerDay: sql<number>`count(*) / 30.0`,
      })
      .from(dispensingLogs)
      .where(sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`);

    const preferredTimes = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${dispensingLogs.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(dispensingLogs)
      .where(sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`)
      .groupBy(sql`EXTRACT(HOUR FROM ${dispensingLogs.createdAt})`)
      .orderBy(desc(sql`count(*)`))
      .limit(3);

    const topTeaTypes = await db
      .select({
        teaType: dispensingLogs.teaType,
      })
      .from(dispensingLogs)
      .where(sql`${dispensingLogs.createdAt} > NOW() - INTERVAL '30 days'`)
      .groupBy(dispensingLogs.teaType)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    return {
      avgTeaPerDay: avgResult?.avgTeaPerDay || 0,
      preferredTimes: preferredTimes.map(pt => pt.hour),
      topTeaTypes: topTeaTypes.map(tt => tt.teaType),
    };
  }
}

export const storage = new DatabaseStorage();
