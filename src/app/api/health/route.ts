import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db.run(sql`SELECT 1`);
    return NextResponse.json({ ok: true, db: "connected" });
  } catch {
    return NextResponse.json({ ok: false, db: "error" }, { status: 503 });
  }
}
