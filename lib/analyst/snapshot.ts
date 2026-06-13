// The snapshot is the ONLY thing the model ever sees. Target 3–6k tokens:
// lists are capped, floats rounded — never summarized by another model call.

import { prisma } from "../prisma";
import { meanOrNull, pctChangeFromCloses, type CloseRow } from "../metrics";
import { addDaysStr, todayStr } from "../dates";
import type { Snapshot } from "./schemas";

const TOP_MOVERS = 15;
const HEADLINES_PER_SECTOR = 3;
const CATALYST_WINDOW_DAYS = 14;

export type SnapshotInputs = {
  maxDate: string | null;
  sectors: {
    code: string;
    name: string;
    stage: string;
    driver: number;
    members: string[];
  }[];
  closesBySymbol: Map<string, CloseRow[]>;
  firedRules: { rule_id: string; severity: string; message: string; fired_at: string }[];
  headlinesBySector: Map<string, { title: string; source: string | null }[]>;
  catalysts: { d: string; kind: string; symbol: string | null; title: string }[];
  manualLatest: Record<string, { d: string; value: number }>;
};

/** Pure assembly — unit-testable with fixture inputs. */
export function assembleSnapshot(inputs: SnapshotInputs): Snapshot {
  const pct = (symbol: string, days: number) =>
    pctChangeFromCloses(inputs.closesBySymbol.get(symbol) ?? [], days);

  const sectors = inputs.sectors.map((s) => ({
    code: s.code,
    name: s.name,
    stage: s.stage,
    driver: s.driver,
    avg_1d: meanOrNull(s.members.map((m) => pct(m, 1))),
    avg_7d: meanOrNull(s.members.map((m) => pct(m, 7))),
    avg_30d: meanOrNull(s.members.map((m) => pct(m, 30))),
  }));

  const primarySector = new Map<string, string>();
  for (const s of inputs.sectors) {
    for (const m of s.members) {
      if (!primarySector.has(m)) primarySector.set(m, s.code);
    }
  }

  const top_movers = [...primarySector.keys()]
    .map((symbol) => ({ symbol, sector: primarySector.get(symbol)!, pct_1d: pct(symbol, 1) }))
    .filter((m): m is { symbol: string; sector: string; pct_1d: number } => m.pct_1d !== null)
    .sort((a, b) => Math.abs(b.pct_1d) - Math.abs(a.pct_1d))
    .slice(0, TOP_MOVERS);

  const headlines: Record<string, string[]> = {};
  for (const [code, items] of inputs.headlinesBySector) {
    if (items.length === 0) continue;
    headlines[code] = items
      .slice(0, HEADLINES_PER_SECTOR)
      .map((h) => (h.source ? `${h.title} — ${h.source}` : h.title));
  }

  return {
    date: inputs.maxDate,
    sectors,
    top_movers,
    fired_rules_7d: inputs.firedRules,
    headlines,
    catalysts_next_14d: inputs.catalysts,
    manual_series_latest: inputs.manualLatest,
  };
}

/** Load everything in a handful of queries, then assemble. */
export async function buildSnapshot(): Promise<Snapshot> {
  const today = todayStr();

  const [maxPriceRow, sectorRows, links, ruleEvents, news, catalysts, manualRows] =
    await Promise.all([
      prisma.price.findFirst({ orderBy: { d: "desc" }, select: { d: true } }),
      prisma.sector.findMany({ orderBy: { code: "asc" } }),
      prisma.tickerSector.findMany({
        where: { ticker: { active: true } },
        select: { symbol: true, sectorCode: true },
      }),
      prisma.ruleEvent.findMany({
        where: { firedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
        orderBy: { firedAt: "desc" },
      }),
      prisma.newsItem.findMany({
        orderBy: [{ publishedAt: "desc" }, { fetchedAt: "desc" }],
        take: 400,
      }),
      prisma.catalyst.findMany({
        where: { d: { gte: today, lte: addDaysStr(today, CATALYST_WINDOW_DAYS) } },
        orderBy: { d: "asc" },
      }),
      prisma.manualSeries.findMany({ orderBy: { d: "desc" } }),
    ]);

  const maxDate = maxPriceRow?.d ?? null;

  // One bulk price query covering the 30d metric window, grouped in memory.
  const closesBySymbol = new Map<string, CloseRow[]>();
  if (maxDate) {
    const priceRows = await prisma.price.findMany({
      where: { d: { gte: addDaysStr(maxDate, -50) } },
      orderBy: { d: "asc" },
      select: { symbol: true, d: true, close: true },
    });
    for (const row of priceRows) {
      let arr = closesBySymbol.get(row.symbol);
      if (!arr) closesBySymbol.set(row.symbol, (arr = []));
      arr.push({ d: row.d, close: row.close });
    }
  }

  const membersBySector = new Map<string, string[]>();
  for (const link of links) {
    let arr = membersBySector.get(link.sectorCode);
    if (!arr) membersBySector.set(link.sectorCode, (arr = []));
    arr.push(link.symbol);
  }

  const headlinesBySector = new Map<string, { title: string; source: string | null }[]>();
  for (const item of news) {
    if (!item.sectorCode) continue;
    let arr = headlinesBySector.get(item.sectorCode);
    if (!arr) headlinesBySector.set(item.sectorCode, (arr = []));
    if (arr.length < HEADLINES_PER_SECTOR) arr.push({ title: item.title, source: item.source });
  }

  const manualLatest: Record<string, { d: string; value: number }> = {};
  for (const row of manualRows) {
    if (!(row.series in manualLatest)) manualLatest[row.series] = { d: row.d, value: row.value };
  }

  return assembleSnapshot({
    maxDate,
    sectors: sectorRows.map((s) => ({
      code: s.code,
      name: s.name,
      stage: s.stage,
      driver: s.driver,
      members: membersBySector.get(s.code) ?? [],
    })),
    closesBySymbol,
    firedRules: ruleEvents.map((e) => ({
      rule_id: e.ruleId,
      severity: e.severity,
      message: e.message,
      fired_at: e.firedAt.toISOString(),
    })),
    headlinesBySector,
    catalysts: catalysts
      .filter((c): c is typeof c & { d: string } => c.d !== null)
      .map((c) => ({ d: c.d, kind: c.kind, symbol: c.symbol, title: c.title })),
    manualLatest,
  });
}
