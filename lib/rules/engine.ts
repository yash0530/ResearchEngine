// Tripwire evaluation. Pure evaluators over an injectable RuleContext; the
// Prisma-bound context and runAllRules live at the bottom.
//
// Tripwires are *signals*, not pages. A fire records a RuleEvent row; everything
// downstream (the morning digest, the Signals view, the analyst snapshot) reads
// those rows. Nothing is pushed to a phone — this is a check-once dashboard.

import { prisma } from "../prisma";
import { drawdownFromCloses, getCloses, round2 } from "../metrics";
import { addDaysStr, todayStr } from "../dates";
import { TRIPWIRES } from "../../config/tripwires";
import type { Fired, RuleContext, TripwireRule } from "./types";

const DAY_MS = 86_400_000;

export function interpolate(message: string, value: number | string | null): string {
  return message.replaceAll("{value}", value === null ? "" : String(value));
}

export async function evaluateRule(
  rule: TripwireRule,
  ctx: RuleContext,
  firedIds: Set<string>,
): Promise<Fired | null> {
  const fired = (value: number | string | null): Fired => ({
    id: rule.id,
    severity: rule.severity,
    message: interpolate(rule.message, value),
    value,
  });

  switch (rule.type) {
    case "drawdown": {
      const rows = await ctx.getCloses(rule.symbol, rule.lookbackDays);
      const dd = drawdownFromCloses(rows, rule.lookbackDays);
      if (dd === null) return null;
      return dd <= rule.pct ? fired(dd) : null;
    }

    case "consecutive_monthly": {
      const rows = await ctx.getSeriesLast(rule.series, rule.n);
      if (rows.length < rule.n) return null;
      const ok =
        rule.direction === "down"
          ? rows.every((r) => r.value < 0)
          : rows.every((r) => r.value > 0);
      return ok ? fired(rows.map((r) => r.value).join(", ")) : null;
    }

    case "flag_equals": {
      const hit = await ctx.seriesValueWithin(rule.series, rule.value, rule.withinDays);
      return hit ? fired(rule.value) : null;
    }

    case "ratio_change": {
      const [rowsA, rowsB] = await Promise.all([
        ctx.getCloses(rule.a, rule.lookbackDays),
        ctx.getCloses(rule.b, rule.lookbackDays),
      ]);
      const byDateB = new Map(rowsB.map((r) => [r.d, r.close]));
      const ratios: number[] = [];
      for (const r of rowsA) {
        const b = byDateB.get(r.d);
        if (b) ratios.push(r.close / b);
      }
      if (ratios.length < 5) return null; // too few shared dates — skip silently
      const change = round2((ratios[ratios.length - 1] / ratios[0] - 1) * 100);
      return change <= rule.pct ? fired(change) : null;
    }

    case "compound": {
      if (!rule.allOf.every((id) => firedIds.has(id))) return null;
      if (rule.noneOf.some((id) => firedIds.has(id))) return null;
      if (rule.requireNotRecent === "capex_raise") {
        const raised = await ctx.seriesValueWithin("capex_flag", 1, 35);
        if (raised) return null;
      }
      return fired(null);
    }
  }
}

export function underCooloff(lastFiredAt: Date | null, cooloffDays: number, now: Date): boolean {
  if (!lastFiredAt) return false;
  return now.getTime() - lastFiredAt.getTime() < cooloffDays * DAY_MS;
}

// ── Prisma-bound context + orchestration ─────────────────────────────────────

export function prismaRuleContext(): RuleContext {
  const today = todayStr();
  return {
    today,
    getCloses: (symbol, lastN) => getCloses(symbol, lastN),
    async getSeriesLast(series, n) {
      const rows = await prisma.manualSeries.findMany({
        where: { series },
        orderBy: { d: "desc" },
        take: n,
        select: { d: true, value: true },
      });
      return rows;
    },
    async seriesValueWithin(series, value, withinDays) {
      const row = await prisma.manualSeries.findFirst({
        where: {
          series,
          value,
          d: { gte: addDaysStr(today, -withinDays), lte: today },
        },
      });
      return row !== null;
    },
  };
}

export type RulesRunResult = {
  evaluated: number;
  fired: Fired[];
  suppressed: string[];
};

export async function runAllRules(opts: { dryRun?: boolean } = {}): Promise<RulesRunResult> {
  const ctx = prismaRuleContext();
  const candidates: Fired[] = [];
  const firedIds = new Set<string>();

  // Non-compounds first; compounds see the fired set from this same pass.
  for (const phase of ["simple", "compound"] as const) {
    for (const rule of TRIPWIRES) {
      const isCompound = rule.type === "compound";
      if ((phase === "compound") !== isCompound) continue;
      const result = await evaluateRule(rule, ctx, firedIds);
      if (result) {
        candidates.push(result);
        firedIds.add(rule.id);
      }
    }
  }

  const now = new Date();
  const fired: Fired[] = [];
  const suppressed: string[] = [];
  for (const candidate of candidates) {
    const rule = TRIPWIRES.find((r) => r.id === candidate.id)!;
    const last = await prisma.ruleEvent.findFirst({
      where: { ruleId: candidate.id },
      orderBy: { firedAt: "desc" },
    });
    if (underCooloff(last?.firedAt ?? null, rule.cooloffDays, now)) {
      suppressed.push(candidate.id);
      continue;
    }
    if (!opts.dryRun) {
      await prisma.ruleEvent.create({
        data: {
          ruleId: candidate.id,
          severity: candidate.severity,
          message: candidate.message,
        },
      });
    }
    fired.push(candidate);
  }

  // No routing/paging. Severity is retained on the RuleEvent so the digest and the
  // Signals view can rank criticals above warns above infos — surfaced, never pushed.
  return { evaluated: TRIPWIRES.length, fired, suppressed };
}

export async function runRulesJob(opts: { dryRun?: boolean } = {}): Promise<string> {
  const result = await runAllRules(opts);
  const firedText = result.fired.length
    ? result.fired
        .map((f) => `${f.severity.toUpperCase()} ${f.id}: ${f.message}`)
        .join(" | ")
    : "no rules fired";
  const suffix = result.suppressed.length
    ? `; cooloff-suppressed: ${result.suppressed.join(",")}`
    : "";
  return `evaluated ${result.evaluated}${opts.dryRun ? " (dry-run)" : ""} — ${firedText}${suffix}`;
}
