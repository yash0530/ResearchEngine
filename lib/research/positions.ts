import { prisma } from "../prisma";
import { loadLatestDigest } from "../board";
import { getCloses, despike, drawdownFromCloses, pctChangeFromCloses } from "../metrics";
import type { Insight } from "./synthesize";

export type PositionItem = {
  symbol: string;
  name: string | null;
  sectors: { code: string; name: string; stage: string }[];
  pct30d: number | null;
  drawdown60: number | null;
  topSeverity: "critical" | "warn" | "info" | null;
  flaggedBy: string[];
};

export type PositionContext = {
  asOf: string | null;
  items: PositionItem[];
  flaggedCount: number;
};

const SEV_RANK = { critical: 3, warn: 2, info: 1 } as const;

/** PURE: which digest insights touch this position (by symbol or one of its sectors),
 *  and the most severe among them. */
export function matchInsightsToPosition(
  symbol: string,
  sectorCodes: string[],
  insights: Insight[],
): { topSeverity: "critical" | "warn" | "info" | null; flaggedBy: string[] } {
  const flags: string[] = [];
  let topSev: "critical" | "warn" | "info" | null = null;

  for (const insight of insights) {
    const matchSymbol = insight.symbol === symbol;
    const matchSector = insight.sector !== undefined && sectorCodes.includes(insight.sector);
    if (matchSymbol || matchSector) {
      flags.push(insight.headline);
      if (!topSev || SEV_RANK[insight.severity] > SEV_RANK[topSev]) {
        topSev = insight.severity;
      }
    }
  }

  return { topSeverity: topSev, flaggedBy: flags };
}

export async function loadPositionContext(): Promise<PositionContext | null> {
  const positions = await prisma.position.findMany();
  if (positions.length === 0) return null;

  const digest = await loadLatestDigest();
  const d = digest?.data;

  const tickers = await prisma.ticker.findMany({
    where: { symbol: { in: positions.map((p) => p.symbol) } },
    include: { sectorLinks: { include: { sector: true } } },
  });
  const tickerBySym = new Map(tickers.map((t) => [t.symbol, t]));
  const insights = d?.insights ?? [];

  let flaggedCount = 0;
  const items: PositionItem[] = [];

  for (const pos of positions) {
    const ticker = tickerBySym.get(pos.symbol);
    const name = ticker?.name ?? null;
    const sectors =
      ticker?.sectorLinks.map((l) => ({
        code: l.sectorCode,
        name: l.sector.name,
        stage: l.sector.stage,
      })) ?? [];

    // Despike to match the rest of the app — raw getCloses would re-introduce the
    // bad-tick drawdowns the analytics loaders already strip (e.g. the KLAC spike).
    const closes = despike(await getCloses(pos.symbol, 70));
    const pct30d = pctChangeFromCloses(closes, 30);
    const drawdown60 = drawdownFromCloses(closes, 60);

    const match = matchInsightsToPosition(
      pos.symbol,
      sectors.map((s) => s.code),
      insights,
    );
    if (match.topSeverity) flaggedCount++;

    items.push({
      symbol: pos.symbol,
      name,
      sectors,
      pct30d,
      drawdown60,
      topSeverity: match.topSeverity,
      flaggedBy: match.flaggedBy,
    });
  }

  // Flagged holdings first, then alphabetical.
  items.sort((a, b) => {
    const sevA = a.topSeverity ? 1 : 0;
    const sevB = b.topSeverity ? 1 : 0;
    if (sevA !== sevB) return sevB - sevA;
    return a.symbol.localeCompare(b.symbol);
  });

  return { asOf: d?.asOf ?? null, items, flaggedCount };
}
