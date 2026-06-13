import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTickerDetail } from "@/lib/board";
import { PriceChart } from "@/components/price-chart";
import { EmptyNote, Pct, StageChip } from "@/components/ui";
import { fmtCompact, fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel p-3">
      <div className="label mb-1">{label}</div>
      <div className="text-lg font-semibold">{children}</div>
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
  const { ticker, closes, metrics, lastVolume, position, journal, catalysts, news } = detail;

  return (
    <div className="space-y-6">
      <div className="page-header">
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
        <div className="text-right">
          <div className="mono text-2xl font-semibold">{fmtMoney(metrics.lastClose)}</div>
          <div className="muted mono text-xs">as of {metrics.lastDate ?? "—"}</div>
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
