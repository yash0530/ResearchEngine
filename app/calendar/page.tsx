import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { addDaysStr, todayStr } from "@/lib/dates";
import { SECTOR_SEEDS } from "@/config/sectors";
import { CatalystForm, DeleteCatalystButton } from "@/components/catalyst-form";
import { EmptyNote } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const today = todayStr();
  const [dated, undated] = await Promise.all([
    prisma.catalyst.findMany({
      where: { d: { gte: today, lte: addDaysStr(today, 90) } },
      orderBy: { d: "asc" },
    }),
    prisma.catalyst.findMany({ where: { d: null }, orderBy: { id: "asc" } }),
  ]);

  const byDate = new Map<string, typeof dated>();
  for (const c of dated) {
    const key = c.d!;
    let arr = byDate.get(key);
    if (!arr) byDate.set(key, (arr = []));
    arr.push(c);
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine</div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">
            Catalysts for the next 90 days. Earnings refresh weekly via the earnings job;
            everything else is yours to curate.
          </p>
        </div>
      </div>

      <div className="panel panel-pad">
        <h2 className="mb-3 text-sm font-semibold">Add catalyst</h2>
        <CatalystForm sectorCodes={SECTOR_SEEDS.map((s) => s.code)} />
      </div>

      {byDate.size === 0 ? (
        <EmptyNote>No dated catalysts in the next 90 days.</EmptyNote>
      ) : (
        <div className="space-y-4">
          {[...byDate.entries()].map(([d, items]) => (
            <div key={d} className="panel panel-pad">
              <div className="mono mb-2 text-xs font-bold text-[var(--muted)]">{d}</div>
              <ul className="space-y-1.5">
                {items.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="badge shrink-0">{c.kind}</span>
                    {c.sectorCode ? (
                      <Link href={`/sectors/${c.sectorCode}`} className="mono shrink-0 text-xs hover:underline">
                        {c.sectorCode}
                      </Link>
                    ) : null}
                    <span className="flex-1">
                      {c.symbol ? (
                        <Link href={`/tickers/${c.symbol}`} className="mono font-semibold hover:underline">
                          {c.symbol}{" "}
                        </Link>
                      ) : null}
                      {c.title}
                      {c.note ? <span className="muted"> — {c.note}</span> : null}
                    </span>
                    <DeleteCatalystButton id={c.id} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="panel panel-pad">
        <h2 className="mb-2 text-sm font-semibold">Pending — undated watches</h2>
        {undated.length === 0 ? (
          <EmptyNote>Nothing pending.</EmptyNote>
        ) : (
          <ul className="space-y-1.5">
            {undated.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <span className="badge shrink-0">{c.kind}</span>
                {c.sectorCode ? <span className="mono text-xs">{c.sectorCode}</span> : null}
                <span className="flex-1">{c.title}</span>
                <DeleteCatalystButton id={c.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
