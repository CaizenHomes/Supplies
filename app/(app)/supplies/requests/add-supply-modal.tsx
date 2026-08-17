"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addSupplyRequest, type AddSupplyActionState } from "./actions";
import type { Enums } from "@/lib/types";

const INITIAL_STATE: AddSupplyActionState = {};

export function AddSupplyModal({ role }: { role: Enums<"user_role"> }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [state, formAction, isPending] = useActionState(addSupplyRequest, INITIAL_STATE);
  const [handledState, setHandledState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  const isExecutive = role === "executive";
  const qtyNum = parseFloat(qty) || 0;
  const priceNum = parseFloat(unitPrice);
  const itemTotal = priceNum > 0 && qtyNum > 0 ? qtyNum * priceNum : null;

  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
      setQty("1");
      setUnitPrice("");
    }
  }

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
        + New request
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.4)] p-5"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface shadow-md">
            <form ref={formRef} action={formAction}>
              <div className="border-b border-border px-6 py-5">
                <h2 className="text-[17px] font-semibold text-text">New supply request</h2>
                <p className="mt-1 text-[13px] text-text-muted">
                  PPE, site consumables, office and plotter supplies — anything that isn&rsquo;t
                  groceries.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="mb-3.5">
                  <label htmlFor="s-name" className="mb-1.5 block text-sm font-medium text-text">
                    Item name
                  </label>
                  <input
                    id="s-name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Hi-vis safety vests — CSA Class 2"
                    className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                </div>

                <div className="mb-3.5 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="s-vendor" className="mb-1.5 block text-sm font-medium text-text">
                      Vendor
                    </label>
                    <input
                      id="s-vendor"
                      name="vendor"
                      type="text"
                      required
                      placeholder="Acklands-Grainger, Amazon, Staples…"
                      className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                    />
                  </div>
                  <div>
                    <label htmlFor="s-qty" className="mb-1.5 block text-sm font-medium text-text">
                      Quantity
                    </label>
                    <input
                      id="s-qty"
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

                <div className="mb-3.5 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="s-price" className="mb-1.5 block text-sm font-medium text-text">
                      Est. unit price ($) <span className="font-normal text-text-subtle">(optional)</span>
                    </label>
                    <input
                      id="s-price"
                      name="unit_price"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={unitPrice}
                      onChange={(event) => setUnitPrice(event.target.value)}
                      className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                    />
                  </div>
                  <div>
                    <label htmlFor="s-urgency" className="mb-1.5 block text-sm font-medium text-text">
                      Urgency
                    </label>
                    <select
                      id="s-urgency"
                      name="urgency"
                      defaultValue="normal"
                      className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent — needed this week</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3.5">
                  <label htmlFor="s-link" className="mb-1.5 block text-sm font-medium text-text">
                    Link <span className="font-normal text-text-subtle">(optional)</span>
                  </label>
                  <input
                    id="s-link"
                    name="link"
                    type="text"
                    placeholder="https://… (product page)"
                    className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                </div>

                <div className="mb-3.5">
                  <label htmlFor="s-note" className="mb-1.5 block text-sm font-medium text-text">
                    What&rsquo;s it for? <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="s-note"
                    name="note"
                    rows={2}
                    required
                    placeholder="e.g. New crew starting at CCW site next week — need vests on hand."
                    className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Manpreet sees this on the approval request. A clear reason gets approved faster.
                  </p>
                </div>

                {itemTotal !== null && (
                  <div className="mb-3.5 rounded-md bg-bg p-3 text-[13px]">
                    <div className="flex justify-between border-t border-border pt-2 font-semibold">
                      <span>Estimated total</span>
                      <span>${itemTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {isExecutive ? (
                  <div className="mb-3.5 rounded-md border border-[#b9d7ff] bg-info-soft px-3 py-2.5 text-[13px] text-info">
                    You&rsquo;re the approver, so this goes straight onto the order list.
                  </div>
                ) : (
                  <div className="mb-3.5 rounded-md border border-[#fedd8a] bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
                    <div className="font-semibold">Goes to Manpreet for approval</div>
                    <div>
                      There&rsquo;s no supplies budget — instead, every request is approved
                      individually before it can be ordered.
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
                  disabled={isPending}
                  className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Sending…" : isExecutive ? "Add to order list" : "Send for approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
