import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSectorDetail } from "@/lib/board";
import { DRIVERS } from "@/config/sectors";
import { SectorSparkline } from "@/components/sector-sparkline";
import { StageEditor } from "@/components/stage-editor";
import { DriverBadge, EmptyNote, StageChip } from "@/components/ui";
import { SectorTableClient } from "@/components/sector-table-client";

export const dynamic = "force-dynamic";

export default async function SectorPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const detail = await loadSectorDetail(code);
  if (!detail) notFound();
  const { sector, members, news, catalysts, spark } = detail;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Sector {sector.code}</div>
          <h1 className="page-title">{sector.name}</h1>
          <p className="page-subtitle">{sector.note}</p>
          <div className="mt-2 flex items-center gap-2">
            <StageChip stage={sector.stage} />
            <DriverBadge driver={sector.driver} />
            <span className="muted text-xs">{DRIVERS[sector.driver]}</span>
          </div>
        </div>
        <div className="w-48">
          <SectorSparkline data={spark} color="auto" height={56} />
          <div className="muted mt-1 text-right text-[10px]">30d, equal-weight</div>
        </div>
      </div>

      <div className="panel panel-pad">
        <h2 className="mb-3 text-sm font-semibold">Re-rate stage</h2>
        <StageEditor code={sector.code} current={sector.stage} />
      </div>

      <SectorTableClient members={members} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel panel-pad lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">News (7d)</h2>
          {news.length === 0 ? (
            <EmptyNote>No stored news for this sector — run the news job.</EmptyNote>
          ) : (
            <ul className="space-y-2">
              {news.map((n) => (
                <li key={n.urlHash} className="text-sm">
                  <a href={n.url} target="_blank" rel="noreferrer" className="hover:underline">
                    {n.title}
                  </a>
                  <div className="muted text-xs">
                    {n.source ?? "unknown"}
                    {n.publishedAt ? ` · ${n.publishedAt.toISOString().slice(0, 10)}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel panel-pad">
            <h2 className="mb-2 text-sm font-semibold">Catalysts (60d)</h2>
            {catalysts.length === 0 ? (
              <EmptyNote>None upcoming.</EmptyNote>
            ) : (
              <ul className="space-y-1.5">
                {catalysts.map((c) => (
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

          <div className="panel panel-pad">
            <h2 className="mb-2 text-sm font-semibold">Stage history</h2>
            {sector.stageHistory.length === 0 ? (
              <EmptyNote>No ratings yet.</EmptyNote>
            ) : (
              <ul className="space-y-2">
                {sector.stageHistory.map((h) => (
                  <li key={h.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <StageChip stage={h.stage} />
                      <span className="muted mono">{h.ratedAt.toISOString().slice(0, 10)}</span>
                      <span className="badge">{h.ratedBy}</span>
                    </div>
                    {h.rationale ? <div className="muted mt-0.5">{h.rationale}</div> : null}
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
