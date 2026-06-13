// Deterministic research synthesis — the accuracy-first backbone of the morning
// digest. It turns stored facts (closes, fundamentals, fired tripwires, catalysts,
// manual series, job health) into a ranked set of INSIGHTS, each carrying its own
// `evidence` string so every claim traces to a number or a dated source.
//
// This module NEVER calls an LLM and never invents data. The optional LLM layer
// (lib/research/llm.ts) only writes prose ON TOP of the DigestData produced here.
//
// `synthesize()` is pure (unit-tested with fixtures); `buildDigestData()` loads from
// Prisma and calls it — same split as lib/analyst/snapshot.ts.

import { prisma } from "../prisma";
import {
  despike,
  drawdownFromCloses,
  meanOrNull,
  pctChangeFromCloses,
  round2,
  type CloseRow,
} from "../metrics";
import { addDaysStr, daysBetween, todayStr } from "../dates";
import { BENCHMARKS, MANUAL_SERIES_META, type ManualSeriesName } from "../../config/sectors";

export type InsightSeverity = "critical" | "warn" | "info";
export type InsightKind =
  | "tripwire"
  | "risk"
  | "divergence"
  | "momentum"
  | "credit"
  | "catalyst"
  | "signal"
  | "data";

export type Insight = {
  kind: InsightKind;
  severity: InsightSeverity;
  /** Sort key within a severity band — larger = more prominent. Not displayed. */
  weight: number;
  sector?: string;
  symbol?: string;
  headline: string;
  /** Provenance: the exact numbers / source backing the headline. Always present. */
  evidence: string;
};

export type MemberMetric = {
  symbol: string;
  pct1d: number | null;
  pct7d: number | null;
  pct30d: number | null;
  drawdown60: number | null;
  yearChange: number | null;
  forwardPE: number | null;
};

export type SectorInput = {
  code: string;
  name: string;
  stage: string;
  driver: number;
  members: MemberMetric[];
};

export type SynthesisInputs = {
  asOf: string | null;
  ageDays: number | null;
  generatedAt: string; // ISO — passed in so the pure fn stays deterministic
  sectors: SectorInput[];
  hyperscaler1d: number | null; // equal-weight mean across the hyperscaler basket
  hyperscaler30d: number | null;
  credit30d: number | null; // HYG/IEF ratio change over ~30d (financing-stress proxy)
  firedRules: { ruleId: string; severity: InsightSeverity; message: string; firedAt: string }[];
  catalysts: { d: string; kind: string; symbol: string | null; title: string }[];
  manualLatest: Partial<Record<ManualSeriesName, { d: string; value: number }>>;
  newsCoverage: { code: string; count: number }[];
  jobIssues: string[]; // failed jobs (last 24h) — "name: detail"
};

export type SectorPulse = {
  code: string;
  name: string;
  stage: string;
  driver: number;
  avg1d: number | null;
  avg7d: number | null;
  avg30d: number | null;
  vsHyperscaler30d: number | null; // sector 30d minus hyperscaler-basket 30d
  worstDrawdown: { symbol: string; dd: number } | null;
  leader: { symbol: string; pct30d: number } | null;
  laggard: { symbol: string; pct30d: number } | null;
  memberCount: number;
  newsCount: number;
};

export type DigestData = {
  asOf: string | null;
  ageDays: number | null;
  generatedAt: string;
  headline: string;
  market: { hyperscaler1d: number | null; hyperscaler30d: number | null; credit30d: number | null };
  insights: Insight[];
  sectors: SectorPulse[];
  topMovers: { symbol: string; sector: string; pct1d: number }[];
  catalysts: { d: string; kind: string; symbol: string | null; title: string }[];
  manual: { series: string; label: string; value: number; d: string }[];
  freshness: { stale: boolean; ageDays: number | null; jobIssues: string[] };
  counts: { sectorsWithNews: number; insightsTotal: number; criticals: number };
};

