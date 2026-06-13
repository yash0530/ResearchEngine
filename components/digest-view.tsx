import type { CSSProperties } from "react";
import Link from "next/link";
import type { DigestData } from "@/lib/research/synthesize";
import { Markdown } from "@/components/markdown";
import { SeverityChip } from "@/components/ui";

function sevColor(severity: string): string {
  return severity === "critical"
    ? "var(--bad)"
    : severity === "warn"
      ? "var(--warn)"
      : "var(--border)";
}

/** Renders one digest's narrative + ranked, provenance-backed signals. Shared by the
 *  digest archive detail page (kept separate from the Morning home layout on purpose). */
export function DigestView({
  data,
  llmMd,
  llmProvider,
  llmModel,
}: {
  data: DigestData;
  llmMd: string | null;
  llmProvider: string | null;
  llmModel: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="panel panel-pad">
        <p className="text-base font-medium leading-snug">{data.headline}</p>
        {llmMd ? (
          <div className="mt-3 text-sm">
            <Markdown>{llmMd}</Markdown>
          </div>
        ) : null}
        <p className="muted mt-3 border-t border-[var(--border)] pt-2 text-[10px]">
          {llmMd && llmModel ? `Narrated by ${llmProvider}/${llmModel}. ` : ""}
          {data.counts.insightsTotal} signals · {data.counts.criticals} critical · as of{" "}
          {data.asOf ?? "—"}. Research, not advice.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Signals — ranked, with provenance</h2>
        {data.insights.length === 0 ? (
          <p className="muted py-2 text-sm">No material signals in this digest.</p>
        ) : (
          <ul className="space-y-2">
            {data.insights.map((i, idx) => (
              <li
                key={idx}
                className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-3"
                style={{ borderLeft: `3px solid ${sevColor(i.severity)}` } as CSSProperties}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm leading-snug">{i.headline}</div>
                    <div className="muted mono mt-1 text-[10px]">{i.evidence}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {i.sector ? (
                      <Link href={`/sectors/${i.sector}`} className="badge hover:text-[var(--text)]">
                        {i.sector}
                      </Link>
                    ) : null}
                    {i.symbol ? (
                      <Link href={`/tickers/${i.symbol}`} className="badge mono hover:text-[var(--text)]">
                        {i.symbol}
                      </Link>
                    ) : null}
                    <SeverityChip severity={i.severity} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
