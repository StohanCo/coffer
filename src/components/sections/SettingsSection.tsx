"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Decimal from "decimal.js";
import { Plus, X, RefreshCw, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/Skeleton";
import { signOut } from "@/lib/auth/client";
import { BUILTIN_CURRENCIES, parseCurrencies, isValidCurrencyCode } from "@/lib/currencies";
import type { DashboardData } from "@/server/services/dashboard";
import { PageHeader } from "@/components/ui/Page";

const CATEGORY_COLORS = ["#10b981", "#06b6d4", "#6366f1", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#64748b"];
const CATEGORY_TYPES = ["expense", "income", "transfer"] as const;

type Props = {
  data: DashboardData;
  user: { email: string; name?: string | null };
};

export default function SettingsSection({ data, user }: Props) {
  const { settings } = data;
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currency, setCurrency] = useState(settings?.defaultCurrency ?? "NZD");

  const [newCode, setNewCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const extraCurrencies = parseCurrencies(settings?.extraCurrencies ?? "[]");

  // Category management
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<(typeof CATEGORY_TYPES)[number]>("expense");
  const [catColor, setCatColor] = useState(CATEGORY_COLORS[0]);
  const [catError, setCatError] = useState<string | null>(null);
  const [catLoading, setCatLoading] = useState(false);
  const [catBusyId, setCatBusyId] = useState<string | null>(null);

  async function addCategory() {
    setCatError(null);
    if (!catName.trim()) { setCatError("Enter a name"); return; }
    setCatLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName.trim(), type: catType, color: catColor }),
      });
      const json = await res.json();
      if (!res.ok) { setCatError(json.error ?? "Failed"); return; }
      setCatName("");
      router.refresh();
    } finally {
      setCatLoading(false);
    }
  }

  async function deleteCategory(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? Transactions keep their data but become uncategorized.`)) return;
    setCatBusyId(id);
    try {
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setCatBusyId(null);
    }
  }

  const [refreshing, setRefreshing] = useState(false);
  async function refreshRates() {
    setRefreshing(true);
    try {
      await fetch("/api/fx/refresh", { method: "POST" });
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  async function savePreferences() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultCurrency: currency }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function addCurrency() {
    const code = newCode.toUpperCase().trim();
    setCodeError(null);
    if (!isValidCurrencyCode(code)) {
      setCodeError("Must be exactly 3 letters, e.g. RUB");
      return;
    }
    setCodeLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) { setCodeError(json.error ?? "Failed"); return; }
      setNewCode("");
      router.refresh();
    } finally {
      setCodeLoading(false);
    }
  }

  async function removeCurrency(code: string) {
    await fetch("/api/settings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    router.refresh();
  }

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Account and preferences" />

      {/* Profile */}
      <section className="card p-5">
        <h2 className="stat-label mb-4">Profile</h2>
        <div className="space-y-3">
          <Row label="Name" value={user.name ?? "—"} />
          <Row label="Email" value={user.email} />
        </div>
      </section>

      {/* Preferences */}
      <section className="card p-5">
        <h2 className="stat-label mb-4">Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Default currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="input cursor-pointer"
            >
              {data.availableCurrencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button onClick={savePreferences} disabled={saving} className="btn-primary">
            {saving && <Spinner className="h-4 w-4" />}
            {saved ? "Saved" : saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      {/* Currencies */}
      <section className="card p-5">
        <h2 className="stat-label mb-1">Currencies</h2>
        <p className="mb-4 text-xs text-slate-600">
          Add any ISO 4217 currency code (e.g. RUB, CNY, CHF) to make it available in account and transaction forms.
        </p>

        {/* Built-in list */}
        <div className="mb-4">
          <p className="mb-2 text-xs text-slate-500">Built-in</p>
          <div className="flex flex-wrap gap-2">
            {BUILTIN_CURRENCIES.map((c) => (
              <span key={c} className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-400">
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Extra currencies */}
        {extraCurrencies.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs text-slate-500">Added by you</p>
            <div className="flex flex-wrap gap-2">
              {extraCurrencies.map((c) => (
                <span
                  key={c}
                  className="flex items-center gap-1.5 rounded-md border border-emerald-800/40 bg-emerald-900/30 px-2.5 py-1 font-mono text-xs text-emerald-300"
                >
                  {c}
                  <button
                    onClick={() => removeCurrency(c)}
                    className="rounded text-emerald-500/60 transition-colors hover:text-rose-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/60"
                    title={`Remove ${c}`}
                    aria-label={`Remove currency ${c}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add input */}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <input
              value={newCode}
              onChange={(e) => { setNewCode(e.target.value.toUpperCase().slice(0, 3)); setCodeError(null); }}
              onKeyDown={(e) => e.key === "Enter" && addCurrency()}
              placeholder="e.g. RUB"
              maxLength={3}
              className="input font-mono uppercase"
            />
            {codeError && <p className="mt-1 text-xs text-rose-400">{codeError}</p>}
          </div>
          <button
            onClick={addCurrency}
            disabled={codeLoading || newCode.length !== 3}
            className="btn-primary"
          >
            {codeLoading ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </div>
      </section>

      {/* Categories */}
      <section className="card p-5">
        <h2 className="stat-label mb-1">Categories</h2>
        <p className="mb-4 text-xs text-slate-600">
          Categories power transactions and budgets. Add your own or remove ones you don&apos;t use.
        </p>

        {data.categories.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {data.categories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="flex-1 truncate text-sm text-slate-200">{c.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{c.type}</span>
                <button
                  onClick={() => deleteCategory(c.id, c.name)}
                  disabled={catBusyId === c.id}
                  aria-label={`Delete ${c.name}`}
                  className="rounded p-1 text-slate-500 transition-colors hover:text-rose-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-500/60"
                >
                  {catBusyId === c.id ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add category */}
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/30 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={catName}
              onChange={(e) => { setCatName(e.target.value); setCatError(null); }}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="New category name"
              className="input flex-1"
            />
            <select value={catType} onChange={(e) => setCatType(e.target.value as (typeof CATEGORY_TYPES)[number])} className="input sm:w-32">
              {CATEGORY_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCatColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={catColor === c}
                  className={`h-6 w-6 rounded-full transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/60 ${catColor === c ? "scale-125 ring-2 ring-white/50" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button onClick={addCategory} disabled={catLoading || !catName.trim()} className="btn-primary">
              {catLoading ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>
          {catError && <p className="text-xs text-rose-400">{catError}</p>}
        </div>
      </section>

      {/* FX Rates */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="stat-label">Exchange rates</h2>
            <p className="mt-1 text-xs text-slate-600">
              Cached and refreshed every 6 hours · {data.fx.source === "live" ? "Live data" : "Fallback (offline)"}
              {data.fx.fetchedAt && ` · updated ${relativeTime(data.fx.fetchedAt)}`}
            </p>
          </div>
          <button
            onClick={refreshRates}
            disabled={refreshing}
            className="btn-secondary px-3 py-2 text-xs"
          >
            {refreshing ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh now
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-800/60">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40">
                <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-slate-500">Code</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-slate-500">1 {data.fx.base} =</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-slate-500">1 unit = {data.fx.base}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {data.availableCurrencies
                .filter((c) => c !== data.fx.base && data.fx.rates[c])
                .map((c) => {
                  const oneBaseInThis = new Decimal(1).div(data.fx.rates[c]).toNumber();
                  const oneThisInBase = data.fx.rates[c];
                  return (
                    <tr key={c} className="bg-slate-900/20 hover:bg-slate-900/40 transition-colors">
                      <td className="px-3 py-2 text-sm font-mono font-medium text-slate-200">{c}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono text-slate-300 tabular-nums">
                        {formatRateValue(oneBaseInThis)} {c}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-mono text-slate-400 tabular-nums">
                        {formatRateValue(oneThisInBase)} {data.fx.base}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-rose-900/40 bg-rose-950/10 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-rose-400/70">Account</h2>
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-rose-800/40 bg-rose-900/20 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-900/40 transition cursor-pointer"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm text-slate-200">{value}</span>
    </div>
  );
}

function formatRateValue(rate: number): string {
  if (rate >= 1000) return rate.toFixed(2);
  if (rate >= 1) return rate.toFixed(4);
  return rate.toFixed(6);
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
