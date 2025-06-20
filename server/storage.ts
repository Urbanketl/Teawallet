import {
  users,
  rfidCards,
  transactions,
  dispensingLogs,
  teaMachines,
  type User,
  type UpsertUser,
  type RfidCard,
  type InsertRfidCard,
  type Transaction,
  type InsertTransaction,
  type DispensingLog,
  type InsertDispensingLog,
  type TeaMachine,
  type InsertTeaMachine,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
