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
