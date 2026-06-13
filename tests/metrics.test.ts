import { describe, expect, it } from "vitest";
import {
  despike,
  drawdownFromCloses,
  meanOrNull,
  pctChangeFromCloses,
  type CloseRow,
} from "../lib/metrics";

const rows = (closes: number[]): CloseRow[] =>
  closes.map((close, i) => ({ d: `day-${String(i).padStart(3, "0")}`, close }));

describe("despike", () => {
  const closes = (xs: number[]) => despike(rows(xs)).map((r) => r.close);

  it("leaves short series (<5) untouched", () => {
    expect(closes([100, 9999, 100])).toEqual([100, 9999, 100]);
  });

  it("removes a single revert spike", () => {
    expect(closes([100, 101, 99, 5000, 100, 102, 98])).toEqual([100, 101, 99, 100, 102, 98]);
  });

  it("removes a multi-day spike block (the KLAC pattern)", () => {
    const out = closes([210, 212, 208, 1900, 2100, 2150, 213, 211, 209, 214]);
    expect(out).toEqual([210, 212, 208, 213, 211, 209, 214]);
  });

  it("keeps a legitimate sustained trend — no false drops", () => {
    const trend = Array.from({ length: 12 }, (_, i) => 100 * 1.1 ** i);
    expect(despike(rows(trend))).toHaveLength(12);
  });

  it("keeps a normal earnings gap under the ratio", () => {
    expect(closes([100, 100, 100, 130, 132, 131, 133])).toEqual([100, 100, 100, 130, 132, 131, 133]);
  });
});

describe("pctChangeFromCloses", () => {
  it("computes last vs N rows back", () => {
    expect(pctChangeFromCloses(rows([100, 110]), 1)).toBe(10);
    expect(pctChangeFromCloses(rows([100, 50, 200]), 2)).toBe(100);
  });

  it("falls back to the earliest row when history is short", () => {
    expect(pctChangeFromCloses(rows([100, 105, 121]), 30)).toBe(21);
  });

  it("returns null with fewer than 2 rows", () => {
    expect(pctChangeFromCloses(rows([100]), 1)).toBeNull();
    expect(pctChangeFromCloses([], 7)).toBeNull();
  });

  it("returns null on a zero base", () => {
    expect(pctChangeFromCloses(rows([0, 10]), 1)).toBeNull();
  });

  it("only looks at the last days+1 rows", () => {
    // 10 → … the last 2 rows are 50, 55: +10%
    expect(pctChangeFromCloses(rows([10, 20, 50, 55]), 1)).toBe(10);
  });
});

describe("drawdownFromCloses", () => {
  it("measures from the window high", () => {
    expect(drawdownFromCloses(rows([100, 120, 90]), 60)).toBe(-25);
  });

  it("is 0 at a fresh high, never positive", () => {
    expect(drawdownFromCloses(rows([100, 120]), 60)).toBe(0);
  });

  it("respects the lookback window", () => {
    // high of 200 is outside lookback=2; window is [100, 90]
    expect(drawdownFromCloses(rows([200, 100, 90]), 2)).toBe(-10);
  });

  it("returns null on empty input", () => {
    expect(drawdownFromCloses([], 60)).toBeNull();
  });
});

describe("meanOrNull", () => {
  it("skips nulls", () => {
    expect(meanOrNull([1, null, 3])).toBe(2);
  });
  it("null when nothing usable", () => {
    expect(meanOrNull([null, null])).toBeNull();
    expect(meanOrNull([])).toBeNull();
  });
});
