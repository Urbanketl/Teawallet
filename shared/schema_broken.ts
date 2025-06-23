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
  createdAt: timestamp("created_at").defaultNow(),
});

// Tea dispensing logs
export const dispensingLogs = pgTable("dispensing_logs", {

// Referrals
export const referrals = pgTable("referrals", {
  userId: varchar("user_id").notNull().references(() => users.id),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// Referrals
export const referrals = pgTable("referrals", {
