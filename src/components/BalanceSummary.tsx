"use client";

import Decimal from "decimal.js";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";

type Props = {
  data: DashboardData;
  /** Show the FX rates list. Default: true */
  showRates?: boolean;
  /** Compact mode hides the FX rates list and uses smaller padding */
  compact?: boolean;
};

export default function BalanceSummary({ data, showRates = true, compact = false }: Props) {
  const { accounts, settings, summary, fx } = data;
  const baseCurrency = settings?.defaultCurrency ?? "NZD";
  const locale = settings?.locale ?? "en-NZ";

  const totalByCurrency = accounts.reduce<Record<string, string>>((acc, a) => {
    acc[a.currency] = new Decimal(acc[a.currency] ?? 0).plus(new Decimal(a.balance)).toString();
    return acc;
  }, {});

  const currencies = Object.keys(totalByCurrency).sort();
  const showFx = currencies.length > 1;

  if (currencies.length === 0) return null;

  const fetchedAgo = relativeTime(fx.fetchedAt);

  return (
    <div className="space-y-4">
      {/* Grand total + per-currency tiles */}
      <div className="flex flex-wrap gap-3">
        {showFx && (
          <div className="flex-1 min-w-[220px] rounded-xl border border-emerald-700/40 bg-emerald-950/20 px-4 py-3 ring-1 ring-emerald-500/10">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/70">
              Grand Total ({baseCurrency})
            </p>
            <p className={`mt-1 font-bold font-mono text-emerald-300 tabular-nums ${compact ? "text-xl" : "text-2xl"}`}>
              {formatCurrency(summary.totalBalanceFx, baseCurrency, locale)}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-600">
              {currencies.length} currencies · FX {fx.source === "live" ? "live" : "cached"} · {fetchedAgo}
            </p>
          </div>
        )}
        {currencies.map((cur) => {
          const amt = totalByCurrency[cur];
          const isBase = cur === baseCurrency;
          const converted = isBase ? null : new Decimal(amt).mul(fx.rates[cur] ?? 0).toString();
          return (
            <div
              key={cur}
              className={`flex-1 min-w-[180px] rounded-xl border px-4 py-3 ${
                isBase ? "border-slate-700 bg-brand-surface/80 ring-1 ring-emerald-500/10" : "border-slate-800 bg-brand-surface/60"
              }`}
            >
              <p className={`text-xs font-medium uppercase tracking-wider ${isBase ? "text-emerald-400/70" : "text-slate-500"}`}>
                {cur} {isBase && <span className="text-[10px] font-normal text-emerald-500/50">(base)</span>}
              </p>
              <p className={`mt-1 font-bold font-mono tabular-nums ${compact ? "text-lg" : "text-xl"} ${isBase ? "text-white" : "text-white"}`}>
                {formatCurrency(amt, cur, locale)}
              </p>
              {converted && (
                <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                  ≈ {formatCurrency(converted, baseCurrency, locale)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* FX rates list */}
      {showRates && !compact && showFx && (
        <div className="rounded-xl border border-slate-800/60 bg-brand-surface/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                FX Rates · 1 {baseCurrency} =
              </h3>
            </div>
            <span className="text-[10px] text-slate-600">
              {fx.source === "live" ? "live" : "cached"} · {fetchedAgo}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {currencies
              .filter((c) => c !== baseCurrency)
              .map((cur) => {
                // 1 base = X cur  (inverse of cur->base)
                const rate = fx.rates[cur] ? new Decimal(1).div(fx.rates[cur]).toNumber() : null;
                if (!rate) return null;
                return (
                  <div
                    key={cur}
                    className="flex items-baseline justify-between rounded-lg bg-slate-800/40 px-3 py-2"
                  >
                    <span className="text-xs font-mono font-medium text-slate-400">{cur}</span>
                    <span className="text-sm font-mono font-semibold text-slate-200 tabular-nums">
                      {formatRate(rate)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRate(rate: number): string {
  // For very small or very large rates, adjust precision
  if (rate >= 100) return rate.toFixed(2);
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
