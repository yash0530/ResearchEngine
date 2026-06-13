import Link from "next/link";
import { ArrowUpRight, Bell, CalendarDays, FileText } from "lucide-react";
import { loadBoardPage } from "@/lib/board";
import { STAGES } from "@/config/sectors";
import { SectorSparkline } from "@/components/sector-sparkline";
import { Markdown } from "@/components/markdown";
import { DriverBadge, EmptyNote, Pct, SeverityChip, StageChip } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const board = await loadBoardPage();
  const stale = board.ageDays !== null && board.ageDays > 3;

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine · field map</div>
          <h1 className="page-title">Board</h1>
          <p className="page-subtitle">
            12 AI-infrastructure sectors by lifecycle stage. Research, not advice.
          </p>
        </div>
        <div className={`text-right text-xs ${stale ? "text-[var(--bad)]" : "muted"}`}>
          data as of <span className="mono">{board.asOf ?? "—"}</span>
          {stale ? ` (${board.ageDays}d old — run prices)` : ""}
        </div>
      </div>

      {/* Stage grid — the hero */}
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

      {/* Top movers strip */}
      <div className="panel panel-pad">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Top movers (1d)</h2>
          <Link href="/tickers" className="muted flex items-center gap-1 text-xs hover:text-[var(--text)]">
            universe <ArrowUpRight size={12} />
          </Link>
        </div>
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

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Latest brief */}
        <div className="panel panel-pad lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <FileText size={14} /> Latest brief
            </h2>
            <Link href="/briefs" className="muted flex items-center gap-1 text-xs hover:text-[var(--text)]">
              archive <ArrowUpRight size={12} />
            </Link>
          </div>
          {board.latestBrief?.briefMd ? (
            <>
              <div className="muted mb-2 text-xs">
                {board.latestBrief.createdAt.toLocaleString()}
              </div>
              <div className="text-sm">
                <Markdown>{board.latestBrief.briefMd}</Markdown>
              </div>
            </>
          ) : (
            <EmptyNote>
              No brief yet. Add a provider key to .env, then run the nightly job from Ops.
            </EmptyNote>
          )}
        </div>

        <div className="space-y-4">
          {/* Unacked alerts */}
          <div className="panel panel-pad">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Bell size={14} /> Alerts
              </h2>
              <Link href="/alerts" className="muted flex items-center gap-1 text-xs hover:text-[var(--text)]">
                all <ArrowUpRight size={12} />
              </Link>
            </div>
            {board.unacked.length === 0 ? (
              <EmptyNote>Nothing unacknowledged.</EmptyNote>
            ) : (
              <ul className="space-y-2">
                {board.unacked.map((e) => (
                  <li key={e.id} className="text-xs">
                    <SeverityChip severity={e.severity} />{" "}
                    <span className="muted mono">{e.firedAt.toISOString().slice(0, 10)}</span>
                    <div className="mt-0.5">{e.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Catalysts */}
          <div className="panel panel-pad">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays size={14} /> Next 14 days
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
    </div>
  );
}
