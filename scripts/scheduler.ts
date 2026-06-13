// Long-running cron process. Every handler goes through runJob, so a failure logs
// a JobRun row instead of crashing the scheduler — failures surface in the Ops job
// log and the morning digest's data-health line, never as a push.
//
//   npm run scheduler        — start the daemon (use launchd/systemd to keep alive)
//   npm run scheduler:test   — run the overnight pipeline + monthly once, then exit

import "dotenv/config";

import cron from "node-cron";
import { JOBS } from "../lib/jobs/registry";
import { runJob } from "../lib/jobs/runner";
import { settings } from "../config/settings";
import { prisma } from "../lib/prisma";

const TEST = process.argv.includes("--test");

async function heartbeat(detail: string) {
  try {
    await prisma.jobRun.create({ data: { job: "scheduler", ok: true, detail } });
  } catch {
    // never let bookkeeping crash the daemon
  }
}

// A missed cron tick (machine asleep) leaves no monthly re-rate that month and,
// unlike prices, nothing heals it. On boot, run it if none exists this month.
async function monthlyCatchupIfMissing() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  try {
    const existing = await prisma.brief.findFirst({
      where: { kind: "monthly_rerate", createdAt: { gte: monthStart } },
      select: { id: true },
    });
    if (existing) return;
    console.log("monthly re-rate missing for this month — running catch-up");
    await runJob("monthly", () => JOBS.monthly({}));
  } catch (error) {
    console.log(`monthly catch-up check failed: ${error instanceof Error ? error.message : error}`);
  }
}

async function runTest() {
  console.log("scheduler --test: running the overnight pipeline + monthly once…");
  let failures = 0;
  for (const name of ["overnight", "monthly"] as const) {
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

  // One ordered pipeline overnight: prices→news→earnings→rules→nightly→digest. Each
  // step records its own JobRun; a step failure is counted, not fatal.
  schedule("overnight", s.overnight, () => runJob("overnight", () => JOBS.overnight({})));

  // Monthly re-rate stays decoupled from the nightly pipeline so a failed/missed run
  // can't take it down (see monthlyCatchupIfMissing for the boot heal).
  schedule("monthly", s.monthly, () => runJob("monthly", () => JOBS.monthly({})));

  void heartbeat("boot");
  void monthlyCatchupIfMissing();
  console.log("Scheduler is up. Ctrl-C to stop.");
}

if (TEST) {
  void runTest();
} else {
  startDaemon();
}
