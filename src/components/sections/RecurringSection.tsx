"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Repeat, Pencil, Pause, Play, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { frequencyLabel } from "@/lib/recurrence";
import type { DashboardData } from "@/server/services/dashboard";
import { PageHeader, EmptyState } from "@/components/ui/Page";
import AddRecurringModal, { type EditableRecurring } from "@/components/modals/AddRecurringModal";

type Props = { data: DashboardData };

export default function RecurringSection({ data }: Props) {
  const router = useRouter();
  const { recurring, settings, accounts } = data;
  const locale = settings?.locale ?? "en-NZ";
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<EditableRecurring | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(r: EditableRecurring) {
    setBusyId(r.id);
    try {
      await fetch(`/api/recurring/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring"
        subtitle={`${recurring.filter((r) => r.isActive).length} active`}
        action={
          <button className="btn-primary" onClick={() => setShowAdd(true)} disabled={accounts.length === 0}>
            <Plus className="h-4 w-4" />
            Add recurring
          </button>
        }
      />

      {recurring.length === 0 ? (
        <EmptyState
          icon={Repeat}
          label="No recurring transactions"
          hint="Automate salary, rent, subscriptions and more — they post themselves on schedule."
          action={accounts.length ? "Add your first one" : undefined}
          onAction={accounts.length ? () => setShowAdd(true) : undefined}
        />
      ) : (
        <div className="card divide-y divide-slate-800/60 overflow-hidden">
          {recurring.map((r) => {
            const income = r.type === "income";
            const Icon = income ? TrendingUp : TrendingDown;
            return (
              <div key={r.id} className={`group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-surface/80 ${!r.isActive ? "opacity-50" : ""}`}>
                <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${income ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">{r.description}</p>
                  <p className="text-xs text-slate-500">
                    {frequencyLabel(r.frequency)} · next {format(r.nextDue instanceof Date ? r.nextDue : new Date(r.nextDue), "d MMM yyyy")}
                    {r.category ? ` · ${r.category.name}` : ""}
                    {!r.isActive ? " · paused" : ""}
                  </p>
                </div>
                <p className={`flex-shrink-0 font-mono text-sm font-semibold ${income ? "text-emerald-400" : "text-rose-400"}`}>
                  {income ? "+" : "−"}{formatCurrency(r.amount, r.currency, locale)}
                </p>
                <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    onClick={() => toggleActive(r)}
                    disabled={busyId === r.id}
                    aria-label={r.isActive ? "Pause" : "Resume"}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {r.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => setEditing(r)}
                    aria-label="Edit"
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddRecurringModal data={data} onClose={() => setShowAdd(false)} />}
      {editing && <AddRecurringModal data={data} rule={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
