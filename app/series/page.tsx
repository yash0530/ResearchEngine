import { prisma } from "@/lib/prisma";
import { MANUAL_SERIES, MANUAL_SERIES_META } from "@/config/sectors";
import { SeriesCard, type SeriesRow } from "@/components/series-client";

export const dynamic = "force-dynamic";

export default async function SeriesPage() {
  const all = await prisma.manualSeries.findMany({ orderBy: { d: "desc" } });
  const bySeries = new Map<string, SeriesRow[]>();
  for (const r of all) {
    let arr = bySeries.get(r.series);
    if (!arr) bySeries.set(r.series, (arr = []));
    arr.push({ d: r.d, value: r.value, note: r.note });
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine</div>
          <h1 className="page-title">Manual series</h1>
          <p className="page-subtitle">
            Hand-entered fundamentals the tripwires read. DDR5/NAND pricing momentum and the
            capex flag drive the memory-exit logic; keep them current.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {MANUAL_SERIES.map((series) => (
          <SeriesCard
            key={series}
            series={series}
            label={MANUAL_SERIES_META[series].label}
            hint={MANUAL_SERIES_META[series].hint}
            rows={bySeries.get(series) ?? []}
          />
        ))}
      </div>
    </div>
  );
}
