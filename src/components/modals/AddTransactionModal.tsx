"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { DashboardData } from "@/server/services/dashboard";
import { Modal, Field, inputCls, primaryCls, secondaryCls } from "./AddAccountModal";

type Props = { data: DashboardData; onClose: () => void };

export default function AddTransactionModal({ data, onClose }: Props) {
  const router = useRouter();
  const { accounts, categories } = data;

  const [type, setType] = useState<"income" | "expense">("expense");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const filteredCategories = categories.filter((c) => c.type === type || c.type === "transfer");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          accountId,
          categoryId: categoryId || null,
          amount,
          currency: selectedAccount?.currency ?? "NZD",
          description,
          notes: notes || null,
          date: new Date(date).toISOString(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Add Transaction" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {/* Type toggle */}
        <div className="flex gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition cursor-pointer ${
                type === t
                  ? t === "income"
                    ? "bg-emerald-600 text-white"
                    : "bg-rose-600 text-white"
                  : "border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Account">
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls} required>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Amount">
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="0.00"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
              <option value="">None</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes…"
            className={`${inputCls} resize-none`}
          />
        </Field>

        {error && <p className="text-xs text-rose-400">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className={secondaryCls}>Cancel</button>
          <button type="submit" disabled={loading} className={primaryCls}>
            {loading ? "Saving…" : "Save transaction"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
