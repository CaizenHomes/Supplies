"use client";

import { useActionState, useState } from "react";
import { markReceivedBatch, type MarkReceivedBatchActionState } from "@/lib/actions/order-actions";
import { BarcodeScanner } from "@/components/barcode-scanner";

const INITIAL_STATE: MarkReceivedBatchActionState = {};

type ActiveProfile = { id: string; full_name: string };

export function MarkReceivedButton({
  itemIds,
  itemName,
  module,
  currentUserId,
  activeProfiles,
  label,
  className,
  onSuccess,
}: {
  itemIds: string[];
  // Item name for display, and module for the barcode scanner's search scope. itemName
  // is only set by the single-item call site — a group modal has no one name to show
  // until a scan retargets it to a single scanned item.
  itemName?: string;
  module?: "groceries" | "supplies";
  currentUserId: string;
  activeProfiles: ActiveProfile[];
  label?: string;
  className?: string;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  // A scan match replaces the modal's target item entirely (rather than just the group
  // it was originally opened for) — these start from the props but can be overwritten.
  const [activeItemIds, setActiveItemIds] = useState(itemIds);
  const [activeItemName, setActiveItemName] = useState(itemName);
  // Tracks whether the current target came from a scan (vs. the modal's original
  // item/group) — used purely for display ("(from scan)"), not for form submission.
  const [isScannedOverride, setIsScannedOverride] = useState(false);
  const [state, formAction, isPending] = useActionState(markReceivedBatch, INITIAL_STATE);
  const [handledState, setHandledState] = useState(state);
  const canScan = !!module;
  // Derived from the *active* target, not the original itemIds prop — a scan inside a
  // group modal narrows it down to one item, and the header/labels below should reflect
  // "receive just this one" once that happens, not the original group size.
  const isActiveGroup = activeItemIds.length > 1;

  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
      setActiveItemIds(itemIds);
      setActiveItemName(itemName);
      setIsScannedOverride(false);
      onSuccess?.();
    }
  }

  function handleOpen() {
    setActiveItemIds(itemIds);
    setActiveItemName(itemName);
    setIsScannedOverride(false);
    setOpen(true);
  }

  function handleScanConfirmed(scannedItemId: string, scannedItemName: string) {
    setActiveItemIds([scannedItemId]);
    setActiveItemName(scannedItemName);
    setIsScannedOverride(true);
    setScannerOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          className ??
          "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:bg-bg"
        }
      >
        {label ?? "Mark received"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.4)] p-5"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface shadow-md">
            <form action={formAction}>
              {activeItemIds.map((id) => (
                <input key={id} type="hidden" name="item_ids" value={id} />
              ))}

              <div className="border-b border-border px-6 py-5">
                <h2 className="text-[17px] font-semibold text-text">
                  {isActiveGroup ? `Mark ${activeItemIds.length} items` : "Mark as"} received &amp; verified
                </h2>
                <p className="mt-1 text-[13px] text-text-muted">
                  Confirm the correct item{isActiveGroup ? "s" : ""} arrived. This moves{" "}
                  {isActiveGroup ? "them" : "it"} to History.
                </p>
              </div>

              <div className="px-6 py-5">
                {activeItemName && (
                  <p className="mb-3.5 text-sm text-text">
                    Item: <span className="font-medium">{activeItemName}</span>
                    {isScannedOverride && (
                      <span className="ml-1.5 text-xs text-text-muted">(from scan)</span>
                    )}
                  </p>
                )}

                {canScan && (
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="mb-3.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-text hover:bg-bg"
                  >
                    📷 Scan barcode
                  </button>
                )}

                <label htmlFor="checked_by" className="mb-1.5 block text-sm font-medium text-text">
                  Verified by
                </label>
                <select
                  id="checked_by"
                  name="checked_by"
                  defaultValue={currentUserId}
                  className="w-full rounded-md border border-border-strong bg-white px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                >
                  {activeProfiles.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-text-muted">
                  The person who physically checked the delivery.
                </p>

                {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
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
                    ? "Confirming…"
                    : isActiveGroup
                      ? `Confirm ${activeItemIds.length} received`
                      : "Confirm receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {scannerOpen && module && (
        <BarcodeScanner
          module={module}
          onClose={() => setScannerOpen(false)}
          onConfirmed={handleScanConfirmed}
        />
      )}
    </>
  );
}
