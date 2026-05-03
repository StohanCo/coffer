"use client";

import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";

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
      <div>
        <h1 className="text-2xl font-bold text-white">Statistics</h1>
        <p className="text-sm text-slate-400 mt-0.5">Month-over-month comparisons</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This Month Income"
          value={formatCurrency(thisIncome.toString(), currency, locale)}
          delta={incomeDelta}
          sub={`vs ${format(subMonths(now, 1), "MMM")}`}
          positive
        />
        <StatCard
          label="This Month Expenses"
          value={formatCurrency(thisExpenses.toString(), currency, locale)}
          delta={expensesDelta}
          sub={`vs ${format(subMonths(now, 1), "MMM")}`}
          positive={false}
        />
        <StatCard
          label="Avg Transaction"
          value={formatCurrency(avgTransaction.toString(), currency, locale)}
          sub={`across ${totalTransactions} transactions`}
        />
        <StatCard
          label="Net This Month"
          value={formatCurrency(thisIncome.minus(thisExpenses).toString(), currency, locale)}
          sub="income minus expenses"
          positive={thisIncome.gte(thisExpenses)}
        />
      </div>

      {/* Accounts balance list */}
      <section className="rounded-xl border border-slate-800/60 bg-brand-surface/60 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Account Balances
        </h2>
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
    <div className="rounded-xl border border-slate-800/60 bg-brand-surface/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold font-mono text-white">{value}</p>
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
