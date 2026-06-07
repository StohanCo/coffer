"use client";

import { Receipt, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import { PageHeader, EmptyState } from "@/components/ui/Page";

type Props = { data: DashboardData };

export default function ReceiptsSection({ data }: Props) {
  const { transactions, settings } = data;
  const locale = settings?.locale ?? "en-NZ";

  const withReceipts = transactions.filter((t) => t.receiptUrl);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        subtitle={`${withReceipts.length} receipt${withReceipts.length !== 1 ? "s" : ""} stored`}
      />

      {withReceipts.length === 0 ? (
        <EmptyState
          icon={Receipt}
          label="No receipts yet"
          hint="Attach a photo when adding a transaction — it's scanned on your server to auto-fill the amount, date, and merchant."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withReceipts.map((t) => (
            <div key={t.id} className="card-interactive overflow-hidden">
              {t.receiptUrl && (
                <a
                  href={t.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden border-b border-slate-800 bg-slate-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.receiptUrl}
                    alt="Receipt"
                    className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </a>
              )}
              <div className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {t.description || t.category?.name || "Transaction"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(t.date instanceof Date ? t.date : new Date(t.date), locale)}
                  </p>
                </div>
                <a
                  href={t.receiptUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open receipt in new tab"
                  className="flex-shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-emerald-400"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
