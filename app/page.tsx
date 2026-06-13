import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, CalendarDays, Sparkles } from "lucide-react";
import { loadBoardPage, loadLatestDigest } from "@/lib/board";
import { loadPositionContext } from "@/lib/research/positions";
import type { DigestData } from "@/lib/research/synthesize";
import { STAGES } from "@/config/sectors";
import { SectorSparkline } from "@/components/sector-sparkline";
import { Markdown } from "@/components/markdown";
import { DriverBadge, EmptyNote, Pct, SeverityChip, StageChip } from "@/components/ui";

export const dynamic = "force-dynamic";

function sevColor(severity: string): string {
  return severity === "critical"
    ? "var(--bad)"
    : severity === "warn"
      ? "var(--warn)"
      : "var(--border)";
}

function InsightList({ insights }: { insights: DigestData["insights"] }) {
  if (insights.length === 0) return <EmptyNote>No material signals this morning.</EmptyNote>;
  return (
    <ul className="space-y-2">
      {insights.map((i, idx) => (
        <li
          key={idx}
          className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-3"
          style={{ borderLeft: `3px solid ${sevColor(i.severity)}` } as CSSProperties}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm leading-snug">{i.headline}</div>
              <div className="muted mono mt-1 text-[10px]">{i.evidence}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {i.sector ? (
                <Link href={`/sectors/${i.sector}`} className="badge hover:text-[var(--text)]">
                  {i.sector}
                </Link>
              ) : null}
              {i.symbol ? (
                <Link href={`/tickers/${i.symbol}`} className="badge mono hover:text-[var(--text)]">
                  {i.symbol}
                </Link>
              ) : null}
              <SeverityChip severity={i.severity} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function MorningPage() {
  const [digest, board, posCtx] = await Promise.all([loadLatestDigest(), loadBoardPage(), loadPositionContext()]);
  const d = digest?.data ?? null;
  const stale = (d?.ageDays ?? board.ageDays ?? 0) > 3;

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine · morning digest</div>
          <h1 className="page-title">Morning</h1>
          <p className="page-subtitle">
            One synthesized read of the AI-infrastructure board. Research, not advice — verify at source.
          </p>
        </div>
        <div className={`text-right text-xs ${stale ? "text-[var(--bad)]" : "muted"}`}>
          data as of <span className="mono">{d?.asOf ?? board.asOf ?? "—"}</span>
          {stale ? ` (${d?.ageDays ?? board.ageDays}d old — run prices)` : ""}
          {digest ? (
            <div className="muted mt-0.5">built {digest.createdAt.toLocaleString()}</div>
          ) : null}
        </div>
      </div>

      {!digest || !d ? (
        <div className="panel panel-pad">
          <EmptyNote>
            No digest yet. Run the <span className="mono">overnight</span> pipeline (or just{" "}
            <span className="mono">morning</span>) from{" "}
            <Link href="/ops" className="underline">
              Ops
            </Link>{" "}
            to build today&apos;s synthesis.
          </EmptyNote>
        </div>
      ) : (
        <>
          {/* Hero: headline + editor's note + market */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="panel panel-pad lg:col-span-2">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={15} />
                <h2 className="text-sm font-semibold">What matters this morning</h2>
              </div>
              <p className="text-base font-medium leading-snug">{d.headline}</p>
              {digest.llmMd ? (
                <div className="mt-3 text-sm">
                  <Markdown>{digest.llmMd}</Markdown>
                </div>
              ) : (
                <p className="muted mt-3 text-xs">
                  Deterministic digest only — add a provider key (<span className="mono">.env</span>)
                  to layer a written synthesis on top of the computed signals below.
                </p>
              )}
              <p className="muted mt-3 border-t border-[var(--border)] pt-2 text-[10px]">
                {digest.llmMd && digest.llmModel
                  ? `Narrated by ${digest.llmProvider}/${digest.llmModel} over the deterministic digest. `
                  : ""}
                Every signal below is computed from stored data with its evidence shown. Research, not advice.
              </p>
            </div>

            <div className="panel panel-pad">
              <h2 className="mb-3 text-sm font-semibold">Capex backdrop</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="muted">Hyperscalers 1d</dt>
                  <dd><Pct value={d.market.hyperscaler1d} decimals={1} /></dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="muted">Hyperscalers 30d</dt>
                  <dd><Pct value={d.market.hyperscaler30d} decimals={1} /></dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="muted">Credit HYG/IEF 30d</dt>
                  <dd><Pct value={d.market.credit30d} decimals={1} /></dd>
                </div>
              </dl>
              <div className="muted mt-3 border-t border-[var(--border)] pt-2 text-[11px]">
                {d.counts.insightsTotal} signals · {d.counts.criticals} critical ·{" "}
                {d.counts.sectorsWithNews}/12 sectors with news
              </div>
            </div>
          </div>

          {/* The signal surface */}
          <div>
            <h2 className="mb-2 text-sm font-semibold">Signals — ranked, with provenance</h2>
            <InsightList insights={d.insights} />
          </div>
        </>
      )}

      {posCtx && posCtx.items.length > 0 && (
        <div className="panel panel-pad">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Your book</h2>
            <span className="text-xs text-[var(--muted)]">{posCtx.items.length} positions · {posCtx.flaggedCount} flagged</span>
          </div>
          <div className="space-y-3">
            {posCtx.items.map((item) => (
              <div key={item.symbol} className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/tickers/${item.symbol}`} className="mono font-semibold hover:text-[var(--text)] transition">
                      {item.symbol}
                    </Link>
                    <div className="flex items-center gap-1">
                      {item.sectors.map((s) => (
                        <StageChip key={s.code} stage={s.stage} />
                      ))}
                    </div>
                    {item.topSeverity && <SeverityChip severity={item.topSeverity} />}
                  </div>
                  {item.flaggedBy.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {item.flaggedBy.map((f, i) => (
                        <li key={i} className="text-xs text-[var(--muted)] leading-snug">• {f}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="text-right text-xs shrink-0">
                  <div>30d: <Pct value={item.pct30d} /></div>
                  <div className="text-[var(--muted)] mt-0.5">dd60: {item.drawdown60 !== null ? `${item.drawdown60}%` : "—"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage board — the live field map */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">The board — 12 sectors by lifecycle stage</h2>
          <Link href="/tickers" className="muted flex items-center gap-1 text-xs hover:text-[var(--text)]">
            universe <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {STAGES.map((stage) => {
            const sectors = board.sectors.filter((s) => s.stage === stage);
            return (
              <div key={stage} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <StageChip stage={stage} />
                  <span className="muted text-xs">{sectors.length}</span>
                </div>
                {sectors.length === 0 && (
                  <div className="rounded-md border border-dashed border-[var(--border)] p-3 text-center text-xs text-[var(--muted)]">
                    empty
                  </div>
                )}
                {sectors.map((s) => (
                  <Link
                    key={s.code}
                    href={`/sectors/${s.code}`}
                    className="panel block p-3 transition hover:border-[var(--accent)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="mono text-[10px] text-[var(--muted)]">
                          {s.code} · {s.memberCount} names
                        </div>
                        <div className="text-sm font-semibold leading-tight">{s.name}</div>
                      </div>
                      <DriverBadge driver={s.driver} />
                    </div>
                    <div className="mt-2">
                      <SectorSparkline data={s.spark} color="auto" height={36} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span>
                        <span className="muted">1d </span>
                        <Pct value={s.avg1d} decimals={1} />
                      </span>
                      <span>
                        <span className="muted">7d </span>
                        <Pct value={s.avg7d} decimals={1} />
                      </span>
                      <span>
                        <span className="muted">30d </span>
                        <Pct value={s.avg30d} decimals={1} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Movers + catalysts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel panel-pad">
          <h2 className="mb-2 text-sm font-semibold">Top movers (1d)</h2>
          {board.topMovers.length === 0 ? (
            <EmptyNote>No price data yet — run the prices job.</EmptyNote>
          ) : (
            <div className="flex flex-wrap gap-2">
              {board.topMovers.map((m) => (
                <Link
                  key={m.symbol}
                  href={`/tickers/${m.symbol}`}
                  className="flex items-center gap-2 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs transition hover:bg-[var(--soft)]"
                  title={m.name ?? m.symbol}
                >
                  <span className="mono font-semibold">{m.symbol}</span>
                  <Pct value={m.pct1d} decimals={1} />
                  <span className="muted mono text-[10px]">{m.sector}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="panel panel-pad">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays size={14} /> Catalysts · next 14 days
            </h2>
            <Link href="/calendar" className="muted flex items-center gap-1 text-xs hover:text-[var(--text)]">
              calendar <ArrowUpRight size={12} />
            </Link>
          </div>
          {board.catalysts.length === 0 ? (
            <EmptyNote>No dated catalysts inside 14 days.</EmptyNote>
          ) : (
            <ul className="space-y-1.5">
              {board.catalysts.map((c) => (
                <li key={c.id} className="flex items-baseline gap-2 text-xs">
                  <span className="mono shrink-0 text-[var(--muted)]">{c.d}</span>
                  <span className="badge shrink-0">{c.kind}</span>
                  <span>
                    {c.symbol ? <span className="mono font-semibold">{c.symbol} </span> : null}
                    {c.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
