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
    // an edit here (or a profile edit there), never a code change. All three roles
    // run on Gemini flash-lite today (the only key on file). When 3.5-flash quota lands,
    // point `monthly` at the pre-staged `gemini_strong` profile — a one-line change. The
    // deterministic digest does not depend on any of this — the LLM only *enriches* facts.
    nightly: "gemini_compat",
    monthly: "gemini_compat",
    event: "gemini_compat",
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
    concurrency: 5,
    staggerMs: 250,
  },
  backups: {
    dir: "data/backups",
    keep: 14,
  },
  schedule: {
    // node-cron expressions, local time (day-of-week: 0=Sun … 6=Sat). One ordered
    // overnight pipeline (prices→news→earnings→rules→nightly→digest) keeps the morning
    // dashboard coherent and fresh; the monthly stage re-rate stays on its own cadence.
    overnight: "0 3 * * *", // 03:00 — late enough for end-of-day data to settle
    monthly: "0 8 1 * *", // 1st of month 08:00 — decoupled (own cron + boot catch-up)
    timezone: process.env.ENGINE_TZ || undefined,
  },
};
