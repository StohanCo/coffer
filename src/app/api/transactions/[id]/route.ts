import { z } from "zod";
import Decimal from "decimal.js";
import { db } from "@/lib/db/client";
import { transaction, financialAccount } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";

const patchSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3),
  description: z.string().max(500).default(""),
  notes: z.string().max(1000).nullable().optional(),
  type: z.enum(["income", "expense"]),
  date: z.string().datetime(),
  receiptUrl: z.string().max(2048).nullable().optional(),
});

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const existing = await db.query.transaction.findFirst({
    where: and(eq(transaction.id, id), eq(transaction.userId, session.user.id)),
  });
  if (!existing) return err("Transaction not found", 404);
  if (existing.type === "transfer") {
    return err("Transfers cannot be edited — delete and recreate", 400);
  }

  const oldAccount = await db.query.financialAccount.findFirst({
    where: eq(financialAccount.id, existing.accountId),
  });
  const newAccount =
    parsed.data.accountId === existing.accountId
      ? oldAccount
      : await db.query.financialAccount.findFirst({
          where: and(
            eq(financialAccount.id, parsed.data.accountId),
            eq(financialAccount.userId, session.user.id),
          ),
        });
  if (!oldAccount || !newAccount) return err("Account not found", 404);

  const oldSigned = new Decimal(existing.amount);
  const newSigned =
    parsed.data.type === "income"
      ? new Decimal(parsed.data.amount)
      : new Decimal(parsed.data.amount).negated();

  const now = new Date();

  if (oldAccount.id === newAccount.id) {
    const updated = new Decimal(oldAccount.balance).minus(oldSigned).plus(newSigned).toString();
    await db
      .update(financialAccount)
      .set({ balance: updated, updatedAt: now })
      .where(eq(financialAccount.id, oldAccount.id));
  } else {
    const reverted = new Decimal(oldAccount.balance).minus(oldSigned).toString();
    const applied = new Decimal(newAccount.balance).plus(newSigned).toString();
    await db
      .update(financialAccount)
      .set({ balance: reverted, updatedAt: now })
      .where(eq(financialAccount.id, oldAccount.id));
    await db
      .update(financialAccount)
      .set({ balance: applied, updatedAt: now })
      .where(eq(financialAccount.id, newAccount.id));
  }

  const [row] = await db
    .update(transaction)
    .set({
      accountId: parsed.data.accountId,
      categoryId: parsed.data.categoryId ?? null,
      amount: newSigned.toString(),
      currency: parsed.data.currency,
      description: parsed.data.description,
      notes: parsed.data.notes ?? null,
      type: parsed.data.type,
      date: new Date(parsed.data.date),
      receiptUrl: parsed.data.receiptUrl ?? null,
      updatedAt: now,
    })
    .where(eq(transaction.id, id))
    .returning();

  return ok(row);
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const existing = await db.query.transaction.findFirst({
    where: and(eq(transaction.id, id), eq(transaction.userId, session.user.id)),
  });
  if (!existing) return err("Transaction not found", 404);

  const now = new Date();

  // Collect all legs (transfers have a paired leg sharing transferId).
  const legs =
    existing.type === "transfer" && existing.transferId
      ? await db.query.transaction.findMany({
          where: and(
            eq(transaction.transferId, existing.transferId),
            eq(transaction.userId, session.user.id),
          ),
        })
      : [existing];

  for (const leg of legs) {
    const acc = await db.query.financialAccount.findFirst({
      where: eq(financialAccount.id, leg.accountId),
    });
    if (!acc) continue;
    const reverted = new Decimal(acc.balance).minus(new Decimal(leg.amount)).toString();
    await db
      .update(financialAccount)
      .set({ balance: reverted, updatedAt: now })
      .where(eq(financialAccount.id, acc.id));
    await db.delete(transaction).where(eq(transaction.id, leg.id));
  }

  return ok({ deleted: legs.length });
}
