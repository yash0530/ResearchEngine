// Weekly earnings-calendar sweep. Future dates become catalysts; symbols without
// data (foreign listings, ETFs) skip silently.

import { TickerClass } from "@prisma/client";
import { prisma } from "../prisma";
import { settings } from "../../config/settings";
import { fetchEarningsDates, mapPool } from "../yahoo";
import { todayStr } from "../dates";

export async function runEarnings(): Promise<string> {
  // Benchmarks stay in: hyperscaler earnings are exactly the capex-watch events.
  const tickers = await prisma.ticker.findMany({
    where: { active: true, class: { not: TickerClass.etf } },
    orderBy: { symbol: "asc" },
    select: { symbol: true },
  });
  const overrides = new Map(
    (await prisma.symbolOverride.findMany()).map((o) => [o.symbol, o.yfSymbol]),
  );

  const today = todayStr();
  let added = 0;
  let covered = 0;

  // Bounded concurrency + small stagger (see settings.earnings) to avoid bursts.
  await mapPool(tickers, settings.earnings.concurrency, settings.earnings.staggerMs, async ({ symbol }) => {
    const yfSymbol = overrides.get(symbol) ?? symbol;
    const dates = (await fetchEarningsDates(yfSymbol)).filter((d) => d >= today);
    if (dates.length > 0) {
      covered += 1;
    }
    for (const d of dates) {
      const title = `${symbol} earnings`;
      const existing = await prisma.catalyst.findFirst({
        where: { d, kind: "earnings", symbol, title },
      });
      if (!existing) {
        try {
          await prisma.catalyst.create({ data: { d, kind: "earnings", symbol, title } });
          added += 1;
        } catch {
          // If we race or hit a unique constraint, ignore and continue
        }
      }
    }
  });

  return `added ${added} earnings dates (${covered}/${tickers.length} symbols had upcoming dates)`;
}
