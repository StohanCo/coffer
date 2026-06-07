export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Apply pending DB migrations before anything queries the database.
    const { runMigrations } = await import("./lib/db/migrate");
    await runMigrations();

    const { startCron } = await import("./lib/cron");
    startCron();
  }
}
