// Single name→job map shared by the scheduler, the CLI (scripts/pull.ts), the
// API route, and the Ops page — "run now" is the same code path everywhere.

import { runPrices } from "./prices";
import { runBackup } from "./backup";

export type JobOptions = { backfillDays?: number; dryRun?: boolean };
export type JobFn = (opts: JobOptions) => Promise<string>;

export const JOBS: Record<string, JobFn> = {
  prices: (opts) => runPrices({ backfillDays: opts.backfillDays }),
  backup: () => runBackup(),
  // M3 adds: news, earnings · M4 adds: rules · M5 adds: nightly, monthly, morning
};

export const JOB_NAMES = Object.keys(JOBS);

export function isJobName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(JOBS, name);
}
