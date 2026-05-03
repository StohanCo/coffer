import type { Config } from "drizzle-kit";
import path from "path";

const raw = process.env.DATABASE_URL ?? "./data/finops.db";
const url = raw.startsWith("file:") ? raw : `file:${path.resolve(raw)}`;

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url },
} satisfies Config;
