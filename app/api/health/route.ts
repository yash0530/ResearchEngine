import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [maxPrice, runs] = await Promise.all([
      prisma.price.findFirst({ orderBy: { d: "desc" }, select: { d: true } }),
      prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 50 }),
    ]);
    const lastRuns: Record<string, { startedAt: string; ok: boolean }> = {};
    for (const run of runs) {
      if (!(run.job in lastRuns)) {
        lastRuns[run.job] = { startedAt: run.startedAt.toISOString(), ok: run.ok };
      }
    }
    return NextResponse.json({ ok: true, pricesAsOf: maxPrice?.d ?? null, lastRuns });
  } catch (error) {
    return NextResponse.json(
      { ok: false, detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
