import cron from "node-cron";

export function startCron() {
  // Daily snapshot at 02:00 server time
  cron.schedule("0 2 * * *", async () => {
    try {
      const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      await fetch(`${baseUrl}/api/internal/snapshots`, {
        method: "POST",
        headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
      });
    } catch (e) {
      console.error("[cron] daily snapshot failed", e);
    }
  });

  // FX rate refresh every 6 hours, plus an immediate kick on startup
  const refresh = async () => {
    try {
      const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      await fetch(`${baseUrl}/api/internal/fx-refresh`, {
        method: "POST",
        headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
      });
    } catch (e) {
      console.error("[cron] fx refresh failed", e);
    }
  };
  cron.schedule("0 */6 * * *", refresh);
  // Warm the cache shortly after boot so the first dashboard load is fast.
  setTimeout(refresh, 5_000);

  console.log("[cron] scheduled: daily snapshot 02:00, FX refresh every 6h (warmup in 5s)");
}
