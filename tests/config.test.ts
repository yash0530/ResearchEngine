import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ALL_SEED_SYMBOLS,
  BENCHMARKS,
  MANUAL_SERIES,
  SECTOR_SEEDS,
  STAGES,
} from "../config/sectors";
import { TRIPWIRES } from "../config/tripwires";
import { PROVIDER_PROFILES } from "../config/providers";
import { settings } from "../config/settings";
import { PREAMBLE } from "../lib/analyst/prompts";

describe("sector config", () => {
  it("has 12 unique codes 00–11", () => {
    const codes = SECTOR_SEEDS.map((s) => s.code);
    expect(codes).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i).padStart(2, "0")),
    );
  });

  it("has a non-empty news query, note, and members per sector", () => {
    for (const s of SECTOR_SEEDS) {
      expect(s.newsQuery.length, s.code).toBeGreaterThan(0);
      expect(s.tickers.length, s.code).toBeGreaterThan(2);
      expect(STAGES).toContain(s.stage);
      expect([1, 2, 3, 4, 5]).toContain(s.driver);
    }
  });

  it("keeps benchmarks out of sector membership", () => {
    for (const b of BENCHMARKS) {
      expect(ALL_SEED_SYMBOLS).not.toContain(b.symbol);
    }
  });

  it("driver 1 covers 8 of 12 sectors (capex tripwire message depends on it)", () => {
    expect(SECTOR_SEEDS.filter((s) => s.driver === 1)).toHaveLength(8);
  });
});

describe("tripwire config", () => {
  const universe = new Set([...ALL_SEED_SYMBOLS, ...BENCHMARKS.map((b) => b.symbol)]);
  const ids = new Set(TRIPWIRES.map((r) => r.id));

  it("has unique ids", () => {
    expect(ids.size).toBe(TRIPWIRES.length);
  });

  it("references only symbols in the universe", () => {
    for (const rule of TRIPWIRES) {
      if (rule.type === "drawdown") expect(universe.has(rule.symbol), rule.id).toBe(true);
      if (rule.type === "ratio_change") {
        expect(universe.has(rule.a), rule.id).toBe(true);
        expect(universe.has(rule.b), rule.id).toBe(true);
      }
    }
  });

  it("references only known manual series", () => {
    for (const rule of TRIPWIRES) {
      if (rule.type === "consecutive_monthly" || rule.type === "flag_equals") {
        expect(MANUAL_SERIES as readonly string[], rule.id).toContain(rule.series);
      }
    }
  });

  it("compound rules reference defined rule ids", () => {
    for (const rule of TRIPWIRES) {
      if (rule.type !== "compound") continue;
      for (const ref of [...rule.allOf, ...rule.noneOf]) {
        expect(ids.has(ref), `${rule.id} → ${ref}`).toBe(true);
      }
    }
  });
});

describe("provider config", () => {
  const ProfileSchema = z.object({
    protocol: z.enum(["anthropic", "openai_compat"]),
    baseUrl: z.string().url(),
    model: z.string().min(1),
    apiKeyEnv: z.string().min(1).nullable(),
    maxTokens: z.number().int().positive(),
    tokenParam: z.enum(["max_tokens", "max_completion_tokens"]).optional(),
    jsonMode: z.boolean().optional(),
    timeoutMs: z.number().optional(),
  });

  it("validates every profile", () => {
    for (const [name, profile] of Object.entries(PROVIDER_PROFILES)) {
      expect(() => ProfileSchema.parse(profile), name).not.toThrow();
    }
  });

  it("settings point at existing profiles", () => {
    expect(PROVIDER_PROFILES[settings.analyst.nightly]).toBeDefined();
    expect(PROVIDER_PROFILES[settings.analyst.monthly]).toBeDefined();
    expect(PROVIDER_PROFILES[settings.analyst.event]).toBeDefined();
  });
});

describe("prompts", () => {
  it("preamble keeps the load-bearing guardrails", () => {
    expect(PREAMBLE).toContain("VALID JSON");
    expect(PREAMBLE).toContain('"no change"');
    expect(PREAMBLE).toContain("research");
  });
});
