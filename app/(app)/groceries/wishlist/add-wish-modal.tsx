"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addWishlistItem, type AddWishActionState } from "./actions";
import type { Enums } from "@/lib/types";

const INITIAL_STATE: AddWishActionState = {};

type AddWishModalProps = {
  role: Enums<"user_role">;
  capAmount: number;
  usedAmount: number;
};

export function AddWishModal({ role, capAmount, usedAmount }: AddWishModalProps) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [state, formAction, isPending] = useActionState(addWishlistItem, INITIAL_STATE);
  const [handledState, setHandledState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  const isCapped = role === "staff";
  const itemTotal = (parseFloat(qty) || 0) * (parseFloat(unitPrice) || 0);
  const projected = usedAmount + itemTotal;
  const remaining = capAmount - projected;
  const overCap = isCapped && projected > capAmount + 0.001;

  // Derived-state-during-render (react.dev/learn/you-might-not-need-an-effect): close the
  // modal and clear the live-total inputs the instant a submission succeeds, without an
  // Effect calling setState.
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
      setQty("1");
      setUnitPrice("");
    }
  }

  // Resetting the uncontrolled fields (name/vendor/link) is a real DOM mutation, so it
  // belongs in an Effect — but it doesn't call setState, so it doesn't trip the same rule.
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        + Add wish
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.4)] p-5"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface shadow-md">
            <form ref={formRef} action={formAction}>
              <div className="border-b border-border px-6 py-5">
                <h2 className="text-[17px] font-semibold text-text">Add to wishlist</h2>
                <p className="mt-1 text-[13px] text-text-muted">
                  Add a snack item you&rsquo;d like ordered this month.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="mb-3.5">
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text">
                    Item name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Kirkland coffee beans, 3lb"
                    className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                </div>

                <div className="mb-3.5 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="vendor" className="mb-1.5 block text-sm font-medium text-text">
                      Vendor
                    </label>
                    <input
                      id="vendor"
                      name="vendor"
                      type="text"
                      required
                      placeholder="Costco, Amazon…"
                      className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                    />
                  </div>
                  <div>
                    <label htmlFor="qty" className="mb-1.5 block text-sm font-medium text-text">
                      Quantity
                    </label>
                    <input
                      id="qty"
                      name="qty"
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={qty}
                      onChange={(event) => setQty(event.target.value)}
                      className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                    />
                  </div>
                </div>

                <div className="mb-3.5">
                  <label htmlFor="unit_price" className="mb-1.5 block text-sm font-medium text-text">
                    Unit price ($)
                  </label>
                  <input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    min={0.01}
                    step={0.01}
                    required
                    placeholder="0.00"
                    value={unitPrice}
                    onChange={(event) => setUnitPrice(event.target.value)}
                    className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                </div>

                <div className="mb-3.5">
                  <label htmlFor="link" className="mb-1.5 block text-sm font-medium text-text">
                    Link <span className="font-normal text-text-subtle">(optional)</span>
                  </label>
                  <input
                    id="link"
                    name="link"
                    type="text"
                    placeholder="https://costco.ca/… (product page)"
                    className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Paste a product link so managers can see exactly what to order.
                  </p>
                </div>

                <div className="mb-3.5 rounded-md bg-bg p-3 text-[13px]">
                  <div className="flex justify-between py-0.5">
                    <span>This item total</span>
                    <span>${itemTotal.toFixed(2)}</span>
                  </div>
                  {isCapped && (
                    <>
                      <div className="flex justify-between py-0.5">
                        <span>Your wishlist used</span>
                        <span>${usedAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span>Your allowance (1/3 of budget)</span>
                        <span>${capAmount.toFixed(2)}</span>
                      </div>
                      <div
                        className={`mt-1.5 flex justify-between border-t border-border pt-2 font-semibold ${
                          overCap ? "text-danger" : ""
                        }`}
                      >
                        <span>Allowance remaining after</span>
                        <span>${remaining.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>

                {overCap && (
                  <div className="mb-3.5 rounded-md border border-[#fedd8a] bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
                    <div className="font-semibold">This exceeds your wishlist allowance</div>
                    <div>
                      Each team member can wish up to 1/3 of the monthly budget. Remove a wish or
                      lower the amount to add this.
                    </div>
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
                  disabled={isPending || overCap}
                  className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {overCap ? "Over allowance" : isPending ? "Adding…" : "Add to wishlist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
