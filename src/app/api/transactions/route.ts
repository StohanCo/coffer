import { z } from "zod";
import { nanoid } from "nanoid";
import Decimal from "decimal.js";
import { db } from "@/lib/db/client";
import { transaction, financialAccount } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";

const createSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3),
  description: z.string().max(500).default(""),
  notes: z.string().max(1000).nullable().optional(),
  type: z.enum(["income", "expense", "transfer"]),
  date: z.string().datetime(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const transactions = await db.query.transaction.findMany({
    where: eq(transaction.userId, session.user.id),
    with: { category: true, account: true },
    orderBy: [desc(transaction.date)],
    limit: 500,
  });
  return ok(transactions);
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const { accountId, amount, type } = parsed.data;

  const account = await db.query.financialAccount.findFirst({
    where: and(eq(financialAccount.id, accountId), eq(financialAccount.userId, session.user.id)),
  });
  if (!account) return err("Account not found", 404);

  const delta = type === "income" ? new Decimal(amount) : new Decimal(amount).negated();
  const newBalance = new Decimal(account.balance).plus(delta).toString();

  const now = new Date();
  const txDate = new Date(parsed.data.date);
  const signedAmount = type === "income" ? amount : `-${amount}`;

  await db
    .update(financialAccount)
    .set({ balance: newBalance, updatedAt: now })
    .where(eq(financialAccount.id, accountId));

  const [created] = await db
    .insert(transaction)
    .values({
      id: nanoid(),
      userId: session.user.id,
      accountId,
      categoryId: parsed.data.categoryId ?? null,
      amount: signedAmount,
      currency: parsed.data.currency,
      description: parsed.data.description,
      notes: parsed.data.notes ?? null,
      type,
      date: txDate,
      isRecurring: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return ok(created, 201);
}
