// Runtime settings. Secrets and machine-local switches come from .env; everything
// else is code so it is type-checked and greppable.

function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export const settings = {
  analyst: {
    enabled: envBool("ANALYST_ENABLED", true),
    // Provider profile names from config/providers.ts — switching providers is
    // an edit here (or a profile edit there), never a code change.
    nightly: "anthropic",
    monthly: "anthropic_strong",
    event: "anthropic",
  },
  ntfy: {
    enabled: envBool("NTFY_ENABLED", false),
    url: process.env.NTFY_URL || "https://ntfy.sh",
    topic: process.env.NTFY_TOPIC || "",
  },
  prices: {
    healWindowDays: 5, // daily pull re-fetches this many days to heal gaps
    concurrency: 6,
    staggerMs: 300,
  },
  news: {
    maxPerSector: 25,
    keepDays: 7,
  },
  earnings: {
    throttleMs: 500,
  },
  backups: {
    dir: "data/backups",
    keep: 14,
  },
  schedule: {
    // node-cron expressions, local time (day-of-week: 0=Sun … 6=Sat).
    prices: "30 22 * * *",
    news: "0 23 * * *",
    rules: "30 23 * * *",
    nightly: "45 23 * * *", // monthly re-rate also runs here on the last day of the month
    earnings: "0 10 * * 6",
    morning: "30 7 * * *",
    timezone: process.env.ENGINE_TZ || undefined,
  },
};
