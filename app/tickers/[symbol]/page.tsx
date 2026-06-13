import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTickerDetail } from "@/lib/board";
import { PriceChart } from "@/components/price-chart";
import { EmptyNote, Pct, StageChip } from "@/components/ui";
import { fmtCompact, fmtMoney, fmtMoneyCompact, fmtMultiple, fmtPct } from "@/lib/format";
import { TickerRefreshButton } from "@/components/ticker-refresh-button";
import {
  calculateSMA,
  calculateRSI,
  calculateBollinger,
  calculateMACD,
  calculateVolatility,
  calculateGoldenCross,
} from "@/lib/technicals";

export const dynamic = "force-dynamic";

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel p-3">
      <div className="label mb-1 text-xs eyebrow">{label}</div>
      <div className="text-lg font-semibold">{children}</div>
    </div>
  );
}

function StatRow({
  label,
  value,
  valueType = "text",
}: {
  label: string;
  value: any;
  valueType?: "money" | "moneyCompact" | "compact" | "pct" | "multiple" | "text";
}) {
  let display = "—";
  if (value != null) {
    if (valueType === "money") {
      display = fmtMoney(value);
    } else if (valueType === "moneyCompact") {
      display = fmtMoneyCompact(value);
    } else if (valueType === "compact") {
      display = fmtCompact(value);
    } else if (valueType === "pct") {
      display = fmtPct(value * 100, { decimals: 1 });
    } else if (valueType === "multiple") {
      display = fmtMultiple(value);
    } else {
      display = String(value);
    }
  }
  return (
    <div className="flex justify-between border-b border-[var(--border)] py-1.5 text-xs">
      <span className="muted">{label}</span>
      <span className="mono font-semibold">{display}</span>
    </div>
  );
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const detail = await loadTickerDetail(decodeURIComponent(symbol).toUpperCase());
  if (!detail) notFound();
  const { ticker, closes, metrics, lastVolume, position, journal, catalysts, news, liveStats } = detail;

  // Extract stats sections from live quote summary
  const keyStats = liveStats?.defaultKeyStatistics || {};
  const financials = liveStats?.financialData || {};
  const detailStats = liveStats?.summaryDetail || {};

  // Calculate Technicals on the fly from SQLite price history (260 closes)
  const recentCloses = closes.map((c) => c.close);
  const rsi = calculateRSI(recentCloses);
  const macd = calculateMACD(recentCloses);
  const bb = calculateBollinger(recentCloses);
  const volatility = calculateVolatility(recentCloses);
  const isGoldenCross = calculateGoldenCross(recentCloses);
  const sma50 = calculateSMA(recentCloses, 50);
  const sma200 = calculateSMA(recentCloses, 200);

  // Determine RSI styling/label
  const getRSIDetails = (r: number | null) => {
    if (r == null) return { text: "—", className: "muted" };
    if (r >= 70) return { text: `Overbought (${r.toFixed(1)})`, className: "text-red-400 font-semibold" };
    if (r <= 30) return { text: `Oversold (${r.toFixed(1)})`, className: "text-green-400 font-semibold" };
    return { text: `Neutral (${r.toFixed(1)})`, className: "mono" };
  };
  const rsiDetails = getRSIDetails(rsi);

  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-start">
        <div>
          <div className="eyebrow">
            {ticker.class}
            {ticker.active ? "" : " · inactive"}
          </div>
          <h1 className="page-title mono">{ticker.symbol}</h1>
          <p className="page-subtitle">{ticker.name ?? ""}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {ticker.sectorLinks.map((l) => (
              <Link
                key={l.sectorCode}
                href={`/sectors/${l.sectorCode}`}
                className="badge transition hover:bg-[var(--soft)]"
                title={l.sector.name}
              >
                {l.sectorCode} · {l.sector.name} <StageChip stage={l.sector.stage} />
              </Link>
            ))}
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div>
            <div className="mono text-2xl font-semibold">{fmtMoney(metrics.lastClose)}</div>
            <div className="muted mono text-xs">as of {metrics.lastDate ?? "—"}</div>
          </div>
          <TickerRefreshButton symbol={ticker.symbol} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile label="1d"><Pct value={metrics.pct1d} /></Tile>
        <Tile label="7d"><Pct value={metrics.pct7d} /></Tile>
        <Tile label="30d"><Pct value={metrics.pct30d} /></Tile>
        <Tile label="Off 60d high"><Pct value={metrics.drawdown60} /></Tile>
        <Tile label="Volume">
          <span className="mono">{lastVolume != null ? fmtCompact(lastVolume) : "—"}</span>
        </Tile>
      </div>

      <div className="panel panel-pad">
        {closes.length < 2 ? (
          <EmptyNote>No stored price history — run the prices job.</EmptyNote>
        ) : (
          <PriceChart data={closes} />
        )}
      </div>

      {/* 4-Card Fundamental & Financial Cockpit */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Key Fundamentals */}
        <div className="panel panel-pad flex flex-col bg-[var(--panel)] border border-[var(--border)]">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Key Fundamentals</h3>
          <div className="flex-1 flex flex-col justify-between">
            <StatRow label="Market Cap" value={detailStats.marketCap || keyStats.marketCap} valueType="moneyCompact" />
            <StatRow label="Forward P/E" value={detailStats.forwardPE || keyStats.forwardPE} valueType="multiple" />
            <StatRow label="Trailing P/E" value={detailStats.trailingPE || keyStats.trailingPE} valueType="multiple" />
            <StatRow label="PEG Ratio" value={keyStats.pegRatio} valueType="multiple" />
            <StatRow label="EPS (Trailing)" value={keyStats.trailingEps} valueType="money" />
            <StatRow label="Revenue" value={financials.totalRevenue} valueType="moneyCompact" />
            <StatRow label="Revenue Growth" value={financials.revenueGrowth} valueType="pct" />
            <StatRow label="52W High" value={detailStats.fiftyTwoWeekHigh} valueType="money" />
            <StatRow label="52W Low" value={detailStats.fiftyTwoWeekLow} valueType="money" />
            <StatRow label="Dividend Yield" value={detailStats.dividendYield} valueType="pct" />
            <StatRow label="Beta" value={detailStats.beta || keyStats.beta} />
          </div>
        </div>

        {/* Card 2: Valuation & Balance Sheet */}
        <div className="panel panel-pad flex flex-col bg-[var(--panel)] border border-[var(--border)]">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Valuation & Balance Sheet</h3>
          <div className="flex-1 flex flex-col justify-between">
            <StatRow label="Enterprise Value" value={keyStats.enterpriseValue} valueType="moneyCompact" />
            <StatRow label="EV / Revenue" value={keyStats.enterpriseToRevenue} valueType="multiple" />
            <StatRow label="EV / EBITDA" value={keyStats.enterpriseToEbitda} valueType="multiple" />
            <StatRow label="Price to Book (P/B)" value={keyStats.priceToBook} valueType="multiple" />
            <StatRow label="Book Value" value={keyStats.bookValue} valueType="money" />
            <StatRow label="Total Cash" value={financials.totalCash} valueType="moneyCompact" />
            <StatRow label="Total Debt" value={financials.totalDebt} valueType="moneyCompact" />
            <StatRow label="Debt to Equity" value={financials.debtToEquity} />
          </div>
        </div>

        {/* Card 3: Share Statistics & Short Interest */}
        <div className="panel panel-pad flex flex-col bg-[var(--panel)] border border-[var(--border)]">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Share Stats & Short Interest</h3>
          <div className="flex-1 flex flex-col justify-between">
            <StatRow label="Shares Outstanding" value={keyStats.sharesOutstanding} valueType="compact" />
            <StatRow label="Float Shares" value={keyStats.floatShares} valueType="compact" />
            <StatRow label="Shares Short" value={keyStats.sharesShort} valueType="compact" />
            <StatRow label="Short Ratio" value={keyStats.shortRatio} />
            <StatRow label="Short % of Float" value={keyStats.shortPercentOfFloat} valueType="pct" />
            <StatRow label="Insiders Held %" value={keyStats.heldPercentInsiders} valueType="pct" />
            <StatRow label="Institutions Held %" value={keyStats.heldPercentInstitutions} valueType="pct" />
            <StatRow label="Net Income" value={keyStats.netIncomeToCommon} valueType="moneyCompact" />
          </div>
        </div>

        {/* Card 4: Efficiency & Returns */}
        <div className="panel panel-pad flex flex-col bg-[var(--panel)] border border-[var(--border)]">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Efficiency & Returns</h3>
          <div className="flex-1 flex flex-col justify-between">
            <StatRow label="Operating Margin" value={financials.operatingMargins} valueType="pct" />
            <StatRow label="Profit Margin" value={financials.profitMargins || keyStats.profitMargins} valueType="pct" />
            <StatRow label="Return on Assets (ROA)" value={financials.returnOnAssets} valueType="pct" />
            <StatRow label="Return on Equity (ROE)" value={financials.returnOnEquity} valueType="pct" />
            <StatRow label="Operating Cash Flow" value={financials.operatingCashflow} valueType="moneyCompact" />
            <StatRow label="Free Cash Flow" value={financials.freeCashflow} valueType="moneyCompact" />
          </div>
        </div>
      </div>

      {/* Technical Analysis & Indicators Panel */}
      <div className="panel panel-pad bg-[var(--panel)] border border-[var(--border)]">
        <h2 className="mb-4 text-sm font-semibold text-[var(--accent)]">Technical Indicators</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-[var(--border)] rounded-md p-3 flex flex-col justify-between bg-[var(--soft)]/20">
            <span className="eyebrow text-[10px]">RSI (14 Daily)</span>
            <span className={`text-base font-bold my-1 ${rsiDetails.className}`}>{rsiDetails.text}</span>
            <span className="text-[10px] muted">Calculated over trailing 14 trading sessions</span>
          </div>

          <div className="border border-[var(--border)] rounded-md p-3 flex flex-col justify-between bg-[var(--soft)]/20">
            <span className="eyebrow text-[10px]">MACD (12, 26, 9)</span>
            {macd ? (
              <div className="my-1">
                <div className={`text-base font-bold ${macd.histogram > 0 ? "text-green-400" : "text-red-400"}`}>
                  {macd.signalLabel}
                </div>
                <div className="mono text-[10px] muted mt-0.5">
                  Value: {macd.macd.toFixed(2)} / Signal: {macd.signal.toFixed(2)}
                </div>
              </div>
            ) : (
              <span className="text-base font-bold my-1 text-[var(--muted)]">—</span>
            )}
            <span className="text-[10px] muted">Moving Average Convergence Divergence</span>
          </div>

          <div className="border border-[var(--border)] rounded-md p-3 flex flex-col justify-between bg-[var(--soft)]/20">
            <span className="eyebrow text-[10px]">Bollinger Bands (20, 2)</span>
            {bb ? (
              <div className="my-1 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold mono">{(bb.position * 100).toFixed(0)}% position</span>
                  <span className="text-[10px] muted mono">[{fmtMoney(bb.lower, 1)}, {fmtMoney(bb.upper, 1)}]</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--soft)] rounded-full overflow-hidden border border-[var(--border)]">
                  <div 
                    className={`h-full rounded-full ${
                      bb.position > 1 ? "bg-red-500" : bb.position < 0 ? "bg-green-500" : "bg-[var(--accent)]"
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, bb.position * 100))}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-base font-bold my-1 text-[var(--muted)]">—</span>
            )}
            <span className="text-[10px] muted">20-period SMA ± 2 standard deviations</span>
          </div>

          <div className="border border-[var(--border)] rounded-md p-3 flex flex-col justify-between bg-[var(--soft)]/20">
            <span className="eyebrow text-[10px]">Trend & Volatility</span>
            <div className="my-1 flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-xs muted">SMA Cross</span>
                {isGoldenCross == null ? (
                  <span className="text-xs font-semibold mono">—</span>
                ) : isGoldenCross ? (
                  <span className="badge bg-emerald-950/40 text-emerald-400 border-emerald-900/50 text-[10px] py-0 font-bold">GOLDEN CROSS</span>
                ) : (
                  <span className="badge bg-rose-950/40 text-rose-400 border-rose-900/50 text-[10px] py-0 font-bold">DEATH CROSS</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-xs muted">Ann. Volatility</span>
                <span className="text-xs font-semibold mono">
                  {volatility != null ? fmtPct(volatility, { decimals: 1 }) : "—"}
                </span>
              </div>
            </div>
            <span className="text-[10px] muted">SMA 50: {fmtMoney(sma50)} / SMA 200: {fmtMoney(sma200)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel panel-pad lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Sector news (7d)</h2>
          {news.length === 0 ? (
            <EmptyNote>No stored news.</EmptyNote>
          ) : (
            <ul className="space-y-2">
              {news.map((n) => (
                <li key={n.urlHash} className="text-sm">
                  <a href={n.url} target="_blank" rel="noreferrer" className="hover:underline">
                    {n.title}
                  </a>
                  <div className="muted text-xs">
                    {n.source ?? "unknown"} · sector {n.sectorCode}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel panel-pad">
            <h2 className="mb-2 text-sm font-semibold">Upcoming</h2>
            {catalysts.length === 0 ? (
              <EmptyNote>No dated catalysts.</EmptyNote>
            ) : (
              <ul className="space-y-1.5">
                {catalysts.map((c) => (
                  <li key={c.id} className="flex items-baseline gap-2 text-xs">
                    <span className="mono shrink-0 text-[var(--muted)]">{c.d}</span>
                    <span className="badge shrink-0">{c.kind}</span>
                    <span>{c.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel panel-pad">
            <h2 className="mb-2 text-sm font-semibold">Position</h2>
            {position ? (
              <div className="text-sm">
                <div className="mono">
                  {position.qty} @ {fmtMoney(position.avgCost)}
                </div>
                {metrics.lastClose != null && position.avgCost > 0 ? (
                  <div className="mt-1">
                    unrealized{" "}
                    <Pct value={((metrics.lastClose - position.avgCost) / position.avgCost) * 100} />
                  </div>
                ) : null}
                <div className="muted mt-1 text-xs">
                  opened {position.openedAt ?? "—"} · manage in{" "}
                  <Link href="/journal" className="underline">
                    Journal
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyNote>
                No recorded position. Track one in{" "}
                <Link href="/journal" className="underline">
                  Journal
                </Link>
                .
              </EmptyNote>
            )}
          </div>

          <div className="panel panel-pad">
            <h2 className="mb-2 text-sm font-semibold">Journal</h2>
            {journal.length === 0 ? (
              <EmptyNote>No entries for {ticker.symbol} yet.</EmptyNote>
            ) : (
              <ul className="space-y-2">
                {journal.slice(0, 5).map((j) => (
                  <li key={j.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="badge">{j.action}</span>
                      <span className="muted mono">{j.createdAt.toISOString().slice(0, 10)}</span>
                    </div>
                    <div className="mt-0.5">{j.thesis}</div>
                    {j.invalidation ? (
                      <div className="muted mt-0.5">invalidate: {j.invalidation}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
