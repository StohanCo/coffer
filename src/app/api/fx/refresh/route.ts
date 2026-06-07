import { db } from "@/lib/db/client";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { refreshFxRates } from "@/lib/fx";
import { requireSession, ok, unauthorized } from "@/lib/api-helpers";

export async function POST() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, session.user.id),
  });
  const base = settings?.defaultCurrency ?? "NZD";
  const fx = await refreshFxRates(base);
  return ok({ ok: true, base: fx.base, source: fx.source, fetchedAt: fx.fetchedAt });
}
