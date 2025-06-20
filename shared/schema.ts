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
