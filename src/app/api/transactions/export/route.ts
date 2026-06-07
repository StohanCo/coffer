import { db } from "@/lib/db/client";
import { transaction } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireSession, unauthorized } from "@/lib/api-helpers";
import { toCsv } from "@/lib/csv";
import { format } from "date-fns";

export const runtime = "nodejs";

const HEADER = ["Date", "Type", "Amount", "Currency", "Description", "Category", "Account", "Notes"];

/** GET /api/transactions/export — download all transactions as CSV. */
export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const rows = await db.query.transaction.findMany({
    where: eq(transaction.userId, session.user.id),
    with: { category: true, account: true },
    orderBy: [desc(transaction.date)],
  });

  const data = rows.map((t) => [
    format(t.date instanceof Date ? t.date : new Date(t.date), "yyyy-MM-dd"),
    t.type,
    t.amount.replace(/^-/, ""), // absolute; Type column carries the sign
    t.currency,
    t.description ?? "",
    t.category?.name ?? "",
    t.account?.name ?? "",
    t.notes ?? "",
  ]);

  const csv = "﻿" + toCsv([HEADER, ...data]); // BOM so Excel reads UTF-8
  const filename = `coffer-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
