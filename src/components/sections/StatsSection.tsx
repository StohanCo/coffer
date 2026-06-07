"use client";

import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import { PageHeader } from "@/components/ui/Page";

type Props = { data: DashboardData };

export default function StatsSection({ data }: Props) {
  const { transactions, accounts, settings } = data;
  const currency = settings?.defaultCurrency ?? "NZD";
  const locale = settings?.locale ?? "en-NZ";

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  function sumForPeriod(start: Date, end: Date, type: "income" | "expense") {
    return transactions
      .filter((t) => {
        const d = t.date instanceof Date ? t.date : new Date(t.date);
        return d >= start && d <= end && t.type === type && t.currency === currency;
      })
      .reduce((acc, t) => acc.plus(new Decimal(t.amount).abs()), new Decimal(0));
  }

  const thisIncome = sumForPeriod(thisMonthStart, thisMonthEnd, "income");
  const lastIncome = sumForPeriod(lastMonthStart, lastMonthEnd, "income");
  const thisExpenses = sumForPeriod(thisMonthStart, thisMonthEnd, "expense");
  const lastExpenses = sumForPeriod(lastMonthStart, lastMonthEnd, "expense");

  const incomeDelta = lastIncome.gt(0)
    ? thisIncome.minus(lastIncome).div(lastIncome).mul(100).toNumber()
    : null;
  const expensesDelta = lastExpenses.gt(0)
    ? thisExpenses.minus(lastExpenses).div(lastExpenses).mul(100).toNumber()
    : null;

  const avgTransaction =
    transactions.length > 0
      ? transactions
          .filter((t) => t.currency === currency)
          .reduce((acc, t) => acc.plus(new Decimal(t.amount).abs()), new Decimal(0))
          .div(transactions.length)
      : new Decimal(0);

  const totalTransactions = transactions.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Statistics" subtitle="Month-over-month comparisons" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This month income"
          value={formatCurrency(thisIncome.toString(), currency, locale)}
          delta={incomeDelta}
          sub={`vs ${format(subMonths(now, 1), "MMM")}`}
          positive
        />
        <StatCard
          label="This month expenses"
          value={formatCurrency(thisExpenses.toString(), currency, locale)}
          delta={expensesDelta}
          sub={`vs ${format(subMonths(now, 1), "MMM")}`}
          positive={false}
        />
        <StatCard
          label="Avg transaction"
          value={formatCurrency(avgTransaction.toString(), currency, locale)}
          sub={`across ${totalTransactions} transactions`}
        />
        <StatCard
          label="Net this month"
          value={formatCurrency(thisIncome.minus(thisExpenses).toString(), currency, locale)}
          sub="income minus expenses"
          positive={thisIncome.gte(thisExpenses)}
        />
      </div>

      {/* Accounts balance list */}
      <section className="card p-5">
        <h2 className="stat-label mb-4">Account balances</h2>
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: acc.color }} />
              <span className="flex-1 text-sm text-slate-300">{acc.name}</span>
              <span className="text-sm font-mono font-medium text-white">
                {formatCurrency(acc.balance, acc.currency, locale)}
              </span>
              <span className="text-xs text-slate-600">{acc.currency}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  sub,
  positive,
}: {
  label: string;
  value: string;
  delta?: number | null;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="stat-label">{label}</p>
      <p className="mt-2 font-mono text-xl font-bold text-white">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {delta != null && (
          <span
            className={`text-xs font-medium ${
              positive
                ? delta >= 0 ? "text-emerald-400" : "text-rose-400"
                : delta <= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {Math.round(delta)}%
          </span>
        )}
        {sub && <span className="text-xs text-slate-600">{sub}</span>}
      </div>
    </div>
  );
}
