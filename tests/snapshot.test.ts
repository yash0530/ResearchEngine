import { describe, expect, it } from "vitest";
import { assembleSnapshot, type SnapshotInputs } from "../lib/analyst/snapshot";
import { SnapshotSchema } from "../lib/analyst/schemas";
import type { CloseRow } from "../lib/metrics";

const flat = (n: number, close = 100): CloseRow[] =>
  Array.from({ length: n }, (_, i) => ({ d: `day-${String(i).padStart(3, "0")}`, close }));

const trending = (n: number, dailyPct: number): CloseRow[] => {
  const rows: CloseRow[] = [];
  let close = 100;
  for (let i = 0; i < n; i++) {
    rows.push({ d: `day-${String(i).padStart(3, "0")}`, close });
    close *= 1 + dailyPct / 100;
  }
  return rows;
};

function inputs(overrides: Partial<SnapshotInputs> = {}): SnapshotInputs {
  return {
    maxDate: "2026-06-12",
    sectors: [
      { code: "00", name: "Memory", stage: "popping", driver: 1, members: ["MU", "WDC"] },
      { code: "01", name: "Compute", stage: "crowded", driver: 1, members: ["NVDA"] },
    ],
    closesBySymbol: new Map([
      ["MU", trending(40, 2)],
      ["WDC", flat(40)],
      ["NVDA", trending(40, -1)],
    ]),
    firedRules: [],
    headlinesBySector: new Map(),
    catalysts: [],
    manualLatest: {},
    ...overrides,
  };
}

describe("assembleSnapshot", () => {
  it("produces a schema-valid snapshot", () => {
    const snap = assembleSnapshot(inputs());
    expect(() => SnapshotSchema.parse(snap)).not.toThrow();
  });

  it("averages members and skips symbols without data", () => {
    const snap = assembleSnapshot(
      inputs({
        sectors: [
          { code: "00", name: "Memory", stage: "popping", driver: 1, members: ["MU", "GHOST"] },
        ],
      }),
    );
    // GHOST has no closes → average comes from MU alone (≈ +2% per day).
    expect(snap.sectors[0].avg_1d).toBeCloseTo(2, 0);
    expect(snap.sectors[0].avg_30d).not.toBeNull();
  });

  it("returns null averages when no member has data", () => {
    const snap = assembleSnapshot(
      inputs({ closesBySymbol: new Map(), sectors: [{ code: "00", name: "x", stage: "early", driver: 1, members: ["MU"] }] }),
    );
    expect(snap.sectors[0].avg_1d).toBeNull();
  });

  it("ranks top movers by |1d| and caps at 15", () => {
    const closes = new Map<string, CloseRow[]>();
    const members: string[] = [];
    for (let i = 0; i < 20; i++) {
      const sym = `S${i}`;
      members.push(sym);
      closes.set(sym, trending(3, i % 2 === 0 ? i : -i)); // alternating signs, growing magnitude
    }
    const snap = assembleSnapshot(
      inputs({
        sectors: [{ code: "00", name: "x", stage: "early", driver: 1, members }],
        closesBySymbol: closes,
      }),
    );
    expect(snap.top_movers).toHaveLength(15);
    const magnitudes = snap.top_movers.map((m) => Math.abs(m.pct_1d));
    expect(magnitudes).toEqual([...magnitudes].sort((a, b) => b - a));
  });

  it("attributes a dual-listed symbol to its first sector", () => {
    const snap = assembleSnapshot(
      inputs({
        sectors: [
          { code: "01", name: "a", stage: "early", driver: 1, members: ["AVGO"] },
          { code: "03", name: "b", stage: "early", driver: 1, members: ["AVGO"] },
        ],
        closesBySymbol: new Map([["AVGO", trending(3, 5)]]),
      }),
    );
    expect(snap.top_movers[0]).toMatchObject({ symbol: "AVGO", sector: "01" });
  });

  it("caps headlines at 5 per sector, formats title — source, appends snippet", () => {
    const snap = assembleSnapshot(
      inputs({
        headlinesBySector: new Map([
          [
            "00",
            [
              { title: "A", source: "Reuters", snippet: "detail a" },
              { title: "B", source: null },
              { title: "C", source: "WSJ" },
              { title: "D", source: "FT" },
              { title: "E", source: null },
              { title: "F", source: "Bloomberg" },
            ],
          ],
        ]),
      }),
    );
    expect(snap.headlines["00"]).toEqual([
      "A — Reuters :: detail a",
      "B",
      "C — WSJ",
      "D — FT",
      "E",
    ]);
  });

  it("computes the hyperscaler basket and per-sector divergence", () => {
    const closesBySymbol = new Map<string, CloseRow[]>([
      ["MU", trending(40, 2)],
      ["MSFT", trending(40, 0.5)],
      ["AMZN", trending(40, 0.5)],
      ["HYG", flat(40)],
      ["IEF", flat(40)],
    ]);
    const snap = assembleSnapshot(
      inputs({
        sectors: [{ code: "00", name: "Memory", stage: "popping", driver: 1, members: ["MU"] }],
        closesBySymbol,
      }),
    );
    expect(snap.market.hyperscaler_30d).not.toBeNull();
    expect(snap.market.credit_30d).toBeCloseTo(0, 1); // flat HYG/IEF ratio
    // MU (+2%/day) far outruns the +0.5%/day hyperscaler basket → large positive divergence.
    expect(snap.sectors[0].vs_hyperscaler_30d).not.toBeNull();
    expect(snap.sectors[0].vs_hyperscaler_30d!).toBeGreaterThan(0);
  });

  it("keeps the serialized snapshot small", () => {
    const snap = assembleSnapshot(inputs());
    expect(JSON.stringify(snap).length).toBeLessThan(24_000);
  });
});
