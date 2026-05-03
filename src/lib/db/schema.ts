import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ── better-auth required tables ───────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

// ── App tables ────────────────────────────────────────────────────────────────

export const financialAccount = sqliteTable("financial_account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // checking | savings | credit | investment | loan | cash
  currency: text("currency").notNull().default("NZD"),
  balance: text("balance").notNull().default("0"), // TEXT for Decimal.js precision
  color: text("color").notNull().default("#06b6d4"),
  icon: text("icon"),
  isArchived: integer("isArchived", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const category = sqliteTable("category", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color").notNull().default("#6366f1"),
  type: text("type").notNull().default("expense"), // income | expense | transfer
  isDefault: integer("isDefault", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

export const transaction = sqliteTable("transaction", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId")
    .notNull()
    .references(() => financialAccount.id, { onDelete: "cascade" }),
  categoryId: text("categoryId").references(() => category.id, { onDelete: "set null" }),
  amount: text("amount").notNull(), // TEXT for Decimal.js; positive = income, negative = expense
  currency: text("currency").notNull(),
  description: text("description").notNull().default(""),
  notes: text("notes"),
  type: text("type").notNull(), // income | expense | transfer
  date: integer("date", { mode: "timestamp" }).notNull(),
  receiptUrl: text("receiptUrl"),
  receiptKey: text("receiptKey"),
  tags: text("tags"), // JSON array stored as TEXT
  isRecurring: integer("isRecurring", { mode: "boolean" }).notNull().default(false),
  recurringId: text("recurringId"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const budget = sqliteTable("budget", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  categoryId: text("categoryId").references(() => category.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  amount: text("amount").notNull(), // TEXT for Decimal.js
  currency: text("currency").notNull().default("NZD"),
  period: text("period").notNull().default("monthly"), // monthly | weekly | yearly
  startDate: integer("startDate", { mode: "timestamp" }).notNull(),
  endDate: integer("endDate", { mode: "timestamp" }),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const recurringTransaction = sqliteTable("recurring_transaction", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId")
    .notNull()
    .references(() => financialAccount.id, { onDelete: "cascade" }),
  categoryId: text("categoryId").references(() => category.id, { onDelete: "set null" }),
  amount: text("amount").notNull(),
  currency: text("currency").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // income | expense
  frequency: text("frequency").notNull(), // daily | weekly | monthly | yearly
  dayOfMonth: integer("dayOfMonth"),
  dayOfWeek: integer("dayOfWeek"),
  nextDue: integer("nextDue", { mode: "timestamp" }).notNull(),
  lastProcessed: integer("lastProcessed", { mode: "timestamp" }),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const accountSnapshot = sqliteTable("account_snapshot", {
  id: text("id").primaryKey(),
  accountId: text("accountId")
    .notNull()
    .references(() => financialAccount.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  balance: text("balance").notNull(),
  currency: text("currency").notNull(),
  snapshotDate: integer("snapshotDate", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

export const userSettings = sqliteTable("user_settings", {
  userId: text("userId")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  defaultCurrency: text("defaultCurrency").notNull().default("NZD"),
  locale: text("locale").notNull().default("en-NZ"),
  fiscalYearStart: integer("fiscalYearStart").notNull().default(4), // April for NZ
  taxRate: real("taxRate").notNull().default(0.33), // NZ top tax rate
  theme: text("theme").notNull().default("dark"),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export type User = typeof user.$inferSelect;
export type FinancialAccount = typeof financialAccount.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Transaction = typeof transaction.$inferSelect;
export type Budget = typeof budget.$inferSelect;
export type RecurringTransaction = typeof recurringTransaction.$inferSelect;
export type AccountSnapshot = typeof accountSnapshot.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
