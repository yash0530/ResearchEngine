// Small server-safe display atoms shared across pages.

import type { CSSProperties } from "react";
import { fmtPct } from "@/lib/format";
import { DRIVERS } from "@/config/sectors";

export function Pct({ value, decimals = 2 }: { value: number | null; decimals?: number }) {
  if (value === null || !Number.isFinite(value)) return <span className="muted">—</span>;
  const cls =
    value > 0 ? "text-[var(--good)]" : value < 0 ? "text-[var(--bad)]" : "text-[var(--muted)]";
  return <span className={`mono ${cls}`}>{fmtPct(value, { sign: true, decimals })}</span>;
}

export function StageChip({ stage }: { stage: string }) {
  return (
    <span
      className="stage-chip"
      style={{ "--stage-color": `var(--stage-${stage})` } as CSSProperties}
    >
      {stage}
    </span>
  );
}

export function DriverBadge({ driver }: { driver: number }) {
  return (
    <span className="badge" title={DRIVERS[driver] ?? `Driver ${driver}`}>
      D{driver}
    </span>
  );
}

export function SeverityChip({ severity }: { severity: string }) {
  const color =
    severity === "critical"
      ? "var(--bad)"
      : severity === "warn"
        ? "var(--warn)"
        : "var(--muted)";
  return (
    <span className="stage-chip" style={{ "--stage-color": color } as CSSProperties}>
      {severity}
    </span>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="muted py-2 text-sm">{children}</p>;
}
