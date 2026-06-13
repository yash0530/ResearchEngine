import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { loadDriverDetail } from "@/lib/research/drivers";
import { Pct, StageChip } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DriverPage({
  params,
}: {
  params: Promise<{ driver: string }>;
}) {
  const { driver } = await params;
  const n = Number(driver);
  const detail = Number.isInteger(n) ? await loadDriverDetail(n) : null;
  if (!detail) notFound();
  const { rollup, sectors } = detail;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine · driver {rollup.driver}</div>
          <h1 className="page-title">{rollup.label}</h1>
          <p className="page-subtitle">{rollup.sectorCount} sectors. Research, not advice.</p>
        </div>
        <Link href="/" className="muted flex items-center gap-1 text-xs hover:text-[var(--text)]">
          morning <ArrowUpRight size={12} />
        </Link>
      </div>

      <div className="panel panel-pad">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="muted text-[10px] uppercase tracking-wide">30d</div>
            <div className="mt-0.5">
              <Pct value={rollup.avg30d} decimals={1} />
            </div>
          </div>
          <div>
            <div className="muted text-[10px] uppercase tracking-wide">vs hyperscalers 30d</div>
            <div className="mono mt-0.5">
              {rollup.vsHyperscaler30d === null ? (
                <span className="muted">—</span>
              ) : (
                <span className={rollup.vsHyperscaler30d >= 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}>
                  {rollup.vsHyperscaler30d > 0 ? "+" : ""}
                  {rollup.vsHyperscaler30d}pp
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="muted text-[10px] uppercase tracking-wide">active signals</div>
            <div className="mt-0.5">{rollup.signalCount}</div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Sectors in this driver</h2>
        <ul className="space-y-2">
          {sectors.map((s) => (
            <li key={s.code}>
              <Link
                href={`/sectors/${s.code}`}
                className="panel block p-3 transition hover:border-[var(--accent)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="mono text-[10px] text-[var(--muted)]">{s.code}</span>{" "}
                    <span className="font-medium">{s.name}</span> <StageChip stage={s.stage} />
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs">
                    <span>
                      <span className="muted">30d </span>
                      <Pct value={s.avg30d} decimals={1} />
                    </span>
                    {s.worstDrawdown ? (
                      <span className="muted mono">
                        {s.worstDrawdown.symbol} {s.worstDrawdown.dd}%
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
