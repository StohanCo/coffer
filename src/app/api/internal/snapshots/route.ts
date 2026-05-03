import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { financialAccount, accountSnapshot } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accounts = await db.query.financialAccount.findMany();
  const now = new Date();

  if (accounts.length > 0) {
    await db.insert(accountSnapshot).values(
      accounts.map((a) => ({
        id: nanoid(),
        accountId: a.id,
        userId: a.userId,
        balance: a.balance,
        currency: a.currency,
        snapshotDate: now,
        createdAt: now,
      }))
    );
  }

  return NextResponse.json({ ok: true, snapshotted: accounts.length });
}
