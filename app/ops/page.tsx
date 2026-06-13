import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { settings } from "@/config/settings";
import { OpsClient } from "@/components/ops-client";
import { EmptyNote } from "@/components/ui";

export const dynamic = "force-dynamic";

function listBackups(): { name: string; sizeKb: number }[] {
  try {
    const dir = path.resolve(settings.backups.dir);
    return fs
      .readdirSync(dir)
      .filter((f) => /^engine-\d{4}-\d{2}-\d{2}\.db$/.test(f))
      .sort()
      .reverse()
      .map((name) => ({
        name,
        sizeKb: Math.round(fs.statSync(path.join(dir, name)).size / 1024),
      }));
  } catch {
    return [];
  }
}

export default async function OpsPage() {
  const runs = await prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 40 });
  const backups = listBackups();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine</div>
          <h1 className="page-title">Ops</h1>
          <p className="page-subtitle">
            Trigger jobs, run event-mode analysis, test notifications, and watch the job log.
          </p>
        </div>
      </div>

      <OpsClient />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel panel-pad lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Recent job runs</h2>
          {runs.length === 0 ? (
            <EmptyNote>No jobs have run yet.</EmptyNote>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>When</th>
                    <th>OK</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td className="mono text-xs font-semibold">{r.job}</td>
                      <td className="muted text-xs">{r.startedAt.toLocaleString()}</td>
                      <td>
                        <span className={r.ok ? "text-[var(--good)]" : "text-[var(--bad)]"}>
                          {r.ok ? "ok" : "fail"}
                        </span>
                      </td>
                      <td className="max-w-md truncate text-xs" title={r.detail ?? ""}>
                        {r.detail ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel panel-pad">
          <h2 className="mb-2 text-sm font-semibold">Backups</h2>
          {backups.length === 0 ? (
            <EmptyNote>No backups yet — they are written by the prices job.</EmptyNote>
          ) : (
            <ul className="space-y-1.5">
              {backups.map((b) => (
                <li key={b.name} className="flex items-center justify-between text-xs">
                  <span className="mono">{b.name}</span>
                  <span className="muted">{b.sizeKb} KB</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted mt-3 text-xs">
            Kept: newest {settings.backups.keep}. Dir:{" "}
            <span className="mono">{settings.backups.dir}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
