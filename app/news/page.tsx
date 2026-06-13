import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SECTOR_SEEDS, sectorSeedByCode } from "@/config/sectors";
import { EmptyNote } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ sector?: string }>;
}) {
  const { sector } = await searchParams;
  const filter = sector && sectorSeedByCode(sector) ? sector : null;

  const items = await prisma.newsItem.findMany({
    where: filter ? { sectorCode: filter } : {},
    orderBy: [{ publishedAt: "desc" }, { fetchedAt: "desc" }],
    take: 150,
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine</div>
          <h1 className="page-title">News</h1>
          <p className="page-subtitle">
            Rolling 7-day window from per-sector Google News queries. Headlines are leads
            to verify, not facts.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/news"
          className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
            !filter
              ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
              : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--soft)]"
          }`}
        >
          all
        </Link>
        {SECTOR_SEEDS.map((s) => (
          <Link
            key={s.code}
            href={`/news?sector=${s.code}`}
            title={s.name}
            className={`mono rounded-md border px-2.5 py-1 text-xs font-semibold ${
              filter === s.code
                ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
                : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--soft)]"
            }`}
          >
            {s.code}
          </Link>
        ))}
      </div>

      {filter ? (
        <p className="muted text-sm">
          Sector {filter} — {sectorSeedByCode(filter)?.name} · query:{" "}
          <span className="mono text-xs">{sectorSeedByCode(filter)?.newsQuery}</span>
        </p>
      ) : null}

      {items.length === 0 ? (
        <EmptyNote>No stored news — run the news job from Ops.</EmptyNote>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.urlHash} className="panel p-3 text-sm">
              <a href={n.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                {n.title}
              </a>
              <div className="muted mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                <span>{n.source ?? "unknown"}</span>
                {n.publishedAt ? <span>{n.publishedAt.toLocaleString()}</span> : null}
                {n.sectorCode ? (
                  <Link href={`/news?sector=${n.sectorCode}`} className="mono hover:underline">
                    sector {n.sectorCode}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
