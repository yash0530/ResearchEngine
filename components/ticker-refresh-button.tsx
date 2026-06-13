"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { refreshTickerDataAction } from "@/app/actions";

export function TickerRefreshButton({ symbol }: { symbol: string }) {
  const [pending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const result = await refreshTickerDataAction(symbol);
        if (result.ok) {
          toast.success(result.detail);
        } else {
          toast.error(result.detail);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to refresh data");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={pending}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold border transition select-none ${
        pending
          ? "bg-[var(--soft)] border-[var(--border)] text-[var(--muted)] cursor-not-allowed"
          : "bg-[var(--panel)] border-[var(--border)] text-[var(--fg)] hover:bg-[var(--soft)] hover:border-[var(--accent)] active:scale-95"
      }`}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin text-[var(--accent)]" : ""}`} />
      {pending ? "Refreshing..." : "Refresh Data"}
    </button>
  );
}
