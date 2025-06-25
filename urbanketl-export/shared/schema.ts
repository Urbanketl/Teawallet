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

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0.00"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RFID Cards
export const rfidCards = pgTable("rfid_cards", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  cardNumber: varchar("card_number").notNull().unique(),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'recharge', 'deduction', 'refund'
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
  userId: varchar("user_id").notNull(),
  rfidCardId: integer("rfid_card_id").notNull().references(() => rfidCards.id),
  machineId: varchar("machine_id").notNull(),
  teaType: varchar("tea_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tea Machines
export const teaMachines = pgTable("tea_machines", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  location: varchar("location").notNull(),
  isActive: boolean("is_active").default(true),
  lastPing: timestamp("last_ping"),
  teaTypes: jsonb("tea_types"), // Array of available tea types with prices
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
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  category: varchar("category").notNull(),
  tags: jsonb("tags"),
  views: integer("views").default(0),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  rfidCards: many(rfidCards),
  transactions: many(transactions),
  supportTickets: many(supportTickets),
  supportMessages: many(supportMessages),
}));

export const rfidCardsRelations = relations(rfidCards, ({ one, many }) => ({
  user: one(users, { fields: [rfidCards.userId], references: [users.id] }),
  dispensingLogs: many(dispensingLogs),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
}));

export const dispensingLogsRelations = relations(dispensingLogs, ({ one }) => ({
  rfidCard: one(rfidCards, { fields: [dispensingLogs.rfidCardId], references: [rfidCards.id] }),
}));

// Insert schemas
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
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