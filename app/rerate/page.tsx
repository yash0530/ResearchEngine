import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RerateClient, type RerateRow } from "@/components/rerate-client";
import { EmptyNote } from "@/components/ui";

export const dynamic = "force-dynamic";

type Ratings = {
  ratings?: { sector: string; stage: string; changed: boolean; rationale: string }[];
};

export default async function ReratePage() {
  const [latest, sectors] = await Promise.all([
    prisma.brief.findFirst({
      where: { kind: "monthly_rerate", ok: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sector.findMany({ orderBy: { code: "asc" } }),
  ]);

  const currentByCode = new Map(sectors.map((s) => [s.code, s]));
  const rows: RerateRow[] = [];
  if (latest) {
    try {
      const parsed = JSON.parse(latest.outputJson) as Ratings;
      for (const r of parsed.ratings ?? []) {
        const sector = currentByCode.get(r.sector);
        if (!sector) continue;
        rows.push({
          sector: r.sector,
          name: sector.name,
          currentStage: sector.stage,
          proposedStage: r.stage,
          changed: r.changed,
          rationale: r.rationale,
        });
      }
    } catch {
      // leave rows empty on malformed output
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine</div>
          <h1 className="page-title">Re-rate</h1>
          <p className="page-subtitle">
            The analyst proposes; you decide. Applying a change writes the new stage plus a
            human-attributed entry in the sector&apos;s stage history.
          </p>
        </div>
      </div>

      {!latest ? (
        <EmptyNote>
          No monthly re-rate yet. Run it from{" "}
          <Link href="/ops" className="underline">Ops</Link> (or{" "}
          <span className="mono">npm run job -- monthly</span>) — it runs automatically on the
          last day of each month.
        </EmptyNote>
      ) : rows.length === 0 ? (
        <EmptyNote>The latest monthly brief held no usable ratings.</EmptyNote>
      ) : (
        <>
          <p className="muted text-xs">
            From brief{" "}
            <Link href={`/briefs/${latest.id}`} className="underline">#{latest.id}</Link> ·{" "}
            {latest.provider}/{latest.model} · {latest.createdAt.toLocaleString()}
          </p>
          <RerateClient rows={rows} />
        </>
      )}
    </div>
  );
}