// ── Tunable thresholds (named so they're greppable + tunable in one place) ──────
const T = {
  drawdownRisk: -20, // member ≤ this (60d) → risk insight
  drawdownSevere: -30, // ≤ this → escalate to warn weight bump
  drawdownImplausible: -70, // worse than this over 60d ≈ split/bad tick, not a real move

  momentum30d: 10, // |sector 30d avg| ≥ this → momentum insight
  divergence30d: 8, // |sector 30d − hyperscaler 30d| ≥ this → divergence insight
  creditStress30d: -4, // HYG/IEF 30d ≤ this → financing-stress signal (sector 07)
  catalystWindowDays: 10, // dated catalysts within this many days → near-term
  staleDays: 3, // price age > this → stale
  maxInsights: 14, // cap for signal-to-noise (criticals are never dropped)
};

const SEV_RANK: Record<InsightSeverity, number> = { critical: 3, warn: 2, info: 1 };
const FINANCING_SENSITIVE_SECTOR = "07"; // Data Centers & Neoclouds (see credit_proxy tripwire)

function pctStr(v: number | null): string {
  return v === null ? "n/a" : `${v > 0 ? "+" : ""}${v}%`;
}

/** Pure synthesis: stored facts → ranked insights + per-sector pulse. No I/O. */
export function synthesize(inputs: SynthesisInputs): DigestData {
  const insights: Insight[] = [];
  const suspectData: string[] = []; // implausible values → flagged, never shown as real signal

  // Per-sector pulse first — several insight families read from it.
  const sectors: SectorPulse[] = inputs.sectors.map((s) => {
    const avg = (pick: (m: MemberMetric) => number | null) =>
      meanOrNull(s.members.map(pick));
    const avg30 = avg((m) => m.pct30d);
    const withDd = s.members.filter(
      (m): m is MemberMetric & { drawdown60: number } => m.drawdown60 !== null,
    );
    const worst = withDd.length
      ? withDd.reduce((a, b) => (b.drawdown60 < a.drawdown60 ? b : a))
      : null;
    const with30 = s.members.filter(
      (m): m is MemberMetric & { pct30d: number } => m.pct30d !== null,
    );
    const leader = with30.length
      ? with30.reduce((a, b) => (b.pct30d > a.pct30d ? b : a))
      : null;
    const laggard = with30.length
      ? with30.reduce((a, b) => (b.pct30d < a.pct30d ? b : a))
      : null;
    const vsHyper =
      avg30 !== null && inputs.hyperscaler30d !== null
        ? round2(avg30 - inputs.hyperscaler30d)
        : null;
    return {
      code: s.code,
      name: s.name,
      stage: s.stage,
      driver: s.driver,
      avg1d: avg((m) => m.pct1d),
      avg7d: avg((m) => m.pct7d),
      avg30d: avg30,
      vsHyperscaler30d: vsHyper,
      worstDrawdown: worst ? { symbol: worst.symbol, dd: worst.drawdown60 } : null,
      leader: leader ? { symbol: leader.symbol, pct30d: leader.pct30d } : null,
      laggard: laggard ? { symbol: laggard.symbol, pct30d: laggard.pct30d } : null,
      memberCount: s.members.length,
      newsCount: inputs.newsCoverage.find((c) => c.code === s.code)?.count ?? 0,
    };
  });
  const pulseByCode = new Map(sectors.map((p) => [p.code, p]));

  // 1) Fired tripwires — the authoritative risk signals (severity from the rule).
  for (const r of inputs.firedRules) {
    insights.push({
      kind: "tripwire",
      severity: r.severity,
      weight: 100 + SEV_RANK[r.severity] * 10,
      headline: r.message,
      evidence: `tripwire ${r.ruleId} fired ${r.firedAt.slice(0, 10)}`,
    });
  }

  // 2) Manual-series signals. capex_flag = −1 means a Mag-7 capex guide-down: the
  //    master driver (8 of 12 sectors). Surfaced even if the matching tripwire's
  //    cooloff suppressed a re-fire this run.
  const capex = inputs.manualLatest.capex_flag;
  if (capex && capex.value === -1) {
    insights.push({
      kind: "signal",
      severity: "warn",
      weight: 90,
      headline: "Hyperscaler capex flagged DOWN — Driver-1 (8 of 12 sectors) exposed.",
      evidence: `capex_flag = -1 as of ${capex.d}`,
    });
  }
  const ddr5 = inputs.manualLatest.ddr5_contract_mom;
  if (ddr5 && ddr5.value < 0) {
    insights.push({
      kind: "signal",
      severity: "info",
      weight: 40,
      sector: "00",
      headline: `DDR5 contract pricing negative MoM (${ddr5.value}%) — watch the memory cycle.`,
      evidence: `ddr5_contract_mom = ${ddr5.value} as of ${ddr5.d}`,
    });
  }

  // 3) Drawdown risk — worst member per sector beyond the threshold. Implausible
  //    values (≤ drawdownImplausible) are split/bad-tick artifacts: never present
  //    them as a real risk — divert to the data-quality note (#8) so the digest
  //    stays trustworthy. Accuracy is the whole point of the deterministic backbone.
  for (const p of sectors) {
    if (!p.worstDrawdown) continue;
    if (p.worstDrawdown.dd <= T.drawdownImplausible) {
      suspectData.push(`${p.worstDrawdown.symbol} ${p.worstDrawdown.dd}% (60d)`);
      continue;
    }
    if (p.worstDrawdown.dd <= T.drawdownRisk) {
      const severe = p.worstDrawdown.dd <= T.drawdownSevere;
      insights.push({
        kind: "risk",
        severity: "warn",
        weight: 70 + Math.min(20, Math.abs(p.worstDrawdown.dd)) + (severe ? 10 : 0),
        sector: p.code,
        symbol: p.worstDrawdown.symbol,
        headline: `${p.worstDrawdown.symbol} is ${p.worstDrawdown.dd}% off its 60-day high (${p.name}).`,
        evidence: `${p.worstDrawdown.symbol} drawdown60 = ${p.worstDrawdown.dd}%`,
      });
    }
  }

  // 4) Credit-financing proxy → most financing-sensitive sector.
  if (inputs.credit30d !== null && inputs.credit30d <= T.creditStress30d) {
    const p = pulseByCode.get(FINANCING_SENSITIVE_SECTOR);
    insights.push({
      kind: "credit",
      severity: "warn",
      weight: 80,
      sector: FINANCING_SENSITIVE_SECTOR,
      headline: `Credit proxy HYG/IEF ${pctStr(inputs.credit30d)} (30d) — financing stress for ${p?.name ?? "data-center build"}. Verify ABS spreads at source.`,
      evidence: `HYG/IEF ratio change 30d = ${inputs.credit30d}%`,
    });
  }

  // 5) Divergence — a Driver-1 sector pulling away from (or lagging) the hyperscaler
  //    basket that funds it is a genuine "picks-and-shovels vs buyers" tell.
  for (const p of sectors) {
    if (p.driver !== 1 || p.vsHyperscaler30d === null) continue;
    if (Math.abs(p.vsHyperscaler30d) < T.divergence30d) continue;
    const ahead = p.vsHyperscaler30d > 0;
    insights.push({
      kind: "divergence",
      severity: "info",
      weight: 50 + Math.min(20, Math.abs(p.vsHyperscaler30d)),
      sector: p.code,
      headline: `${p.name} ${ahead ? "leading" : "lagging"} hyperscalers by ${Math.abs(p.vsHyperscaler30d)}pp over 30d (${pctStr(p.avg30d)} vs ${pctStr(inputs.hyperscaler30d)}).`,
      evidence: `sector 30d ${pctStr(p.avg30d)} − hyperscaler 30d ${pctStr(inputs.hyperscaler30d)} = ${p.vsHyperscaler30d}pp`,
    });
  }

  // 6) Momentum — large 30d sector moves, framed by lifecycle stage.
  for (const p of sectors) {
    if (p.avg30d === null || Math.abs(p.avg30d) < T.momentum30d) continue;
    const up = p.avg30d > 0;
    const frame =
      up && (p.stage === "crowded" || p.stage === "popping")
        ? "extending a late-stage move — watch for exhaustion"
        : !up && p.stage === "reset"
          ? "still bleeding"
          : !up && (p.stage === "crowded" || p.stage === "popping")
            ? "rolling over from a hot stage"
            : up
              ? "inflecting up"
              : "cooling";
    insights.push({
      kind: "momentum",
      severity: "info",
      weight: 45 + Math.min(15, Math.abs(p.avg30d) / 2),
      sector: p.code,
      headline: `${p.name} ${pctStr(p.avg30d)} over 30d (${p.stage}) — ${frame}.`,
      evidence: `sector ${p.code} equal-weight 30d avg = ${p.avg30d}% (stage ${p.stage})`,
    });
  }

  // 7) Near-term dated catalysts. Horizon derives from passed-in dates only (stays pure).
  const horizon = addDaysStr(inputs.asOf ?? inputs.generatedAt.slice(0, 10), T.catalystWindowDays);
  for (const c of inputs.catalysts) {
    if (c.d > horizon) continue;
    insights.push({
      kind: "catalyst",
      severity: "info",
      weight: 30,
      symbol: c.symbol ?? undefined,
      headline: `${c.d} · ${c.kind}${c.symbol ? ` ${c.symbol}` : ""}: ${c.title}`,
      evidence: `catalyst dated ${c.d}`,
    });
  }

  // 8) Data health — stale prices or failed overnight jobs degrade trust; say so loudly.
  if (inputs.ageDays !== null && inputs.ageDays > T.staleDays) {
    insights.push({
      kind: "data",
      severity: "warn",
      weight: 85,
      headline: `Price data is ${inputs.ageDays} days stale — run the prices job before trusting moves.`,
      evidence: `latest close ${inputs.asOf}, ${inputs.ageDays}d old`,
    });
  }
  if (suspectData.length) {
    insights.push({
      kind: "data",
      severity: "warn",
      weight: 65,
      headline: `${suspectData.length} ticker(s) show implausible 60-day drawdowns — almost certainly splits or bad price ticks, not real moves. Refetch prices and verify before trusting affected sectors.`,
      evidence: `suspect: ${suspectData.slice(0, 6).join(", ")}`,
    });
  }
  if (inputs.jobIssues.length) {
    insights.push({
      kind: "data",
      severity: "info",
      weight: 25,
      headline: `${inputs.jobIssues.length} overnight job issue(s) — coverage may be partial.`,
      evidence: inputs.jobIssues.slice(0, 3).join("; "),
    });
  }

  // Rank: severity band, then weight. Keep all criticals; cap the rest.
  insights.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || b.weight - a.weight);
  const criticals = insights.filter((i) => i.severity === "critical");
  const ranked =
    insights.length <= T.maxInsights
      ? insights
      : [...criticals, ...insights.filter((i) => i.severity !== "critical")].slice(
          0,
          Math.max(T.maxInsights, criticals.length),
        );

  // Top movers across all sector members by |1d|.
  const topMovers = inputs.sectors
    .flatMap((s) => s.members.map((m) => ({ symbol: m.symbol, sector: s.code, pct1d: m.pct1d })))
    .filter((m): m is { symbol: string; sector: string; pct1d: number } => m.pct1d !== null)
    .sort((a, b) => Math.abs(b.pct1d) - Math.abs(a.pct1d))
    .slice(0, 12);

  const manual = (Object.entries(inputs.manualLatest) as [
    ManualSeriesName,
    { d: string; value: number },
  ][])
    .filter(([, v]) => v !== undefined)
    .map(([series, v]) => ({
      series,
      label: MANUAL_SERIES_META[series]?.label ?? series,
      value: v.value,
      d: v.d,
    }));

  const stale = inputs.ageDays !== null && inputs.ageDays > T.staleDays;
  const headline = composeHeadline(ranked, sectors, inputs, stale);

  return {
    asOf: inputs.asOf,
    ageDays: inputs.ageDays,
    generatedAt: inputs.generatedAt,
    headline,
    market: {
      hyperscaler1d: inputs.hyperscaler1d,
      hyperscaler30d: inputs.hyperscaler30d,
      credit30d: inputs.credit30d,
    },
    insights: ranked,
    sectors,
    topMovers,
    catalysts: inputs.catalysts.filter((c) => c.d <= horizon),
    manual,
    freshness: { stale, ageDays: inputs.ageDays, jobIssues: inputs.jobIssues },
    counts: {
      sectorsWithNews: sectors.filter((p) => p.newsCount > 0).length,
      insightsTotal: ranked.length,
      criticals: criticals.length,
    },
  };
}

