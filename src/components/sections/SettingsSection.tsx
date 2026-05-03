"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import type { DashboardData } from "@/server/services/dashboard";

type Props = {
  data: DashboardData;
  user: { email: string; name?: string | null };
};

const CURRENCIES = ["NZD", "AUD", "USD", "EUR", "GBP", "SGD", "JPY", "CAD"];

export default function SettingsSection({ data, user }: Props) {
  const { settings } = data;
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currency, setCurrency] = useState(settings?.defaultCurrency ?? "NZD");

  async function save() {
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

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Account and preferences</p>
      </div>

      {/* Profile */}
      <section className="rounded-xl border border-slate-800/60 bg-brand-surface/60 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Profile</h2>
        <div className="space-y-3">
          <Row label="Name" value={user.name ?? "—"} />
          <Row label="Email" value={user.email} />
        </div>
      </section>

      {/* Preferences */}
      <section className="rounded-xl border border-slate-800/60 bg-brand-surface/60 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Default Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500 cursor-pointer"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50 transition cursor-pointer"
          >
            {saved ? "Saved!" : saving ? "Saving…" : "Save changes"}
          </button>
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
