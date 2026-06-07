import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { budget } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  categoryId: z.string().min(1, "Pick a category"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
  currency: z.string().length(3),
  period: z.enum(["weekly", "monthly", "yearly"]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const budgets = await db.query.budget.findMany({
    where: and(eq(budget.userId, session.user.id), eq(budget.isActive, true)),
    orderBy: [desc(budget.createdAt)],
  });
  return ok(budgets);
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const now = new Date();
  const { startDate, endDate, ...rest } = parsed.data;
  const [created] = await db
    .insert(budget)
    .values({
      id: nanoid(),
      userId: session.user.id,
      ...rest,
      startDate: startDate ? new Date(startDate) : now,
      endDate: endDate ? new Date(endDate) : null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return ok(created, 201);
}
