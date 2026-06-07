/**
 * Heuristic parser for raw OCR text extracted from a receipt photo.
 *
 * No third party, no LLM — just regex + scoring tuned for the common shape of
 * supermarket / café / retail receipts. It is deliberately conservative: every
 * field is optional and the caller treats results as *suggestions* the user can
 * correct, never as ground truth.
 */

export type ParsedReceipt = {
  /** Total amount as a plain decimal string, e.g. "42.50". Undefined if not found. */
  amount?: string;
  /** ISO date (yyyy-MM-dd) if a date could be parsed. */
  date?: string;
  /** Best-guess merchant / store name. */
  merchant?: string;
  /** 3-letter currency code if a symbol or code was detected. */
  currency?: string;
};

const CURRENCY_BY_SYMBOL: Record<string, string> = {
  $: "NZD", // ambiguous — default to app's primary; user can change
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
};

const CURRENCY_CODE = /\b(NZD|AUD|USD|EUR|GBP|SGD|JPY|CAD)\b/;

// Lines that strongly indicate the grand total (ordered by confidence).
const TOTAL_KEYWORDS = [
  /\b(grand\s*total|amount\s*due|balance\s*due|total\s*due)\b/i,
  /\b(total)\b/i,
  /\b(amount|balance)\b/i,
];

// Lines we never want to treat as the total.
const TOTAL_BLOCKLIST = /\b(sub\s*-?\s*total|subtotal|gst|tax|change|tendered|cash|card|vat|savings|discount)\b/i;

const MONEY = /(?:[$£€¥]\s*)?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})|\d+\.\d{2})/g;

function toAmount(raw: string): number {
  return parseFloat(raw.replace(/[^\d.]/g, ""));
}

function detectCurrency(text: string): string | undefined {
  const code = text.match(CURRENCY_CODE)?.[1];
  if (code) return code;
  for (const [sym, cur] of Object.entries(CURRENCY_BY_SYMBOL)) {
    if (text.includes(sym)) return cur;
  }
  return undefined;
}

function parseAmount(lines: string[]): string | undefined {
  // Strategy: scan keyword tiers; within the best tier pick the largest money
  // value on a matching, non-blocklisted line. Fall back to the largest money
  // value anywhere (totals are usually the biggest number on a receipt).
  for (const keyword of TOTAL_KEYWORDS) {
    let best: number | undefined;
    for (const line of lines) {
      if (!keyword.test(line) || TOTAL_BLOCKLIST.test(line)) continue;
      const matches = line.match(MONEY);
      if (!matches) continue;
      const max = Math.max(...matches.map(toAmount));
      if (Number.isFinite(max) && (best === undefined || max > best)) best = max;
    }
    if (best !== undefined) return best.toFixed(2);
  }

  // Fallback: largest money value across the whole receipt.
  let max: number | undefined;
  for (const line of lines) {
    const matches = line.match(MONEY);
    if (!matches) continue;
    for (const m of matches) {
      const v = toAmount(m);
      if (Number.isFinite(v) && (max === undefined || v > max)) max = v;
    }
  }
  return max !== undefined ? max.toFixed(2) : undefined;
}

function parseDate(text: string): string | undefined {
  // ISO: 2026-06-07
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const [, y, m, d] = iso;
    return normalize(+y, +m, +d);
  }

  // DMY / MDY with separators: 07/06/2026, 7.6.26, 07-06-2026
  const dmy = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/);
  if (dmy) {
    const ai = +dmy[1];
    const bi = +dmy[2];
    let year = +dmy[3];
    if (year < 100) year += 2000;
    // App is NZ-first, so default to DMY; only flip to MDY when the first
    // group must be a month because the second group can't be (>12).
    let day: number;
    let month: number;
    if (ai > 12) {
      day = ai; month = bi;          // first group must be the day
    } else if (bi > 12) {
      month = ai; day = bi;          // second group must be the day -> MDY
    } else {
      day = ai; month = bi;          // ambiguous -> DMY default
    }
    return normalize(year, month, day);
  }

  // Textual month: 7 Jun 2026 / June 7, 2026
  const months =
    "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december";
  const txt = text.match(
    new RegExp(`\\b(\\d{1,2})\\s*(${months})[a-z]*\\.?,?\\s*(20\\d{2})\\b`, "i")
  );
  if (txt) {
    const month = monthIndex(txt[2]);
    if (month) return normalize(+txt[3], month, +txt[1]);
  }
  const txt2 = text.match(
    new RegExp(`\\b(${months})[a-z]*\\.?\\s*(\\d{1,2}),?\\s*(20\\d{2})\\b`, "i")
  );
  if (txt2) {
    const month = monthIndex(txt2[1]);
    if (month) return normalize(+txt2[3], month, +txt2[2]);
  }

  return undefined;
}

function monthIndex(name: string): number | undefined {
  const i = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ].indexOf(name.slice(0, 3).toLowerCase());
  return i >= 0 ? i + 1 : undefined;
}

function normalize(y: number, m: number, d: number): string | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parseMerchant(lines: string[]): string | undefined {
  // The merchant name is usually one of the first non-noise lines.
  const noise = /(receipt|tax invoice|invoice|^\s*\d|abn|gst|www\.|http|tel:|phone|\bltd\b$)/i;
  for (const line of lines.slice(0, 6)) {
    const cleaned = line.trim();
    if (cleaned.length < 3 || cleaned.length > 40) continue;
    if (noise.test(cleaned)) continue;
    if (!/[a-z]/i.test(cleaned)) continue; // must contain letters
    return cleaned.replace(/\s{2,}/g, " ");
  }
  return undefined;
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    amount: parseAmount(lines),
    date: parseDate(rawText),
    merchant: parseMerchant(lines),
    currency: detectCurrency(rawText),
  };
}
