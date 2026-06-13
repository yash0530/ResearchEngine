"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { runEventModeAction, testNtfyAction } from "@/app/actions";

const JOB_BUTTONS: { name: string; label: string; note?: string }[] = [
  { name: "prices", label: "Prices", note: "daily closes + backup" },
  { name: "news", label: "News" },
  { name: "earnings", label: "Earnings", note: "slow — ~1/sec" },
  { name: "rules", label: "Rules" },
  { name: "nightly", label: "Nightly brief", note: "needs a key" },
  { name: "monthly", label: "Monthly re-rate", note: "needs a key" },
  { name: "morning", label: "Morning push" },
  { name: "backup", label: "Backup" },
];

export function OpsClient() {
  const [running, setRunning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [event, setEvent] = useState("");

  async function runJob(name: string) {
    setRunning(name);
    try {
      const res = await fetch(`/api/jobs/${name}`, { method: "POST" });
      const data = (await res.json()) as { ok: boolean; detail: string };
      if (data.ok) toast.success(`${name}: ${data.detail}`, { duration: 8000 });
      else toast.error(`${name}: ${data.detail}`, { duration: 10000 });
    } catch (error) {
      toast.error(`${name}: ${error instanceof Error ? error.message : "failed"}`);
    } finally {
      setRunning(null);
    }
  }

  function testNtfy() {
    startTransition(async () => {
      const ok = await testNtfyAction();
      if (ok) toast.success("ntfy push sent — check your phone");
      else toast.error("ntfy not sent (disabled, no topic, or unreachable)");
    });
  }

  function runEvent() {
    startTransition(async () => {
      try {
        const result = await runEventModeAction(event);
        if (result.ok) {
          toast.success(`Event analysis: ${result.detail}`, { duration: 8000 });
          setEvent("");
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

      <div className="panel panel-pad">
        <h2 className="mb-2 text-sm font-semibold">Notifications</h2>
        <button type="button" className="btn" disabled={pending} onClick={testNtfy}>
          Send test push
        </button>
        <p className="muted mt-2 text-xs">
          Configure NTFY_ENABLED / NTFY_TOPIC in .env and subscribe to the topic in the ntfy app.
        </p>
      </div>
    </div>
  );
}
