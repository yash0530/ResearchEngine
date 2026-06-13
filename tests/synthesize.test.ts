import { describe, expect, it } from "vitest";
import {
  synthesize,
  type MemberMetric,
  type SynthesisInputs,
} from "../lib/research/synthesize";

const member = (symbol: string, o: Partial<MemberMetric> = {}): MemberMetric => ({
  symbol,
  pct1d: null,
  pct7d: null,
  pct30d: null,
  drawdown60: null,
  yearChange: null,
  forwardPE: null,
  ...o,
});

const base = (o: Partial<SynthesisInputs> = {}): SynthesisInputs => ({
  asOf: "2026-06-12",
  ageDays: 1,
  generatedAt: "2026-06-13T07:30:00.000Z",
  sectors: [],
  hyperscaler1d: 0,
  hyperscaler30d: 0,
  credit30d: 0,
  firedRules: [],
  catalysts: [],
  manualLatest: {},
  newsCoverage: [],
  jobIssues: [],
  ...o,
});

describe("synthesize", () => {
  it("ranks fired tripwires by severity and drives the headline off criticals", () => {
    const d = synthesize(
      base({
        firedRules: [
          { ruleId: "mu_dd", severity: "warn", message: "MU off high", firedAt: "2026-06-13T00:00:00Z" },
          { ruleId: "memory_exit", severity: "critical", message: "MEMORY EXIT", firedAt: "2026-06-13T00:00:00Z" },
        ],
      }),
    );
    expect(d.insights[0].severity).toBe("critical");
    expect(d.counts.criticals).toBe(1);
    expect(d.headline).toContain("MEMORY EXIT");
  });

  it("emits a real drawdown risk but diverts an implausible one to a data warning", () => {
    const d = synthesize(
      base({
        sectors: [
          { code: "08", name: "Servers", stage: "inflecting", driver: 1, members: [member("SMCI", { drawdown60: -39 })] },
          { code: "02", name: "Semicap", stage: "inflecting", driver: 1, members: [member("KLAC", { drawdown60: -88 })] },
        ],
      }),
    );
    expect(d.insights.some((i) => i.kind === "risk" && i.symbol === "SMCI")).toBe(true);
    // -88% is a split/bad-tick artifact — must NOT appear as a real risk…
    expect(d.insights.some((i) => i.kind === "risk" && i.symbol === "KLAC")).toBe(false);
    // …it surfaces as a data-quality warning instead.
    expect(d.insights.some((i) => i.kind === "data" && i.headline.includes("implausible"))).toBe(true);
  });

  it("flags a Driver-1 sector diverging from the hyperscaler basket", () => {
    const d = synthesize(
      base({
        hyperscaler30d: -3,
        sectors: [
          { code: "00", name: "Memory", stage: "popping", driver: 1, members: [member("MU", { pct30d: 20 })] },
        ],
      }),
    );
    const div = d.insights.find((i) => i.kind === "divergence");
    expect(div).toBeTruthy();
    expect(div!.sector).toBe("00");
    expect(div!.evidence).toContain("hyperscaler");
  });

  it("scopes credit-stress to the financing-sensitive sector", () => {
    const d = synthesize(
      base({
        credit30d: -6,
        sectors: [{ code: "07", name: "Data Centers", stage: "crowded", driver: 1, members: [member("EQIX")] }],
      }),
    );
    const credit = d.insights.find((i) => i.kind === "credit");
    expect(credit).toBeTruthy();
    expect(credit!.sector).toBe("07");
  });

  it("surfaces a capex guide-down from the manual series", () => {
    const d = synthesize(base({ manualLatest: { capex_flag: { d: "2026-06-01", value: -1 } } }));
    expect(d.insights.some((i) => i.kind === "signal" && i.headline.toLowerCase().includes("capex"))).toBe(true);
  });

  it("calls out stale price data in both the headline and an insight", () => {
    const d = synthesize(base({ ageDays: 6 }));
    expect(d.freshness.stale).toBe(true);
    expect(d.headline.toLowerCase()).toContain("stale");
    expect(d.insights.some((i) => i.kind === "data")).toBe(true);
  });

  it("falls back to a quiet-tape headline when nothing is material", () => {
    const d = synthesize(
      base({
        hyperscaler30d: 1.5,
        sectors: [
          { code: "00", name: "Memory", stage: "early", driver: 1, members: [member("MU", { pct30d: 3 })] },
          { code: "01", name: "Compute", stage: "early", driver: 1, members: [member("NVDA", { pct30d: -2 })] },
        ],
      }),
    );
    expect(d.headline).toContain("Quiet tape");
    expect(d.counts.criticals).toBe(0);
  });

  it("caps insights for signal-to-noise but never drops criticals", () => {
    const manySectors = Array.from({ length: 16 }, (_, i) => ({
      code: `x${i}`,
      name: `S${i}`,
      stage: "popping",
      driver: 1,
      members: [member(`X${i}`, { drawdown60: -25 })],
    }));
    const d = synthesize(
      base({
        firedRules: [
          { ruleId: "a", severity: "critical", message: "A", firedAt: "2026-06-13T00:00:00Z" },
          { ruleId: "b", severity: "critical", message: "B", firedAt: "2026-06-13T00:00:00Z" },
        ],
        sectors: manySectors,
      }),
    );
    expect(d.insights.length).toBeLessThanOrEqual(14);
    expect(d.insights.filter((i) => i.severity === "critical")).toHaveLength(2);
  });
});
