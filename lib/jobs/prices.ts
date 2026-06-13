// Daily close ingestion. Re-fetches a small healing window every run so missed
// days (machine asleep, Yahoo hiccup) self-repair; --backfill=N widens the window.

import { prisma } from "../prisma";
import { settings } from "../../config/settings";
import { fetchDailyBars, mapPool } from "../yahoo";
import { runBackup } from "./backup";

export async function runPrices(opts: { backfillDays?: number } = {}): Promise<string> {
  const sinceDays = opts.backfillDays ?? settings.prices.healWindowDays + 3;
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
    const { bars, name } = await fetchDailyBars(overrides.get(t.symbol) ?? t.symbol, sinceDays);
    if (bars.length === 0) {
      empty.push(t.symbol);
      return;
    }
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
      if (name && !t.name) {
        await prisma.ticker.update({ where: { symbol: t.symbol }, data: { name } });
      }
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
