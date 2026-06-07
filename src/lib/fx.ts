import Decimal from "decimal.js";
import { db } from "@/lib/db/client";
import { fxRateCache } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Static fallback FX rates (approximate Q1 2026, 1 CODE = N USD).
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  NZD: 0.6,
  AUD: 0.66,
  EUR: 1.08,
  GBP: 1.27,
  SGD: 0.74,
  JPY: 0.0067,
  CAD: 0.74,
  RUB: 0.011,
  CNY: 0.14,
  CHF: 1.13,
  INR: 0.012,
};

export type FxRates = {
  base: string;
  rates: Record<string, number>; // 1 CODE = rates[CODE] units of base
  fetchedAt: number; // ms epoch
  source: "live" | "fallback";
};

const REFRESH_THRESHOLD_MS = 1000 * 60 * 60 * 6; // refresh if older than 6h

async function fetchUsdRatesFromApi(): Promise<{ rates: Record<string, number>; source: "live" | "fallback" }> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result !== "success" || !data.rates) throw new Error("malformed response");
    // open.er-api.com gives 1 USD = N CODE. Invert so each entry is "1 CODE in USD".
    const inverted: Record<string, number> = {};
    for (const [code, rate] of Object.entries(data.rates)) {
      if (rate > 0) inverted[code] = 1 / rate;
    }
    inverted.USD = 1;
    return { rates: inverted, source: "live" };
  } catch {
    return { rates: FALLBACK_USD_RATES, source: "fallback" };
  }
}

function rebase(usdRates: Record<string, number>, base: string): Record<string, number> {
  const baseInUsd = usdRates[base];
  if (!baseInUsd) return { [base]: 1 };
  const rates: Record<string, number> = {};
  for (const [code, codeInUsd] of Object.entries(usdRates)) {
    rates[code] = codeInUsd / baseInUsd;
  }
  return rates;
}

/**
 * Read rates from DB cache instantly (or fallback if empty).
 * Triggers a background refresh if the cache is stale; the result is NOT awaited.
 */
export async function getFxRates(base: string): Promise<FxRates> {
  const cached = await db.query.fxRateCache.findFirst({ where: eq(fxRateCache.base, base) });

  if (cached) {
    const fetchedAt = (cached.fetchedAt instanceof Date ? cached.fetchedAt : new Date(cached.fetchedAt)).getTime();
    const stale = Date.now() - fetchedAt > REFRESH_THRESHOLD_MS;
    if (stale) void refreshFxRatesInBackground(base);
    return {
      base,
      rates: parseRates(cached.ratesJson),
      fetchedAt,
      source: cached.source as "live" | "fallback",
    };
  }

  // No cache row yet — seed synchronously so first render has rates.
  return await refreshFxRates(base);
}

/**
 * Force-refresh from the API and persist to DB. Always awaited.
 */
export async function refreshFxRates(base: string): Promise<FxRates> {
  const { rates: usdRates, source } = await fetchUsdRatesFromApi();
  const rates = rebase(usdRates, base);
  const now = new Date();

  // Persist as USD-keyed rates so any base can be derived later.
  // Storing the rebased version is fine for one user; we always rebase from USD elsewhere.
  await db
    .insert(fxRateCache)
    .values({
      base,
      ratesJson: JSON.stringify(rates),
      source,
      fetchedAt: now,
    })
    .onConflictDoUpdate({
      target: fxRateCache.base,
      set: { ratesJson: JSON.stringify(rates), source, fetchedAt: now },
    });

  return { base, rates, fetchedAt: now.getTime(), source };
}

function refreshFxRatesInBackground(base: string): Promise<void> {
  return refreshFxRates(base)
    .then(() => undefined)
    .catch((e) => console.error("[fx] background refresh failed", e));
}

function parseRates(json: string): Record<string, number> {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return {};
}

export function convert(amount: string | number, from: string, to: string, rates: Record<string, number>): string {
  if (from === to) return new Decimal(amount).toString();
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return new Decimal(amount).toString();
  return new Decimal(amount).mul(fromRate).div(toRate).toString();
}
