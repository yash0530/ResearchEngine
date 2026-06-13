import Link from "next/link";
import { loadTickersList } from "@/lib/board";
import { EmptyNote, Pct } from "@/components/ui";
import { fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TickersPage() {
  const tickers = await loadTickersList();
  const active = tickers.filter((t) => t.active);
  const inactive = tickers.filter((t) => !t.active);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine</div>
          <h1 className="page-title">Tickers</h1>
          <p className="page-subtitle">
            {active.length} active names ({inactive.length} inactive). Benchmarks carry no
            sector so they never skew sector averages.
          </p>
        </div>
      </div>

      {tickers.length === 0 ? (
        <EmptyNote>Universe is empty — run the seed.</EmptyNote>
      ) : (
        <div className="panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Sectors</th>
                  <th>Close</th>
                  <th>1d</th>
                  <th>30d</th>
                </tr>
              </thead>
              <tbody>
                {[...active, ...inactive].map((t) => (
                  <tr key={t.symbol} className={t.active ? "" : "opacity-50"}>
                    <td>
                      <Link
                        href={`/tickers/${t.symbol}`}
                        className="mono font-semibold hover:underline"
                      >
                        {t.symbol}
                      </Link>
                    </td>
                    <td className="muted max-w-64 truncate">{t.name ?? "—"}</td>
                    <td>
                      <span className="badge">{t.class}</span>
                    </td>
                    <td className="mono text-xs">
                      {t.sectors.length ? (
                        t.sectors.map((code) => (
                          <Link
                            key={code}
                            href={`/sectors/${code}`}
                            className="mr-1 hover:underline"
                          >
                            {code}
                          </Link>
                        ))
                      ) : (
                        <span className="muted">benchmark</span>
                      )}
                    </td>
                    <td className="mono">{fmtMoney(t.lastClose)}</td>
                    <td><Pct value={t.pct1d} decimals={1} /></td>
                    <td><Pct value={t.pct30d} decimals={1} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
