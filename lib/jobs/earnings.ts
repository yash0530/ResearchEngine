// Weekly earnings-calendar sweep. Future dates become catalysts; symbols without
// data (foreign listings, ETFs) skip silently.

import { TickerClass } from "@prisma/client";
import { prisma } from "../prisma";
import { settings } from "../../config/settings";
import { fetchEarningsDates } from "../yahoo";
import { todayStr } from "../dates";

export async function runEarnings(): Promise<string> {
  // Benchmarks stay in: hyperscaler earnings are exactly the capex-watch events.
  const tickers = await prisma.ticker.findMany({
    where: { active: true, class: { not: TickerClass.etf } },
    orderBy: { symbol: "asc" },
    select: { symbol: true },
  });
  const today = todayStr();
  let added = 0;
  let covered = 0;

  for (const { symbol } of tickers) {
    const dates = (await fetchEarningsDates(symbol)).filter((d) => d >= today);
    if (dates.length > 0) covered += 1;
    for (const d of dates) {
      const title = `${symbol} earnings`;
      const existing = await prisma.catalyst.findFirst({
        where: { d, kind: "earnings", symbol, title },
      });
      if (!existing) {
        await prisma.catalyst.create({ data: { d, kind: "earnings", symbol, title } });
        added += 1;
      }
    }
    await new Promise((r) => setTimeout(r, settings.earnings.throttleMs));
  }

  return `added ${added} earnings dates (${covered}/${tickers.length} symbols had upcoming dates)`;
}
