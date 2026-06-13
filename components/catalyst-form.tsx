"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { addCatalystAction, deleteCatalystAction } from "@/app/actions";

const KINDS = ["earnings", "deadline", "ipo", "product", "macro"] as const;

export function CatalystForm({ sectorCodes }: { sectorCodes: string[] }) {
  const [kind, setKind] = useState<string>("deadline");
  const [d, setD] = useState("");
  const [sectorCode, setSectorCode] = useState("");
  const [symbol, setSymbol] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await addCatalystAction({
          d: d || null,
          kind,
          sectorCode: sectorCode || null,
          symbol: symbol || null,
          title,
          note: note || undefined,
        });
        toast.success("Catalyst added");
        setTitle("");
        setNote("");
        setSymbol("");
        setD("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add catalyst");
      }
    });
  }

  return (
    <div className="grid gap-2 md:grid-cols-6">
      <div>
        <label className="label">Kind</label>
        <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Date (optional)</label>
        <input
          className="input mono"
          placeholder="YYYY-MM-DD"
          value={d}
          onChange={(e) => setD(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Sector</label>
        <select className="select" value={sectorCode} onChange={(e) => setSectorCode(e.target.value)}>
          <option value="">—</option>
          {sectorCodes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Symbol</label>
        <input
          className="input mono"
          placeholder="optional"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        />
      </div>
      <div className="md:col-span-2">
        <label className="label">Title</label>
        <input
          className="input"
          placeholder="What happens?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="md:col-span-5">
        <label className="label">Note</label>
        <input
          className="input"
          placeholder="optional context"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="flex items-end">
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={pending || title.trim().length < 3}
          onClick={submit}
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

export function DeleteCatalystButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label="Delete catalyst"
      className="btn-danger btn px-2 py-1"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await deleteCatalystAction(id);
            toast.success("Catalyst removed");
          } catch {
            toast.error("Failed to delete");
          }
        })
      }
    >
      <Trash2 size={12} />
    </button>
  );
}
