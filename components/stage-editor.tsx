"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setSectorStageAction } from "@/app/actions";
import { STAGES } from "@/config/sectors";

export function StageEditor({ code, current }: { code: string; current: string }) {
  const [stage, setStage] = useState(current);
  const [rationale, setRationale] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await setSectorStageAction({ code, stage, rationale });
        toast.success(`Sector ${code} re-rated to ${stage}`);
        setRationale("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to set stage");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label" htmlFor={`stage-${code}`}>
          Stage
        </label>
        <select
          id={`stage-${code}`}
          className="select w-40"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-56 flex-1">
        <label className="label" htmlFor={`rationale-${code}`}>
          Rationale
        </label>
        <input
          id={`rationale-${code}`}
          className="input"
          placeholder="Why? (recorded in stage history)"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending || !rationale.trim() || stage === current}
        onClick={submit}
      >
        {pending ? "Saving…" : "Set stage"}
      </button>
    </div>
  );
}
