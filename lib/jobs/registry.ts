// Single name→job map shared by the scheduler, the CLI (scripts/pull.ts), the
// API route, and the Ops page — "run now" is the same code path everywhere.

import { runPrices } from "./prices";
import { runBackup } from "./backup";
import { runNews } from "./news";
import { runEarnings } from "./earnings";
import { runRulesJob } from "../rules/engine";

export type JobOptions = { backfillDays?: number; dryRun?: boolean };
export type JobFn = (opts: JobOptions) => Promise<string>;

export const JOBS: Record<string, JobFn> = {
  prices: (opts) => runPrices({ backfillDays: opts.backfillDays }),
  backup: () => runBackup(),
  news: () => runNews(),
  earnings: () => runEarnings(),
  rules: (opts) => runRulesJob({ dryRun: opts.dryRun }),
  // M5 adds: nightly, monthly, morning
};

export const JOB_NAMES = Object.keys(JOBS);

export function isJobName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(JOBS, name);
}
