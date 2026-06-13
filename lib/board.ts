// Server-side page data loaders. One bulk price query per page, grouped in
// memory — metrics always derive from stored closes (lib/metrics).

import { prisma } from "./prisma";
import {
  drawdownFromCloses,
  meanOrNull,
  pctChangeFromCloses,
  round2,
  type CloseRow,
} from "./metrics";
import { addDaysStr, daysBetween, todayStr } from "./dates";

export type SymbolMetrics = {
  symbol: string;
  name: string | null;
  lastClose: number | null;
  lastDate: string | null;
  pct1d: number | null;
  pct7d: number | null;
  pct30d: number | null;
  drawdown60: number | null;
};

async function bulkCloses(sinceDays: number): Promise<{
  maxDate: string | null;
  bySymbol: Map<string, CloseRow[]>;
}> {
  const maxRow = await prisma.price.findFirst({
    orderBy: { d: "desc" },
    select: { d: true },
  });
  if (!maxRow) return { maxDate: null, bySymbol: new Map() };
  const rows = await prisma.price.findMany({
    where: { d: { gte: addDaysStr(maxRow.d, -sinceDays) } },
    orderBy: { d: "asc" },
    select: { symbol: true, d: true, close: true },
  });
  const bySymbol = new Map<string, CloseRow[]>();
  for (const row of rows) {
    let arr = bySymbol.get(row.symbol);
    if (!arr) bySymbol.set(row.symbol, (arr = []));
    arr.push({ d: row.d, close: row.close });
  }
  return { maxDate: maxRow.d, bySymbol };
}

function symbolMetrics(
  symbol: string,
  name: string | null,
  closes: CloseRow[] | undefined,
): SymbolMetrics {
  const rows = closes ?? [];
  const last = rows.length ? rows[rows.length - 1] : null;
  return {
    symbol,
    name,
    lastClose: last ? round2(last.close) : null,
    lastDate: last?.d ?? null,
    pct1d: pctChangeFromCloses(rows, 1),
    pct7d: pctChangeFromCloses(rows, 7),
    pct30d: pctChangeFromCloses(rows, 30),
    drawdown60: drawdownFromCloses(rows, 60),
  };
}

/** Sector index sparkline: equal-weight average of member closes, rebased to 100. */
function sectorSpark(members: string[], bySymbol: Map<string, CloseRow[]>, points = 30): number[] {
  const dates = new Set<string>();
  for (const m of members) for (const row of bySymbol.get(m) ?? []) dates.add(row.d);
  const sorted = [...dates].sort().slice(-points);
  if (sorted.length < 2) return [];

  const baseBySymbol = new Map<string, number>();
  const closeMap = new Map<string, Map<string, number>>();
  for (const m of members) {
    const rows = (bySymbol.get(m) ?? []).filter((r) => r.d >= sorted[0]);
    if (rows.length === 0) continue;
    baseBySymbol.set(m, rows[0].close);
    closeMap.set(m, new Map(rows.map((r) => [r.d, r.close])));
  }

  const spark: number[] = [];
  for (const d of sorted) {
    const values: number[] = [];
    for (const [m, base] of baseBySymbol) {
      const close = closeMap.get(m)?.get(d);
      if (close != null && base) values.push((close / base) * 100);
    }
    if (values.length) spark.push(round2(values.reduce((a, b) => a + b, 0) / values.length));
  }
  return spark;
}

// ── Board ────────────────────────────────────────────────────────────────────

export type BoardSector = {
  code: string;
  name: string;
  stage: string;
  driver: number;
  note: string | null;
  memberCount: number;
  avg1d: number | null;
  avg7d: number | null;
  avg30d: number | null;
  spark: number[];
};

