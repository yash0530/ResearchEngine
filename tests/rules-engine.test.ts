import { describe, expect, it } from "vitest";
import { evaluateRule, interpolate, underCooloff } from "../lib/rules/engine";
import type {
  CompoundRule,
  ConsecutiveMonthlyRule,
  DrawdownRule,
  FlagEqualsRule,
  RatioChangeRule,
  RuleContext,
} from "../lib/rules/types";

const rows = (closes: number[]) =>
  closes.map((close, i) => ({ d: `day-${String(i).padStart(3, "0")}`, close }));

function ctx(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    today: "2026-06-12",
    getCloses: async () => [],
    getSeriesLast: async () => [],
    seriesValueWithin: async () => false,
    ...overrides,
  };
}

const drawdownRule: DrawdownRule = {
  id: "dd",
  type: "drawdown",
  symbol: "MU",
  lookbackDays: 60,
  pct: -20,
  severity: "warn",
  cooloffDays: 7,
  message: "MU is {value}% off its 60d high",
};

describe("drawdown", () => {
  it("fires at exactly the threshold", async () => {
    const fired = await evaluateRule(
      drawdownRule,
      ctx({ getCloses: async () => rows([100, 80]) }),
      new Set(),
    );
    expect(fired).not.toBeNull();
    expect(fired!.value).toBe(-20);
    expect(fired!.message).toBe("MU is -20% off its 60d high");
  });

  it("does not fire above the threshold", async () => {
    const fired = await evaluateRule(
      drawdownRule,
      ctx({ getCloses: async () => rows([100, 81]) }),
      new Set(),
    );
    expect(fired).toBeNull();
  });

  it("skips silently with no data", async () => {
    expect(await evaluateRule(drawdownRule, ctx(), new Set())).toBeNull();
  });
});

const ddr5Rule: ConsecutiveMonthlyRule = {
  id: "ddr5",
  type: "consecutive_monthly",
  series: "ddr5_contract_mom",
  n: 2,
  direction: "down",
  severity: "warn",
  cooloffDays: 25,
  message: "down 2 months: {value}",
};

describe("consecutive_monthly", () => {
  it("fires when all n readings are negative", async () => {
    const fired = await evaluateRule(
      ddr5Rule,
      ctx({
        getSeriesLast: async () => [
          { d: "2026-06-01", value: -1.5 },
          { d: "2026-05-01", value: -2 },
        ],
      }),
      new Set(),
    );
    expect(fired).not.toBeNull();
    expect(fired!.message).toBe("down 2 months: -1.5, -2");
  });

  it("does not fire on a mixed sign", async () => {
    const fired = await evaluateRule(
      ddr5Rule,
      ctx({
        getSeriesLast: async () => [
          { d: "2026-06-01", value: -1 },
          { d: "2026-05-01", value: 2 },
        ],
      }),
      new Set(),
    );
    expect(fired).toBeNull();
  });

  it("does not fire with fewer than n readings", async () => {
    const fired = await evaluateRule(
      ddr5Rule,
      ctx({ getSeriesLast: async () => [{ d: "2026-06-01", value: -1 }] }),
      new Set(),
    );
    expect(fired).toBeNull();
  });

  it("supports direction up", async () => {
    const fired = await evaluateRule(
      { ...ddr5Rule, direction: "up" },
      ctx({
        getSeriesLast: async () => [
          { d: "2026-06-01", value: 2 },
          { d: "2026-05-01", value: 1 },
        ],
      }),
      new Set(),
    );
    expect(fired).not.toBeNull();
  });
});

const capexRule: FlagEqualsRule = {
  id: "capex",
  type: "flag_equals",
  series: "capex_flag",
  value: -1,
  withinDays: 35,
  severity: "critical",
  cooloffDays: 10,
  message: "capex guide-down",
};

