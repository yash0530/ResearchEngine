import { prisma } from "@/lib/prisma";
import { loadTickersList, loadTickersTechnicals } from "@/lib/board";
import { SECTOR_SEEDS } from "@/config/sectors";
import { EmptyNote } from "@/components/ui";
import { TickerAdminClient } from "@/components/ticker-admin-client";
import { TickersTabsClient } from "@/components/tickers-tabs-client";

export const dynamic = "force-dynamic";

export default async function TickersPage() {
  const [tickers, technicals, overrides] = await Promise.all([
    loadTickersList(),
    loadTickersTechnicals(),
    prisma.symbolOverride.findMany({ orderBy: { symbol: "asc" } }),
  ]);

  const active = tickers.filter((t) => t.active);
  const inactive = tickers.filter((t) => !t.active);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine</div>
          <h1 className="page-title">Tickers</h1>
          <p className="page-subtitle">
            {active.length} active names ({inactive.length} inactive). Benchmarks carry no
            sector so they never skew sector averages.
          </p>
        </div>
      </div>

      <div className="panel panel-pad">
        <h2 className="mb-3 text-sm font-semibold">Manage universe</h2>
        <TickerAdminClient 
          sectorCodes={SECTOR_SEEDS.map((s) => s.code)} 
          overrides={overrides}
        />
      </div>

      {tickers.length === 0 ? (
        <EmptyNote>Universe is empty — run the seed.</EmptyNote>
      ) : (
        <TickersTabsClient
          tickers={tickers}
          technicals={technicals}
          overrides={overrides}
          sectors={SECTOR_SEEDS.map((s) => ({ code: s.code, name: s.name }))}
        />
      )}
    </div>
  );
}
