import { describe, expect, it } from "vitest";
import { filterTickers, type TickerLike, type TickerFilters } from "../lib/tickers";

const noFilters: TickerFilters = {
  search: "",
  classFilter: "all",
  sectorFilter: "all",
  statusFilter: "all",
};

const makeTicker = (overrides: Partial<TickerLike> & Pick<TickerLike, "symbol">): TickerLike => ({
  name: null,
  class: "stock",
  active: true,
  sectors: [],
  ...overrides,
});

const DATA: TickerLike[] = [
  makeTicker({ symbol: "NVDA", name: "NVIDIA Corporation", class: "stock", active: true, sectors: ["GPU", "AI"] }),
  makeTicker({ symbol: "SPY", name: "SPDR S&P 500 ETF", class: "etf", active: true, sectors: ["BENCH"] }),
  makeTicker({ symbol: "AAPL", name: "Apple Inc.", class: "stock", active: false, sectors: ["EDGE"] }),
  makeTicker({ symbol: "QQQ", name: "Invesco QQQ Trust", class: "etf", active: false, sectors: ["BENCH"] }),
  makeTicker({ symbol: "GSPC", name: null, class: "benchmark", active: true, sectors: [] }),
];

describe("filterTickers — search", () => {
  it("returns all tickers when search is empty", () => {
    expect(filterTickers(DATA, noFilters)).toHaveLength(DATA.length);
  });

  it("filters by symbol (case-insensitive)", () => {
    const result = filterTickers(DATA, { ...noFilters, search: "nvda" });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("NVDA");
  });

  it("filters by name (case-insensitive)", () => {
    const result = filterTickers(DATA, { ...noFilters, search: "apple" });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("AAPL");
  });

  it("matches both symbol and name hits", () => {
    // 'spy' matches symbol SPY and name 'SPDR S&P 500 ETF' (via symbol only here)
    const result = filterTickers(DATA, { ...noFilters, search: "SPY" });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("SPY");
  });

  it("treats whitespace-only search as no filter (empty guard via trim)", () => {
    // search.trim() is falsy for whitespace-only → no filter applied → all tickers returned
    const result = filterTickers(DATA, { ...noFilters, search: "   " });
    expect(result).toHaveLength(DATA.length);
  });

  it("returns empty when no match", () => {
    const result = filterTickers(DATA, { ...noFilters, search: "ZZZZZ" });
    expect(result).toHaveLength(0);
  });

  it("handles null name gracefully (no crash, no match on name)", () => {
    // GSPC has null name — searching 'gspc' should match via symbol only
    const result = filterTickers(DATA, { ...noFilters, search: "gspc" });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("GSPC");
  });
});

describe("filterTickers — class filter", () => {
  it("keeps only stocks when classFilter=stock", () => {
    const result = filterTickers(DATA, { ...noFilters, classFilter: "stock" });
    expect(result.map((t) => t.symbol)).toEqual(["NVDA", "AAPL"]);
  });

  it("keeps only ETFs when classFilter=etf", () => {
    const result = filterTickers(DATA, { ...noFilters, classFilter: "etf" });
    expect(result.map((t) => t.symbol)).toEqual(["SPY", "QQQ"]);
  });

  it("keeps all when classFilter=all", () => {
    expect(filterTickers(DATA, { ...noFilters, classFilter: "all" })).toHaveLength(DATA.length);
  });
});

describe("filterTickers — sector filter", () => {
  it("keeps only tickers in the given sector", () => {
    const result = filterTickers(DATA, { ...noFilters, sectorFilter: "AI" });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("NVDA");
  });

  it("handles multi-sector tickers correctly", () => {
    const result = filterTickers(DATA, { ...noFilters, sectorFilter: "GPU" });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("NVDA");
  });

  it("returns empty when no ticker is in that sector", () => {
    const result = filterTickers(DATA, { ...noFilters, sectorFilter: "NOPE" });
    expect(result).toHaveLength(0);
  });

  it("keeps all when sectorFilter=all", () => {
    expect(filterTickers(DATA, { ...noFilters, sectorFilter: "all" })).toHaveLength(DATA.length);
  });
});

describe("filterTickers — status filter", () => {
  it("keeps only active tickers when statusFilter=active", () => {
    const result = filterTickers(DATA, { ...noFilters, statusFilter: "active" });
    expect(result.every((t) => t.active)).toBe(true);
    expect(result.map((t) => t.symbol)).toEqual(["NVDA", "SPY", "GSPC"]);
  });

  it("keeps only inactive tickers when statusFilter=inactive", () => {
    const result = filterTickers(DATA, { ...noFilters, statusFilter: "inactive" });
    expect(result.every((t) => !t.active)).toBe(true);
    expect(result.map((t) => t.symbol)).toEqual(["AAPL", "QQQ"]);
  });

  it("keeps all when statusFilter=all", () => {
    expect(filterTickers(DATA, { ...noFilters, statusFilter: "all" })).toHaveLength(DATA.length);
  });
});

describe("filterTickers — combined filters", () => {
  it("applies search + class + sector + status together", () => {
    // search='nvidia' matches NVDA by name, class=stock, sector=AI, status=active
    const result = filterTickers(DATA, {
      search: "nvidia",
      classFilter: "stock",
      sectorFilter: "AI",
      statusFilter: "active",
    });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("NVDA");
  });

  it("returns empty when combined filters eliminate everything", () => {
    // AAPL is inactive, so active filter rules it out even if name/class/sector match
    const result = filterTickers(DATA, {
      search: "apple",
      classFilter: "stock",
      sectorFilter: "EDGE",
      statusFilter: "active",
    });
    expect(result).toHaveLength(0);
  });
});
