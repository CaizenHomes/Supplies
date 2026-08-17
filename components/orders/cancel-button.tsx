"use client";

import { useState, useTransition } from "react";
import { cancelOrderItem } from "@/lib/actions/order-actions";

export function CancelButton({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const reason = window.prompt(`Cancel "${itemName}"? Add a short reason (optional):`);
    if (reason === null) return; // user hit Cancel on the prompt itself

    setError(null);
    startTransition(async () => {
      try {
        await cancelOrderItem(itemId, reason);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md px-2 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
      >
        {isPending ? "Cancelling…" : "Cancel"}
      </button>
      {error && <span className="max-w-[160px] text-right text-xs text-danger">{error}</span>}
    </div>
  );
}
