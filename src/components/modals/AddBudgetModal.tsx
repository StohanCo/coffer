"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/Skeleton";
import { Modal, Field, inputCls, primaryCls, secondaryCls } from "./AddAccountModal";
import type { DashboardData } from "@/server/services/dashboard";

export type EditableBudget = DashboardData["budgets"][number];

const PERIODS = ["weekly", "monthly", "yearly"] as const;

type Props = {
  data: DashboardData;
  onClose: () => void;
  budget?: EditableBudget;
};

export default function AddBudgetModal({ data, onClose, budget }: Props) {
  const router = useRouter();
  const isEdit = !!budget;
  const expenseCategories = data.categories.filter((c) => c.type === "expense");

  const [name, setName] = useState(budget?.name ?? "");
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? expenseCategories[0]?.id ?? "");
  const [amount, setAmount] = useState(budget?.amount ?? "");
  const [currency, setCurrency] = useState(budget?.currency ?? data.settings?.defaultCurrency ?? "NZD");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(
    (budget?.period as (typeof PERIODS)[number]) ?? "monthly"
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill the name from the chosen category until the user types their own.
  function pickCategory(id: string) {
    setCategoryId(id);
    const cat = expenseCategories.find((c) => c.id === id);
    if (cat && (!name || expenseCategories.some((c) => c.name === name))) {
      setName(cat.name);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/budgets/${budget!.id}` : "/api/budgets", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, categoryId, amount, currency, period }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save budget");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!budget) return;
    if (!window.confirm(`Delete the "${budget.name}" budget?`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/budgets/${budget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete budget");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit budget" : "Add budget"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {expenseCategories.length === 0 && (
          <p className="rounded-lg border border-amber-800/40 bg-amber-900/15 px-3 py-2 text-xs text-amber-400/90">
            Add an expense category first (Settings) — budgets track spending per category.
          </p>
        )}

        <Field label="Category">
          <select value={categoryId} onChange={(e) => pickCategory(e.target.value)} className={inputCls} required>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Groceries"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Limit">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">
                {currency}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
                className={`${inputCls} pl-12 text-right font-mono`}
              />
            </div>
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
              {data.availableCurrencies.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Period">
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`rounded-lg py-2 text-sm font-medium capitalize transition-all cursor-pointer ${
                  period === p ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/40" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          {isEdit && (
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="btn-ghost mr-auto text-rose-400 hover:bg-rose-900/30 hover:text-rose-300"
            >
              {deleting ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
          )}
          <button type="button" onClick={onClose} className={secondaryCls}>Cancel</button>
          <button type="submit" disabled={loading || expenseCategories.length === 0} className={primaryCls}>
            {loading && <Spinner className="h-4 w-4" />}
            {loading ? "Saving…" : isEdit ? "Save changes" : "Create budget"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