export async function loadBoardPage() {
  const [{ maxDate, bySymbol }, sectors, links, tickers, unacked, latestBrief, catalysts] =
    await Promise.all([
      bulkCloses(50),
      prisma.sector.findMany({ orderBy: { code: "asc" } }),
      prisma.tickerSector.findMany({
        where: { ticker: { active: true } },
        select: { symbol: true, sectorCode: true },
      }),
      prisma.ticker.findMany({ select: { symbol: true, name: true } }),
      prisma.ruleEvent.findMany({
        where: { acked: false },
        orderBy: { firedAt: "desc" },
        take: 6,
      }),
      prisma.brief.findFirst({
        where: { kind: "nightly", ok: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.catalyst.findMany({
        where: { d: { gte: todayStr(), lte: addDaysStr(todayStr(), 14) } },
        orderBy: { d: "asc" },
        take: 6,
      }),
    ]);

  const nameBySymbol = new Map(tickers.map((t) => [t.symbol, t.name]));
  const membersBySector = new Map<string, string[]>();
  for (const link of links) {
    let arr = membersBySector.get(link.sectorCode);
    if (!arr) membersBySector.set(link.sectorCode, (arr = []));
    arr.push(link.symbol);
  }

  const boardSectors: BoardSector[] = sectors.map((s) => {
    const members = membersBySector.get(s.code) ?? [];
    const pcts = (days: number) =>
      members.map((m) => pctChangeFromCloses(bySymbol.get(m) ?? [], days));
    return {
      code: s.code,
      name: s.name,
      stage: s.stage,
      driver: s.driver,
      note: s.note,
      memberCount: members.length,
      avg1d: meanOrNull(pcts(1)),
      avg7d: meanOrNull(pcts(7)),
      avg30d: meanOrNull(pcts(30)),
      spark: sectorSpark(members, bySymbol),
    };
  });

  // Top movers across sector members (benchmarks excluded), primary-sector attribution.
  const primarySector = new Map<string, string>();
  for (const s of sectors) {
    for (const m of membersBySector.get(s.code) ?? []) {
      if (!primarySector.has(m)) primarySector.set(m, s.code);
    }
  }
  const topMovers = [...primarySector.entries()]
    .map(([symbol, sector]) => ({
      symbol,
      sector,
      name: nameBySymbol.get(symbol) ?? null,
      pct1d: pctChangeFromCloses(bySymbol.get(symbol) ?? [], 1),
    }))
    .filter((m): m is typeof m & { pct1d: number } => m.pct1d !== null)
    .sort((a, b) => Math.abs(b.pct1d) - Math.abs(a.pct1d))
    .slice(0, 15);

  const briefExcerpt = latestBrief ? parseBriefMd(latestBrief.outputJson) : null;

  return {
    asOf: maxDate,
    ageDays: maxDate ? daysBetween(maxDate, todayStr()) : null,
    sectors: boardSectors,
    topMovers,
    unacked,
    latestBrief: latestBrief
      ? { id: latestBrief.id, createdAt: latestBrief.createdAt, briefMd: briefExcerpt }
      : null,
    catalysts,
  };
}

function parseBriefMd(outputJson: string): string | null {
  try {
    const parsed = JSON.parse(outputJson) as { brief_md?: string };
    return parsed.brief_md ?? null;
  } catch {
    return null;
  }
}

// ── Sector detail ────────────────────────────────────────────────────────────

export async function loadSectorDetail(code: string) {
  const sector = await prisma.sector.findUnique({
    where: { code },
    include: {
      tickerLinks: { include: { ticker: true } },
      stageHistory: { orderBy: { ratedAt: "desc" }, take: 10 },
    },
  });
  if (!sector) return null;

  const members = sector.tickerLinks
    .filter((l) => l.ticker.active)
    .map((l) => l.ticker);
  const symbols = members.map((m) => m.symbol);

  const [{ bySymbol }, news, catalysts] = await Promise.all([
    bulkCloses(70),
    prisma.newsItem.findMany({
      where: { sectorCode: code },
      orderBy: [{ publishedAt: "desc" }, { fetchedAt: "desc" }],
      take: 12,
    }),
    prisma.catalyst.findMany({
      where: {
        d: { gte: todayStr(), lte: addDaysStr(todayStr(), 60) },
        OR: [{ sectorCode: code }, { symbol: { in: symbols } }],
      },
      orderBy: { d: "asc" },
      take: 12,
    }),
  ]);

  const rows = members
    .map((m) => symbolMetrics(m.symbol, m.name, bySymbol.get(m.symbol)))
    .sort((a, b) => (b.pct1d ?? -999) - (a.pct1d ?? -999));

  return {
    sector,
    members: rows,
    news,
    catalysts,
    spark: sectorSpark(symbols, bySymbol),
  };
}

// ── Ticker detail ────────────────────────────────────────────────────────────

export async function loadTickerDetail(symbol: string) {
  const ticker = await prisma.ticker.findUnique({
    where: { symbol },
    include: { sectorLinks: { include: { sector: true } } },
  });
  if (!ticker) return null;

  const [prices, position, journal, catalysts] = await Promise.all([
    prisma.price.findMany({
      where: { symbol },
      orderBy: { d: "desc" },
      take: 260,
    }),
    prisma.position.findUnique({ where: { symbol } }),
    prisma.journalEntry.findMany({
      where: { symbol },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.catalyst.findMany({
      where: { symbol, d: { gte: todayStr() } },
      orderBy: { d: "asc" },
      take: 6,
    }),
  ]);

  const closes: CloseRow[] = prices
    .slice()
    .reverse()
    .map((p) => ({ d: p.d, close: p.close }));
  const last = prices[0] ?? null;

  const sectorCodes = ticker.sectorLinks.map((l) => l.sectorCode);
  const news = sectorCodes.length
    ? await prisma.newsItem.findMany({
        where: { sectorCode: { in: sectorCodes } },
        orderBy: [{ publishedAt: "desc" }, { fetchedAt: "desc" }],
        take: 8,
      })
    : [];

  return {
    ticker,
    closes,
    lastVolume: last?.volume ?? null,
    metrics: symbolMetrics(ticker.symbol, ticker.name, closes),
    position,
    journal,
    catalysts,
    news,
  };
}

// ── Universe list ────────────────────────────────────────────────────────────

export async function loadTickersList() {
  const [{ bySymbol }, tickers] = await Promise.all([
    bulkCloses(35),
    prisma.ticker.findMany({
      include: { sectorLinks: true },
      orderBy: { symbol: "asc" },
    }),
  ]);
  return tickers.map((t) => ({
    symbol: t.symbol,
    name: t.name,
    class: t.class,
    active: t.active,
    sectors: t.sectorLinks.map((l) => l.sectorCode).sort(),
    pct1d: pctChangeFromCloses(bySymbol.get(t.symbol) ?? [], 1),
    pct30d: pctChangeFromCloses(bySymbol.get(t.symbol) ?? [], 30),
    lastClose: (() => {
      const rows = bySymbol.get(t.symbol);
      return rows?.length ? round2(rows[rows.length - 1].close) : null;
    })(),
  }));
}
