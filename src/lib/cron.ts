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

  // Recurring transactions: process hourly, and catch up any missed ones on boot.
  const processRecurring = async () => {
    try {
      const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      await fetch(`${baseUrl}/api/internal/recurring`, {
        method: "POST",
        headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
      });
    } catch (e) {
      console.error("[cron] recurring processing failed", e);
    }
  };
  cron.schedule("5 * * * *", processRecurring); // 5 minutes past every hour
  setTimeout(processRecurring, 10_000);

  console.log("[cron] scheduled: daily snapshot 02:00, FX refresh 6h, recurring hourly (warmups on boot)");
}
