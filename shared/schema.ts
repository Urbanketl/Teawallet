import { pgTable, serial, text, varchar, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sessions table for authentication
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Users table - Platform users who can manage multiple business units
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false), // Platform admin vs regular user
  isSuperAdmin: boolean("is_super_admin").default(false), // UrbanKetl platform super admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business Units table - Separate entities with their own wallets
export const businessUnits = pgTable("business_units", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  code: varchar("code").notNull().unique(),
  description: text("description"),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Business Unit assignments (many-to-many)
export const userBusinessUnits = pgTable("user_business_units", {
  userId: varchar("user_id").notNull().references(() => users.id),
  businessUnitId: varchar("business_unit_id").notNull().references(() => businessUnits.id),
  role: varchar("role").default("manager"), // 'manager', 'admin', 'viewer'
  createdAt: timestamp("created_at").defaultNow(),
});

// RFID Cards - Generic cards under business units
export const rfidCards = pgTable("rfid_cards", {
  id: serial("id").primaryKey(),
  businessUnitId: varchar("business_unit_id").notNull().references(() => businessUnits.id), // Business unit this card belongs to
  cardNumber: varchar("card_number").notNull().unique(),
  cardName: varchar("card_name"), // Optional name/label for the card (e.g., "Office Card #1")
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  lastUsedMachineId: varchar("last_used_machine_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessUnitId: varchar("business_unit_id").references(() => businessUnits.id), // Business unit for this transaction
  machineId: varchar("machine_id").references(() => teaMachines.id), // Machine involved (for dispensing transactions)
  type: varchar("type").notNull(), // 'recharge', 'deduction', 'refund', 'dispensing'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  status: varchar("status").default("completed"), // 'pending', 'completed', 'failed'
  razorpayOrderId: varchar("razorpay_order_id"),
  razorpayPaymentId: varchar("razorpay_payment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dispensing Logs
export const dispensingLogs = pgTable("dispensing_logs", {
  id: serial("id").primaryKey(),
  businessUnitId: varchar("business_unit_id").notNull().references(() => businessUnits.id), // Business unit whose wallet is charged
  rfidCardId: integer("rfid_card_id").notNull().references(() => rfidCards.id),
  machineId: varchar("machine_id").notNull().references(() => teaMachines.id),
  teaType: varchar("tea_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tea Machines - Linked to business units
export const teaMachines = pgTable("tea_machines", {
  id: varchar("id").primaryKey(),
  businessUnitId: varchar("business_unit_id").references(() => businessUnits.id), // Business unit this machine belongs to (optional for unassigned machines)
  name: varchar("name").notNull(),
  location: varchar("location").notNull(),
  isActive: boolean("is_active").default(true),
  lastPing: timestamp("last_ping"),
  teaTypes: jsonb("tea_types"), // Legacy field - keeping for backward compatibility
  price: decimal("price", { precision: 10, scale: 2 }).default("5.00"), // Single price per cup for Regular Tea
  serialNumber: varchar("serial_number"),
  installationDate: timestamp("installation_date"),
  maintenanceContact: varchar("maintenance_contact"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Referrals
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: varchar("referrer_id").notNull(),
  refereeId: varchar("referee_id").notNull(),
  status: varchar("status").default("pending"),
  rewardAmount: varchar("reward_amount").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: varchar("subject").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(),
  priority: varchar("priority").default("medium"),
  status: varchar("status").default("open"),
  assignedTo: varchar("assigned_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support Messages
export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  attachments: jsonb("attachments"),
  isFromSupport: boolean("is_from_support").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ticket Status History
export const ticketStatusHistory = pgTable("ticket_status_history", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  oldStatus: varchar("old_status"),
  newStatus: varchar("new_status").notNull(),
  updatedBy: varchar("updated_by").notNull().references(() => users.id),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// FAQ Articles
export const faqArticles = pgTable("faq_articles", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: varchar("category").notNull(),
  order: integer("order").default(0),
  isPublished: boolean("is_published").default(true),
  views: integer("views").default(0),
  helpful: integer("helpful").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Settings
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business Unit Transfer Audit Log
export const businessUnitTransfers = pgTable("business_unit_transfers", {
  id: serial("id").primaryKey(),
  businessUnitId: varchar("business_unit_id").notNull().references(() => businessUnits.id),
  fromUserId: varchar("from_user_id").references(() => users.id), // null for initial assignments
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  transferredBy: varchar("transferred_by").notNull().references(() => users.id),
  reason: text("reason"),
  transferDate: timestamp("transfer_date").defaultNow(),
  assetsTransferred: jsonb("assets_transferred"), // snapshot of assets at transfer time
});

// Relations - Updated for multi-business unit model
export const usersRelations = relations(users, ({ many }) => ({
  userBusinessUnits: many(userBusinessUnits),
  transactions: many(transactions),
  supportTickets: many(supportTickets),
  supportMessages: many(supportMessages),
}));

export const businessUnitsRelations = relations(businessUnits, ({ many }) => ({
  userBusinessUnits: many(userBusinessUnits),
  rfidCards: many(rfidCards),
  teaMachines: many(teaMachines),
  dispensingLogs: many(dispensingLogs),
  transactions: many(transactions),
}));

export const userBusinessUnitsRelations = relations(userBusinessUnits, ({ one }) => ({
  user: one(users, { fields: [userBusinessUnits.userId], references: [users.id] }),
  businessUnit: one(businessUnits, { fields: [userBusinessUnits.businessUnitId], references: [businessUnits.id] }),
}));

export const rfidCardsRelations = relations(rfidCards, ({ one, many }) => ({
  businessUnit: one(businessUnits, { fields: [rfidCards.businessUnitId], references: [businessUnits.id] }),
  dispensingLogs: many(dispensingLogs),
}));

export const teaMachinesRelations = relations(teaMachines, ({ one, many }) => ({
  businessUnit: one(businessUnits, { fields: [teaMachines.businessUnitId], references: [businessUnits.id] }),
  dispensingLogs: many(dispensingLogs),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  businessUnit: one(businessUnits, { fields: [transactions.businessUnitId], references: [businessUnits.id] }),
  machine: one(teaMachines, { fields: [transactions.machineId], references: [teaMachines.id] }),
}));

export const dispensingLogsRelations = relations(dispensingLogs, ({ one }) => ({
  businessUnit: one(businessUnits, { fields: [dispensingLogs.businessUnitId], references: [businessUnits.id] }),
  rfidCard: one(rfidCards, { fields: [dispensingLogs.rfidCardId], references: [rfidCards.id] }),
  machine: one(teaMachines, { fields: [dispensingLogs.machineId], references: [teaMachines.id] }),
}));

// Insert schemas
export const insertBusinessUnitSchema = createInsertSchema(businessUnits).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserBusinessUnitSchema = createInsertSchema(userBusinessUnits).omit({
  createdAt: true,
});

export const insertRfidCardSchema = createInsertSchema(rfidCards).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertDispensingLogSchema = createInsertSchema(dispensingLogs).omit({
  id: true,
  createdAt: true,
});

export const insertTeaMachineSchema = createInsertSchema(teaMachines).omit({
  createdAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketStatusHistorySchema = createInsertSchema(ticketStatusHistory).omit({
  id: true,
  createdAt: true,
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
});

export const insertFaqArticleSchema = createInsertSchema(faqArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertBusinessUnitTransferSchema = createInsertSchema(businessUnitTransfers).omit({
  id: true,
  transferDate: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type BusinessUnit = typeof businessUnits.$inferSelect & {
  ownerName?: string | null;
  ownerEmail?: string | null;
  assignedAt?: Date | null;
};
export type InsertBusinessUnit = z.infer<typeof insertBusinessUnitSchema>;
export type UserBusinessUnit = typeof userBusinessUnits.$inferSelect;
export type InsertUserBusinessUnit = z.infer<typeof insertUserBusinessUnitSchema>;
export type RfidCard = typeof rfidCards.$inferSelect;
export type InsertRfidCard = z.infer<typeof insertRfidCardSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type DispensingLog = typeof dispensingLogs.$inferSelect;
export type InsertDispensingLog = z.infer<typeof insertDispensingLogSchema>;
export type TeaMachine = typeof teaMachines.$inferSelect;
export type InsertTeaMachine = z.infer<typeof insertTeaMachineSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type TicketStatusHistory = typeof ticketStatusHistory.$inferSelect;
export type InsertTicketStatusHistory = z.infer<typeof insertTicketStatusHistorySchema>;
export type FaqArticle = typeof faqArticles.$inferSelect;
export type InsertFaqArticle = z.infer<typeof insertFaqArticleSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type BusinessUnitTransfer = typeof businessUnitTransfers.$inferSelect;
export type InsertBusinessUnitTransfer = z.infer<typeof insertBusinessUnitTransferSchema>;