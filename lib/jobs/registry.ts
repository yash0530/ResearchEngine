// Single name→job map shared by the scheduler, the CLI (scripts/pull.ts), the
// API route, and the Ops page — "run now" is the same code path everywhere.

import { runPrices } from "./prices";
import { runBackup } from "./backup";
import { runNews } from "./news";
import { runEarnings } from "./earnings";
import { runRulesJob } from "../rules/engine";
import { runAnalyst } from "../analyst/runner";
import { runMorning } from "./morning";
import { runOvernight } from "./overnight";

export type JobOptions = {
  backfillDays?: number;
  dryRun?: boolean;
  providerOverride?: string;
};
export type JobFn = (opts: JobOptions) => Promise<string>;

export const JOBS: Record<string, JobFn> = {
  // The ordered ETL chain run nightly by the scheduler; also runnable on demand.
  overnight: () => runOvernight(),
  prices: (opts) => runPrices({ backfillDays: opts.backfillDays }),
  backup: () => runBackup(),
  news: () => runNews(),
  earnings: () => runEarnings(),
  rules: (opts) => runRulesJob({ dryRun: opts.dryRun }),
  nightly: (opts) =>
    runAnalyst("nightly", { dryRun: opts.dryRun, providerOverride: opts.providerOverride }),
  monthly: (opts) =>
    runAnalyst("monthly_rerate", { dryRun: opts.dryRun, providerOverride: opts.providerOverride }),
  morning: () => runMorning(),
};

export const JOB_NAMES = Object.keys(JOBS);

export function isJobName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(JOBS, name);
}
