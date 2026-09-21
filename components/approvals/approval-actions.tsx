"use client";

import { useState, useTransition } from "react";
import { approveItem, rejectItem } from "@/lib/actions/approval-actions";

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
    <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleReject}
          disabled={isPending}
          className="w-full rounded-md border border-border-strong bg-surface px-3.5 py-3 text-sm font-medium text-text hover:bg-bg disabled:opacity-50 sm:w-auto sm:py-2"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="w-full rounded-md bg-accent px-3.5 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
        >
          {isPending ? "Working…" : "Approve & add to list"}
        </button>
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
