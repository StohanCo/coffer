"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Archive } from "lucide-react";
import { Spinner } from "@/components/ui/Skeleton";

export type EditableAccount = {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: string;
  color: string;
};

type Props = {
  onClose: () => void;
  currencies: string[];
  account?: EditableAccount;
};

const ACCOUNT_TYPES = ["checking", "savings", "credit", "investment", "loan", "cash"];
const COLORS = ["#06b6d4", "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#ec4899", "#64748b"];

export default function AddAccountModal({ onClose, currencies, account }: Props) {
  const router = useRouter();
  const isEdit = !!account;

  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState(account?.type ?? "checking");
  const [currency, setCurrency] = useState(account?.currency ?? "NZD");
  const [balance, setBalance] = useState(account?.balance ?? "0");
  const [color, setColor] = useState(account?.color ?? COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/accounts/${account!.id}` : "/api/accounts", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, currency, balance, color }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save account");
    } finally {
      setLoading(false);
    }
  }

  async function archive() {
    if (!account) return;
    if (!window.confirm(`Archive "${account.name}"? It will be hidden but its transaction history is kept.`)) return;
    setArchiving(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive account");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit account" : "Add account"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. ASB Everyday"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
              {currencies.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label={isEdit ? "Balance" : "Opening balance"}>
          <input
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Color">
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Select color ${c}`}
                aria-pressed={color === c}
                className={`h-7 w-7 rounded-full transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/60 ${color === c ? "scale-125 ring-2 ring-white/50" : "hover:scale-110"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>
        {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          {isEdit && (
            <button
              type="button"
              onClick={archive}
              disabled={archiving}
              className="btn-ghost mr-auto text-rose-400 hover:bg-rose-900/30 hover:text-rose-300"
            >
              {archiving ? <Spinner className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              Archive
            </button>
          )}
          <button type="button" onClick={onClose} className={secondaryCls}>Cancel</button>
          <button type="submit" disabled={loading} className={primaryCls}>
            {loading && <Spinner className="h-4 w-4" />}
            {loading ? "Saving…" : isEdit ? "Save changes" : "Create account"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    // Outer layer scrolls so a tall modal is never cut off at the top/bottom.
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      {/* min-h-full keeps it centered when short, but lets it grow + scroll when tall */}
      <div className="relative flex min-h-full items-start justify-center p-4 sm:items-center">
        <div className="relative my-4 w-full max-w-md rounded-2xl border border-slate-800 bg-brand-surface shadow-2xl animate-fade-up">
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-800/80 bg-brand-surface px-5 py-4">
            <h2 id="modal-title" className="text-base font-semibold tracking-tight text-white">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg p-1 text-slate-500 transition-colors cursor-pointer hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-5 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

// Shared form/control classes — defined in globals.css @layer components so the
// whole app stays visually consistent. Kept as exports for ergonomic reuse.
export const inputCls = "input";

export const primaryCls = "btn-primary flex-1";

export const secondaryCls = "btn-secondary";
