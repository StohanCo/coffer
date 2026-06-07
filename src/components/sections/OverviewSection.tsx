"use client";

import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, PieChart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import BalanceSummary from "@/components/BalanceSummary";
import { PageHeader, SectionHeading, EmptyState } from "@/components/ui/Page";

type Props = {
  data: DashboardData;
  onNavigate: (section: "accounts" | "transactions" | "budgets" | "analytics" | "stats" | "receipts" | "tax" | "settings" | "overview") => void;
};

export default function OverviewSection({ data, onNavigate }: Props) {
  const { summary, accounts, transactions, budgets, settings } = data;
  const currency = settings?.defaultCurrency ?? "NZD";
  const locale = settings?.locale ?? "en-NZ";

  const recentTransactions = transactions.slice(0, 5);
  const net = parseFloat(summary.monthIncome) - parseFloat(summary.monthExpenses);

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" subtitle="Your financial snapshot" />

      {/* Aggregated balances + FX rates */}
      {accounts.length > 0 && <BalanceSummary data={data} />}

      {/* Month KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Month income"
          value={formatCurrency(summary.monthIncome, currency, locale)}
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiCard
          label="Month expenses"
          value={formatCurrency(summary.monthExpenses, currency, locale)}
          icon={TrendingDown}
          tone="rose"
        />
        <KpiCard
          label="Net this month"
          value={`${net >= 0 ? "+" : "−"}${formatCurrency(Math.abs(net), currency, locale)}`}
          icon={Wallet}
          tone={net >= 0 ? "emerald" : "rose"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Accounts */}
        <section>
          <SectionHeading title="Accounts" onViewAll={() => onNavigate("accounts")} />
          {accounts.length === 0 ? (
            <EmptyState icon={Wallet} label="No accounts yet" hint="Add your first account to start tracking balances." action="Add account" onAction={() => onNavigate("accounts")} />
          ) : (
            <div className="space-y-2">
              {accounts.slice(0, 4).map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => onNavigate("accounts")}
                  className="card-interactive flex w-full items-center justify-between px-4 py-3 text-left"
                  style={{ borderLeftColor: acc.color, borderLeftWidth: "3px" }}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{acc.name}</p>
                    <p className="text-xs capitalize text-slate-500">{acc.type}</p>
                  </div>
                  <p className="font-mono text-sm font-semibold text-white">
                    {formatCurrency(acc.balance, acc.currency, locale)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recent transactions */}
        <section>
          <SectionHeading title="Recent transactions" onViewAll={() => onNavigate("transactions")} />
          {recentTransactions.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} label="No transactions yet" hint="Log income and expenses to see them here." action="Add transaction" onAction={() => onNavigate("transactions")} />
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-brand-surface/60 px-4 py-3 transition-colors hover:border-slate-700"
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: `${t.category?.color ?? "#64748b"}22`, color: t.category?.color ?? "#94a3b8" }}
                  >
                    {t.category?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">{t.description || t.category?.name || "Transaction"}</p>
                    <p className="text-xs text-slate-500">{t.account?.name}</p>
                  </div>
                  <p className={`font-mono text-sm font-semibold ${t.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                    {t.type === "income" ? "+" : "−"}
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
          <SectionHeading title="Budgets" onViewAll={() => onNavigate("budgets")} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {budgets.slice(0, 4).map((b) => {
              const pct = Math.min(100, (parseFloat(b.spent) / parseFloat(b.amount)) * 100);
              const over = pct >= 100;
              const near = pct >= 80 && !over;
              return (
                <div key={b.id} className="card px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-200">{b.name}</p>
                    <p className="flex-shrink-0 font-mono text-xs text-slate-500">
                      {formatCurrency(b.spent, b.currency, locale)} / {formatCurrency(b.amount, b.currency, locale)}
                    </p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${over ? "bg-rose-500" : near ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* First-run hint when there is nothing at all */}
      {accounts.length === 0 && transactions.length === 0 && budgets.length === 0 && (
        <EmptyState icon={PieChart} label="Welcome to FinOps Local" hint="Start by adding an account, then log a few transactions. Everything stays on your server." />
      )}
    </div>
  );
}

const TONES = {
  emerald: { ring: "ring-emerald-500/15", chip: "bg-emerald-500/10 text-emerald-400", value: "text-emerald-300" },
  rose: { ring: "ring-rose-500/15", chip: "bg-rose-500/10 text-rose-400", value: "text-rose-300" },
} as const;

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <div className={`card p-4 ring-1 ${t.ring}`}>
      <div className="flex items-center justify-between">
        <p className="stat-label">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${t.chip}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-2 font-mono text-2xl font-bold ${t.value}`}>{value}</p>
    </div>
  );
}
