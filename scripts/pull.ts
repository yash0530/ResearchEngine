// CLI job runner: npm run job -- <name> [--dry-run] [--backfill=N]

import "dotenv/config";

import { JOBS, JOB_NAMES, type JobOptions } from "../lib/jobs/registry";
import { runJob } from "../lib/jobs/runner";

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith("--"));
  const name = positional[0];
  const opts: JobOptions = {
    dryRun: args.includes("--dry-run"),
    backfillDays: parseFlagNumber(args, "--backfill="),
    providerOverride: parseFlag(args, "--provider="),
  };

  // Ad-hoc event-mode analysis: npm run job -- event "capex guide-down at MSFT"
  if (name === "event") {
    const event = positional.slice(1).join(" ");
    if (!event) {
      console.error('usage: npm run job -- event "<what happened>" [--provider=NAME]');
      process.exit(2);
    }
    const { runAnalyst } = await import("../lib/analyst/runner");
    const result = await runJob("event", () =>
      runAnalyst("event_mode", { event, providerOverride: opts.providerOverride }),
    );
    console.log(`event: ${result.ok ? "ok" : "FAILED"} — ${result.detail}`);
    process.exit(result.ok ? 0 : 1);
  }

  if (!name || !(name in JOBS)) {
    console.error(
      `usage: npm run job -- <${JOB_NAMES.join("|")}|event> [--dry-run] [--backfill=N] [--provider=NAME]`,
    );
    process.exit(2);
  }

  const result = await runJob(name, () => JOBS[name](opts));
  console.log(`${name}: ${result.ok ? "ok" : "FAILED"} — ${result.detail}`);
  process.exit(result.ok ? 0 : 1);
}

function parseFlag(args: string[], prefix: string): string | undefined {
  return args.find((a) => a.startsWith(prefix))?.slice(prefix.length) || undefined;
}

function parseFlagNumber(args: string[], prefix: string): number | undefined {
  const raw = parseFlag(args, prefix);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
