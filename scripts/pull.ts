// CLI job runner: npm run job -- <name> [--dry-run] [--backfill=N]

import "dotenv/config";

import { JOBS, JOB_NAMES, type JobOptions } from "../lib/jobs/registry";
import { runJob } from "../lib/jobs/runner";

async function main() {
  const args = process.argv.slice(2);
  const name = args.find((a) => !a.startsWith("--"));
  const opts: JobOptions = {
    dryRun: args.includes("--dry-run"),
    backfillDays: parseBackfill(args),
  };

  if (!name || !(name in JOBS)) {
    console.error(`usage: npm run job -- <${JOB_NAMES.join("|")}> [--dry-run] [--backfill=N]`);
    process.exit(2);
  }

  const result = await runJob(name, () => JOBS[name](opts));
  console.log(`${name}: ${result.ok ? "ok" : "FAILED"} — ${result.detail}`);
  process.exit(result.ok ? 0 : 1);
}

function parseBackfill(args: string[]): number | undefined {
  const raw = args.find((a) => a.startsWith("--backfill="))?.split("=")[1];
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
