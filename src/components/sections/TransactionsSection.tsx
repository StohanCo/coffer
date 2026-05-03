"use client";

import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import AddTransactionModal from "@/components/modals/AddTransactionModal";

type Props = { data: DashboardData };

export default function TransactionsSection({ data }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const { transactions, settings } = data;
  const locale = settings?.locale ?? "en-NZ";

  const filtered = transactions.filter((t) => {
    const matchSearch =
      !search ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-sm text-slate-400 mt-0.5">{transactions.length} total</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition focus:border-cyan-500 placeholder:text-slate-600"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "income", "expense"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors cursor-pointer ${
                typeFilter === t
                  ? "bg-cyan-600 text-white"
                  : "border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-16 text-center">
          <p className="text-slate-500">No transactions found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/60 bg-brand-surface/80">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Description
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:table-cell">
                  Category
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 md:table-cell">
                  Account
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 lg:table-cell">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.map((t) => (
                <tr key={t.id} className="bg-brand-surface/40 hover:bg-brand-surface/80 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-200">{t.description || t.category?.name || "—"}</p>
                    {t.notes && <p className="text-xs text-slate-500 truncate max-w-xs">{t.notes}</p>}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {t.category ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: `${t.category.color}22`,
                          color: t.category.color,
                        }}
                      >
                        {t.category.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-slate-400 md:table-cell">
                    {t.account?.name ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell">
                    {formatDate(t.date instanceof Date ? t.date : new Date(t.date), locale)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-semibold font-mono ${
                    t.type === "income" ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(t.amount, t.currency, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddTransactionModal data={data} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
