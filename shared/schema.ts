import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0.00"),
  loyaltyPoints: integer("loyalty_points").default(0),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0.00"),
  teaCount: integer("tea_count").default(0),
  referralCode: varchar("referral_code").unique(),
  isAdmin: boolean("is_admin").default(false),
  companyName: varchar("company_name"),
  mobileNumber: varchar("mobile_number"),
  address: text("address"),
  buildingDetails: varchar("building_details"),
  city: varchar("city"),
  state: varchar("state"),
  pincode: varchar("pincode"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RFID Cards table
export const rfidCards = pgTable("rfid_cards", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  cardNumber: varchar("card_number").notNull().unique(),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  lastMachine: varchar("last_machine"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'recharge' or 'dispensing'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  method: varchar("method"), // 'razorpay', 'rfid', etc.
  razorpayPaymentId: varchar("razorpay_payment_id"),
  rfidCardId: integer("rfid_card_id").references(() => rfidCards.id),
  machineId: varchar("machine_id"),
  status: varchar("status").default("completed"), // 'pending', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

// Tea dispensing logs
export const dispensingLogs = pgTable("dispensing_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  rfidCardId: integer("rfid_card_id").notNull().references(() => rfidCards.id),
  machineId: varchar("machine_id").notNull(),
  teaType: varchar("tea_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tea machines table
export const teaMachines = pgTable("tea_machines", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  location: varchar("location").notNull(),
  isActive: boolean("is_active").default(true),
  lastPing: timestamp("last_ping"),
  teaTypes: jsonb("tea_types"), // Array of available tea types with prices
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'weekly', 'monthly'
  teaCount: integer("tea_count").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 5, scale: 2 }).default("0.00"), // percentage
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  remainingTeas: integer("remaining_teas").notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date").notNull(),
  autoRenew: boolean("auto_renew").default(false),
  status: varchar("status").default("active"), // 'active', 'paused', 'expired'
  createdAt: timestamp("created_at").defaultNow(),
});

// Loyalty Points
export const loyaltyPoints = pgTable("loyalty_points", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  points: integer("points").notNull(),
  type: varchar("type").notNull(), // 'earned', 'redeemed'
  source: varchar("source").notNull(), // 'purchase', 'referral', 'badge', 'redemption'
  description: text("description").notNull(),
  transactionId: integer("transaction_id").references(() => transactions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Achievement Badges
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  icon: varchar("icon").notNull(),
  requirement: jsonb("requirement").notNull(), // criteria for earning badge
  points: integer("points").default(0), // points awarded for badge
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Badges
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  badgeId: integer("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// Referrals
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  refereeId: varchar("referee_id").notNull().references(() => users.id),
  status: varchar("status").default("pending"), // 'pending', 'completed'
  bonusAwarded: boolean("bonus_awarded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tea Moments (Social Sharing)
export const teaMoments = pgTable("tea_moments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  teaType: varchar("tea_type").notNull(),
  machineId: varchar("machine_id").references(() => teaMachines.id),
  imageUrl: varchar("image_url"),
  isPublic: boolean("is_public").default(true),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tea Moment Likes
export const teaMomentLikes = pgTable("tea_moment_likes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  momentId: integer("moment_id").notNull().references(() => teaMoments.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: varchar("subject").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(), // 'technical', 'billing', 'general'
  priority: varchar("priority").default("medium"), // 'low', 'medium', 'high'
  status: varchar("status").default("open"), // 'open', 'in_progress', 'resolved', 'closed'
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
  attachments: varchar("attachments").array().default([]),
  isFromSupport: boolean("is_from_support").default(false),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  rfidCards: many(rfidCards),
  transactions: many(transactions),
  dispensingLogs: many(dispensingLogs),
}));

export const rfidCardsRelations = relations(rfidCards, ({ one, many }) => ({
  user: one(users, {
    fields: [rfidCards.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  dispensingLogs: many(dispensingLogs),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  rfidCard: one(rfidCards, {
    fields: [transactions.rfidCardId],
    references: [rfidCards.id],
  }),
}));

export const dispensingLogsRelations = relations(dispensingLogs, ({ one }) => ({
  user: one(users, {
    fields: [dispensingLogs.userId],
    references: [users.id],
  }),
  rfidCard: one(rfidCards, {
    fields: [dispensingLogs.rfidCardId],
    references: [rfidCards.id],
  }),
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

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
});



export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const insertTeaMomentSchema = createInsertSchema(teaMoments).omit({
  id: true,
  likes: true,
  createdAt: true,
});

export const insertTeaMomentLikeSchema = createInsertSchema(teaMomentLikes).omit({
  id: true,
  createdAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
});

export const insertFaqArticleSchema = createInsertSchema(faqArticles).omit({
  id: true,
  views: true,
  helpful: true,
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

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type TeaMoment = typeof teaMoments.$inferSelect;
export type InsertTeaMoment = z.infer<typeof insertTeaMomentSchema>;
export type TeaMomentLike = typeof teaMomentLikes.$inferSelect;
export type InsertTeaMomentLike = z.infer<typeof insertTeaMomentLikeSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type FaqArticle = typeof faqArticles.$inferSelect;
export type InsertFaqArticle = z.infer<typeof insertFaqArticleSchema>;
