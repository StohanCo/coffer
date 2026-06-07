import { z } from "zod";
import { db } from "@/lib/db/client";
import { recurringTransaction } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";

const updateSchema = z.object({
  categoryId: z.string().nullable().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  description: z.string().min(1).max(200).optional(),
  type: z.enum(["income", "expense"]).optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  nextDue: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

async function ownedRule(userId: string, id: string) {
  return db.query.recurringTransaction.findFirst({
    where: and(eq(recurringTransaction.id, id), eq(recurringTransaction.userId, userId)),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const existing = await ownedRule(session.user.id, id);
  if (!existing) return err("Recurring rule not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  if (Object.keys(parsed.data).length === 0) return err("Nothing to update");

  const { nextDue, ...rest } = parsed.data;
  const [updated] = await db
    .update(recurringTransaction)
    .set({
      ...rest,
      ...(nextDue !== undefined ? { nextDue: new Date(nextDue) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(recurringTransaction.id, id))
    .returning();

  return ok(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const existing = await ownedRule(session.user.id, id);
  if (!existing) return err("Recurring rule not found", 404);

  await db.delete(recurringTransaction).where(eq(recurringTransaction.id, id));
  return ok({ deleted: true });
}
