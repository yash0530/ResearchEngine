"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TickerActiveToggle } from "@/components/ticker-toggle-active";
import { Pct } from "@/components/ui";
import { fmtMoney, fmtPct } from "@/lib/format";
import { filterTickers } from "@/lib/tickers";
import type { TickerTechnicals } from "@/lib/board";

export function TickersTechnicalsClient({
  technicals,
  overrides,
  sectors,
}: {
  technicals: TickerTechnicals[];
  overrides: { symbol: string; yfSymbol: string }[];
  sectors: { code: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [sortField, setSortField] = useState<keyof TickerTechnicals>("symbol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const overrideMap = useMemo(() => new Map(overrides.map((o) => [o.symbol, o.yfSymbol])), [overrides]);

  const sortedAndFilteredTechnicals = useMemo(() => {
    const filtered = filterTickers(technicals, { search, classFilter, sectorFilter, statusFilter });

    return filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Custom fields sorting
      if (sortField === "sectors") {
        aVal = a.sectors.join(",");
        bVal = b.sectors.join(",");
      } else if (sortField === "macd") {
        aVal = a.macd?.macd ?? null;
        bVal = b.macd?.macd ?? null;
      } else if (sortField === "bollinger") {
        aVal = a.bollinger?.position ?? null;
        bVal = b.bollinger?.position ?? null;
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
  }, [technicals, search, classFilter, sectorFilter, statusFilter, sortField, sortOrder]);

  const handleSort = (field: keyof TickerTechnicals) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      const isString = field === "symbol" || field === "name" || field === "class" || field === "sectors";
      setSortOrder(isString ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: keyof TickerTechnicals }) => {
    if (sortField !== field) {
      return <span className="ml-1 opacity-25 group-hover:opacity-60 transition-opacity">↕</span>;
    }
    return <span className="ml-1 text-[var(--accent)]">{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  const getRSILabel = (rsi: number | null) => {
    if (rsi == null) return null;
    if (rsi >= 70) return <span className="badge bg-red-950/40 text-red-400 border-red-900/50">Overbought ({rsi.toFixed(1)})</span>;
    if (rsi <= 30) return <span className="badge bg-green-950/40 text-green-400 border-green-900/50">Oversold ({rsi.toFixed(1)})</span>;
    return <span className="mono text-xs">{rsi.toFixed(1)}</span>;
  };

  const getMACDLabel = (macd: TickerTechnicals["macd"]) => {
    if (!macd) return <span className="muted">—</span>;
    const isBullish = macd.histogram > 0;
    const isCrossover = macd.signalLabel.toLowerCase().includes("crossover");
    
    let badgeClass = "badge ";
    if (isBullish) {
      badgeClass += isCrossover ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" : "bg-green-950/20 text-green-500/80 border-green-900/30";
    } else {
      badgeClass += isCrossover ? "bg-rose-950/40 text-rose-400 border-rose-900/50" : "bg-red-950/20 text-red-500/80 border-red-900/30";
    }

    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className={badgeClass}>{macd.signalLabel}</span>
        <span className="mono text-[10px] muted">
          M: {macd.macd.toFixed(2)} / S: {macd.signal.toFixed(2)}
        </span>
      </div>
    );
  };

  const getBBLabel = (bb: TickerTechnicals["bollinger"]) => {
    if (!bb) return <span className="muted">—</span>;
    const posPct = bb.position * 100;
    
    let textClass = "";
    let label = `${posPct.toFixed(0)}%`;
    if (posPct > 100) {
      textClass = "text-red-400 font-semibold";
      label = `Above BB (${posPct.toFixed(0)}%)`;
    } else if (posPct < 0) {
      textClass = "text-green-400 font-semibold";
      label = `Below BB (${posPct.toFixed(0)}%)`;
    }

    // Small progress bar visualization
    const barWidth = Math.max(0, Math.min(100, posPct));

    return (
      <div className="flex flex-col items-end gap-1 min-w-24">
        <span className={`mono text-xs ${textClass}`}>{label}</span>
        <div className="h-1.5 w-full bg-[var(--soft)] rounded-full overflow-hidden border border-[var(--border)]">
          <div 
            className={`h-full rounded-full ${
              posPct > 100 ? "bg-red-500" : posPct < 0 ? "bg-green-500" : "bg-[var(--accent)]"
            }`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    );
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
        Showing {sortedAndFilteredTechnicals.length} of {technicals.length} tickers
      </div>

      {/* Technicals Table */}
      {sortedAndFilteredTechnicals.length === 0 ? (
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
                <th onClick={() => handleSort("rsi")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    RSI (14) <SortIcon field="rsi" />
                  </div>
                </th>
                <th onClick={() => handleSort("macd")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    MACD Trend & Crossover <SortIcon field="macd" />
                  </div>
                </th>
                <th onClick={() => handleSort("bollinger")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    BB Position % <SortIcon field="bollinger" />
                  </div>
                </th>
                <th onClick={() => handleSort("isGoldenCross")} className="text-center cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-center">
                    Golden Cross <SortIcon field="isGoldenCross" />
                  </div>
                </th>
                <th onClick={() => handleSort("volatility")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    Ann. Volatility <SortIcon field="volatility" />
                  </div>
                </th>
                <th onClick={() => handleSort("sma50")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    SMA (50) <SortIcon field="sma50" />
                  </div>
                </th>
                <th onClick={() => handleSort("sma200")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
                  <div className="flex items-center justify-end">
                    SMA (200) <SortIcon field="sma200" />
                  </div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredTechnicals.map((t) => {
                const yfOverride = overrideMap.get(t.symbol);
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
                    <td className="mono text-right font-semibold">{fmtMoney(t.lastClose)}</td>
                    <td className="mono text-right font-semibold">
                      {getRSILabel(t.rsi) ?? <span className="muted">—</span>}
                    </td>
                    <td className="text-right">
                      {getMACDLabel(t.macd)}
                    </td>
                    <td className="text-right">
                      {getBBLabel(t.bollinger)}
                    </td>
                    <td className="text-center">
                      {t.isGoldenCross == null ? (
                        <span className="muted">—</span>
                      ) : t.isGoldenCross ? (
                        <span className="badge bg-emerald-950/40 text-emerald-400 border-emerald-900/50 font-semibold uppercase tracking-wider text-[10px]">
                          Golden Cross
                        </span>
                      ) : (
                        <span className="badge bg-rose-950/40 text-rose-400 border-rose-900/50 font-semibold uppercase tracking-wider text-[10px]">
                          Death Cross
                        </span>
                      )}
                    </td>
                    <td className="mono text-right font-medium">
                      {t.volatility != null ? fmtPct(t.volatility, { decimals: 1 }) : <span className="muted">—</span>}
                    </td>
                    <td className="mono text-right text-[11px] muted">{fmtMoney(t.sma50)}</td>
                    <td className="mono text-right text-[11px] muted">{fmtMoney(t.sma200)}</td>
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
