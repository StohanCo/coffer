"use client";

import { TrendingUp, TrendingDown, Wallet, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";

type Props = {
  data: DashboardData;
  onNavigate: (section: "accounts" | "transactions" | "budgets" | "analytics" | "stats" | "receipts" | "tax" | "settings" | "overview") => void;
};

export default function OverviewSection({ data, onNavigate }: Props) {
  const { summary, accounts, transactions, budgets, settings } = data;
  const currency = settings?.defaultCurrency ?? "NZD";
  const locale = settings?.locale ?? "en-NZ";

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your financial snapshot</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Balance"
          value={formatCurrency(summary.totalBalance, currency, locale)}
          sub={`${summary.currencies.join(", ")} accounts`}
          color="cyan"
        />
        <KpiCard
          label="Month Income"
          value={formatCurrency(summary.monthIncome, currency, locale)}
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          color="emerald"
        />
        <KpiCard
          label="Month Expenses"
          value={formatCurrency(summary.monthExpenses, currency, locale)}
          icon={<TrendingDown className="h-4 w-4 text-rose-400" />}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Accounts */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Accounts</h2>
            <button
              onClick={() => onNavigate("accounts")}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              View all
            </button>
          </div>
          {accounts.length === 0 ? (
            <EmptyState
              label="No accounts yet"
              action="Add account"
              onAction={() => onNavigate("accounts")}
            />
          ) : (
            <div className="space-y-2">
              {accounts.slice(0, 4).map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-brand-surface/60 px-4 py-3"
                  style={{ borderLeftColor: acc.color, borderLeftWidth: "3px" }}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{acc.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{acc.type}</p>
                  </div>
                  <p className="text-sm font-semibold text-white font-mono">
                    {formatCurrency(acc.balance, acc.currency, locale)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent transactions */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Recent Transactions
            </h2>
            <button
              onClick={() => onNavigate("transactions")}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              View all
            </button>
          </div>
          {recentTransactions.length === 0 ? (
            <EmptyState
              label="No transactions yet"
              action="Add transaction"
              onAction={() => onNavigate("transactions")}
            />
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-brand-surface/60 px-4 py-3"
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs"
                    style={{ backgroundColor: `${t.category?.color ?? "#64748b"}22`, color: t.category?.color ?? "#64748b" }}
                  >
                    {t.category?.name?.[0] ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">{t.description || t.category?.name || "Transaction"}</p>
                    <p className="text-xs text-slate-500">{t.account?.name}</p>
                  </div>
                  <p
                    className={`text-sm font-semibold font-mono ${
                      t.type === "income" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(t.amount, t.currency, locale)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Budgets summary */}
      {budgets.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Budgets</h2>
            <button
              onClick={() => onNavigate("budgets")}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {budgets.slice(0, 4).map((b) => {
              const pct = Math.min(100, (parseFloat(b.spent) / parseFloat(b.amount)) * 100);
              const over = pct >= 100;
              return (
                <div key={b.id} className="rounded-xl border border-slate-800/60 bg-brand-surface/60 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-200">{b.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(b.spent, b.currency, locale)} / {formatCurrency(b.amount, b.currency, locale)}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800">
                    <div
                      className={`h-1.5 rounded-full transition-all ${over ? "bg-rose-500" : "bg-cyan-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  color: "cyan" | "emerald" | "rose";
}) {
  const ring = { cyan: "ring-cyan-500/20", emerald: "ring-emerald-500/20", rose: "ring-rose-500/20" }[color];
  const text = { cyan: "text-cyan-300", emerald: "text-emerald-300", rose: "text-rose-300" }[color];
  return (
    <div className={`rounded-xl border border-slate-800/60 bg-brand-surface/60 p-4 ring-1 ${ring}`}>
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold font-mono ${text}`}>{value}</p>
      {(sub || icon) && (
        <div className="mt-1 flex items-center gap-1.5">
          {icon}
          {sub && <p className="text-xs text-slate-600">{sub}</p>}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label, action, onAction }: { label: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-8 text-center">
      <p className="mb-3 text-sm text-slate-500">{label}</p>
      <button
        onClick={onAction}
        className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        {action}
      </button>
    </div>
  );
}
