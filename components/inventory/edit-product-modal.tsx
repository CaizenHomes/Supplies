"use client";

import { useActionState, useState } from "react";
import { updateProduct, type UpdateProductActionState } from "@/app/(app)/inventory/products/[id]/actions";
import type { Product } from "@/lib/products";

const INITIAL_STATE: UpdateProductActionState = {};

export function EditProductModal({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [barcode, setBarcode] = useState(product.barcode ?? "");
  const [state, formAction, isPending] = useActionState(updateProduct, INITIAL_STATE);
  const [handledState, setHandledState] = useState(state);

  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
    }
  }

  // Barcode is the one field a change to which can silently break the scanner match
  // (Feature 3b) — everything else is safe to edit freely.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const barcodeChanged = barcode.trim() !== (product.barcode ?? "");
    if (
      barcodeChanged &&
      !window.confirm("Are you sure? This will re-link the scanner match.")
    ) {
      event.preventDefault();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border-strong bg-surface px-3.5 py-3 text-sm font-medium text-text hover:bg-bg sm:py-2"
      >
        Edit product
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.4)] p-3 sm:p-5"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface shadow-md">
            <form action={formAction} onSubmit={handleSubmit}>
              <input type="hidden" name="product_id" value={product.id} />

              <div className="border-b border-border px-4 py-5 sm:px-6">
                <h2 className="text-[17px] font-semibold text-text">Edit product</h2>
              </div>

              <div className="px-4 py-5 sm:px-6">
                <div className="mb-3.5">
                  <label htmlFor="p-name" className="mb-1.5 block text-sm font-medium text-text">
                    Name
                  </label>
                  <input
                    id="p-name"
                    name="name"
                    type="text"
                    required
                    defaultValue={product.name}
                    className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                </div>

                <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="p-vendor" className="mb-1.5 block text-sm font-medium text-text">
                      Default vendor
                    </label>
                    <input
                      id="p-vendor"
                      name="default_vendor"
                      type="text"
                      defaultValue={product.default_vendor ?? ""}
                      className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                    />
                  </div>
                  <div>
                    <label htmlFor="p-price" className="mb-1.5 block text-sm font-medium text-text">
                      Default price ($)
                    </label>
                    <input
                      id="p-price"
                      name="default_unit_price"
                      type="number"
                      min={0.01}
                      step={0.01}
                      defaultValue={product.default_unit_price ?? ""}
                      className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                    />
                  </div>
                </div>

                <div className="mb-3.5">
                  <label htmlFor="p-barcode" className="mb-1.5 block text-sm font-medium text-text">
                    Barcode
                  </label>
                  <input
                    id="p-barcode"
                    name="barcode"
                    type="text"
                    value={barcode}
                    onChange={(event) => setBarcode(event.target.value)}
                    className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Changing this asks for confirmation — the barcode scanner matches on it.
                  </p>
                </div>

                <div className="mb-3.5">
                  <label htmlFor="p-category" className="mb-1.5 block text-sm font-medium text-text">
                    Category
                  </label>
                  <input
                    id="p-category"
                    name="category"
                    type="text"
                    defaultValue={product.category ?? ""}
                    className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                </div>

                {state.error && <p className="text-sm text-danger">{state.error}</p>}
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 rounded-b-xl border-t border-border bg-[#fafbfc] px-4 py-3.5 sm:flex-row sm:px-6">
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
                  {isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
