"use client";

import Decimal from "decimal.js";
import { startOfYear, endOfYear, subYears } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/server/services/dashboard";
import { PageHeader } from "@/components/ui/Page";

type Props = { data: DashboardData };

const NZ_TAX_BRACKETS = [
  { min: 0, max: 14000, rate: 0.105, label: "10.5%" },
  { min: 14000, max: 48000, rate: 0.175, label: "17.5%" },
  { min: 48000, max: 70000, rate: 0.3, label: "30%" },
  { min: 70000, max: 180000, rate: 0.33, label: "33%" },
  { min: 180000, max: Infinity, rate: 0.39, label: "39%" },
];

function calcNZTax(income: Decimal): Decimal {
  let tax = new Decimal(0);
  let remaining = income;
  for (const bracket of NZ_TAX_BRACKETS) {
    if (remaining.lte(0)) break;
    const taxable = Decimal.min(remaining, new Decimal(bracket.max - bracket.min));
    tax = tax.plus(taxable.mul(bracket.rate));
    remaining = remaining.minus(taxable);
  }
  return tax;
}

export default function TaxSection({ data }: Props) {
  const { transactions, settings } = data;
  const currency = settings?.defaultCurrency ?? "NZD";
  const locale = settings?.locale ?? "en-NZ";

  // NZ tax year: April 1 – March 31
  const now = new Date();
  const taxYearStart = now.getMonth() >= 3
    ? new Date(now.getFullYear(), 3, 1)
    : new Date(now.getFullYear() - 1, 3, 1);
  const taxYearEnd = new Date(taxYearStart.getFullYear() + 1, 2, 31, 23, 59, 59);

  const yearlyIncome = transactions
    .filter((t) => {
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      return t.type === "income" && t.currency === currency && d >= taxYearStart && d <= taxYearEnd;
    })
    .reduce((acc, t) => acc.plus(new Decimal(t.amount).abs()), new Decimal(0));

  const yearlyExpenses = transactions
    .filter((t) => {
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      return t.type === "expense" && t.currency === currency && d >= taxYearStart && d <= taxYearEnd;
    })
    .reduce((acc, t) => acc.plus(new Decimal(t.amount).abs()), new Decimal(0));

  const estimatedTax = calcNZTax(yearlyIncome);
  const effectiveRate = yearlyIncome.gt(0)
    ? estimatedTax.div(yearlyIncome).mul(100).toFixed(1)
    : "0.0";

  const gstRate = new Decimal(0.15);
  const gstCollected = yearlyIncome.mul(gstRate).div(new Decimal(1).plus(gstRate));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax & GST"
        subtitle={`NZ tax year ${taxYearStart.getFullYear()}/${taxYearStart.getFullYear() + 1} estimates`}
      />

      <div className="rounded-xl border border-amber-800/30 bg-amber-900/10 px-4 py-3">
        <p className="text-xs text-amber-400/80">
          These are estimates only. Consult a tax professional for filing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TaxCard label="Gross income" value={formatCurrency(yearlyIncome.toString(), currency, locale)} />
        <TaxCard label="Estimated tax" value={formatCurrency(estimatedTax.toString(), currency, locale)} accent="rose" />
        <TaxCard label="Effective rate" value={`${effectiveRate}%`} />
        <TaxCard label="GST component" value={formatCurrency(gstCollected.toString(), currency, locale)} accent="amber" />
      </div>

      {/* Tax brackets breakdown */}
      <section className="card p-5">
        <h2 className="stat-label mb-4">NZ income tax brackets</h2>
        <div className="space-y-2">
          {NZ_TAX_BRACKETS.slice(0, -1).map((bracket) => {
            const bracketIncome = Decimal.max(
              0,
              Decimal.min(yearlyIncome, new Decimal(bracket.max)).minus(new Decimal(bracket.min))
            );
            const bracketTax = bracketIncome.mul(bracket.rate);
            const active = yearlyIncome.gt(bracket.min);

            return (
              <div key={bracket.min} className={`flex items-center gap-4 rounded-lg px-3 py-2 ${active ? "bg-slate-800/40" : "opacity-40"}`}>
                <span className="w-16 text-xs font-medium text-emerald-400">{bracket.label}</span>
                <span className="flex-1 text-xs text-slate-500">
                  ${bracket.min.toLocaleString()} – ${bracket.max.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {formatCurrency(bracketTax.toString(), currency, locale)}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TaxCard({
  label,
  value,
  accent = "emerald",
}: {
  label: string;
  value: string;
  accent?: "emerald" | "rose" | "amber";
}) {
  const colors = {
    emerald: "text-emerald-300",
    rose: "text-rose-300",
    amber: "text-amber-300",
  };
  return (
    <div className="card p-4">
      <p className="stat-label">{label}</p>
      <p className={`mt-2 font-mono text-xl font-bold ${colors[accent]}`}>{value}</p>
    </div>
  );
}
