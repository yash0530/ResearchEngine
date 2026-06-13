"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TickerActiveToggle } from "@/components/ticker-toggle-active";
import { Pct } from "@/components/ui";
import { fmtMoney, fmtMoneyCompact, fmtPct, fmtMultiple } from "@/lib/format";
import { filterTickers } from "@/lib/tickers";

type TickerItem = {
  symbol: string;
  name: string | null;
  class: string;
  active: boolean;
  sectors: string[];
  pct1d: number | null;
  pct30d: number | null;
  lastClose: number | null;
  marketCap: number | null;
  forwardPE: number | null;
  trailingPE: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  beta: number | null;
  eps: number | null;
  dividendYield: number | null;
  yearChange: number | null;
};

export function TickersTableClient({
  tickers,
  overrides,
  sectors,
}: {
  tickers: TickerItem[];
  overrides: { symbol: string; yfSymbol: string }[];
  sectors: { code: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [sortField, setSortField] = useState<keyof TickerItem>("symbol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const overrideMap = useMemo(() => new Map(overrides.map((o) => [o.symbol, o.yfSymbol])), [overrides]);

  const sortedAndFilteredTickers = useMemo(() => {
    const filtered = filterTickers(tickers, { search, classFilter, sectorFilter, statusFilter });

    return filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Special handling for sectors array comparison
      if (sortField === "sectors") {
        aVal = a.sectors.join(",");
        bVal = b.sectors.join(",");
      }

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (sortOrder === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [tickers, search, classFilter, sectorFilter, statusFilter, sortField, sortOrder]);

  const handleSort = (field: keyof TickerItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      const isString = field === "symbol" || field === "name" || field === "class" || field === "sectors";
      setSortOrder(isString ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: keyof TickerItem }) => {
    if (sortField !== field) {
      return <span className="ml-1 opacity-25 group-hover:opacity-60 transition-opacity">↕</span>;
    }
    return <span className="ml-1 text-[var(--accent)]">{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Screening Panel */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <label className="label">Search</label>
          <input
            type="text"
            className="input"
            placeholder="Search symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Class</label>
          <select
            className="select"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">All Classes</option>
            <option value="stock">Stock</option>
            <option value="etf">ETF</option>
            <option value="benchmark">Benchmark</option>
          </select>
        </div>
        <div>
          <label className="label">Sector</label>
          <select
            className="select"
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
          >
            <option value="all">All Sectors</option>
            {sectors.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-xs text-[var(--muted)]">
        Showing {sortedAndFilteredTickers.length} of {tickers.length} tickers
      </div>

      {/* Tickers Table */}
      {sortedAndFilteredTickers.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)] text-sm">
          No tickers match the selected filters.
        </div>
      ) : (
        <div className="table-wrap relative rounded-lg border border-[var(--border)] bg-[var(--panel)]">
          <table className="data-table min-w-[1550px]">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort("symbol")}
                  className="sticky left-0 z-20 bg-[var(--panel)] cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group border-r border-[var(--border)]"
                >
                  <div className="flex items-center">
                    Symbol <SortIcon field="symbol" />
                  </div>
                </th>
                <th onClick={() => handleSort("name")} className="cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center">
                    Name <SortIcon field="name" />
                  </div>
                </th>
                <th onClick={() => handleSort("class")} className="cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center">
                    Class <SortIcon field="class" />
                  </div>
                </th>
                <th onClick={() => handleSort("sectors")} className="cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center">
                    Sectors <SortIcon field="sectors" />
                  </div>
                </th>
                <th onClick={() => handleSort("lastClose")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    Close <SortIcon field="lastClose" />
                  </div>
                </th>
                <th onClick={() => handleSort("pct1d")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    1d <SortIcon field="pct1d" />
                  </div>
                </th>
                <th onClick={() => handleSort("pct30d")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    30d <SortIcon field="pct30d" />
                  </div>
                </th>
                <th onClick={() => handleSort("marketCap")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    Mcap <SortIcon field="marketCap" />
                  </div>
                </th>
                <th onClick={() => handleSort("forwardPE")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    Fwd P/E <SortIcon field="forwardPE" />
                  </div>
                </th>
                <th onClick={() => handleSort("trailingPE")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    Trail P/E <SortIcon field="trailingPE" />
                  </div>
                </th>
                <th onClick={() => handleSort("profitMargin")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    Margin <SortIcon field="profitMargin" />
                  </div>
                </th>
                <th onClick={() => handleSort("revenueGrowth")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    Rev Growth <SortIcon field="revenueGrowth" />
                  </div>
                </th>
                <th onClick={() => handleSort("yearChange")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    52W Chg <SortIcon field="yearChange" />
                  </div>
                </th>
                <th onClick={() => handleSort("beta")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    Beta <SortIcon field="beta" />
                  </div>
                </th>
                <th onClick={() => handleSort("eps")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    EPS <SortIcon field="eps" />
                  </div>
                </th>
                <th onClick={() => handleSort("dividendYield")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    Div Yield <SortIcon field="dividendYield" />
                  </div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredTickers.map((t) => {
                const yfOverride = overrideMap.get(t.symbol);
                const pmClass = t.profitMargin != null ? (t.profitMargin > 0 ? "text-[var(--good)]" : t.profitMargin < 0 ? "text-[var(--bad)]" : "text-[var(--muted)]") : "";
                const rgClass = t.revenueGrowth != null ? (t.revenueGrowth > 0 ? "text-[var(--good)]" : t.revenueGrowth < 0 ? "text-[var(--bad)]" : "text-[var(--muted)]") : "";

                return (
                  <tr key={t.symbol} className={`${t.active ? "" : "opacity-50"} hover:bg-[var(--soft)]/50 transition-colors`}>
                    <td className="sticky left-0 z-10 bg-[var(--panel)] border-r border-[var(--border)]">
                      <div className="flex flex-col">
                        <Link
                          href={`/tickers/${t.symbol}`}
                          className="mono font-semibold hover:underline"
                        >
                          {t.symbol}
                        </Link>
                        {yfOverride && (
                          <span className="muted text-[10px] mono">
                            YF: {yfOverride}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="muted max-w-48 truncate">{t.name ?? "—"}</td>
                    <td>
                      <span className="badge">{t.class}</span>
                    </td>
                    <td className="mono text-xs">
                      {t.sectors.length ? (
                        t.sectors.map((code) => (
                          <Link
                            key={code}
                            href={`/sectors/${code}`}
                            className="mr-1 hover:underline text-[var(--accent)] font-semibold"
                          >
                            {code}
                          </Link>
                        ))
                      ) : (
                        <span className="muted">benchmark</span>
                      )}
                    </td>
                    <td className="mono text-right">{fmtMoney(t.lastClose)}</td>
                    <td className="text-right">
                      <Pct value={t.pct1d} decimals={1} />
                    </td>
                    <td className="text-right">
                      <Pct value={t.pct30d} decimals={1} />
                    </td>
                    <td className="mono text-right">{fmtMoneyCompact(t.marketCap)}</td>
                    <td className="mono text-right">{fmtMultiple(t.forwardPE)}</td>
                    <td className="mono text-right">{fmtMultiple(t.trailingPE)}</td>
                    <td className={`mono text-right ${pmClass}`}>
                      {t.profitMargin != null ? fmtPct(t.profitMargin * 100, { decimals: 1 }) : "—"}
                    </td>
                    <td className={`mono text-right ${rgClass}`}>
                      {t.revenueGrowth != null ? fmtPct(t.revenueGrowth * 100, { decimals: 1 }) : "—"}
                    </td>
                    <td className="text-right">
                      <Pct value={t.yearChange != null ? t.yearChange * 100 : null} decimals={1} />
                    </td>
                    <td className="mono text-right">{t.beta != null ? t.beta.toFixed(2) : "—"}</td>
                    <td className="mono text-right">{fmtMoney(t.eps)}</td>
                    <td className="mono text-right">
                      {t.dividendYield != null ? fmtPct(t.dividendYield * 100, { decimals: 2 }) : "—"}
                    </td>
                    <td>
                      <TickerActiveToggle symbol={t.symbol} active={t.active} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
