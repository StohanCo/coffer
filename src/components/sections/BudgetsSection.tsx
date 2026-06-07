"use client";

import { useState } from "react";
import { Plus, PieChart, Pencil } from "lucide-react";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import { PageHeader, EmptyState } from "@/components/ui/Page";
import AddBudgetModal, { type EditableBudget } from "@/components/modals/AddBudgetModal";

type Props = { data: DashboardData };

export default function BudgetsSection({ data }: Props) {
  const { budgets, settings } = data;
  const locale = settings?.locale ?? "en-NZ";
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<EditableBudget | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        subtitle={`${budgets.length} active`}
        action={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            Add budget
          </button>
        }
      />

      {budgets.length === 0 ? (
        <EmptyState
          icon={PieChart}
          label="No budgets yet"
          hint="Set monthly, weekly, or yearly limits per category to track spending against a plan."
          action="Create your first budget"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => {
            const limit = new Decimal(b.amount);
            const spent = new Decimal(b.spent);
            const pct = limit.gt(0) ? Math.min(100, spent.div(limit).mul(100).toNumber()) : 0;
            const remaining = limit.minus(spent);
            const over = pct >= 100;
            const near = pct > 80 && !over;

            return (
              <div key={b.id} className="group card-interactive p-5">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-100">{b.name}</p>
                    <p className="mt-0.5 text-xs capitalize text-slate-500">{b.period}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    {over && <span className="badge bg-rose-500/10 text-rose-400">Over</span>}
                    {near && <span className="badge bg-amber-500/10 text-amber-400">Almost</span>}
                    <button
                      type="button"
                      onClick={() => setEditing(b)}
                      aria-label={`Edit ${b.name}`}
                      className="rounded-lg p-1 text-slate-500 opacity-0 transition-all hover:bg-slate-800 hover:text-white focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 group-hover:opacity-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <p className="stat-label">Spent</p>
                    <p className="font-mono text-lg font-bold text-white">
                      {formatCurrency(b.spent, b.currency, locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="stat-label">Limit</p>
                    <p className="font-mono text-sm font-medium text-slate-300">
                      {formatCurrency(b.amount, b.currency, locale)}
                    </p>
                  </div>
                </div>
                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${over ? "bg-rose-500" : near ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">{Math.round(pct)}% used</p>
                  <p className={`font-mono text-xs font-medium ${over ? "text-rose-400" : "text-emerald-400"}`}>
                    {over ? "Over by " : ""}
                    {formatCurrency(remaining.abs().toString(), b.currency, locale)}
                    {!over ? " left" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddBudgetModal data={data} onClose={() => setShowAdd(false)} />}
      {editing && <AddBudgetModal data={data} budget={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
