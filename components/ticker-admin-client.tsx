"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addTickerAction } from "@/app/actions";

export function TickerAdminClient({ sectorCodes }: { sectorCodes: string[] }) {
  const [symbol, setSymbol] = useState("");
  const [klass, setKlass] = useState("stock");
  const [sectors, setSectors] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

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

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-3">
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
            className="btn btn-primary w-full"
            disabled={pending || !/^[A-Z.\-]{1,10}$/.test(symbol)}
            onClick={submit}
          >
            {pending ? "Adding…" : "Add ticker"}
          </button>
        </div>
      </div>
      <div>
        <label className="label">Sectors {klass === "benchmark" ? "(benchmarks usually take none)" : ""}</label>
        <div className="flex flex-wrap gap-1.5">
          {sectorCodes.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => toggleSector(code)}
              className={`mono rounded-md border px-2 py-1 text-xs ${
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
      <p className="muted text-xs">
        New tickers are picked up by the next prices pull. For a symbol Yahoo names
        differently, add a row to <span className="mono">SymbolOverride</span> (or use the
        override action) and re-run prices.
      </p>
    </div>
  );
}
