import { beforeEach, describe, expect, it, vi } from "vitest";

// Exercise the overnight orchestration PURELY — mock the runner + each step module so no
// DB/network is touched (matches the test convention). We assert the two contracts that
// matter for iteration 7: steps run in dependency order, and a failed step is counted but
// never aborts the chain (the digest must still build from whatever is fresh).
const { calls } = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("../lib/jobs/runner", () => ({
  runJob: async (name: string, fn: () => Promise<string>) => {
    calls.push(name);
    try {
      return { ok: true, detail: await fn() };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  },
}));
vi.mock("../lib/jobs/prices", () => ({ runPrices: async () => "ok" }));
vi.mock("../lib/jobs/news", () => ({ runNews: async () => "ok" }));
vi.mock("../lib/jobs/earnings", () => ({
  runEarnings: async () => {
    throw new Error("boom"); // simulate a failing step
  },
}));
vi.mock("../lib/rules/engine", () => ({ runRulesJob: async () => "ok" }));
vi.mock("../lib/analyst/runner", () => ({ runAnalyst: async () => "ok" }));
vi.mock("../lib/jobs/morning", () => ({ runMorning: async () => "ok" }));

import { runOvernight } from "../lib/jobs/overnight";

describe("runOvernight", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("runs every step in dependency order", async () => {
    await runOvernight();
    expect(calls).toEqual(["prices", "news", "earnings", "rules", "nightly", "morning"]);
  });

  it("continues past a failed step and reports the failure count", async () => {
    const summary = await runOvernight();
    expect(calls).toContain("morning"); // the earnings throw did NOT abort the chain
    expect(summary).toContain("earnings:FAIL");
    expect(summary).toMatch(/1 step\(s\) failed/);
  });
});
