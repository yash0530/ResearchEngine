import { describe, expect, it } from "vitest";
import {
  drawdownFromCloses,
  meanOrNull,
  pctChangeFromCloses,
  type CloseRow,
} from "../lib/metrics";

const rows = (closes: number[]): CloseRow[] =>
  closes.map((close, i) => ({ d: `day-${String(i).padStart(3, "0")}`, close }));

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
