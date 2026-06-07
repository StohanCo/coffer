import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { category } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(["income", "expense", "transfer"]).default("expense"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const categories = await db.query.category.findMany({
    where: eq(category.userId, session.user.id),
    orderBy: [category.name],
  });
  return ok(categories);
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  // Prevent duplicate name+type for the same user.
  const dupe = await db.query.category.findFirst({
    where: and(
      eq(category.userId, session.user.id),
      eq(category.name, parsed.data.name),
      eq(category.type, parsed.data.type)
    ),
  });
  if (dupe) return err("A category with that name and type already exists");

  const [created] = await db
    .insert(category)
    .values({
      id: nanoid(),
      userId: session.user.id,
      ...parsed.data,
      isDefault: false,
      createdAt: new Date(),
    })
    .returning();

  return ok(created, 201);
}
