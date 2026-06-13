// Derived price metrics — always computed from stored closes, never persisted.
// Pure core works on row arrays (unit-testable); thin Prisma wrappers below.

import { prisma } from "./prisma";

export type CloseRow = { d: string; close: number };

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Percent change of the last close vs the close `days` trading rows earlier.
 * Mirrors the reference semantics: with a short history the base falls back to
 * the earliest available row; fewer than 2 rows → null.
 */
export function pctChangeFromCloses(rows: CloseRow[], days: number): number | null {
  const window = rows.slice(-(days + 1));
  if (window.length < 2) return null;
  const base = window[0].close;
  const last = window[window.length - 1].close;
  return base ? round2((last / base - 1) * 100) : null;
}

/** Percent off the max close of the last `lookback` rows. Always ≤ 0. */
export function drawdownFromCloses(rows: CloseRow[], lookback: number): number | null {
  const window = rows.slice(-lookback);
  if (window.length === 0) return null;
  const hi = Math.max(...window.map((r) => r.close));
  const last = window[window.length - 1].close;
  return hi ? round2((last / hi - 1) * 100) : null;
}

/** Mean of the non-null values; null when nothing usable. */
export function meanOrNull(values: (number | null)[]): number | null {
  const usable = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (usable.length === 0) return null;
  return round2(usable.reduce((a, b) => a + b, 0) / usable.length);
}

/**
 * Drop bad price ticks / unadjusted split points before deriving metrics: any close that
 * sits ≥`ratio`× away from the median of its local window. Uses a median (not neighbors) so
 * it survives multi-day spike *blocks* (e.g. a close stuck at 10× for three days then snapping
 * back). Conservative: ratio 2.5 ≈ a 150%+ move that reverts — a tick, never a real close for
 * a liquid name, so legitimate trends and earnings gaps are kept. Pure + non-destructive;
 * input must be ascending by date. This cleans COMPUTED metrics without mutating the price DB.
 */
export function despike(rows: CloseRow[], window = 10, ratio = 2.5): CloseRow[] {
  if (rows.length < 5) return rows;
  return rows.filter((row, i) => {
    const lo = Math.max(0, i - window);
    const hi = Math.min(rows.length, i + window + 1);
    const neighbors: number[] = [];
    for (let j = lo; j < hi; j++) if (j !== i) neighbors.push(rows[j].close);
    neighbors.sort((a, b) => a - b);
    const med = neighbors[Math.floor(neighbors.length / 2)];
    if (!med || med <= 0 || row.close <= 0) return true;
    const r = row.close / med;
    return r < ratio && r > 1 / ratio;
  });
}

// ── Prisma-bound wrappers ────────────────────────────────────────────────────

/** Last `limit` closes for a symbol, ascending by date. */
export async function getCloses(symbol: string, limit = 70): Promise<CloseRow[]> {
  const rows = await prisma.price.findMany({
    where: { symbol },
    orderBy: { d: "desc" },
    take: limit,
    select: { d: true, close: true },
  });
  return rows.reverse();
}

export async function pctChange(symbol: string, days: number): Promise<number | null> {
  return pctChangeFromCloses(await getCloses(symbol, days + 1), days);
}

export async function drawdownFromHigh(symbol: string, lookback = 60): Promise<number | null> {
  return drawdownFromCloses(await getCloses(symbol, lookback), lookback);
}
