import { describe, expect, it } from "vitest";
import { summarizeDigestRow } from "../lib/digests";

describe("summarizeDigestRow", () => {
  it("extracts headline + counts from valid digest JSON", () => {
    const json = JSON.stringify({ headline: "two critical", counts: { insightsTotal: 14, criticals: 2 } });
    expect(summarizeDigestRow(json)).toEqual({ headline: "two critical", insightsTotal: 14, criticals: 2 });
  });

  it("falls back to insights.length when counts are absent", () => {
    const json = JSON.stringify({ headline: "h", insights: [{}, {}, {}] });
    expect(summarizeDigestRow(json)).toMatchObject({ insightsTotal: 3, criticals: 0 });
  });

  it("returns a safe fallback on malformed JSON", () => {
    expect(summarizeDigestRow("{not json")).toEqual({
      headline: "(unreadable digest)",
      insightsTotal: 0,
      criticals: 0,
    });
  });
});
