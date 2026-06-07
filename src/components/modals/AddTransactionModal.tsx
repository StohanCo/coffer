"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ScanLine, X as XIcon } from "lucide-react";
import type { DashboardData } from "@/server/services/dashboard";
import { Modal, Field, inputCls, primaryCls, secondaryCls } from "./AddAccountModal";
import { Spinner } from "@/components/ui/Skeleton";

type EditableTransaction = DashboardData["transactions"][number];

type Props = {
  data: DashboardData;
  onClose: () => void;
  transaction?: EditableTransaction;
};

export default function AddTransactionModal({ data, onClose, transaction }: Props) {
  const router = useRouter();
  const { accounts, categories } = data;
  const isEdit = !!transaction;

  // Strip leading "-" from stored signed amount so the input shows a positive number.
  const initialAmount = transaction
    ? transaction.amount.replace(/^-/, "")
    : "";
  const initialType =
    transaction && (transaction.type === "income" || transaction.type === "expense")
      ? transaction.type
      : "expense";
  const initialDate = transaction
    ? format(transaction.date instanceof Date ? transaction.date : new Date(transaction.date), "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  const [type, setType] = useState<"income" | "expense">(initialType);
  const [accountId, setAccountId] = useState(transaction?.accountId ?? accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [amount, setAmount] = useState(initialAmount);
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [date, setDate] = useState(initialDate);
  const [receiptUrl, setReceiptUrl] = useState(transaction?.receiptUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const filteredCategories = categories.filter((c) => c.type === type || c.type === "transfer");

  async function handleReceiptFile(file: File) {
    setScanning(true);
    setScanNote(null);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/receipts/scan", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      setReceiptUrl(json.url);

      const filled: string[] = [];
      if (json.amount && !amount) {
        setAmount(String(json.amount));
        filled.push("amount");
      }
      if (json.date) {
        setDate(json.date);
        filled.push("date");
      }
      if (json.merchant && !description) {
        setDescription(json.merchant);
        filled.push("description");
      }

      if (!json.ocrAvailable) {
        setScanNote("Receipt saved. Auto-scan is off on this server — fill the fields manually.");
      } else if (filled.length) {
        setScanNote(`Scanned — filled ${filled.join(", ")}. Double-check before saving.`);
      } else {
        setScanNote("Receipt saved, but nothing could be read from it. Fill the fields manually.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to scan receipt");
    } finally {
      setScanning(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = isEdit ? `/api/transactions/${transaction!.id}` : "/api/transactions";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
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
          receiptUrl: receiptUrl || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Transaction" : "Add Transaction"} onClose={onClose}>
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
            <select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
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
            value={notes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes…"
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field label="Receipt (optional)">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleReceiptFile(f);
              e.target.value = "";
            }}
          />
          {receiptUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receiptUrl} alt="Receipt" className="h-12 w-12 rounded object-cover" />
              <span className="flex-1 truncate text-xs text-slate-400">Receipt attached</span>
              <button
                type="button"
                onClick={() => { setReceiptUrl(""); setScanNote(null); }}
                aria-label="Remove receipt"
                className="rounded p-1 text-slate-500 transition-colors hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/60"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-800/40 py-3 text-sm text-slate-400 transition-colors hover:border-emerald-600/60 hover:text-emerald-300 disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {scanning ? <Spinner className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}
              {scanning ? "Scanning receipt…" : "Upload receipt to auto-fill"}
            </button>
          )}
          {scanNote && <p className="mt-1.5 text-xs text-emerald-400/90">{scanNote}</p>}
        </Field>

        {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className={secondaryCls}>Cancel</button>
          <button type="submit" disabled={loading} className={primaryCls}>
            {loading && <Spinner className="h-4 w-4" />}
            {loading ? "Saving…" : isEdit ? "Save changes" : "Save transaction"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
