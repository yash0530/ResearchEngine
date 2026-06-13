import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Markdown } from "@/components/markdown";
import { StageChip } from "@/components/ui";

export const dynamic = "force-dynamic";

type ParsedBrief = {
  brief_md?: string;
  flags?: string[];
  watch_today?: string[];
  ratings?: { sector: string; stage: string; changed: boolean; rationale: string }[];
};

function tryParse(json: string): ParsedBrief | null {
  try {
    return JSON.parse(json) as ParsedBrief;
  } catch {
    return null;
  }
}

function prettify(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const briefId = Number(id);
  if (!Number.isInteger(briefId)) notFound();
  const brief = await prisma.brief.findUnique({ where: { id: briefId } });
  if (!brief) notFound();

  const parsed = brief.ok ? tryParse(brief.outputJson) : null;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">
            <Link href="/briefs" className="hover:underline">Briefs</Link> · #{brief.id}
          </div>
          <h1 className="page-title">{brief.kind.replaceAll("_", " ")}</h1>
          <p className="page-subtitle">
            {brief.provider} / {brief.model} · {brief.createdAt.toLocaleString()} ·{" "}
            {brief.inputTokens ?? "?"}/{brief.outputTokens ?? "?"} tokens ·{" "}
            <span className={brief.ok ? "text-[var(--good)]" : "text-[var(--bad)]"}>
              {brief.ok ? "valid" : "failed validation"}
            </span>
          </p>
        </div>
      </div>

      {parsed?.brief_md ? (
        <div className="panel panel-pad">
          <Markdown>{parsed.brief_md}</Markdown>
        </div>
      ) : null}

      {parsed?.flags?.length ? (
        <div className="panel panel-pad">
          <h2 className="mb-2 text-sm font-semibold text-[var(--warn)]">Flags — verify today</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {parsed.flags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {parsed?.watch_today?.length ? (
        <div className="panel panel-pad">
          <h2 className="mb-2 text-sm font-semibold">Watch today</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {parsed.watch_today.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {parsed?.ratings?.length ? (
        <div className="panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th>Proposed stage</th>
                  <th>Changed</th>
                  <th>Rationale</th>
                </tr>
              </thead>
              <tbody>
                {parsed.ratings.map((r) => (
                  <tr key={r.sector} className={r.changed ? "bg-[var(--soft)]" : ""}>
                    <td className="mono font-semibold">{r.sector}</td>
                    <td><StageChip stage={r.stage} /></td>
                    <td>{r.changed ? "yes" : "—"}</td>
                    <td className="text-xs">{r.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-pad">
            <Link href="/rerate" className="btn inline-flex text-xs">
              Review &amp; apply on the Re-rate page
            </Link>
          </div>
        </div>
      ) : null}

      {!brief.ok ? (
        <div className="panel panel-pad">
          <h2 className="mb-2 text-sm font-semibold text-[var(--bad)]">Raw model output (invalid)</h2>
          <pre className="mono max-h-96 overflow-auto whitespace-pre-wrap text-xs">{brief.outputJson}</pre>
        </div>
      ) : null}

      <details className="panel panel-pad">
        <summary className="cursor-pointer text-sm font-semibold">
          Audit trail — exact request payload
        </summary>
        <pre className="mono mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs">
          {prettify(brief.inputJson)}
        </pre>
      </details>

      {brief.ok ? (
        <details className="panel panel-pad">
          <summary className="cursor-pointer text-sm font-semibold">Parsed output JSON</summary>
          <pre className="mono mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs">
            {prettify(brief.outputJson)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
