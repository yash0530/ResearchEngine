import { prisma } from "@/lib/prisma";
import { TRIPWIRES } from "@/config/tripwires";
import { AlertsClient, type AlertRow } from "@/components/alerts-client";
import { SeverityChip } from "@/components/ui";

export const dynamic = "force-dynamic";

function ruleSummary(rule: (typeof TRIPWIRES)[number]): string {
  switch (rule.type) {
    case "drawdown":
      return `${rule.symbol} ≤ ${rule.pct}% off its ${rule.lookbackDays}d high`;
    case "consecutive_monthly":
      return `${rule.series} ${rule.direction} ${rule.n} consecutive readings`;
    case "flag_equals":
      return `${rule.series} = ${rule.value} within ${rule.withinDays}d`;
    case "ratio_change":
      return `${rule.a}/${rule.b} ≤ ${rule.pct}% over ${rule.lookbackDays}d`;
    case "compound":
      return `all of [${rule.allOf.join(", ")}]${rule.requireNotRecent ? ` and no recent ${rule.requireNotRecent}` : ""}`;
  }
}

export default async function AlertsPage() {
  const events = await prisma.ruleEvent.findMany({
    orderBy: { firedAt: "desc" },
    take: 100,
  });

  const alerts: AlertRow[] = events.map((e) => ({
    id: e.id,
    ruleId: e.ruleId,
    severity: e.severity,
    message: e.message,
    firedAt: e.firedAt.toISOString(),
    acked: e.acked,
  }));

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine</div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">
            Tripwire fires, newest first. Acknowledge once you have re-read the relevant
            kill criteria — the rule stays armed (cooloff aside).
          </p>
        </div>
      </div>

      <AlertsClient alerts={alerts} />

      <div className="panel panel-pad">
        <h2 className="mb-3 text-sm font-semibold">Configured tripwires</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Type</th>
                <th>Trigger</th>
                <th>Severity</th>
                <th>Cooloff</th>
              </tr>
            </thead>
            <tbody>
              {TRIPWIRES.map((rule) => (
                <tr key={rule.id}>
                  <td className="mono text-xs font-semibold">{rule.id}</td>
                  <td className="mono text-xs">{rule.type}</td>
                  <td className="text-xs">{ruleSummary(rule)}</td>
                  <td><SeverityChip severity={rule.severity} /></td>
                  <td className="mono text-xs">{rule.cooloffDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted mt-2 text-xs">
          Edit rules in <span className="mono">config/tripwires.ts</span>; dry-run with{" "}
          <span className="mono">npm run job -- rules --dry-run</span>.
        </p>
      </div>
    </div>
  );
}
