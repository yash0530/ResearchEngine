import { describe, expect, it } from "vitest";
import { matchInsightsToPosition } from "../lib/research/positions";
import type { Insight } from "../lib/research/synthesize";

describe("matchInsightsToPosition", () => {
  it("identifies relevant insights by symbol and sector, and the top severity", () => {
    const insights: Insight[] = [
      { kind: "risk", severity: "critical", weight: 100, sector: "01", symbol: "NVDA", headline: "NVDA is 20% off high", evidence: "drawdown = -20%" },
      { kind: "momentum", severity: "warn", weight: 90, sector: "01", headline: "Semi sector extending late move", evidence: "avg30d = 15%" },
      { kind: "risk", severity: "info", weight: 80, sector: "02", symbol: "MSFT", headline: "MSFT soft", evidence: "soft" },
    ];

    const match = matchInsightsToPosition("NVDA", ["01", "03"], insights);

    expect(match.topSeverity).toBe("critical");
    expect(match.flaggedBy).toHaveLength(2);
    expect(match.flaggedBy).toContain("NVDA is 20% off high");
    expect(match.flaggedBy).toContain("Semi sector extending late move");
    expect(match.flaggedBy).not.toContain("MSFT soft");
  });

  it("returns null topSeverity when nothing matches", () => {
    const insights: Insight[] = [
      { kind: "risk", severity: "info", weight: 80, sector: "02", symbol: "MSFT", headline: "MSFT soft", evidence: "soft" },
    ];

    const match = matchInsightsToPosition("NVDA", ["01", "03"], insights);

    expect(match.topSeverity).toBeNull();
    expect(match.flaggedBy).toHaveLength(0);
  });
});
