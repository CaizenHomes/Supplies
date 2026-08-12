"use client";

import { useState, useTransition } from "react";
import { toggleUserActive } from "./actions";

export function ToggleActiveButton({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const next = !isActive;
    if (!window.confirm(`${next ? "Reactivate" : "Deactivate"} this account?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await toggleUserActive(userId, next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-text hover:bg-bg disabled:opacity-50"
      >
        {isPending ? "Working…" : isActive ? "Deactivate" : "Reactivate"}
      </button>
      {error && <span className="max-w-[150px] text-right text-xs text-danger">{error}</span>}
    </div>
  );
}
