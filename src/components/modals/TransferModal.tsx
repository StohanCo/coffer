"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import type { DashboardData } from "@/server/services/dashboard";
import { Modal, Field, inputCls, primaryCls, secondaryCls } from "./AddAccountModal";
import { Spinner } from "@/components/ui/Skeleton";

function convertClient(amount: string, from: string, to: string, rates: Record<string, number>): string {
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return amount;
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return ((n * fromRate) / toRate).toString();
}

type Props = { data: DashboardData; onClose: () => void };

export default function TransferModal({ data, onClose }: Props) {
  const router = useRouter();
  const { accounts, fx } = data;

  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [overrideToAmount, setOverrideToAmount] = useState(false);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const sameCurrency = fromAccount?.currency === toAccount?.currency;

  const computedToAmount = useMemo(() => {
    if (!fromAccount || !toAccount || !amount) return "";
    if (sameCurrency) return amount;
    try {
      const rebased = { ...fx.rates, [fx.base]: 1 };
      const converted = convertClient(amount, fromAccount.currency, toAccount.currency, rebased);
      return Number(converted).toFixed(2);
    } catch {
      return "";
    }
  }, [amount, fromAccount, toAccount, sameCurrency, fx]);

  const effectiveToAmount = overrideToAmount ? toAmount : computedToAmount;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (fromAccountId === toAccountId) {
      setError("Source and destination must differ");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount,
          toAmount: overrideToAmount && toAmount ? toAmount : undefined,
          description,
          date: new Date(date).toISOString(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transfer");
    } finally {
      setLoading(false);
    }
  }

  if (accounts.length < 2) {
    return (
      <Modal title="Transfer between accounts" onClose={onClose}>
        <p className="text-sm text-slate-400">
          You need at least two accounts to make a transfer.
        </p>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className={secondaryCls}>Close</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Transfer between accounts" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <Field label="From">
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className={inputCls}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
              ))}
            </select>
          </Field>
          <div className="pb-3 text-slate-500" aria-hidden="true">
            <ArrowRight className="h-4 w-4" />
          </div>
          <Field label="To">
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className={inputCls}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={`Amount (${fromAccount?.currency ?? ""})`}>
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

        {!sameCurrency && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Will arrive as ~{computedToAmount || "0.00"} {toAccount?.currency} at current FX
              </span>
              <button
                type="button"
                onClick={() => {
                  setOverrideToAmount((v) => !v);
                  if (!overrideToAmount) setToAmount(computedToAmount);
                }}
                className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                {overrideToAmount ? "Use FX rate" : "Override"}
              </button>
            </div>
            {overrideToAmount && (
              <Field label={`Destination amount (${toAccount?.currency ?? ""})`}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={toAmount}
                  onChange={(e) => setToAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className={inputCls}
                />
              </Field>
            )}
          </div>
        )}

        <Field label="Description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={fromAccount && toAccount ? `Transfer ${fromAccount.name} → ${toAccount.name}` : ""}
            className={inputCls}
          />
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

        {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className={secondaryCls}>Cancel</button>
          <button type="submit" disabled={loading} className={primaryCls}>
            {loading && <Spinner className="h-4 w-4" />}
            {loading
              ? "Transferring…"
              : `Transfer ${amount || "0"} ${fromAccount?.currency ?? ""}${
                  !sameCurrency && effectiveToAmount
                    ? ` → ${effectiveToAmount} ${toAccount?.currency}`
                    : ""
                }`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
