import { db } from "@/lib/db/client";
import { financialAccount, transaction, category, budget, userSettings, recurringTransaction } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import Decimal from "decimal.js";
import { nanoid } from "nanoid";
import { startOfMonth, endOfMonth } from "date-fns";
import { allCurrencies } from "@/lib/currencies";
import { getFxRates, convert } from "@/lib/fx";

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
  recurring: (typeof recurringTransaction.$inferSelect & {
    account: typeof financialAccount.$inferSelect | null;
    category: typeof category.$inferSelect | null;
  })[];
  settings: typeof userSettings.$inferSelect | null;
  summary: {
    totalBalance: string;
    totalBalanceFx: string; // sum of all accounts converted to default currency
    monthIncome: string;
    monthExpenses: string;
    currencies: string[];
  };
  balanceByCurrency: Record<string, string>;
  availableCurrencies: string[];
  fx: {
    base: string;
    rates: Record<string, number>;
    source: "live" | "fallback";
    fetchedAt: number;
  };
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

  const recurring = await db.query.recurringTransaction.findMany({
    where: eq(recurringTransaction.userId, userId),
    with: { account: true, category: true },
    orderBy: [recurringTransaction.nextDue],
  });

  // Determine base currency early — we need it for FX before any aggregations
  const defaultCurrency = settings?.defaultCurrency ?? (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "NZD");
  const fx = await getFxRates(defaultCurrency);

  // Filter transactions to the current month
  const monthTransactions = transactions.filter((t) => {
    const d = t.date instanceof Date ? t.date : new Date(t.date);
    return d >= monthStart && d <= monthEnd;
  });

  // Calculate month income/expenses, converting each transaction into the base currency
  let monthIncome = new Decimal(0);
  let monthExpenses = new Decimal(0);
  for (const t of monthTransactions) {
    const amtInBase = new Decimal(convert(t.amount, t.currency, defaultCurrency, fx.rates)).abs();
    if (t.type === "income") monthIncome = monthIncome.plus(amtInBase);
    else if (t.type === "expense") monthExpenses = monthExpenses.plus(amtInBase);
  }

  // Balance by currency (each account in its own native currency)
  const balanceByCurrency: Record<string, string> = {};
  for (const acc of accounts) {
    const cur = acc.currency;
    balanceByCurrency[cur] = new Decimal(balanceByCurrency[cur] ?? 0)
      .plus(new Decimal(acc.balance))
      .toString();
  }

  const currencies = [...new Set(accounts.map((a) => a.currency))];

  // Total balance in base currency only (no conversion — just the base accounts)
  const totalBalance = balanceByCurrency[defaultCurrency] ?? "0";

  // FX-normalized total: convert every account balance to defaultCurrency and sum
  let totalBalanceFx = new Decimal(0);
  for (const acc of accounts) {
    totalBalanceFx = totalBalanceFx.plus(
      new Decimal(convert(acc.balance, acc.currency, defaultCurrency, fx.rates))
    );
  }

  // Budget spent: convert each transaction to the budget's currency
  const budgetsWithSpent = budgets.map((b) => {
    const spent = transactions
      .filter((t) => t.type === "expense" && t.categoryId === b.categoryId)
      .reduce(
        (acc, t) =>
          acc.plus(
            new Decimal(convert(t.amount, t.currency, b.currency, fx.rates)).abs()
          ),
        new Decimal(0)
      );
    return { ...b, spent: spent.toString() };
  });

  return {
    accounts,
    transactions: transactions as DashboardData["transactions"],
    categories,
    budgets: budgetsWithSpent,
    recurring: recurring as DashboardData["recurring"],
    settings: settings ?? null,
    summary: {
      totalBalance,
      totalBalanceFx: totalBalanceFx.toString(),
      monthIncome: monthIncome.toString(),
      monthExpenses: monthExpenses.toString(),
      currencies,
    },
    balanceByCurrency,
    availableCurrencies: allCurrencies(settings?.extraCurrencies ?? "[]"),
    fx: { base: fx.base, rates: fx.rates, source: fx.source, fetchedAt: fx.fetchedAt },
  };
}
