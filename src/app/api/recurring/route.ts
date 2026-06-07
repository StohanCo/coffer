import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { recurringTransaction, financialAccount } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";

const createSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
  description: z.string().min(1).max(200),
  type: z.enum(["income", "expense"]),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  nextDue: z.string().datetime(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const rules = await db.query.recurringTransaction.findMany({
    where: eq(recurringTransaction.userId, session.user.id),
    orderBy: [asc(recurringTransaction.nextDue)],
  });
  return ok(rules);
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const account = await db.query.financialAccount.findFirst({
    where: and(eq(financialAccount.id, parsed.data.accountId), eq(financialAccount.userId, session.user.id)),
  });
  if (!account) return err("Account not found", 404);

  const now = new Date();
  const [created] = await db
    .insert(recurringTransaction)
    .values({
      id: nanoid(),
      userId: session.user.id,
      accountId: parsed.data.accountId,
      categoryId: parsed.data.categoryId ?? null,
      amount: parsed.data.amount,
      currency: account.currency,
      description: parsed.data.description,
      type: parsed.data.type,
      frequency: parsed.data.frequency,
      nextDue: new Date(parsed.data.nextDue),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return ok(created, 201);
}
