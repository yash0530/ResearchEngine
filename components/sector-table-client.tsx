"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { fmtMoney, fmtMoneyCompact, fmtPct, fmtMultiple } from "@/lib/format";
import { Pct } from "@/components/ui";

type MemberItem = {
  symbol: string;
  name: string | null;
  lastClose: number | null;
  lastDate: string | null;
  pct1d: number | null;
  pct7d: number | null;
  pct30d: number | null;
  drawdown60: number | null;
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

export function SectorTableClient({ members }: { members: MemberItem[] }) {
  const [sortField, setSortField] = useState<keyof MemberItem>("pct1d");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: keyof MemberItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Default to desc for numeric metrics, asc for text fields
      const isString = field === "symbol" || field === "name";
      setSortOrder(isString ? "asc" : "desc");
    }
  };

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined values (put them at the end)
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (sortOrder === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [members, sortField, sortOrder]);

  const SortIcon = ({ field }: { field: keyof MemberItem }) => {
    if (sortField !== field) {
      return <span className="ml-1 opacity-25 group-hover:opacity-60 transition-opacity">↕</span>;
    }
    return <span className="ml-1 text-[var(--accent)]">{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="table-wrap relative rounded-lg border border-[var(--border)] bg-[var(--panel)]">
      <table className="data-table min-w-[1500px]">
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
            <th onClick={() => handleSort("pct7d")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
              <div className="flex items-center justify-end">
                7d <SortIcon field="pct7d" />
              </div>
            </th>
            <th onClick={() => handleSort("pct30d")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
              <div className="flex items-center justify-end">
                30d <SortIcon field="pct30d" />
              </div>
            </th>
            <th onClick={() => handleSort("drawdown60")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
              <div className="flex items-center justify-end">
                Off 60d High <SortIcon field="drawdown60" />
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
                Profit Margin <SortIcon field="profitMargin" />
              </div>
            </th>
            <th onClick={() => handleSort("revenueGrowth")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
              <div className="flex items-center justify-end">
                Rev Growth <SortIcon field="revenueGrowth" />
              </div>
            </th>
            <th onClick={() => handleSort("yearChange")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
              <div className="flex items-center justify-end">
                52W Change <SortIcon field="yearChange" />
              </div>
            </th>
            <th onClick={() => handleSort("fiftyTwoWeekHigh")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
              <div className="flex items-center justify-end">
                52W High <SortIcon field="fiftyTwoWeekHigh" />
              </div>
            </th>
            <th onClick={() => handleSort("fiftyTwoWeekLow")} className="text-right cursor-pointer hover:bg-[var(--soft)] transition-colors select-none group">
              <div className="flex items-center justify-end">
                52W Low <SortIcon field="fiftyTwoWeekLow" />
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
          </tr>
        </thead>
        <tbody>
          {sortedMembers.map((m) => {
            const peRatio = m.trailingPE != null && m.forwardPE != null && m.forwardPE > 0
              ? m.trailingPE / m.forwardPE
              : null;
            const pmClass = m.profitMargin != null ? (m.profitMargin > 0 ? "text-[var(--good)]" : m.profitMargin < 0 ? "text-[var(--bad)]" : "text-[var(--muted)]") : "";
            const rgClass = m.revenueGrowth != null ? (m.revenueGrowth > 0 ? "text-[var(--good)]" : m.revenueGrowth < 0 ? "text-[var(--bad)]" : "text-[var(--muted)]") : "";

            return (
              <tr key={m.symbol} className="hover:bg-[var(--soft)]/50 transition-colors">
                <td className="sticky left-0 z-10 bg-[var(--panel)] font-semibold border-r border-[var(--border)]">
                  <Link href={`/tickers/${m.symbol}`} className="mono hover:underline">
                    {m.symbol}
                  </Link>
                </td>
                <td className="muted max-w-56 truncate">{m.name ?? "—"}</td>
                <td className="mono text-right">{fmtMoney(m.lastClose)}</td>
                <td className="text-right">
                  <Pct value={m.pct1d} decimals={1} />
                </td>
                <td className="text-right">
                  <Pct value={m.pct7d} decimals={1} />
                </td>
                <td className="text-right">
                  <Pct value={m.pct30d} decimals={1} />
                </td>
                <td className="text-right">
                  <Pct value={m.drawdown60} decimals={1} />
                </td>
                <td className="mono text-right">{fmtMoneyCompact(m.marketCap)}</td>
                <td className="mono text-right">{fmtMultiple(m.forwardPE)}</td>
                <td className="mono text-right">{fmtMultiple(m.trailingPE)}</td>
                <td className={`mono text-right ${pmClass}`}>
                  {m.profitMargin != null ? fmtPct(m.profitMargin * 100, { decimals: 1 }) : "—"}
                </td>
                <td className={`mono text-right ${rgClass}`}>
                  {m.revenueGrowth != null ? fmtPct(m.revenueGrowth * 100, { decimals: 1 }) : "—"}
                </td>
                <td className="text-right">
                  <Pct value={m.yearChange != null ? m.yearChange * 100 : null} decimals={1} />
                </td>
                <td className="mono text-right">{fmtMoney(m.fiftyTwoWeekHigh)}</td>
                <td className="mono text-right">{fmtMoney(m.fiftyTwoWeekLow)}</td>
                <td className="mono text-right">{m.beta != null ? m.beta.toFixed(2) : "—"}</td>
                <td className="mono text-right">{fmtMoney(m.eps)}</td>
                <td className="mono text-right">
                  {m.dividendYield != null ? fmtPct(m.dividendYield * 100, { decimals: 2 }) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
