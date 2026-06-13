"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setTickerActiveAction } from "@/app/actions";

export function TickerActiveToggle({
  symbol,
  active,
}: {
  symbol: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      try {
        await setTickerActiveAction({ symbol, active: !active });
        toast.success(`${symbol} ${!active ? "activated" : "deactivated"}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to toggle active state");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`rounded px-2 py-0.5 text-xs transition border ${
        active
          ? "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--soft)]"
          : "border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
      }`}
    >
      {pending ? "..." : active ? "Deactivate" : "Activate"}
    </button>
  );
}
