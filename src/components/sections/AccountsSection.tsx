"use client";

import { useState } from "react";
import { Plus, Wallet, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import AddAccountModal, { type EditableAccount } from "@/components/modals/AddAccountModal";
import BalanceSummary from "@/components/BalanceSummary";
import { PageHeader, EmptyState } from "@/components/ui/Page";

type Props = { data: DashboardData };

export default function AccountsSection({ data }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<EditableAccount | null>(null);
  const { accounts, settings } = data;
  const locale = settings?.locale ?? "en-NZ";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        subtitle={`${accounts.length} account${accounts.length !== 1 ? "s" : ""}`}
        action={
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add account
          </button>
        }
      />

      {/* Aggregated balances + FX rates */}
      {accounts.length > 0 && <BalanceSummary data={data} />}

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          label="No accounts yet"
          hint="Add a checking, savings, or credit account to start tracking your money."
          action="Add your first account"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="group card-interactive p-5"
              style={{ borderTopColor: acc.color, borderTopWidth: "3px" }}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-100">{acc.name}</p>
                  <p className="mt-0.5 text-xs capitalize text-slate-500">{acc.type}</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <span className="badge" style={{ backgroundColor: `${acc.color}22`, color: acc.color }}>
                    {acc.currency}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: acc.id,
                        name: acc.name,
                        type: acc.type,
                        currency: acc.currency,
                        balance: acc.balance,
                        color: acc.color,
                      })
                    }
                    aria-label={`Edit ${acc.name}`}
                    className="rounded-lg p-1 text-slate-500 opacity-0 transition-all hover:bg-slate-800 hover:text-white focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 group-hover:opacity-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="font-mono text-2xl font-bold text-white">
                {formatCurrency(acc.balance, acc.currency, locale)}
              </p>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} currencies={data.availableCurrencies} />}
      {editing && (
        <AddAccountModal
          account={editing}
          onClose={() => setEditing(null)}
          currencies={data.availableCurrencies}
        />
      )}
    </div>
  );
}
