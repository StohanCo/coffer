import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

function getDbUrl(): string {
  const raw = process.env.DATABASE_URL ?? "./data/finops.db";
  // libsql expects file: URLs or :memory:
  if (raw.startsWith("file:") || raw === ":memory:") return raw;
  // Resolve relative paths to absolute
  const abs = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return `file:${abs}`;
}

const client = createClient({ url: getDbUrl() });

export const db = drizzle(client, { schema });
