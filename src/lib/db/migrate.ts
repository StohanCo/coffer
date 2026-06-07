import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import fs from "fs";
import { db } from "./client";

let hasRun = false;

/**
 * Applies any pending Drizzle migrations from the bundled `drizzle/` folder.
 *
 * This is what creates the schema on a fresh deploy — the production
 * (standalone) image cannot run `drizzle-kit push`, so the SQL migrations
 * generated at build time are applied here on boot instead. Idempotent:
 * Drizzle tracks applied migrations in its own journal table.
 */
export async function runMigrations(): Promise<void> {
  if (hasRun) return;
  hasRun = true;

  // In the standalone runner cwd is /app and the folder is copied to /app/drizzle.
  // In dev it sits at the project root. Resolve relative to cwd and fall back gracefully.
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  if (!fs.existsSync(migrationsFolder)) {
    console.warn(`[migrate] no migrations folder at ${migrationsFolder}; skipping`);
    return;
  }

  try {
    await migrate(db, { migrationsFolder });
    console.log("[migrate] schema up to date");
  } catch (err) {
    console.error("[migrate] failed to apply migrations", err);
    throw err;
  }
}
