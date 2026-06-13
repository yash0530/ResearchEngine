import { describe, expect, it } from "vitest";
import { rollupByDriver } from "../lib/research/drivers";
import type { DigestData } from "../lib/research/synthesize";

const sector = (
  code: string,
  driver: number,
  avg30d: number | null,
  vs: number | null,
): DigestData["sectors"][number] => ({
  code,
  name: `S${code}`,
  stage: "popping",
  driver,
  avg1d: null,
  avg7d: null,
  avg30d,
  vsHyperscaler30d: vs,
  worstDrawdown: null,
  leader: null,
  laggard: null,
  memberCount: 1,
  newsCount: 0,
});

const insight = (
  severity: "critical" | "warn" | "info",
  sector?: string,
): DigestData["insights"][number] => ({
  kind: "risk",
  severity,
  weight: 50,
  sector,
  headline: "h",
  evidence: "e",
});

describe("rollupByDriver", () => {
  it("groups by driver, averages, and counts only in-driver critical/warn signals", () => {
    const sectors = [sector("00", 1, 10, 12), sector("01", 1, 20, 22), sector("05", 2, -4, null)];
    const insights = [
      insight("critical", "00"),
      insight("warn", "01"),
      insight("info", "00"), // info → not counted
      insight("warn", "05"),
      insight("critical", undefined), // no sector → not counted
    ];

    const r = rollupByDriver(sectors, insights);

    expect(r.map((x) => x.driver)).toEqual([1, 2]); // sorted ascending
    const d1 = r[0];
    expect(d1.sectorCount).toBe(2);
    expect(d1.avg30d).toBe(15); // mean(10, 20)
    expect(d1.vsHyperscaler30d).toBe(17); // mean(12, 22)
    expect(d1.signalCount).toBe(2); // critical(00) + warn(01); info + sectorless excluded
    expect(d1.label.length).toBeGreaterThan(0);
    expect(d1.sectorCodes).toEqual(["00", "01"]);

    const d2 = r[1];
    expect(d2.sectorCount).toBe(1);
    expect(d2.vsHyperscaler30d).toBeNull(); // only-null member → null
    expect(d2.signalCount).toBe(1);
  });
});
