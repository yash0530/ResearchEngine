// Every job — scheduled, CLI, API, or UI-triggered — runs through this wrapper:
// one JobRun row per run, and it never throws. Failures are recorded to JobRun
// (and surface in the Ops job log + the morning digest's data-health line) rather
// than pushed anywhere — this is a check-once-a-morning dashboard, not a pager.

import { prisma } from "../prisma";

export type JobResult = { ok: boolean; detail: string };

export async function runJob(name: string, fn: () => Promise<string>): Promise<JobResult> {
  const startedAt = new Date();
  try {
    const detail = await fn();
    await prisma.jobRun.create({ data: { job: name, startedAt, ok: true, detail } });
    return { ok: true, detail };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    try {
      await prisma.jobRun.create({ data: { job: name, startedAt, ok: false, detail } });
    } catch {
      // even logging must not throw out of a job
    }
    return { ok: false, detail };
  }
}
