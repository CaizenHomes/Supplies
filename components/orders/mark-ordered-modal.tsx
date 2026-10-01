"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markOrdered, type MarkOrderedActionState } from "@/lib/actions/order-actions";
import { TaxInputs } from "@/components/orders/tax-inputs";

const INITIAL_STATE: MarkOrderedActionState = {};

export function MarkOrderedModal({
  itemId,
  module,
}: {
  itemId: string;
  module: "groceries" | "supplies";
}) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(markOrdered, INITIAL_STATE);
  const [handledState, setHandledState] = useState(state);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
      setFileName(null);
    }
  }

  // If the order was saved but its tax wasn't, the server skipped refreshing the list so
  // this message stays visible; pick up the now-ordered item once the dialog is closed.
  function close() {
    setOpen(false);
    if (state.orderSaved) {
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border-strong bg-surface px-2.5 py-3.5 text-xs font-medium text-text hover:bg-bg sm:py-1.5"
      >
        Mark ordered
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(16,24,40,0.4)] p-modal-backdrop py-6 sm:items-center sm:p-modal-backdrop-lg"
          onClick={(event) => event.target === event.currentTarget && close()}
        >
          <div className="w-full max-w-md rounded-xl bg-surface shadow-md sm:max-h-[90vh] sm:overflow-y-auto">
            <form action={formAction}>
              <input type="hidden" name="item_id" value={itemId} />
              <input type="hidden" name="module" value={module} />

              <div className="border-b border-border px-modal-pad py-5 sm:px-modal-pad-lg">
                <h2 className="text-[17px] font-semibold text-text">Mark as ordered</h2>
                <p className="mt-1 text-[13px] text-text-muted">
                  Attach the receipt or PO for record-keeping.
                </p>
              </div>

              <div className="px-modal-pad py-5 sm:px-modal-pad-lg">
                <label className="mb-1.5 block text-sm font-medium text-text">Receipt or PO</label>
                <label
                  htmlFor="receipt"
                  className={`block cursor-pointer rounded-md border border-dashed p-5 text-center text-[13px] ${
                    fileName
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border-strong bg-bg text-text-muted hover:border-accent hover:text-accent"
                  }`}
                >
                  {fileName ? `📎 ${fileName}  (click to change)` : "Click to upload a file (PDF, image, screenshot…)"}
                </label>
                <input
                  ref={fileInputRef}
                  id="receipt"
                  name="receipt"
                  type="file"
                  required
                  className="hidden"
                  onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
                />
                <p className="mt-1 text-xs text-text-muted">
                  Any file works. Filename will be saved with the record.
                </p>

                {module === "groceries" && (
                  <div className="mt-4">
                    <TaxInputs idPrefix={`mark-ordered-${itemId}`} />
                  </div>
                )}

                {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 rounded-b-xl border-t border-border bg-[#fafbfc] px-modal-pad py-3.5 sm:flex-row sm:px-modal-pad-lg">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md border border-border-strong bg-surface px-3.5 py-3 text-sm font-medium text-text hover:bg-bg sm:py-2"
                >
                  {state.orderSaved ? "Close" : "Cancel"}
                </button>
                {!state.orderSaved && (
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-accent px-3.5 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
                  >
                    {isPending ? "Confirming…" : "Confirm order"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