/** One scannable line for the top of the dashboard, derived from the ranked set. */
function composeHeadline(
  ranked: Insight[],
  sectors: SectorPulse[],
  inputs: SynthesisInputs,
  stale: boolean,
): string {
  const criticals = ranked.filter((i) => i.severity === "critical");
  if (criticals.length) {
    return criticals.length === 1
      ? `Critical: ${criticals[0].headline}`
      : `${criticals.length} critical signals — ${criticals[0].headline}`;
  }
  if (stale) {
    return `Data is ${inputs.ageDays}d stale — run prices before reading the moves.`;
  }
  const topWarn = ranked.find((i) => i.severity === "warn");
  if (topWarn) return topWarn.headline;

  // Calm-market default: anchor on the hyperscaler basket + best/worst sector.
  const ranked30 = sectors
    .filter((p): p is SectorPulse & { avg30d: number } => p.avg30d !== null)
    .sort((a, b) => b.avg30d - a.avg30d);
  if (ranked30.length >= 2 && inputs.hyperscaler30d !== null) {
    const best = ranked30[0];
    const worst = ranked30[ranked30.length - 1];
    return `Quiet tape: hyperscalers ${pctStr(inputs.hyperscaler30d)} (30d); ${best.name} leads ${pctStr(best.avg30d)}, ${worst.name} lags ${pctStr(worst.avg30d)}.`;
  }
  return "No material signals — nothing requiring action this morning.";
}

