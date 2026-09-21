"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addSupplyRequest, type AddSupplyActionState } from "./actions";
import type { Enums } from "@/lib/types";
import { ProductCombobox, type Product } from "@/components/product-combobox";

const INITIAL_STATE: AddSupplyActionState = {};

export function AddSupplyModal({ role }: { role: Enums<"user_role"> }) {
  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [vendor, setVendor] = useState("");
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [state, formAction, isPending] = useActionState(addSupplyRequest, INITIAL_STATE);
  const [handledState, setHandledState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  const isExecutive = role === "executive";
  const canCreateProducts = role === "manager" || role === "executive";
  const qtyNum = parseFloat(qty) || 0;
  const priceNum = parseFloat(unitPrice);
  const itemTotal = priceNum > 0 && qtyNum > 0 ? qtyNum * priceNum : null;

  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
      setQty("1");
      setUnitPrice("");
      setVendor("");
      setProductName("");
      setProductId(null);
    }
  }

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  // Selecting a catalog product fills in what it knows (blank if the product doesn't
  // have a default) — the user can still edit either field afterward. Quantity and link
  // are deliberately left untouched: qty is whatever the user already set, and product
  // URLs vary per shopping trip so there's no sensible default to pull in.
  function handleProductSelect(product: Product) {
    setProductId(product.id);
    setVendor(product.default_vendor ?? "");
    setUnitPrice(product.default_unit_price != null ? String(product.default_unit_price) : "");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-accent px-3.5 py-3 text-sm font-medium text-white hover:bg-accent-hover sm:py-2"
      >
        + New request
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(16,24,40,0.4)] p-modal-backdrop py-6 sm:items-center sm:p-modal-backdrop-lg"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-md rounded-xl bg-surface shadow-md sm:max-h-[90vh] sm:overflow-y-auto">
            <form ref={formRef} action={formAction}>
              <div className="border-b border-border px-modal-pad py-5 sm:px-modal-pad-lg">
                <h2 className="text-[17px] font-semibold text-text">New supply request</h2>
                <p className="mt-1 text-[13px] text-text-muted">
                  PPE, site consumables, office and plotter supplies — anything that isn&rsquo;t
                  groceries.
                </p>
              </div>

              <div className="px-modal-pad py-5 sm:px-modal-pad-lg">
                <div className="mb-3.5">
                  <label htmlFor="s-name" className="mb-1.5 block text-sm font-medium text-text">
                    Item name
                  </label>
                  <ProductCombobox
                    id="s-name"
                    value={productName}
                    onChange={(value) => {
                      setProductName(value);
                      setProductId(null);
                    }}
                    onProductSelect={handleProductSelect}
                    placeholder="e.g. Hi-vis safety vests — CSA Class 2"
                    canCreateProducts={canCreateProducts}
                  />
                  <input type="hidden" name="name" value={productName} />
                  <input type="hidden" name="product_id" value={productId ?? ""} />
                  <input type="hidden" name="product_name" value={productName} />
                </div>

                <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="s-vendor" className="mb-1.5 block text-sm font-medium text-text">
                      Vendor
                    </label>
                    <input
                      id="s-vendor"
                      name="vendor"
                      type="text"
                      required
                      value={vendor}
                      onChange={(event) => setVendor(event.target.value)}
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

                <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
