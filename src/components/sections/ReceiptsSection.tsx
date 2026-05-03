"use client";

import { useState } from "react";
import { Upload, Receipt, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";

type Props = { data: DashboardData };

export default function ReceiptsSection({ data }: Props) {
  const { transactions, settings } = data;
  const locale = settings?.locale ?? "en-NZ";

  const withReceipts = transactions.filter((t) => t.receiptUrl);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Receipts</h1>
          <p className="text-sm text-slate-400 mt-0.5">{withReceipts.length} receipt{withReceipts.length !== 1 ? "s" : ""} stored</p>
        </div>
      </div>

      {withReceipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-16 text-center">
          <Receipt className="mb-3 h-8 w-8 text-slate-600" />
          <p className="text-slate-500">No receipts yet</p>
          <p className="mt-1 text-xs text-slate-600">
            Upload receipts when adding transactions
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withReceipts.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-slate-800/60 bg-brand-surface/60 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
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
                  className="flex-shrink-0 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              {t.receiptUrl && (
                <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                  <img
                    src={t.receiptUrl}
                    alt="Receipt"
                    className="h-32 w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
