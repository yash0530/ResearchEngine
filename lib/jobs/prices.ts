// Daily close ingestion. Re-fetches a small healing window every run so missed
// days (machine asleep, Yahoo hiccup) self-repair; --backfill=N widens the window.

import { prisma } from "../prisma";
import { settings } from "../../config/settings";
import { fetchDailyBars, fetchTickerStats, mapPool } from "../yahoo";
import { runBackup } from "./backup";
import { daysBetween, todayStr } from "../dates";

export async function runPrices(opts: { backfillDays?: number } = {}): Promise<string> {
  // Heal whatever gap exists: widen the window to reach the latest stored close so
  // any length of downtime self-repairs on the next run. --backfill=N overrides.
  let sinceDays = opts.backfillDays;
  if (sinceDays == null) {
    const base = settings.prices.healWindowDays + 3;
    const latest = await prisma.price.findFirst({ orderBy: { d: "desc" }, select: { d: true } });
    const gap = latest ? daysBetween(latest.d, todayStr()) + 3 : base;
    sinceDays = Math.min(365, Math.max(base, gap));
  }
  const tickers = await prisma.ticker.findMany({
    where: { active: true },
    orderBy: { symbol: "asc" },
  });
  const overrides = new Map(
    (await prisma.symbolOverride.findMany()).map((o) => [o.symbol, o.yfSymbol]),
  );

  let updated = 0;
  let rows = 0;
  const empty: string[] = [];

  await mapPool(tickers, settings.prices.concurrency, settings.prices.staggerMs, async (t) => {
    const yfSymbol = overrides.get(t.symbol) ?? t.symbol;
    const { bars, name } = await fetchDailyBars(yfSymbol, sinceDays);
    if (bars.length === 0) {
      empty.push(t.symbol);
      return;
    }
    const stats = await fetchTickerStats(yfSymbol);
    try {
      await prisma.$transaction(
        bars.map((b) =>
          prisma.price.upsert({
            where: { symbol_d: { symbol: t.symbol, d: b.d } },
            update: { close: b.close, volume: b.volume },
            create: { symbol: t.symbol, d: b.d, close: b.close, volume: b.volume },
          }),
        ),
      );

      const dataToUpdate: any = {
        name: name || undefined,
        statsUpdatedAt: stats ? new Date() : undefined,
      };
      if (stats) {
        dataToUpdate.marketCap = stats.marketCap;
        dataToUpdate.forwardPE = stats.forwardPE;
        dataToUpdate.trailingPE = stats.trailingPE;
        dataToUpdate.profitMargin = stats.profitMargin;
        dataToUpdate.revenueGrowth = stats.revenueGrowth;
        dataToUpdate.fiftyTwoWeekHigh = stats.fiftyTwoWeekHigh;
        dataToUpdate.fiftyTwoWeekLow = stats.fiftyTwoWeekLow;
        dataToUpdate.beta = stats.beta;
        dataToUpdate.eps = stats.eps;
        dataToUpdate.dividendYield = stats.dividendYield;
        dataToUpdate.yearChange = stats.yearChange;
      }

      await prisma.ticker.update({
        where: { symbol: t.symbol },
        data: dataToUpdate,
      });

      updated += 1;
      rows += bars.length;
    } catch {
      empty.push(t.symbol);
    }
  });

  let backupDetail = "skipped";
  try {
    backupDetail = await runBackup();
  } catch (error) {
    backupDetail = `failed: ${error instanceof Error ? error.message : error}`;
  }

  const emptyNote = empty.length
    ? `, empty: ${empty.slice(0, 10).join(",")}${empty.length > 10 ? "…" : ""}`
    : "";
  return `updated ${updated}/${tickers.length} symbols, ${rows} rows${emptyNote}; backup: ${backupDetail}`;
}
