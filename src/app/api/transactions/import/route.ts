import { nanoid } from "nanoid";
import Decimal from "decimal.js";
import { db } from "@/lib/db/client";
import { transaction, financialAccount, category } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";
import { parseCsv } from "@/lib/csv";

export const runtime = "nodejs";

const MAX_ROWS = 5000;

/**
 * POST /api/transactions/import
 * Body: multipart/form-data with `file`, OR raw text/csv.
 *
 * Expected columns (header row, case-insensitive, order-independent):
 *   Date, Type, Amount, Currency, Description, Category, Account, Notes
 *
 * Rows are matched to existing accounts by name. Unknown accounts, transfer
 * rows, and unparseable amounts/dates are skipped and reported. Categories are
 * matched by name+type; unmatched categories just leave the row uncategorized.
 */
export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = session.user.id;

  // Read CSV text from either a multipart file or the raw body.
  let text: string;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return err("No file uploaded");
    text = await file.text();
  } else {
    text = await req.text();
  }
  if (!text.trim()) return err("Empty file");

  const rows = parseCsv(text);
  if (rows.length < 2) return err("No data rows found (need a header + at least one row)");

  // Map header names → column index.
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const idx = {
    date: col("date"),
    type: col("type"),
    amount: col("amount"),
    currency: col("currency"),
    description: col("description"),
    category: col("category"),
    account: col("account"),
    notes: col("notes"),
  };
  if (idx.date < 0 || idx.amount < 0 || idx.account < 0) {
    return err("CSV must include at least Date, Amount and Account columns");
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_ROWS) return err(`Too many rows (max ${MAX_ROWS})`);

  // Preload accounts + categories for name matching.
  const accounts = await db.query.financialAccount.findMany({ where: eq(financialAccount.userId, userId) });
  const accountByName = new Map(accounts.map((a) => [a.name.trim().toLowerCase(), a]));
  const categories = await db.query.category.findMany({ where: eq(category.userId, userId) });
  const catByKey = new Map(categories.map((c) => [`${c.type}:${c.name.trim().toLowerCase()}`, c]));

  const balanceDelta = new Map<string, Decimal>();
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  const now = new Date();

  const toInsert: (typeof transaction.$inferInsert)[] = [];

  dataRows.forEach((r, i) => {
    const line = i + 2; // 1-based + header
    const get = (n: number) => (n >= 0 ? (r[n] ?? "").trim() : "");

    const rawType = get(idx.type).toLowerCase() || "expense";
    if (rawType === "transfer") { skipped++; return; }
    if (rawType !== "income" && rawType !== "expense") {
      errors.push(`Row ${line}: unknown type "${rawType}"`); skipped++; return;
    }

    const acct = accountByName.get(get(idx.account).toLowerCase());
    if (!acct) { errors.push(`Row ${line}: account "${get(idx.account)}" not found`); skipped++; return; }

    const amountRaw = get(idx.amount).replace(/[^0-9.\-]/g, "");
    let amount: Decimal;
    try {
      amount = new Decimal(amountRaw).abs();
      if (amount.isZero() || !amount.isFinite()) throw new Error();
    } catch {
      errors.push(`Row ${line}: invalid amount "${get(idx.amount)}"`); skipped++; return;
    }

    const dateStr = get(idx.date);
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) { errors.push(`Row ${line}: invalid date "${dateStr}"`); skipped++; return; }

    const currency = (get(idx.currency) || acct.currency).toUpperCase().slice(0, 3);
    const catName = get(idx.category);
    const cat = catName ? catByKey.get(`${rawType}:${catName.toLowerCase()}`) : undefined;

    const signed = rawType === "income" ? amount.toString() : `-${amount.toString()}`;
    const delta = rawType === "income" ? amount : amount.negated();
    balanceDelta.set(acct.id, (balanceDelta.get(acct.id) ?? new Decimal(0)).plus(delta));

    toInsert.push({
      id: nanoid(),
      userId,
      accountId: acct.id,
      categoryId: cat?.id ?? null,
      amount: signed,
      currency,
      description: get(idx.description) || (cat?.name ?? ""),
      notes: get(idx.notes) || null,
      type: rawType,
      date,
      isRecurring: false,
      createdAt: now,
      updatedAt: now,
    });
    imported++;
  });

  // Persist: insert rows, then apply balance deltas.
  for (const value of toInsert) {
    await db.insert(transaction).values(value);
  }
  for (const [accountId, delta] of balanceDelta) {
    const acct = accounts.find((a) => a.id === accountId)!;
    await db
      .update(financialAccount)
      .set({ balance: new Decimal(acct.balance).plus(delta).toString(), updatedAt: now })
      .where(eq(financialAccount.id, accountId));
  }

  return ok({ imported, skipped, errors: errors.slice(0, 25), totalErrors: errors.length });
}
