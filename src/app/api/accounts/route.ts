import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { financialAccount } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["checking", "savings", "credit", "investment", "loan", "cash"]),
  currency: z.string().length(3),
  balance: z.string().regex(/^-?\d+(\.\d{1,2})?$/),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#06b6d4"),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const accounts = await db.query.financialAccount.findMany({
    where: and(eq(financialAccount.userId, session.user.id), eq(financialAccount.isArchived, false)),
  });
  return ok(accounts);
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const now = new Date();
  const [account] = await db
    .insert(financialAccount)
    .values({
      id: nanoid(),
      userId: session.user.id,
      ...parsed.data,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return ok(account, 201);
}
