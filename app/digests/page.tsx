import Link from "next/link";
import { loadDigestList } from "@/lib/digests";
import { EmptyNote } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DigestsPage() {
  const digests = await loadDigestList();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine · archive</div>
          <h1 className="page-title">Digests</h1>
          <p className="page-subtitle">
            Past morning digests, newest first — review how signals evolved. Research, not advice.
          </p>
        </div>
      </div>

      {digests.length === 0 ? (
        <div className="panel panel-pad">
          <EmptyNote>
            No digests yet — run the <span className="mono">morning</span> (or{" "}
            <span className="mono">overnight</span>) job.
          </EmptyNote>
        </div>
      ) : (
        <ul className="space-y-2">
          {digests.map((dg) => (
            <li key={dg.id}>
              <Link
                href={`/digests/${dg.id}`}
                className="panel block p-3 transition hover:border-[var(--accent)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mono text-[10px] text-[var(--muted)]">
                      {dg.d} · built {dg.createdAt.toLocaleString()}
                      {dg.llmModel ? ` · ${dg.llmProvider}/${dg.llmModel}` : " · deterministic"}
                    </div>
                    <div className="mt-0.5 text-sm leading-snug">{dg.headline}</div>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <div>{dg.insightsTotal} signals</div>
                    {dg.criticals > 0 ? (
                      <div className="text-[var(--bad)]">{dg.criticals} critical</div>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
