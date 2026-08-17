"use client";

import { useActionState, useState } from "react";
import { promoteWishlistItem, type PromoteActionState } from "./actions";
import { formatCurrency } from "@/lib/format";

const INITIAL_STATE: PromoteActionState = {};

type PromoteModalProps = {
  itemId: string;
  itemName: string;
  itemTotal: number;
  budget: number;
  spentThisMonth: number;
};

export function PromoteModal({
  itemId,
  itemName,
  itemTotal,
  budget,
  spentThisMonth,
}: PromoteModalProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(promoteWishlistItem, INITIAL_STATE);
  const [handledState, setHandledState] = useState(state);

  const projected = spentThisMonth + itemTotal;
  const remaining = budget - projected;
  const overBudget = projected > budget;

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
        className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
      >
        Move to Order List
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.4)] p-5"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface shadow-md">
            <form action={formAction}>
              <input type="hidden" name="item_id" value={itemId} />

              <div className="border-b border-border px-6 py-5">
                <h2 className="text-[17px] font-semibold text-text">Move to Order List</h2>
                <p className="mt-1 text-[13px] text-text-muted">
                  Promote &ldquo;{itemName}&rdquo; so it can be ordered.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="mb-3.5 rounded-md bg-bg p-3 text-[13px]">
                  <div className="flex justify-between py-0.5">
                    <span>This item total</span>
                    <span>{formatCurrency(itemTotal)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Already spent this month</span>
                    <span>{formatCurrency(spentThisMonth)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Projected total</span>
                    <span>{formatCurrency(projected)}</span>
                  </div>
                  <div
                    className={`mt-1.5 flex justify-between border-t border-border pt-2 font-semibold ${
                      overBudget ? "text-danger" : ""
                    }`}
                  >
                    <span>Budget remaining after</span>
                    <span>{formatCurrency(remaining)}</span>
                  </div>
                </div>

                {overBudget ? (
                  <>
                    <div className="mb-3.5 rounded-md border border-[#fedd8a] bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
                      <div className="font-semibold">This will put you over budget</div>
                      <div>
                        The request will be sent to an executive for approval. It won&rsquo;t be
                        ordered until approved.
                      </div>
                    </div>
                    <div className="mb-3.5">
                      <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-text">
                        Why is this over budget?
                      </label>
                      <textarea
                        id="reason"
                        name="reason"
                        rows={3}
                        required
                        placeholder="e.g. End-of-quarter client visit — extra snacks needed for the week."
                        className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                      />
                      <p className="mt-1 text-xs text-text-muted">
                        An executive will see this on the approval request.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="mb-3.5 rounded-md border border-[#b9d7ff] bg-info-soft px-3 py-2.5 text-[13px] text-info">
                    This fits inside the monthly budget and will be added to the order list right
                    away.
                  </div>
                )}

                {state.error && <p className="text-sm text-danger">{state.error}</p>}
              </div>

              <div className="flex justify-end gap-2 rounded-b-xl border-t border-border bg-[#fafbfc] px-6 py-3.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-text hover:bg-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending
                    ? "Submitting…"
                    : overBudget
                      ? "Send for approval"
                      : "Move to Order List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
