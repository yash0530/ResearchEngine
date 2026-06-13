"use client";

import { useState } from "react";
import { TickersTableClient } from "./tickers-table-client";
import { TickersTechnicalsClient } from "./tickers-technicals-client";
import type { TickerTechnicals } from "@/lib/board";

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

export function TickersTabsClient({
  tickers,
  technicals,
  overrides,
  sectors,
}: {
  tickers: TickerItem[];
  technicals: TickerTechnicals[];
  overrides: { symbol: string; yfSymbol: string }[];
  sectors: { code: string; name: string }[];
}) {
  const [activeTab, setActiveTab] = useState<"fundamental" | "technical">("fundamental");

  return (
    <div className="space-y-4">
      {/* Tabs list */}
      <div className="flex border-b border-[var(--border)] gap-2">
        <button
          onClick={() => setActiveTab("fundamental")}
          className={`px-4 py-2 text-sm font-semibold transition border-b-2 -mb-[2px] ${
            activeTab === "fundamental"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--border)]"
          }`}
        >
          Universe Directory
        </button>
        <button
          onClick={() => setActiveTab("technical")}
          className={`px-4 py-2 text-sm font-semibold transition border-b-2 -mb-[2px] ${
            activeTab === "technical"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--border)]"
          }`}
        >
          Technical Screener
        </button>
      </div>

      {/* Tab panel */}
      {activeTab === "fundamental" ? (
        <TickersTableClient tickers={tickers} overrides={overrides} sectors={sectors} />
      ) : (
        <TickersTechnicalsClient technicals={technicals} overrides={overrides} sectors={sectors} />
      )}
    </div>
  );
}
