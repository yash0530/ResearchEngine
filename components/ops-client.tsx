"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { runEventModeAction, resetDatabaseAction } from "@/app/actions";

const JOB_BUTTONS: { name: string; label: string; note?: string }[] = [
  { name: "overnight", label: "Overnight pipeline", note: "runs the full chain in order" },
  { name: "prices", label: "Prices", note: "daily closes + backup" },
  { name: "news", label: "News" },
  { name: "earnings", label: "Earnings", note: "slow — ~1/sec" },
  { name: "rules", label: "Rules" },
  { name: "nightly", label: "Nightly brief", note: "needs a key" },
  { name: "monthly", label: "Monthly re-rate", note: "needs a key" },
  { name: "morning", label: "Morning digest", note: "builds the dashboard digest" },
  { name: "backup", label: "Backup" },
];

export function OpsClient() {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [event, setEvent] = useState("");
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (
      !confirm(
        "Are you sure you want to hard reset the database? This will wipe all pricing, news, briefs, rules, and custom positions/journals, and re-seed the default taxonomy."
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      const result = await resetDatabaseAction();
      if (result.ok) {
        toast.success(result.detail);
        router.refresh();
      } else {
        toast.error(result.detail);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  async function runJob(name: string) {
    setRunning(name);
    try {
      const res = await fetch(`/api/jobs/${name}`, { method: "POST" });
      const data = (await res.json()) as { ok: boolean; detail: string };
      if (data.ok) toast.success(`${name}: ${data.detail}`, { duration: 8000 });
      else toast.error(`${name}: ${data.detail}`, { duration: 10000 });
      router.refresh();
    } catch (error) {
      toast.error(`${name}: ${error instanceof Error ? error.message : "failed"}`);
    } finally {
      setRunning(null);
    }
  }

  function runEvent() {
    startTransition(async () => {
      try {
        const result = await runEventModeAction(event);
        if (result.ok) {
          toast.success(`Event analysis: ${result.detail}`, { duration: 8000 });
          setEvent("");
          router.refresh();
        } else {
          toast.error(`Event analysis: ${result.detail}`, { duration: 10000 });
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="panel panel-pad">
        <h2 className="mb-3 text-sm font-semibold">Run a job now</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {JOB_BUTTONS.map((job) => (
            <button
              key={job.name}
              type="button"
              className="btn justify-start"
              disabled={running !== null}
              onClick={() => runJob(job.name)}
            >
              <Play size={13} />
              <span className="flex flex-col items-start">
                <span>{running === job.name ? "Running…" : job.label}</span>
                {job.note ? <span className="muted text-[10px] font-normal">{job.note}</span> : null}
              </span>
            </button>
          ))}
        </div>
        <p className="muted mt-2 text-xs">
          Same code path as the scheduler. Results are written to job runs below.
        </p>
      </div>

      <div className="panel panel-pad">
        <h2 className="mb-3 text-sm font-semibold">Event mode</h2>
        <p className="muted mb-2 text-xs">
          Describe a market event; the analyst re-assesses which sectors are exposed via
          which driver, what to verify at the source within 24h, and what would falsify it.
        </p>
        <textarea
          className="textarea"
          placeholder="e.g. MSFT guided FY27 capex down 15% on the earnings call"
          value={event}
          onChange={(e) => setEvent(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary mt-2"
          disabled={pending || event.trim().length < 5}
          onClick={runEvent}
        >
          {pending ? "Analyzing…" : "Run event analysis"}
        </button>
      </div>

      <div className="panel panel-pad border-[color-mix(in_srgb,var(--bad)_40%,transparent)] bg-[color-mix(in_srgb,var(--bad)_3%,transparent)]">
        <h2 className="mb-2 text-sm font-semibold text-[var(--bad)]">Database Reset</h2>
        <p className="muted mb-3 text-xs">
          Wipes the SQLite database completely, drops all custom positions/journals, and re-seeds the default 12-sector AI-infrastructure taxonomy, seed tickers, and static catalysts.
        </p>
        <button
          type="button"
          className="btn btn-danger"
          disabled={resetting || running !== null || pending}
          onClick={handleReset}
        >
          {resetting ? "Resetting database…" : "Reset Database"}
        </button>
      </div>
    </div>
  );
}
