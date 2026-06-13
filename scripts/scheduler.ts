// Long-running cron process. Every handler goes through runJob, so a failure
// logs a JobRun row and pushes an ntfy warn instead of crashing the scheduler.
//
//   npm run scheduler        — start the daemon (use launchd/systemd to keep alive)
//   npm run scheduler:test   — run every job once, in sequence, then exit

import "dotenv/config";

import cron from "node-cron";
import { JOBS } from "../lib/jobs/registry";
import { runJob } from "../lib/jobs/runner";
import { runAnalyst } from "../lib/analyst/runner";
import { settings } from "../config/settings";
import { isLastDayOfMonth } from "../lib/dates";
import { prisma } from "../lib/prisma";

const TEST = process.argv.includes("--test");

async function heartbeat(detail: string) {
  try {
    await prisma.jobRun.create({ data: { job: "scheduler", ok: true, detail } });
  } catch {
    // never let bookkeeping crash the daemon
  }
}

async function runTest() {
  console.log("scheduler --test: running every job once…");
  const order = ["prices", "news", "earnings", "rules", "nightly", "morning"] as const;
  let failures = 0;
  for (const name of order) {
    const result = await runJob(name, () => JOBS[name]({}));
    console.log(`  ${name}: ${result.ok ? "ok" : "FAIL"} — ${result.detail}`);
    if (!result.ok) failures += 1;
  }
  await prisma.$disconnect();
  console.log(failures ? `DONE with ${failures} failure(s)` : "DONE — all jobs ok");
  process.exit(failures ? 1 : 0);
}

function schedule(name: string, expr: string, handler: () => Promise<unknown>) {
  cron.schedule(expr, handler, { timezone: settings.schedule.timezone });
  console.log(`  ${name.padEnd(9)} ${expr}${settings.schedule.timezone ? ` (${settings.schedule.timezone})` : ""}`);
}

function startDaemon() {
  const s = settings.schedule;
  console.log("ENGINE scheduler starting. Jobs (local time):");

  schedule("prices", s.prices, () => runJob("prices", () => JOBS.prices({})));
  schedule("news", s.news, () => runJob("news", () => JOBS.news({})));
  schedule("rules", s.rules, () => runJob("rules", () => JOBS.rules({})));
  schedule("earnings", s.earnings, () => runJob("earnings", () => JOBS.earnings({})));

  // Nightly brief, then monthly re-rate only on the last calendar day of the month
  // (cron has no "last day" token, so guard inside the handler).
  schedule("nightly", s.nightly, async () => {
    await runJob("nightly", () => JOBS.nightly({}));
    if (isLastDayOfMonth()) {
      await runJob("monthly", () => runAnalyst("monthly_rerate"));
    }
  });

  schedule("morning", s.morning, () => runJob("morning", () => JOBS.morning({})));

  void heartbeat("boot");
  console.log("Scheduler is up. Ctrl-C to stop.");
}

if (TEST) {
  void runTest();
} else {
  startDaemon();
}
