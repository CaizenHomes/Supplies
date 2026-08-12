"use client";

import { useState, useTransition } from "react";
import { approveItem, rejectItem } from "./actions";

export function ApprovalActions({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      try {
        await approveItem(itemId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleReject() {
    if (!window.confirm(`Reject "${itemName}"?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await rejectItem(itemId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleReject}
          disabled={isPending}
          className="rounded-md border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-text hover:bg-bg disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Working…" : "Approve & add to list"}
        </button>
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
