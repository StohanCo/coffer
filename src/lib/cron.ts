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

  console.log("[cron] scheduled: daily snapshot at 02:00");
}
