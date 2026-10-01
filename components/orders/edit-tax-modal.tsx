"use client";

import { useActionState, useState } from "react";
import { updateOrderTax, type UpdateOrderTaxActionState } from "@/lib/actions/order-actions";
import { TaxInputs } from "@/components/orders/tax-inputs";
import type { OrderTax } from "@/lib/order-totals";

const INITIAL_STATE: UpdateOrderTaxActionState = {};

// Add or edit GST/PST on an existing Groceries order. Rendered only for managers and
// executives (the roles RLS lets write order_taxes).
export function EditTaxModal({ receiptPath, tax }: { receiptPath: string; tax: OrderTax | undefined }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(updateOrderTax, INITIAL_STATE);
  const [handledState, setHandledState] = useState(state);
  const hasTax = tax != null && (tax.gst != null || tax.pst != null);

  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border-strong bg-surface px-2.5 py-3.5 text-xs font-medium normal-case tracking-normal text-text hover:bg-bg sm:py-1.5"
      >
        {hasTax ? "Edit tax" : "Add tax"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(16,24,40,0.4)] p-modal-backdrop py-6 text-left normal-case tracking-normal sm:items-center sm:p-modal-backdrop-lg"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-md rounded-xl bg-surface font-normal shadow-md sm:max-h-[90vh] sm:overflow-y-auto">
            <form action={formAction}>
              <input type="hidden" name="receipt_path" value={receiptPath} />

              <div className="border-b border-border px-modal-pad py-5 sm:px-modal-pad-lg">
                <h2 className="text-[17px] font-semibold text-text">Order tax</h2>
                <p className="mt-1 text-[13px] text-text-muted">
                  GST and PST for this order, so its total matches the receipt.
                </p>
              </div>

              <div className="px-modal-pad py-5 sm:px-modal-pad-lg">
                <TaxInputs idPrefix={`edit-tax-${receiptPath}`} defaultGst={tax?.gst} defaultPst={tax?.pst} />
                {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 rounded-b-xl border-t border-border bg-[#fafbfc] px-modal-pad py-3.5 sm:flex-row sm:px-modal-pad-lg">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border-strong bg-surface px-3.5 py-3 text-sm font-medium text-text hover:bg-bg sm:py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-accent px-3.5 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
                >
                  {isPending ? "Saving…" : "Save tax"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
