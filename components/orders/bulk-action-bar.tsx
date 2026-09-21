"use client";

import { useActionState, useState } from "react";
import { markOrderedBatch, type MarkOrderedBatchActionState } from "@/lib/actions/order-actions";

const ORDERED_INITIAL: MarkOrderedBatchActionState = {};

// Only in_list items are checkbox-selectable — this is the "select N items to order
// together" moment. Once a group exists (2+ items sharing a receipt_path), marking it
// received happens from the group's own header button (see order-table.tsx), not here.
export function BulkActionBar({
  selectedIds,
  onDone,
}: {
  selectedIds: string[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent bg-accent-soft px-4 py-2.5">
      <span className="text-sm font-medium text-accent">{selectedIds.length} selected</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover sm:min-h-0"
      >
        Mark {selectedIds.length} selected as ordered
      </button>

      {open && (
        <BulkMarkOrderedDialog
          itemIds={selectedIds}
          onClose={() => setOpen(false)}
          onSuccess={onDone}
        />
      )}
    </div>
  );
}

function BulkMarkOrderedDialog({
  itemIds,
  onClose,
  onSuccess,
}: {
  itemIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(markOrderedBatch, ORDERED_INITIAL);
  const [handledState, setHandledState] = useState(state);

  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      onClose();
      onSuccess();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(16,24,40,0.4)] p-modal-backdrop py-6 sm:items-center sm:p-modal-backdrop-lg"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-surface shadow-md sm:max-h-[90vh] sm:overflow-y-auto">
        <form action={formAction}>
          {itemIds.map((id) => (
            <input key={id} type="hidden" name="item_ids" value={id} />
          ))}

          <div className="border-b border-border px-modal-pad py-5 sm:px-modal-pad-lg">
            <h2 className="text-[17px] font-semibold text-text">
              Mark {itemIds.length} items as ordered
            </h2>
            <p className="mt-1 text-[13px] text-text-muted">
              Attach one receipt or PO — it&rsquo;ll be recorded against all {itemIds.length} selected
              items.
            </p>
          </div>

          <div className="px-modal-pad py-5 sm:px-modal-pad-lg">
            <label className="mb-1.5 block text-sm font-medium text-text">Receipt or PO</label>
            <label
              htmlFor="bulk-receipt"
              className={`block cursor-pointer rounded-md border border-dashed p-5 text-center text-[13px] ${
                fileName
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border-strong bg-bg text-text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {fileName
                ? `📎 ${fileName}  (click to change)`
                : "Click to upload a file (PDF, image, screenshot…)"}
            </label>
            <input
              id="bulk-receipt"
              name="receipt"
              type="file"
              required
              className="hidden"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
            />
            <p className="mt-1 text-xs text-text-muted">
              Any file works. Filename will be saved with the record.
            </p>

            {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
          </div>

          <div className="flex flex-col-reverse gap-2 rounded-b-xl border-t border-border bg-[#fafbfc] px-modal-pad py-3.5 sm:flex-row sm:justify-end sm:px-modal-pad-lg">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md border border-border-strong bg-surface px-3.5 py-3 text-sm font-medium text-text hover:bg-bg sm:w-auto sm:py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md bg-accent px-3.5 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
            >
              {isPending ? "Confirming…" : `Confirm ${itemIds.length} orders`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
