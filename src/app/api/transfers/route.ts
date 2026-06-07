import { z } from "zod";
import { nanoid } from "nanoid";
import Decimal from "decimal.js";
import { db } from "@/lib/db/client";
import { transaction, financialAccount, category } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";
import { getFxRates, convert } from "@/lib/fx";

const createSchema = z
  .object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    // Optional manual override of destination amount (banks rarely use spot rate).
    toAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    description: z.string().max(500).default(""),
    notes: z.string().max(1000).nullable().optional(),
    date: z.string().datetime(),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: "Source and destination must differ",
    path: ["toAccountId"],
  });

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const { fromAccountId, toAccountId, amount, toAmount, description, notes, date } = parsed.data;

  const [fromAccount, toAccount] = await Promise.all([
    db.query.financialAccount.findFirst({
      where: and(eq(financialAccount.id, fromAccountId), eq(financialAccount.userId, session.user.id)),
    }),
    db.query.financialAccount.findFirst({
      where: and(eq(financialAccount.id, toAccountId), eq(financialAccount.userId, session.user.id)),
    }),
  ]);
  if (!fromAccount || !toAccount) return err("Account not found", 404);

  // Resolve destination amount: manual override → otherwise FX-converted.
  let destAmount: string;
  if (toAmount) {
    destAmount = toAmount;
  } else if (fromAccount.currency === toAccount.currency) {
    destAmount = amount;
  } else {
    const fx = await getFxRates(fromAccount.currency);
    destAmount = new Decimal(convert(amount, fromAccount.currency, toAccount.currency, fx.rates))
      .toDecimalPlaces(2)
      .toString();
  }

  const transferCategory = await db.query.category.findFirst({
    where: and(eq(category.userId, session.user.id), eq(category.type, "transfer")),
  });

  const transferId = nanoid();
  const now = new Date();
  const txDate = new Date(date);

  const fromSigned = new Decimal(amount).negated().toString();
  const toSigned = new Decimal(destAmount).toString();

  const fromBalance = new Decimal(fromAccount.balance).plus(fromSigned).toString();
  const toBalance = new Decimal(toAccount.balance).plus(toSigned).toString();

  await db
    .update(financialAccount)
    .set({ balance: fromBalance, updatedAt: now })
    .where(eq(financialAccount.id, fromAccount.id));
  await db
    .update(financialAccount)
    .set({ balance: toBalance, updatedAt: now })
    .where(eq(financialAccount.id, toAccount.id));

  const baseDesc = description || `Transfer ${fromAccount.name} → ${toAccount.name}`;

  await db.insert(transaction).values([
    {
      id: nanoid(),
      userId: session.user.id,
      accountId: fromAccount.id,
      categoryId: transferCategory?.id ?? null,
      amount: fromSigned,
      currency: fromAccount.currency,
      description: baseDesc,
      notes: notes ?? null,
      type: "transfer",
      date: txDate,
      transferId,
      isRecurring: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      userId: session.user.id,
      accountId: toAccount.id,
      categoryId: transferCategory?.id ?? null,
      amount: toSigned,
      currency: toAccount.currency,
      description: baseDesc,
      notes: notes ?? null,
      type: "transfer",
      date: txDate,
      transferId,
      isRecurring: false,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  return ok({ transferId }, 201);
}
