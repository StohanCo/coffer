"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import AddAccountModal from "@/components/modals/AddAccountModal";
import BalanceSummary from "@/components/BalanceSummary";
import { PageHeader, EmptyState } from "@/components/ui/Page";

type Props = { data: DashboardData };

export default function AccountsSection({ data }: Props) {
  const [showAdd, setShowAdd] = useState(false);
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
              className="card-interactive p-5"
              style={{ borderTopColor: acc.color, borderTopWidth: "3px" }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-100">{acc.name}</p>
                  <p className="mt-0.5 text-xs capitalize text-slate-500">{acc.type}</p>
                </div>
                <span
                  className="badge"
                  style={{ backgroundColor: `${acc.color}22`, color: acc.color }}
                >
                  {acc.currency}
                </span>
              </div>
              <p className="font-mono text-2xl font-bold text-white">
                {formatCurrency(acc.balance, acc.currency, locale)}
              </p>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} currencies={data.availableCurrencies} />}
    </div>
  );
}