describe("flag_equals", () => {
  it("fires when the flag exists within the window", async () => {
    const calls: unknown[] = [];
    const fired = await evaluateRule(
      capexRule,
      ctx({
        seriesValueWithin: async (series, value, withinDays) => {
          calls.push([series, value, withinDays]);
          return true;
        },
      }),
      new Set(),
    );
    expect(fired).not.toBeNull();
    expect(calls).toEqual([["capex_flag", -1, 35]]);
  });

  it("does not fire otherwise", async () => {
    expect(await evaluateRule(capexRule, ctx(), new Set())).toBeNull();
  });
});

const ratioRule: RatioChangeRule = {
  id: "credit",
  type: "ratio_change",
  a: "HYG",
  b: "IEF",
  lookbackDays: 30,
  pct: -5,
  severity: "warn",
  cooloffDays: 14,
  message: "HYG/IEF down {value}%",
};

describe("ratio_change", () => {
  it("fires when the aligned ratio drops past the threshold", async () => {
    // Ratio walks 1.00 → 0.94 over 6 shared dates: -6%.
    const a = [100, 100, 100, 100, 100, 94];
    const b = [100, 100, 100, 100, 100, 100];
    const fired = await evaluateRule(
      ratioRule,
      ctx({
        getCloses: async (symbol) => rows(symbol === "HYG" ? a : b),
      }),
      new Set(),
    );
    expect(fired).not.toBeNull();
    expect(fired!.value).toBe(-6);
  });

  it("skips silently with fewer than 5 shared dates", async () => {
    const fired = await evaluateRule(
      ratioRule,
      ctx({
        getCloses: async (symbol) =>
          symbol === "HYG" ? rows([100, 50]) : rows([100, 100]),
      }),
      new Set(),
    );
    expect(fired).toBeNull();
  });

  it("does not fire on a small move", async () => {
    const a = [100, 100, 100, 100, 100, 98];
    const fired = await evaluateRule(
      ratioRule,
      ctx({ getCloses: async (symbol) => rows(symbol === "HYG" ? a : a.map(() => 100)) }),
      new Set(),
    );
    expect(fired).toBeNull();
  });
});

const memoryExit: CompoundRule = {
  id: "memory_exit",
  type: "compound",
  allOf: ["ddr5"],
  noneOf: ["never"],
  requireNotRecent: "capex_raise",
  severity: "critical",
  cooloffDays: 30,
  message: "MEMORY EXIT SIGNAL",
};

describe("compound", () => {
  it("fires when allOf fired and no recent capex raise", async () => {
    const fired = await evaluateRule(memoryExit, ctx(), new Set(["ddr5"]));
    expect(fired).not.toBeNull();
    expect(fired!.message).toBe("MEMORY EXIT SIGNAL");
  });

  it("is blocked when allOf did not fire this pass", async () => {
    expect(await evaluateRule(memoryExit, ctx(), new Set())).toBeNull();
  });

  it("is blocked by a noneOf fire", async () => {
    const fired = await evaluateRule(memoryExit, ctx(), new Set(["ddr5", "never"]));
    expect(fired).toBeNull();
  });

  it("is suppressed by a recent capex raise", async () => {
    const fired = await evaluateRule(
      memoryExit,
      ctx({
        seriesValueWithin: async (series, value) => series === "capex_flag" && value === 1,
      }),
      new Set(["ddr5"]),
    );
    expect(fired).toBeNull();
  });
});

describe("underCooloff", () => {
  const now = new Date("2026-06-12T00:00:00Z");
  it("suppresses inside the window", () => {
    expect(underCooloff(new Date("2026-06-06T00:00:01Z"), 7, now)).toBe(true);
  });
  it("allows at exactly the boundary", () => {
    expect(underCooloff(new Date("2026-06-05T00:00:00Z"), 7, now)).toBe(false);
  });
  it("allows when never fired", () => {
    expect(underCooloff(null, 7, now)).toBe(false);
  });
});

describe("interpolate", () => {
  it("replaces only {value}", () => {
    expect(interpolate("v={value} {other}", -3.25)).toBe("v=-3.25 {other}");
    expect(interpolate("no placeholder", 1)).toBe("no placeholder");
  });
});
