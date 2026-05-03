"use client";

import { useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import AddAccountModal from "@/components/modals/AddAccountModal";

type Props = { data: DashboardData };

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  checking: "#06b6d4",
  savings: "#10b981",
  credit: "#f59e0b",
  investment: "#6366f1",
  loan: "#ef4444",
  cash: "#64748b",
};

export default function AccountsSection({ data }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const { accounts, settings } = data;
  const locale = settings?.locale ?? "en-NZ";

  const totalByCurrency = accounts.reduce<Record<string, number>>((acc, a) => {
    acc[a.currency] = (acc[a.currency] ?? 0) + parseFloat(a.balance);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-sm text-slate-400 mt-0.5">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add account
        </button>
      </div>

      {/* Totals by currency */}
      {Object.entries(totalByCurrency).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(totalByCurrency).map(([cur, amt]) => (
            <div key={cur} className="rounded-lg border border-slate-800 bg-brand-surface/60 px-4 py-2.5">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{cur} total</p>
              <p className="text-lg font-bold font-mono text-white">{formatCurrency(amt, cur, locale)}</p>
            </div>
          ))}
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-16 text-center">
          <p className="mb-3 text-slate-500">No accounts yet</p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add your first account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-xl border border-slate-800/60 bg-brand-surface/60 p-5 transition-colors hover:border-slate-700/80"
              style={{ borderTopColor: acc.color, borderTopWidth: "3px" }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-100">{acc.name}</p>
                  <p className="text-xs capitalize text-slate-500 mt-0.5">{acc.type}</p>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: `${acc.color}22`, color: acc.color }}
                >
                  {acc.currency}
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-white">
                {formatCurrency(acc.balance, acc.currency, locale)}
              </p>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
