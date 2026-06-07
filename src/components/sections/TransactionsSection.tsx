"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ArrowLeftRight, Pencil, Trash2, Download, Upload } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import AddTransactionModal from "@/components/modals/AddTransactionModal";
import TransferModal from "@/components/modals/TransferModal";
import ImportTransactionsModal from "@/components/modals/ImportTransactionsModal";
import { Spinner } from "@/components/ui/Skeleton";
import { PageHeader, EmptyState } from "@/components/ui/Page";

type Props = { data: DashboardData };
type Tx = DashboardData["transactions"][number];

export default function TransactionsSection({ data }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense" | "transfer">("all");
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

  async function handleDelete(t: Tx) {
    const isTransfer = t.type === "transfer";
    const confirmMsg = isTransfer
      ? "Delete this transfer? Both legs will be removed and balances reverted."
      : "Delete this transaction? The account balance will be reverted.";
    if (!window.confirm(confirmMsg)) return;
    setDeletingId(t.id);
    try {
      const res = await fetch(`/api/transactions/${t.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle={`${transactions.length} total`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/transactions/export"
              className="btn-secondary px-3 py-2"
              title="Export all transactions to CSV"
            >
              <Download className="h-4 w-4" />
              Export
            </a>
            <button onClick={() => setShowImport(true)} className="btn-secondary px-3 py-2" title="Import transactions from CSV">
              <Upload className="h-4 w-4" />
              Import
            </button>
            <button onClick={() => setShowTransfer(true)} className="btn-secondary">
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/70 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 placeholder:text-slate-600"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "income", "expense", "transfer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-all cursor-pointer active:scale-[0.98] ${
                typeFilter === t
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/40"
                  : "border border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          label={transactions.length === 0 ? "No transactions yet" : "No matches"}
          hint={transactions.length === 0 ? "Add your first transaction to get started." : "Try a different search or filter."}
        />
      ) : (
        <div className="card overflow-hidden">
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
                <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.map((t) => {
                const isTransfer = t.type === "transfer";
                const isPositive = t.type === "income" || (isTransfer && !t.amount.startsWith("-"));
                const sign = isPositive ? "+" : "-";
                const amountAbs = t.amount.replace(/^-/, "");
                return (
                  <tr key={t.id} className="group bg-brand-surface/40 hover:bg-brand-surface/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isTransfer && (
                          <ArrowLeftRight className="h-3.5 w-3.5 text-slate-500" aria-label="Transfer" />
                        )}
                        <p className="text-sm text-slate-200">{t.description || t.category?.name || "—"}</p>
                      </div>
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
                      isTransfer
                        ? "text-slate-300"
                        : t.type === "income" ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {sign}
                      {formatCurrency(amountAbs, t.currency, locale)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {!isTransfer && (
                          <button
                            type="button"
                            onClick={() => setEditing(t)}
                            aria-label="Edit transaction"
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(t)}
                          disabled={deletingId === t.id}
                          aria-label="Delete transaction"
                          className="p-1.5 rounded text-slate-400 hover:text-rose-300 hover:bg-rose-900/40 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/60"
                        >
                          {deletingId === t.id ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddTransactionModal data={data} onClose={() => setShowAdd(false)} />}
      {showTransfer && <TransferModal data={data} onClose={() => setShowTransfer(false)} />}
      {showImport && <ImportTransactionsModal onClose={() => setShowImport(false)} />}
      {editing && (
        <AddTransactionModal data={data} transaction={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
