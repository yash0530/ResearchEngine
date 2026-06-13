// Thin wrapper around yahoo-finance2 v3. chart() is the supported daily-bars API
// (historical() is deprecated — the suppressed ripHistorical notice). chart() is
// single-symbol, so callers batch through mapPool.

import YahooFinance from "yahoo-finance2";
import { barDateStr } from "./dates";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

export type DailyBar = { d: string; close: number; volume: number | null };

/**
 * Daily bars for the last `sinceDaysAgo` calendar days. Returns empty bars on
 * ANY failure (delisted symbol, schema drift, network) — callers count, never crash.
 */
export async function fetchDailyBars(
  symbol: string,
  sinceDaysAgo: number,
): Promise<{ bars: DailyBar[]; name: string | null }> {
  try {
    const period1 = new Date(Date.now() - sinceDaysAgo * 86_400_000);
    const result = await yahooFinance.chart(symbol, { period1, interval: "1d" });
    const meta = result.meta as { longName?: string; shortName?: string };
    const name = meta.longName ?? meta.shortName ?? null;
    const bars: DailyBar[] = [];
    for (const q of result.quotes ?? []) {
      if (!q.date || q.close == null || !Number.isFinite(q.close)) continue;
      bars.push({
        d: barDateStr(q.date),
        close: q.close,
        volume: q.volume != null && Number.isFinite(q.volume) ? q.volume : null,
      });
    }
    return { bars, name };
  } catch {
    return { bars: [], name: null };
  }
}

/** Upcoming earnings dates (YYYY-MM-DD). Empty on any failure — many symbols have none. */
export async function fetchEarningsDates(symbol: string): Promise<string[]> {
  try {
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: ["calendarEvents"],
    });
    const dates = result.calendarEvents?.earnings?.earningsDate ?? [];
    return dates
      .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
      .map((d) => barDateStr(d));
  } catch {
    return [];
  }
}

/** Run `fn` over items with bounded concurrency and a stagger between starts. */
export async function mapPool<T>(
  items: T[],
  size: number,
  staggerMs: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      await fn(item);
      if (staggerMs > 0) await new Promise((r) => setTimeout(r, staggerMs));
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, size) }, worker));
}
