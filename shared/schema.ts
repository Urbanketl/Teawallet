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
  password: varchar("password").notNull(), // Hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  mobileNumber: varchar("mobile_number").notNull(), // Mobile number - mandatory field
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false), // Platform admin vs regular user
  isSuperAdmin: boolean("is_super_admin").default(false), // UrbanKetl platform super admin
  requiresPasswordReset: boolean("requires_password_reset").default(true), // First-time login password reset
  passwordResetToken: varchar("password_reset_token"), // Token for password reset
  passwordResetExpires: timestamp("password_reset_expires"), // Token expiration
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

// RFID Cards - Generic cards under business units with DESFire support
export const rfidCards = pgTable("rfid_cards", {
  id: serial("id").primaryKey(),
  businessUnitId: varchar("business_unit_id").notNull().references(() => businessUnits.id), // Business unit this card belongs to
  cardNumber: varchar("card_number").notNull().unique(),
  cardName: varchar("card_name"), // Optional name/label for the card (e.g., "Office Card #1")
  hardwareUid: varchar("hardware_uid").unique(), // DESFire factory UID (7-byte hex)
  aesKeyEncrypted: text("aes_key_encrypted"), // Encrypted AES key for challenge-response
  cardType: varchar("card_type").default("basic"), // 'basic', 'desfire'
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

// Dispensing Logs - Unified for both RFID and UPI transactions
export const dispensingLogs = pgTable("dispensing_logs", {
  id: serial("id").primaryKey(),
  businessUnitId: varchar("business_unit_id").references(() => businessUnits.id), // Business unit whose wallet is charged (nullable for UPI direct payments)
  
  // Payment method differentiation
  paymentType: varchar("payment_type").notNull().default("rfid"), // 'rfid' or 'upi'
  
  // RFID-specific fields (nullable for UPI)
  rfidCardId: integer("rfid_card_id").references(() => rfidCards.id),
  
  // UPI-specific fields (nullable for RFID)
  upiPaymentId: varchar("upi_payment_id"), // External payment ID from UPI gateway
  upiVpa: varchar("upi_vpa"), // UPI Virtual Payment Address
  externalTransactionId: varchar("external_transaction_id"), // kulhad transaction ID
  externalId: varchar("external_id"), // kulhad _id for deduplication
  
  // Common fields
  machineId: varchar("machine_id").notNull(),
  teaType: varchar("tea_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  cups: integer("cups").default(1), // Number of cups dispensed
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  externalCreatedAt: timestamp("external_created_at"), // Original timestamp from external system
});

// Tea Machines - Linked to business units with sync support
export const teaMachines = pgTable("tea_machines", {
  id: varchar("id").primaryKey(),
  businessUnitId: varchar("business_unit_id").references(() => businessUnits.id), // Business unit this machine belongs to (optional for unassigned machines)
  name: varchar("name").notNull(),
  location: varchar("location").notNull(),
  isActive: boolean("is_active").default(true),
  lastPing: timestamp("last_ping"),
  lastSync: timestamp("last_sync"), // Last successful card data sync
  syncStatus: varchar("sync_status").default("pending"), // 'synced', 'pending', 'failed'
  ipAddress: varchar("ip_address"), // Machine network address
  authToken: varchar("auth_token"), // Machine authentication token
  masterKeyHash: varchar("master_key_hash"), // Hash of machine's master key
  cardsCount: integer("cards_count").default(0), // Number of cards synced
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

// Machine Sync Logs - Track all sync operations
export const machineSyncLogs = pgTable("machine_sync_logs", {
  id: serial("id").primaryKey(),
  machineId: varchar("machine_id").notNull().references(() => teaMachines.id),
  syncType: varchar("sync_type").notNull(), // 'initial', 'update', 'heartbeat', 'bulk'
  dataPushed: jsonb("data_pushed"), // What data was sent
  syncStatus: varchar("sync_status").notNull(), // 'success', 'failed', 'partial'
  errorMessage: text("error_message"),
  responseTime: integer("response_time"), // milliseconds
  cardsUpdated: integer("cards_updated").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// UPI Sync Logs - Track all UPI transaction sync operations
export const upiSyncLogs = pgTable("upi_sync_logs", {
  id: serial("id").primaryKey(),
  syncType: varchar("sync_type").notNull(), // 'initial', 'daily', 'manual'
  startDate: timestamp("start_date").notNull(), // Date range start for sync
  endDate: timestamp("end_date").notNull(), // Date range end for sync
  recordsFound: integer("records_found").default(0), // Total records from API
  recordsProcessed: integer("records_processed").default(0), // Successfully processed
  recordsSkipped: integer("records_skipped").default(0), // Duplicates/invalid
  syncStatus: varchar("sync_status").notNull(), // 'success', 'failed', 'partial'
  errorMessage: text("error_message"),
  responseTime: integer("response_time"), // milliseconds
  apiResponse: jsonb("api_response"), // Sample of API response for debugging
  triggeredBy: varchar("triggered_by"), // 'cron', 'admin', 'manual'
  createdAt: timestamp("created_at").defaultNow(),
});

// Machine Certificates - Authentication for machines
export const machineCertificates = pgTable("machine_certificates", {
  machineId: varchar("machine_id").primaryKey().references(() => teaMachines.id),
  publicKey: text("public_key").notNull(),
  certificateHash: varchar("certificate_hash").notNull(),
  masterKeyVersion: integer("master_key_version").default(1),
  isActive: boolean("is_active").default(true),
  lastAuthentication: timestamp("last_authentication"),
  createdAt: timestamp("created_at").defaultNow(),
});

// RFID Authentication Logs - Track all card authentication attempts
export const rfidAuthLogs = pgTable("rfid_auth_logs", {
  id: serial("id").primaryKey(),
  machineId: varchar("machine_id").notNull().references(() => teaMachines.id),
  cardIdentifier: varchar("card_identifier"), // Could be UID or card number
  businessUnitId: varchar("business_unit_id").references(() => businessUnits.id),
  authMethod: varchar("auth_method").notNull(), // 'challenge_response', 'basic_uid'
  authResult: boolean("auth_result").notNull(),
  errorMessage: text("error_message"),
  responseTime: integer("response_time"), // milliseconds
  challengeHash: varchar("challenge_hash"), // Hash of challenge for audit
  createdAt: timestamp("created_at").defaultNow(),
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
  syncLogs: many(machineSyncLogs),
  certificate: one(machineCertificates, { fields: [teaMachines.id], references: [machineCertificates.machineId] }),
  authLogs: many(rfidAuthLogs),
}));

export const machineSyncLogsRelations = relations(machineSyncLogs, ({ one }) => ({
  machine: one(teaMachines, { fields: [machineSyncLogs.machineId], references: [teaMachines.id] }),
}));

export const machineCertificatesRelations = relations(machineCertificates, ({ one }) => ({
  machine: one(teaMachines, { fields: [machineCertificates.machineId], references: [teaMachines.id] }),
}));

export const rfidAuthLogsRelations = relations(rfidAuthLogs, ({ one }) => ({
  machine: one(teaMachines, { fields: [rfidAuthLogs.machineId], references: [teaMachines.id] }),
  businessUnit: one(businessUnits, { fields: [rfidAuthLogs.businessUnitId], references: [businessUnits.id] }),
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

// Email notification tracking and preferences
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  businessUnitId: varchar("business_unit_id").references(() => businessUnits.id),
  emailType: varchar("email_type", { length: 100 }).notNull(), // 'critical_balance', 'low_balance'
  subject: varchar("subject", { length: 255 }).notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  deliveryStatus: varchar("delivery_status", { length: 50 }).default("sent"),
  lastSentAt: timestamp("last_sent_at"),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).unique(),
  emailEnabled: boolean("email_enabled").default(true),
  balanceAlerts: boolean("balance_alerts").default(true),
  criticalAlerts: boolean("critical_alerts").default(true),
  lowBalanceAlerts: boolean("low_balance_alerts").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export types
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessUnitTransferSchema = createInsertSchema(businessUnitTransfers).omit({
  id: true,
  transferDate: true,
});

export const insertMachineSyncLogSchema = createInsertSchema(machineSyncLogs).omit({
  id: true,
  createdAt: true,
});

export const insertMachineCertificateSchema = createInsertSchema(machineCertificates).omit({
  createdAt: true,
});

export const insertRfidAuthLogSchema = createInsertSchema(rfidAuthLogs).omit({
  id: true,
  createdAt: true,
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
export type MachineSyncLog = typeof machineSyncLogs.$inferSelect;
export type InsertMachineSyncLog = z.infer<typeof insertMachineSyncLogSchema>;
export type MachineCertificate = typeof machineCertificates.$inferSelect;
export type InsertMachineCertificate = z.infer<typeof insertMachineCertificateSchema>;
export type RfidAuthLog = typeof rfidAuthLogs.$inferSelect;
export type InsertRfidAuthLog = z.infer<typeof insertRfidAuthLogSchema>;