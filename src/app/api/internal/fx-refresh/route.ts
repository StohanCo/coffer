import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { userSettings } from "@/lib/db/schema";
import { refreshFxRates } from "@/lib/fx";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Refresh rates for every base currency we have at least one user using
  const all = await db.query.userSettings.findMany();
  const bases = [...new Set([
    process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "NZD",
    ...all.map((s) => s.defaultCurrency),
  ])];

  const results: Record<string, string> = {};
  for (const base of bases) {
    try {
      const fx = await refreshFxRates(base);
      results[base] = fx.source;
    } catch (e) {
      results[base] = "error";
    }
  }

  return NextResponse.json({ ok: true, refreshed: results });
}
