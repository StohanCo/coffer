"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";

type Props = { data: DashboardData };

export default function BudgetsSection({ data }: Props) {
  const { budgets, settings } = data;
  const locale = settings?.locale ?? "en-NZ";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets</h1>
          <p className="text-sm text-slate-400 mt-0.5">{budgets.length} active</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500 transition-colors cursor-pointer">
          <Plus className="h-4 w-4" />
          Add budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-16 text-center">
          <p className="text-slate-500">No budgets yet</p>
          <p className="mt-1 text-xs text-slate-600">Create budgets to track your spending</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => {
            const limit = new Decimal(b.amount);
            const spent = new Decimal(b.spent);
            const pct = limit.gt(0) ? Math.min(100, spent.div(limit).mul(100).toNumber()) : 0;
            const remaining = limit.minus(spent);
            const over = pct >= 100;

            return (
              <div key={b.id} className="rounded-xl border border-slate-800/60 bg-brand-surface/60 p-5">
                <div className="mb-4">
                  <p className="font-semibold text-slate-100">{b.name}</p>
                  <p className="text-xs capitalize text-slate-500 mt-0.5">{b.period}</p>
                </div>
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Spent</p>
                    <p className="text-lg font-bold font-mono text-white">
                      {formatCurrency(b.spent, b.currency, locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Limit</p>
                    <p className="text-sm font-medium text-slate-300">
                      {formatCurrency(b.amount, b.currency, locale)}
                    </p>
                  </div>
                </div>
                <div className="mb-2 h-2 w-full rounded-full bg-slate-800">
                  <div
                    className={`h-2 rounded-full transition-all ${over ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-cyan-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">{Math.round(pct)}% used</p>
                  <p className={`text-xs font-medium ${over ? "text-rose-400" : "text-emerald-400"}`}>
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
    </div>
  );
}