// ── Prisma loader ───────────────────────────────────────────────────────────

const CREDIT = { a: "HYG", b: "IEF" };

/** Ratio (a/b) percent change over the window, computed like the credit_proxy rule. */
function ratioChange(
  closesA: CloseRow[],
  closesB: CloseRow[],
  lookbackDays: number,
): number | null {
  const byB = new Map(closesB.map((r) => [r.d, r.close]));
  const ratios: number[] = [];
  for (const r of closesA.slice(-lookbackDays)) {
    const b = byB.get(r.d);
    if (b) ratios.push(r.close / b);
  }
  if (ratios.length < 5) return null;
  return round2((ratios[ratios.length - 1] / ratios[0] - 1) * 100);
}

/** Load everything in a few queries, derive member metrics, and synthesize. */
export async function buildDigestData(): Promise<DigestData> {
  const today = todayStr();
  const hyperscalers = BENCHMARKS.map((b) => b.symbol).filter(
    (s) => s !== CREDIT.a && s !== CREDIT.b,
  );

  const [maxRow, sectorRows, links, tickers, ruleEvents, catalysts, manualRows, news, jobRuns] =
    await Promise.all([
      prisma.price.findFirst({ orderBy: { d: "desc" }, select: { d: true } }),
      prisma.sector.findMany({ orderBy: { code: "asc" } }),
      prisma.tickerSector.findMany({
        where: { ticker: { active: true } },
        select: { symbol: true, sectorCode: true },
      }),
      prisma.ticker.findMany({
        select: { symbol: true, yearChange: true, forwardPE: true },
      }),
      prisma.ruleEvent.findMany({
        where: { firedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
        orderBy: { firedAt: "desc" },
      }),
      prisma.catalyst.findMany({
        where: { d: { gte: today, lte: addDaysStr(today, 30) } },
        orderBy: { d: "asc" },
      }),
      prisma.manualSeries.findMany({ orderBy: { d: "desc" } }),
      prisma.newsItem.groupBy({
        by: ["sectorCode"],
        where: { sectorCode: { not: null } },
        _count: { _all: true },
      }),
      prisma.jobRun.findMany({
        where: { ok: false, startedAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
        orderBy: { startedAt: "desc" },
        take: 10,
      }),
    ]);

  const maxDate = maxRow?.d ?? null;
  const ageDays = maxDate ? daysBetween(maxDate, today) : null;

  // One bulk price query (50d window covers the 30d metric) grouped in memory.
  const closesBySymbol = new Map<string, CloseRow[]>();
  if (maxDate) {
    const rows = await prisma.price.findMany({
      where: { d: { gte: addDaysStr(maxDate, -50) } },
      orderBy: { d: "asc" },
      select: { symbol: true, d: true, close: true },
    });
    for (const row of rows) {
      let arr = closesBySymbol.get(row.symbol);
      if (!arr) closesBySymbol.set(row.symbol, (arr = []));
      arr.push({ d: row.d, close: row.close });
    }
    for (const [sym, arr] of closesBySymbol) closesBySymbol.set(sym, despike(arr));
  }
  const closesOf = (s: string) => closesBySymbol.get(s) ?? [];

  const membersBySector = new Map<string, string[]>();
  for (const l of links) {
    let arr = membersBySector.get(l.sectorCode);
    if (!arr) membersBySector.set(l.sectorCode, (arr = []));
    arr.push(l.symbol);
  }
  const tickerBySymbol = new Map(tickers.map((t) => [t.symbol, t]));

  const sectors: SectorInput[] = sectorRows.map((s) => ({
    code: s.code,
    name: s.name,
    stage: s.stage,
    driver: s.driver,
    members: (membersBySector.get(s.code) ?? []).map((sym) => {
      const closes = closesOf(sym);
      const t = tickerBySymbol.get(sym);
      return {
        symbol: sym,
        pct1d: pctChangeFromCloses(closes, 1),
        pct7d: pctChangeFromCloses(closes, 7),
        pct30d: pctChangeFromCloses(closes, 30),
        drawdown60: drawdownFromCloses(closes, 60),
        yearChange: t?.yearChange ?? null,
        forwardPE: t?.forwardPE ?? null,
      };
    }),
  }));

  const hyperscaler1d = meanOrNull(hyperscalers.map((s) => pctChangeFromCloses(closesOf(s), 1)));
  const hyperscaler30d = meanOrNull(hyperscalers.map((s) => pctChangeFromCloses(closesOf(s), 30)));
  const credit30d = ratioChange(closesOf(CREDIT.a), closesOf(CREDIT.b), 30);

  const manualLatest: SynthesisInputs["manualLatest"] = {};
  for (const row of manualRows) {
    if (!(row.series in manualLatest)) {
      (manualLatest as Record<string, { d: string; value: number }>)[row.series] = {
        d: row.d,
        value: row.value,
      };
    }
  }

  return synthesize({
    asOf: maxDate,
    ageDays,
    generatedAt: new Date().toISOString(),
    sectors,
    hyperscaler1d,
    hyperscaler30d,
    credit30d,
    firedRules: ruleEvents.map((e) => ({
      ruleId: e.ruleId,
      severity: e.severity as InsightSeverity,
      message: e.message,
      firedAt: e.firedAt.toISOString(),
    })),
    catalysts: catalysts
      .filter((c): c is typeof c & { d: string } => c.d !== null)
      .map((c) => ({ d: c.d, kind: c.kind, symbol: c.symbol, title: c.title })),
    manualLatest,
    newsCoverage: news.map((n) => ({ code: n.sectorCode as string, count: n._count._all })),
    jobIssues: jobRuns.map((j) => `${j.job}: ${(j.detail ?? "failed").slice(0, 80)}`),
  });
}
