"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addTickerAction, deleteSymbolOverrideAction, setSymbolOverrideAction } from "@/app/actions";

export function TickerAdminClient({
  sectorCodes,
  overrides,
}: {
  sectorCodes: string[];
  overrides: { symbol: string; yfSymbol: string }[];
}) {
  // Add ticker state
  const [symbol, setSymbol] = useState("");
  const [klass, setKlass] = useState("stock");
  const [sectors, setSectors] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  // Override state
  const [ovrSymbol, setOvrSymbol] = useState("");
  const [ovrYfSymbol, setOvrYfSymbol] = useState("");
  const [ovrPending, startOvrTransition] = useTransition();

  function toggleSector(code: string) {
    setSectors((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      try {
        await addTickerAction({ symbol, klass, sectors: [...sectors] });
        toast.success(`${symbol.toUpperCase()} added`);
        setSymbol("");
        setSectors(new Set());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add ticker");
      }
    });
  }

  function submitOverride() {
    startOvrTransition(async () => {
      try {
        await setSymbolOverrideAction({ symbol: ovrSymbol, yfSymbol: ovrYfSymbol });
        toast.success(`Override set: ${ovrSymbol} → ${ovrYfSymbol}`);
        setOvrSymbol("");
        setOvrYfSymbol("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to set override");
      }
    });
  }

  function deleteOverride(sym: string) {
    startOvrTransition(async () => {
      try {
        await deleteSymbolOverrideAction(sym);
        toast.success(`Override removed for ${sym}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to remove override");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Side: Add Ticker */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Add Ticker</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="label">Symbol</label>
              <input
                className="input mono"
                placeholder="e.g. PLTR"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="label">Class</label>
              <select className="select" value={klass} onChange={(e) => setKlass(e.target.value)}>
                <option value="stock">stock</option>
                <option value="etf">etf</option>
                <option value="benchmark">benchmark</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="btn btn-primary w-full text-xs py-2"
                disabled={pending || !/^[A-Z.\-]{1,10}$/.test(symbol)}
                onClick={submit}
              >
                {pending ? "Adding…" : "Add ticker"}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Sectors {klass === "benchmark" ? "(benchmarks usually take none)" : ""}</label>
            <div className="flex flex-wrap gap-1">
              {sectorCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleSector(code)}
                  className={`mono rounded-md border px-2 py-0.5 text-[11px] ${
                    sectors.has(code)
                      ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--soft)]"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Symbol Overrides Form */}
        <div className="space-y-3 border-t border-[var(--border)] pt-4 md:border-t-0 md:border-l md:pl-6 md:pt-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Set Yahoo Finance Override</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="label">Symbol</label>
              <input
                className="input mono"
                placeholder="e.g. SPY"
                value={ovrSymbol}
                onChange={(e) => setOvrSymbol(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="label">YF Symbol</label>
              <input
                className="input mono"
                placeholder="e.g. SPY.US"
                value={ovrYfSymbol}
                onChange={(e) => setOvrYfSymbol(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="btn btn-primary w-full text-xs py-2"
                disabled={ovrPending || !/^[A-Z.\-]{1,10}$/.test(ovrSymbol) || !ovrYfSymbol.trim()}
                onClick={submitOverride}
              >
                {ovrPending ? "Saving…" : "Set override"}
              </button>
            </div>
          </div>
          <p className="muted text-[11px]">
            Map overseas or custom tickers to Yahoo Finance equivalents (e.g. override <span className="mono">005930</span> to <span className="mono">005930.KS</span>).
          </p>
        </div>
      </div>

      {/* Overrides List */}
      {overrides.length > 0 && (
        <div className="border-t border-[var(--border)] pt-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Current Overrides</h3>
          <div className="flex flex-wrap gap-2">
            {overrides.map((ovr) => (
              <span
                key={ovr.symbol}
                className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--soft)] px-2.5 py-1 text-xs mono text-[var(--text)]"
              >
                <span>{ovr.symbol} → {ovr.yfSymbol}</span>
                <button
                  type="button"
                  className="text-[var(--bad)] hover:text-red-700 ml-1 font-bold focus:outline-none"
                  onClick={() => deleteOverride(ovr.symbol)}
                  disabled={ovrPending}
                  title={`Remove override for ${ovr.symbol}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
