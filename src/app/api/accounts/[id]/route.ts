import { z } from "zod";
import { db } from "@/lib/db/client";
import { financialAccount } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["checking", "savings", "credit", "investment", "loan", "cash"]).optional(),
  currency: z.string().length(3).optional(),
  balance: z.string().regex(/^-?\d+(\.\d{1,2})?$/).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

async function ownedAccount(userId: string, id: string) {
  return db.query.financialAccount.findFirst({
    where: and(eq(financialAccount.id, id), eq(financialAccount.userId, userId)),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const existing = await ownedAccount(session.user.id, id);
  if (!existing) return err("Account not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  if (Object.keys(parsed.data).length === 0) return err("Nothing to update");

  const [updated] = await db
    .update(financialAccount)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(financialAccount.id, id))
    .returning();

  return ok(updated);
}

/**
 * Soft-delete (archive) so transaction history is preserved. Archived accounts
 * are filtered out of the dashboard. Pass ?hard=1 to permanently delete the
 * account and cascade its transactions.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const existing = await ownedAccount(session.user.id, id);
  if (!existing) return err("Account not found", 404);

  const hard = new URL(req.url).searchParams.get("hard") === "1";

  if (hard) {
    await db.delete(financialAccount).where(eq(financialAccount.id, id));
    return ok({ deleted: true });
  }

  await db
    .update(financialAccount)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(financialAccount.id, id));
  return ok({ archived: true });
}
