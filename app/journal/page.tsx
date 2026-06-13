import { prisma } from "@/lib/prisma";
import {
  JournalClient,
  PositionsClient,
  type JournalRow,
  type PositionRow,
} from "@/components/journal-client";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const [positions, entries] = await Promise.all([
    prisma.position.findMany({ orderBy: { symbol: "asc" } }),
    prisma.journalEntry.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const lastCloses = new Map<string, number>();
  for (const p of positions) {
    const row = await prisma.price.findFirst({
      where: { symbol: p.symbol },
      orderBy: { d: "desc" },
      select: { close: true },
    });
    if (row) lastCloses.set(p.symbol, row.close);
  }

  const positionRows: PositionRow[] = positions.map((p) => ({
    symbol: p.symbol,
    qty: p.qty,
    avgCost: p.avgCost,
    openedAt: p.openedAt,
    lastClose: lastCloses.get(p.symbol) ?? null,
  }));

  const journalRows: JournalRow[] = entries.map((e) => ({
    id: e.id,
    symbol: e.symbol,
    action: e.action,
    thesis: e.thesis,
    invalidation: e.invalidation,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine</div>
          <h1 className="page-title">Journal</h1>
          <p className="page-subtitle">
            Manual records only — the engine never places orders. Every entry needs a
            thesis and ideally the fact that would invalidate it.
          </p>
        </div>
      </div>

      <div className="panel panel-pad">
        <h2 className="mb-3 text-sm font-semibold">Positions</h2>
        <PositionsClient positions={positionRows} />
      </div>

      <div className="panel panel-pad">
        <h2 className="mb-3 text-sm font-semibold">Journal</h2>
        <JournalClient entries={journalRows} />
      </div>
    </div>
  );
}
