"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/Skeleton";
import { Modal, Field, inputCls, primaryCls, secondaryCls } from "./AddAccountModal";
import { FREQUENCIES, type Frequency } from "@/lib/recurrence";
import type { DashboardData } from "@/server/services/dashboard";

export type EditableRecurring = DashboardData["recurring"][number];

type Props = {
  data: DashboardData;
  onClose: () => void;
  rule?: EditableRecurring;
};

export default function AddRecurringModal({ data, onClose, rule }: Props) {
  const router = useRouter();
  const isEdit = !!rule;
  const { accounts, categories } = data;

  const [type, setType] = useState<"income" | "expense">((rule?.type as "income" | "expense") ?? "expense");
  const [accountId, setAccountId] = useState(rule?.accountId ?? accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? "");
  const [amount, setAmount] = useState(rule?.amount ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [frequency, setFrequency] = useState<Frequency>((rule?.frequency as Frequency) ?? "monthly");
  const [nextDue, setNextDue] = useState(
    rule ? format(rule.nextDue instanceof Date ? rule.nextDue : new Date(rule.nextDue), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const filteredCategories = categories.filter((c) => c.type === type);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        accountId,
        categoryId: categoryId || null,
        amount,
        description,
        type,
        frequency,
        nextDue: new Date(nextDue).toISOString(),
      };
      const res = await fetch(isEdit ? `/api/recurring/${rule!.id}` : "/api/recurring", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!rule) return;
    if (!window.confirm(`Delete the recurring "${rule.description}"? Past transactions it created are kept.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/recurring/${rule.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit recurring" : "Add recurring"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {/* Type */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
          {(["expense", "income"] as const).map((t) => {
            const Icon = t === "income" ? TrendingUp : TrendingDown;
            const active = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategoryId(""); }}
                aria-pressed={active}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium capitalize transition-all cursor-pointer ${
                  active
                    ? t === "income" ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/40" : "bg-rose-600 text-white shadow-sm shadow-rose-950/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Account">
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls} required>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Amount">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">
                {selectedAccount?.currency ?? "NZD"}
              </span>
              <input
                type="number" step="0.01" min="0" value={amount}
                onChange={(e) => setAmount(e.target.value)} required placeholder="0.00"
                className={`${inputCls} pl-12 text-right font-mono`}
              />
            </div>
          </Field>
        </div>

        <Field label="Description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="e.g. Salary, Netflix, Rent"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
              <option value="">None</option>
              {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Next date">
            <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} required className={inputCls} />
          </Field>
        </div>

        <Field label="Frequency">
          <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
            {FREQUENCIES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                aria-pressed={frequency === f}
                className={`rounded-lg py-2 text-xs font-medium capitalize transition-all cursor-pointer ${
                  frequency === f ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/40" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          {isEdit && (
            <button type="button" onClick={remove} disabled={deleting} className="btn-ghost mr-auto text-rose-400 hover:bg-rose-900/30 hover:text-rose-300">
              {deleting ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
          )}
          <button type="button" onClick={onClose} className={secondaryCls}>Cancel</button>
          <button type="submit" disabled={loading} className={primaryCls}>
            {loading && <Spinner className="h-4 w-4" />}
            {loading ? "Saving…" : isEdit ? "Save changes" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
