// Every job — scheduled, CLI, API, or UI-triggered — runs through this wrapper:
// one JobRun row per run, ntfy warn on failure, and it never throws.

import { prisma } from "../prisma";
import { sendNtfy } from "../notify";

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
    await sendNtfy({
      severity: "warn",
      title: "engine",
      message: `engine job failed: ${name}: ${detail}`.slice(0, 500),
    });
    return { ok: false, detail };
  }
}
