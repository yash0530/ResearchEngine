export type TickerLike = {
  symbol: string;
  name: string | null;
  class: string;
  active: boolean;
  sectors: string[];
};

export type TickerFilters = {
  search: string;
  classFilter: string;
  sectorFilter: string;
  statusFilter: string;
};

export function filterTickers<T extends TickerLike>(tickers: T[], filters: TickerFilters): T[] {
  const { search, classFilter, sectorFilter, statusFilter } = filters;
  return tickers.filter((t) => {
    // 1. Search filter (Symbol or Name)
    if (search.trim()) {
      const query = search.toLowerCase();
      const symbolMatch = t.symbol.toLowerCase().includes(query);
      const nameMatch = t.name?.toLowerCase().includes(query) ?? false;
      if (!symbolMatch && !nameMatch) return false;
    }

    // 2. Class filter
    if (classFilter !== "all" && t.class !== classFilter) {
      return false;
    }

    // 3. Sector filter
    if (sectorFilter !== "all" && !t.sectors.includes(sectorFilter)) {
      return false;
    }

    // 4. Status filter
    if (statusFilter === "active" && !t.active) return false;
    if (statusFilter === "inactive" && t.active) return false;

    return true;
  });
}
