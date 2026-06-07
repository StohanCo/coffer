"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import { PageHeader } from "@/components/ui/Page";

type Props = { data: DashboardData };

export default function AnalyticsSection({ data }: Props) {
  const { transactions, settings } = data;
  const currency = settings?.defaultCurrency ?? "NZD";
  const locale = settings?.locale ?? "en-NZ";

  // Build last 6 months income/expense data
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const label = format(d, "MMM");

    let income = new Decimal(0);
    let expenses = new Decimal(0);

    for (const t of transactions) {
      const td = t.date instanceof Date ? t.date : new Date(t.date);
      if (td < start || td > end) continue;
      if (t.currency !== currency) continue;
      if (t.type === "income") income = income.plus(new Decimal(t.amount).abs());
      else if (t.type === "expense") expenses = expenses.plus(new Decimal(t.amount).abs());
    }

    return { label, income: income.toNumber(), expenses: expenses.toNumber() };
  });

  // Spending by category (current month)
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const categorySpend: Record<string, { name: string; color: string; amount: number }> = {};
  for (const t of transactions) {
    const td = t.date instanceof Date ? t.date : new Date(t.date);
    if (td < monthStart || td > monthEnd) continue;
    if (t.type !== "expense") continue;
    const key = t.categoryId ?? "__none";
    if (!categorySpend[key]) {
      categorySpend[key] = {
        name: t.category?.name ?? "Uncategorized",
        color: t.category?.color ?? "#64748b",
        amount: 0,
      };
    }
    categorySpend[key].amount += new Decimal(t.amount).abs().toNumber();
  }

  const categoryData = Object.values(categorySpend)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const fmt = (v: number) => formatCurrency(v, currency, locale);

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" subtitle="Income vs expenses over time" />

      {/* Income vs Expenses — area chart */}
      <section className="card p-5">
        <h2 className="stat-label mb-5">6-month overview</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={months} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} width={55} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0d1321", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(v: number) => [fmt(v)]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
            <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#gradIncome)" strokeWidth={2} name="Income" />
            <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fill="url(#gradExpenses)" strokeWidth={2} name="Expenses" />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Category breakdown */}
      {categoryData.length > 0 && (
        <section className="card p-5">
          <h2 className="stat-label mb-5">This month — by category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0d1321", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [fmt(v)]}
              />
              <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}
