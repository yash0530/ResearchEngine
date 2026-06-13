"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ackAlertAction, ackAllAlertsAction } from "@/app/actions";
import { SeverityChip } from "@/components/ui";

export type AlertRow = {
  id: number;
  ruleId: string;
  severity: string;
  message: string;
  firedAt: string; // ISO
  acked: boolean;
};

export function AlertsClient({ alerts }: { alerts: AlertRow[] }) {
  const [severity, setSeverity] = useState<string>("all");
  const [showAcked, setShowAcked] = useState(false);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(
    () =>
      alerts.filter(
        (a) => (severity === "all" || a.severity === severity) && (showAcked || !a.acked),
      ),
    [alerts, severity, showAcked],
  );
  const unackedCount = alerts.filter((a) => !a.acked).length;

  function ack(id: number) {
    startTransition(async () => {
      try {
        await ackAlertAction(id);
      } catch {
        toast.error("Failed to acknowledge");
      }
    });
  }

  function ackAll() {
    startTransition(async () => {
      try {
        await ackAllAlertsAction();
        toast.success("All alerts acknowledged");
      } catch {
        toast.error("Failed to acknowledge");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {["all", "critical", "warn", "info"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeverity(s)}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
              severity === s
                ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
                : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--soft)]"
            }`}
          >
            {s}
          </button>
        ))}
        <label className="muted ml-2 flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={showAcked}
            onChange={(e) => setShowAcked(e.target.checked)}
          />
          show acknowledged
        </label>
        <div className="flex-1" />
        <button
          type="button"
          className="btn text-xs"
          disabled={pending || unackedCount === 0}
          onClick={ackAll}
        >
          Ack all ({unackedCount})
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="muted py-4 text-sm">Nothing here.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((a) => (
            <li key={a.id} className={`panel p-3 ${a.acked ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityChip severity={a.severity} />
                    <span className="mono text-xs font-semibold">{a.ruleId}</span>
                    <span className="muted mono text-xs">
                      {new Date(a.firedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-sm">{a.message}</div>
                </div>
                {!a.acked && (
                  <button
                    type="button"
                    className="btn shrink-0 text-xs"
                    disabled={pending}
                    onClick={() => ack(a.id)}
                  >
                    Ack
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
