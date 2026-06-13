import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EmptyNote } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BriefsPage() {
  const briefs = await prisma.brief.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine</div>
          <h1 className="page-title">Briefs</h1>
          <p className="page-subtitle">
            Every analyst run, stored with the exact payload that was sent — the audit
            trail is a feature.
          </p>
        </div>
      </div>

      {briefs.length === 0 ? (
        <EmptyNote>
          No briefs yet. Set a provider key in .env, then run the nightly job from Ops.
        </EmptyNote>
      ) : (
        <div className="panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Kind</th>
                  <th>Provider / model</th>
                  <th>Created</th>
                  <th>Tokens in/out</th>
                  <th>OK</th>
                </tr>
              </thead>
              <tbody>
                {briefs.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/briefs/${b.id}`} className="mono font-semibold hover:underline">
                        {b.id}
                      </Link>
                    </td>
                    <td><span className="badge">{b.kind}</span></td>
                    <td className="mono text-xs">{b.provider} / {b.model}</td>
                    <td className="muted text-xs">{b.createdAt.toLocaleString()}</td>
                    <td className="mono text-xs">
                      {b.inputTokens ?? "—"} / {b.outputTokens ?? "—"}
                    </td>
                    <td>
                      <span className={b.ok ? "text-[var(--good)]" : "text-[var(--bad)]"}>
                        {b.ok ? "ok" : "invalid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
