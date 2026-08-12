"use client";

import { useState, useTransition } from "react";
import { deleteWishlistItem } from "./actions";

export function DeleteWishButton({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm(`Remove "${itemName}" from the wishlist?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteWishlistItem(itemId);
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
        className="rounded-md px-2 py-1.5 text-xs font-medium text-text-muted hover:bg-bg hover:text-text disabled:opacity-50"
      >
        {isPending ? "Removing…" : "Remove"}
      </button>
      {error && <span className="max-w-[160px] text-right text-xs text-danger">{error}</span>}
    </div>
  );
}
