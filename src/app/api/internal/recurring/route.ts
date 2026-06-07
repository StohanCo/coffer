import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import Decimal from "decimal.js";
import { db } from "@/lib/db/client";
import { recurringTransaction, transaction, financialAccount } from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { advanceDue, type Frequency } from "@/lib/recurrence";

export const runtime = "nodejs";

// Safety cap so a long-dormant rule can't spawn thousands of rows in one pass.
const MAX_CATCHUP = 60;

/**
 * Materializes due recurring transactions. Idempotent-ish: each run only posts
 * occurrences whose nextDue has passed, then advances nextDue. Safe to call
 * hourly (and on boot) — if nothing is due it does nothing.
 *
 * Protected by the shared cron secret (same as the other /api/internal/* jobs).
 */
export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const due = await db.query.recurringTransaction.findMany({
    where: and(eq(recurringTransaction.isActive, true), lte(recurringTransaction.nextDue, now)),
  });

  let posted = 0;

  for (const rule of due) {
    let nextDue = rule.nextDue;
    let iterations = 0;

    // Load the account once; accumulate balance changes locally, write once.
    const account = await db.query.financialAccount.findFirst({
      where: eq(financialAccount.id, rule.accountId),
    });
    if (!account) continue;
    let balance = new Decimal(account.balance);

    while (nextDue <= now && iterations < MAX_CATCHUP) {
      const signedAmount = rule.type === "income" ? rule.amount : `-${rule.amount}`;
      const delta = rule.type === "income"
        ? new Decimal(rule.amount)
        : new Decimal(rule.amount).negated();
      balance = balance.plus(delta);

      await db.insert(transaction).values({
        id: nanoid(),
        userId: rule.userId,
        accountId: rule.accountId,
        categoryId: rule.categoryId ?? null,
        amount: signedAmount,
        currency: rule.currency,
        description: rule.description,
        type: rule.type,
        date: new Date(nextDue),
        isRecurring: true,
        recurringId: rule.id,
        createdAt: now,
        updatedAt: now,
      });

      posted++;
      iterations++;
      nextDue = advanceDue(nextDue, rule.frequency as Frequency);
    }

    await db
      .update(financialAccount)
      .set({ balance: balance.toString(), updatedAt: now })
      .where(eq(financialAccount.id, rule.accountId));

    await db
      .update(recurringTransaction)
      .set({ nextDue, lastProcessed: now, updatedAt: now })
      .where(eq(recurringTransaction.id, rule.id));
  }

  return NextResponse.json({ ok: true, rulesProcessed: due.length, transactionsPosted: posted });
}
