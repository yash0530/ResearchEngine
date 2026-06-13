// "By driver" rollup — aggregates the persisted digest's per-sector pulse up to the
// 5-driver map. Driver 1 (hyperscaler capex) spans 8 of 12 sectors, so a driver-level
// read is high-signal. ADDITIVE: reads the persisted Digest, never recomputes it; the
// deterministic synthesis core is untouched.

import { meanOrNull } from "../metrics";
import { DRIVERS } from "../../config/sectors";
import { loadLatestDigest } from "../board";
import type { DigestData } from "./synthesize";

export type DriverRollup = {
  driver: number;
  label: string;
  sectorCount: number;
  avg30d: number | null;
  vsHyperscaler30d: number | null;
  signalCount: number; // critical|warn insights scoped to this driver's sectors
  sectorCodes: string[];
};

/** Pure: group the digest's sector pulses by driver and aggregate. */
export function rollupByDriver(
  sectors: DigestData["sectors"],
  insights: DigestData["insights"],
): DriverRollup[] {
  const byDriver = new Map<number, DigestData["sectors"]>();
  for (const s of sectors) {
    let arr = byDriver.get(s.driver);
    if (!arr) byDriver.set(s.driver, (arr = []));
    arr.push(s);
  }

  const rollups: DriverRollup[] = [];
  for (const [driver, secs] of byDriver) {
    const codes = secs.map((s) => s.code);
    const codeSet = new Set(codes);
    const signalCount = insights.filter(
      (i) =>
        (i.severity === "critical" || i.severity === "warn") &&
        i.sector !== undefined &&
        codeSet.has(i.sector),
    ).length;
    rollups.push({
      driver,
      label: DRIVERS[driver] ?? `Driver ${driver}`,
      sectorCount: secs.length,
      avg30d: meanOrNull(secs.map((s) => s.avg30d)),
      vsHyperscaler30d: meanOrNull(secs.map((s) => s.vsHyperscaler30d)),
      signalCount,
      sectorCodes: codes,
    });
  }
  return rollups.sort((a, b) => a.driver - b.driver);
}

export async function loadDriverRollup(): Promise<DriverRollup[] | null> {
  const digest = await loadLatestDigest();
  if (!digest) return null;
  return rollupByDriver(digest.data.sectors, digest.data.insights);
}

export type DriverDetail = { rollup: DriverRollup; sectors: DigestData["sectors"] };

export async function loadDriverDetail(driver: number): Promise<DriverDetail | null> {
  const digest = await loadLatestDigest();
  if (!digest) return null;
  const sectors = digest.data.sectors.filter((s) => s.driver === driver);
  if (sectors.length === 0) return null;
  const rollup = rollupByDriver(sectors, digest.data.insights)[0];
  return { rollup, sectors };
}
