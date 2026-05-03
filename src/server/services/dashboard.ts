import { db } from "@/lib/db/client";
import { financialAccount, transaction, category, budget, userSettings } from "@/lib/db/schema";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import Decimal from "decimal.js";
import { nanoid } from "nanoid";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

const DEFAULT_CATEGORIES = [
  { name: "Salary", icon: "briefcase", color: "#10b981", type: "income" },
  { name: "Freelance", icon: "code", color: "#06b6d4", type: "income" },
  { name: "Rent", icon: "home", color: "#6366f1", type: "expense" },
  { name: "Groceries", icon: "shopping-cart", color: "#f59e0b", type: "expense" },
  { name: "Transport", icon: "car", color: "#3b82f6", type: "expense" },
  { name: "Dining", icon: "utensils", color: "#ec4899", type: "expense" },
  { name: "Entertainment", icon: "tv", color: "#8b5cf6", type: "expense" },
  { name: "Healthcare", icon: "heart", color: "#ef4444", type: "expense" },
  { name: "Utilities", icon: "zap", color: "#f97316", type: "expense" },
  { name: "Transfer", icon: "arrows-left-right", color: "#64748b", type: "transfer" },
] as const;

export type DashboardData = {
  accounts: typeof financialAccount.$inferSelect[];
  transactions: (typeof transaction.$inferSelect & {
    category: typeof category.$inferSelect | null;
    account: typeof financialAccount.$inferSelect;
  })[];
  categories: typeof category.$inferSelect[];
  budgets: (typeof budget.$inferSelect & { spent: string })[];
  settings: typeof userSettings.$inferSelect | null;
  summary: {
    totalBalance: string;
    monthIncome: string;
    monthExpenses: string;
    currencies: string[];
  };
  balanceByCurrency: Record<string, string>;
};

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [accounts, categories, settings] = await Promise.all([
    db.query.financialAccount.findMany({
      where: and(eq(financialAccount.userId, userId), eq(financialAccount.isArchived, false)),
      orderBy: [desc(financialAccount.createdAt)],
    }),
    db.query.category.findMany({
      where: eq(category.userId, userId),
      orderBy: [category.name],
    }),
    db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) }),
  ]);

  // Seed default categories if none exist
  if (categories.length === 0) {
    const now = new Date();
    await db.insert(category).values(
      DEFAULT_CATEGORIES.map((c) => ({
        id: nanoid(),
        userId,
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: c.type,
        isDefault: true,
        createdAt: now,
      }))
    );
    categories.push(
      ...(await db.query.category.findMany({ where: eq(category.userId, userId) }))
    );
  }

  // Seed default settings if missing
  if (!settings) {
    const defaultCurrency = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "NZD";
    const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en-NZ";
    await db.insert(userSettings).values({
      userId,
      defaultCurrency,
      locale: defaultLocale,
      updatedAt: new Date(),
    });
  }

  const transactions = await db.query.transaction.findMany({
    where: eq(transaction.userId, userId),
    with: {
      category: true,
      account: true,
    },
    orderBy: [desc(transaction.date)],
    limit: 200,
  });

  const budgets = await db.query.budget.findMany({
    where: and(eq(budget.userId, userId), eq(budget.isActive, true)),
  });

  // Calculate month income/expenses
  const monthTransactions = transactions.filter((t) => {
    const d = t.date instanceof Date ? t.date : new Date(t.date);
    return d >= monthStart && d <= monthEnd;
  });

  let monthIncome = new Decimal(0);
  let monthExpenses = new Decimal(0);
  for (const t of monthTransactions) {
    const amt = new Decimal(t.amount);
    if (t.type === "income") monthIncome = monthIncome.plus(amt.abs());
    else if (t.type === "expense") monthExpenses = monthExpenses.plus(amt.abs());
  }

  // Balance by currency
  const balanceByCurrency: Record<string, string> = {};
  for (const acc of accounts) {
    const cur = acc.currency;
    balanceByCurrency[cur] = new Decimal(balanceByCurrency[cur] ?? 0)
      .plus(new Decimal(acc.balance))
      .toString();
  }

  const currencies = [...new Set(accounts.map((a) => a.currency))];

  // Total balance (primary currency only — FX handled client-side)
  const defaultCurrency = settings?.defaultCurrency ?? (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "NZD");
  const totalBalance = balanceByCurrency[defaultCurrency] ?? "0";

  // Budget spent amounts
  const budgetsWithSpent = budgets.map((b) => {
    const spent = transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.categoryId === b.categoryId &&
          t.currency === b.currency
      )
      .reduce((acc, t) => acc.plus(new Decimal(t.amount).abs()), new Decimal(0));

    return { ...b, spent: spent.toString() };
  });

  return {
    accounts,
    transactions: transactions as DashboardData["transactions"],
    categories,
    budgets: budgetsWithSpent,
    settings: settings ?? null,
    summary: {
      totalBalance,
      monthIncome: monthIncome.toString(),
      monthExpenses: monthExpenses.toString(),
      currencies,
    },
    balanceByCurrency,
  };
}
