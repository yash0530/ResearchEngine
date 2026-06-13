// POST /api/jobs/{name} — run any registered job now. Used by the Ops page,
// curl, and anything else that wants the same code path as the scheduler.

import { NextResponse } from "next/server";
import { JOBS, JOB_NAMES, type JobOptions } from "@/lib/jobs/registry";
import { runJob } from "@/lib/jobs/runner";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ job: string }> },
) {
  const { job } = await params;
  if (!(job in JOBS)) {
    return NextResponse.json(
      { ok: false, detail: `unknown job '${job}' (valid: ${JOB_NAMES.join(", ")})` },
      { status: 404 },
    );
  }

  let opts: JobOptions = {};
  try {
    const body = (await request.json()) as JobOptions;
    opts = {
      dryRun: body.dryRun === true,
      backfillDays:
        typeof body.backfillDays === "number" && body.backfillDays > 0
          ? Math.floor(body.backfillDays)
          : undefined,
    };
  } catch {
    // no body — defaults
  }

  const result = await runJob(job, () => JOBS[job](opts));
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
