"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { addManualSeriesAction, deleteManualSeriesAction } from "@/app/actions";

export type SeriesRow = { d: string; value: number; note: string | null };

export function SeriesCard({
  series,
  label,
  hint,
  rows,
}: {
  series: string;
  label: string;
  hint: string;
  rows: SeriesRow[];
}) {
  const [d, setD] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const latest = rows[0];

  function submit() {
    startTransition(async () => {
      try {
        await addManualSeriesAction({ series, d, value: Number(value), note: note || undefined });
        toast.success(`${label} updated`);
        setValue("");
        setNote("");
        setD("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save");
      }
    });
  }

  function remove(date: string) {
    startTransition(async () => {
      try {
        await deleteManualSeriesAction({ series, d: date });
      } catch {
        toast.error("Failed to delete");
      }
    });
  }

  const valid = /^\d{4}-\d{2}(-\d{2})?$/.test(d) && value !== "" && Number.isFinite(Number(value));

  return (
    <div className="panel panel-pad">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="mono text-lg font-bold">
          {latest ? latest.value : <span className="muted text-sm">no data</span>}
        </span>
      </div>
      <p className="muted mt-1 text-xs">{hint}</p>

      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <div>
          <label className="label">Date</label>
          <input className="input mono" placeholder="YYYY-MM" value={d}
            onChange={(e) => setD(e.target.value)} />
        </div>
        <div>
          <label className="label">Value</label>
          <input className="input mono" placeholder="2.0" inputMode="decimal" value={value}
            onChange={(e) => setValue(e.target.value)} />
        </div>
        <div>
          <label className="label">Note</label>
          <input className="input" placeholder="optional" value={note}
            onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button type="button" className="btn btn-primary w-full" disabled={pending || !valid} onClick={submit}>
            {pending ? "Saving…" : "Add reading"}
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="table-wrap mt-3">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Value</th>
                <th>Note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((r) => (
                <tr key={r.d}>
                  <td className="mono">{r.d}</td>
                  <td className={`mono ${r.value < 0 ? "text-[var(--bad)]" : r.value > 0 ? "text-[var(--good)]" : ""}`}>
                    {r.value}
                  </td>
                  <td className="muted text-xs">{r.note ?? "—"}</td>
                  <td>
                    <button
                      type="button"
                      aria-label={`Delete ${r.d}`}
                      className="btn btn-danger px-2 py-1"
                      disabled={pending}
                      onClick={() => remove(r.d)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
