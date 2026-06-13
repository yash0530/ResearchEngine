"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { applyRerateAction } from "@/app/actions";
import { StageChip } from "@/components/ui";

export type RerateRow = {
  sector: string;
  name: string;
  currentStage: string;
  proposedStage: string;
  changed: boolean;
  rationale: string;
};

export function RerateClient({ rows }: { rows: RerateRow[] }) {
  const changedRows = useMemo(
    () => rows.filter((r) => r.changed && r.proposedStage !== r.currentStage),
    [rows],
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(changedRows.map((r) => r.sector)),
  );
  const [pending, startTransition] = useTransition();

  function toggle(sector: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  }

  function apply(sectors: string[]) {
    const payload = rows
      .filter((r) => sectors.includes(r.sector))
      .map((r) => ({ sector: r.sector, stage: r.proposedStage, rationale: r.rationale }));
    if (payload.length === 0) return;
    startTransition(async () => {
      try {
        const result = await applyRerateAction(payload);
        toast.success(`Applied ${result.applied} stage change(s)`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to apply");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-primary text-xs"
          disabled={pending || selected.size === 0}
          onClick={() => apply([...selected])}
        >
          Apply selected ({selected.size})
        </button>
        <button
          type="button"
          className="btn text-xs"
          disabled={pending || changedRows.length === 0}
          onClick={() => apply(changedRows.map((r) => r.sector))}
        >
          Apply all changed ({changedRows.length})
        </button>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th />
                <th>Sector</th>
                <th>Current</th>
                <th>Proposed</th>
                <th>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isChange = r.changed && r.proposedStage !== r.currentStage;
                return (
                  <tr key={r.sector} className={isChange ? "bg-[var(--soft)]" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={!isChange}
                        checked={selected.has(r.sector)}
                        onChange={() => toggle(r.sector)}
                      />
                    </td>
                    <td>
                      <span className="mono font-semibold">{r.sector}</span>{" "}
                      <span className="muted text-xs">{r.name}</span>
                    </td>
                    <td><StageChip stage={r.currentStage} /></td>
                    <td>
                      {isChange ? (
                        <StageChip stage={r.proposedStage} />
                      ) : (
                        <span className="muted text-xs">no change</span>
                      )}
                    </td>
                    <td className="text-xs">{r.rationale}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
