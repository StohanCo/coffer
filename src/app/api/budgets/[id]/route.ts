import { z } from "zod";
import { db } from "@/lib/db/client";
import { budget } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  categoryId: z.string().min(1).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().length(3).optional(),
  period: z.enum(["weekly", "monthly", "yearly"]).optional(),
  endDate: z.string().datetime().nullable().optional(),
});

async function ownedBudget(userId: string, id: string) {
  return db.query.budget.findFirst({
    where: and(eq(budget.id, id), eq(budget.userId, userId)),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const existing = await ownedBudget(session.user.id, id);
  if (!existing) return err("Budget not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  if (Object.keys(parsed.data).length === 0) return err("Nothing to update");

  const { endDate, ...rest } = parsed.data;
  const [updated] = await db
    .update(budget)
    .set({
      ...rest,
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(budget.id, id))
    .returning();

  return ok(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const existing = await ownedBudget(session.user.id, id);
  if (!existing) return err("Budget not found", 404);

  await db.delete(budget).where(eq(budget.id, id));
  return ok({ deleted: true });
}
