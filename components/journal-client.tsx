"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  addJournalAction,
  deleteJournalAction,
  deletePositionAction,
  upsertPositionAction,
} from "@/app/actions";
import { Pct } from "@/components/ui";

// ── Positions ────────────────────────────────────────────────────────────────

export type PositionRow = {
  symbol: string;
  qty: number;
  avgCost: number;
  openedAt: string | null;
  lastClose: number | null;
};

export function PositionsClient({ positions }: { positions: PositionRow[] }) {
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [openedAt, setOpenedAt] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await upsertPositionAction({
          symbol,
          qty: Number(qty),
          avgCost: Number(avgCost),
          openedAt: openedAt || null,
        });
        toast.success(`${symbol.toUpperCase()} saved`);
        setSymbol("");
        setQty("");
        setAvgCost("");
        setOpenedAt("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save position");
      }
    });
  }

  function remove(sym: string) {
    startTransition(async () => {
      try {
        await deletePositionAction(sym);
        toast.success(`${sym} removed`);
      } catch {
        toast.error("Failed to delete");
      }
    });
  }

  const valid =
    symbol.trim().length > 0 && Number.isFinite(Number(qty)) && Number(avgCost) >= 0 && qty !== "";

  return (
    <div className="space-y-4">
      {positions.length === 0 ? (
        <p className="muted text-sm">No recorded positions. These are manual records — nothing executes.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Qty</th>
                <th>Avg cost</th>
                <th>Last</th>
                <th>Unrealized</th>
                <th>Opened</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const unrealized =
                  p.lastClose != null && p.avgCost > 0
                    ? ((p.lastClose - p.avgCost) / p.avgCost) * 100
                    : null;
                return (
                  <tr key={p.symbol}>
                    <td>
                      <Link href={`/tickers/${p.symbol}`} className="mono font-semibold hover:underline">
                        {p.symbol}
                      </Link>
                    </td>
                    <td className="mono">{p.qty}</td>
                    <td className="mono">${p.avgCost.toFixed(2)}</td>
                    <td className="mono">{p.lastClose != null ? `$${p.lastClose.toFixed(2)}` : "—"}</td>
                    <td><Pct value={unrealized} /></td>
                    <td className="mono text-xs">{p.openedAt ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        aria-label={`Delete ${p.symbol}`}
                        className="btn btn-danger px-2 py-1"
                        disabled={pending}
                        onClick={() => remove(p.symbol)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-5">
        <div>
          <label className="label">Symbol</label>
          <input className="input mono" value={symbol} placeholder="MU"
            onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
        </div>
        <div>
          <label className="label">Qty</label>
          <input className="input mono" value={qty} placeholder="100" inputMode="decimal"
            onChange={(e) => setQty(e.target.value)} />
        </div>
        <div>
          <label className="label">Avg cost</label>
          <input className="input mono" value={avgCost} placeholder="95.50" inputMode="decimal"
            onChange={(e) => setAvgCost(e.target.value)} />
        </div>
        <div>
          <label className="label">Opened</label>
          <input className="input mono" value={openedAt} placeholder="YYYY-MM-DD"
            onChange={(e) => setOpenedAt(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button type="button" className="btn btn-primary w-full" disabled={pending || !valid} onClick={submit}>
            {pending ? "Saving…" : "Save position"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Journal feed ─────────────────────────────────────────────────────────────

export type JournalRow = {
  id: number;
  symbol: string;
  action: string;
  thesis: string;
  invalidation: string | null;
  createdAt: string; // ISO
};

const ACTIONS = ["note", "buy", "add", "trim", "sell"] as const;

export function JournalClient({ entries }: { entries: JournalRow[] }) {
  const [symbol, setSymbol] = useState("");
  const [action, setAction] = useState<string>("note");
  const [thesis, setThesis] = useState("");
  const [invalidation, setInvalidation] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await addJournalAction({ symbol, action, thesis, invalidation: invalidation || undefined });
        toast.success("Journal entry added");
        setThesis("");
        setInvalidation("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add entry");
      }
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      try {
        await deleteJournalAction(id);
      } catch {
        toast.error("Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-4">
        <div>
          <label className="label">Symbol</label>
          <input className="input mono" value={symbol} placeholder="MU"
            onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
        </div>
        <div>
          <label className="label">Action</label>
          <select className="select" value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Thesis (why)</label>
          <input className="input" value={thesis} placeholder="What do you believe, in one line?"
            onChange={(e) => setThesis(e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <label className="label">Invalidation (what kills it)</label>
          <input className="input" value={invalidation}
            placeholder="The observable fact that would prove you wrong"
            onChange={(e) => setInvalidation(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={pending || !symbol.trim() || thesis.trim().length < 3}
            onClick={submit}
          >
            {pending ? "Saving…" : "Add entry"}
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="muted text-sm">No journal entries yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="panel p-3 text-sm">
              <div className="flex items-center gap-2">
                <Link href={`/tickers/${e.symbol}`} className="mono font-semibold hover:underline">
                  {e.symbol}
                </Link>
                <span className="badge">{e.action}</span>
                <span className="muted mono text-xs">{new Date(e.createdAt).toLocaleString()}</span>
                <div className="flex-1" />
                <button
                  type="button"
                  aria-label="Delete entry"
                  className="btn btn-danger px-2 py-1"
                  disabled={pending}
                  onClick={() => remove(e.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="mt-1">{e.thesis}</div>
              {e.invalidation ? (
                <div className="muted mt-0.5 text-xs">invalidate: {e.invalidation}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
