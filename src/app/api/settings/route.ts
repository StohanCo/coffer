import { z } from "zod";
import { db } from "@/lib/db/client";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession, ok, err, unauthorized } from "@/lib/api-helpers";
import { isValidCurrencyCode, parseCurrencies, BUILTIN_CURRENCIES } from "@/lib/currencies";

const updateSchema = z.object({
  defaultCurrency: z.string().length(3).optional(),
  locale: z.string().max(10).optional(),
  fiscalYearStart: z.number().int().min(1).max(12).optional(),
  taxRate: z.number().min(0).max(1).optional(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, session.user.id),
  });
  return ok(settings ?? null);
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, session.user.id),
  });

  if (existing) {
    await db
      .update(userSettings)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(userSettings.userId, session.user.id));
  } else {
    await db.insert(userSettings).values({
      userId: session.user.id,
      defaultCurrency: "NZD",
      locale: "en-NZ",
      fiscalYearStart: 4,
      taxRate: 0.33,
      extraCurrencies: "[]",
      ...parsed.data,
      updatedAt: new Date(),
    });
  }

  return ok({ ok: true });
}

// POST /api/settings/currencies  — add a currency
// DELETE /api/settings/currencies — remove a currency
export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const code: string = (body?.code ?? "").toUpperCase().trim();
  if (!isValidCurrencyCode(code)) return err("Currency code must be 3 uppercase letters (e.g. RUB)");
  if (BUILTIN_CURRENCIES.includes(code)) return err(`${code} is already in the built-in list`);

  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, session.user.id),
  });

  const current = parseCurrencies(existing?.extraCurrencies ?? "[]");
  if (current.includes(code)) return err(`${code} is already added`);

  const updated = JSON.stringify([...current, code]);

  if (existing) {
    await db
      .update(userSettings)
      .set({ extraCurrencies: updated, updatedAt: new Date() })
      .where(eq(userSettings.userId, session.user.id));
  } else {
    await db.insert(userSettings).values({
      userId: session.user.id,
      defaultCurrency: "NZD",
      locale: "en-NZ",
      fiscalYearStart: 4,
      taxRate: 0.33,
      extraCurrencies: updated,
      updatedAt: new Date(),
    });
  }

  return ok({ ok: true, code });
}

export async function DELETE(req: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const code: string = (body?.code ?? "").toUpperCase().trim();

  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, session.user.id),
  });

  const current = parseCurrencies(existing?.extraCurrencies ?? "[]");
  const updated = JSON.stringify(current.filter((c) => c !== code));

  await db
    .update(userSettings)
    .set({ extraCurrencies: updated, updatedAt: new Date() })
    .where(eq(userSettings.userId, session.user.id));

  return ok({ ok: true });
}
