import { z } from "zod";
import { db } from "@/lib/db/client";
import { category } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  type: z.enum(["income", "expense", "transfer"]).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

async function ownedCategory(userId: string, id: string) {
  return db.query.category.findFirst({
    where: and(eq(category.id, id), eq(category.userId, userId)),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const existing = await ownedCategory(session.user.id, id);
  if (!existing) return err("Category not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  if (Object.keys(parsed.data).length === 0) return err("Nothing to update");

  const [updated] = await db
    .update(category)
    .set(parsed.data)
    .where(eq(category.id, id))
    .returning();

  return ok(updated);
}

/**
 * Deletes a category. Transactions and budgets that referenced it keep their
 * rows but have categoryId set to null (per the schema's onDelete: set null),
 * i.e. they become "uncategorized".
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const existing = await ownedCategory(session.user.id, id);
  if (!existing) return err("Category not found", 404);

  await db.delete(category).where(eq(category.id, id));
  return ok({ deleted: true });
}
