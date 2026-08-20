"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  markOrderedBatch,
  markReceivedBatch,
  type MarkOrderedBatchActionState,
  type MarkReceivedBatchActionState,
} from "@/lib/actions/order-actions";

const ORDERED_INITIAL: MarkOrderedBatchActionState = {};
const RECEIVED_INITIAL: MarkReceivedBatchActionState = {};

type ActiveProfile = { id: string; full_name: string };

export function BulkActionBar({
  inListIds,
  orderedIds,
  currentUserId,
  activeProfiles,
  onDone,
}: {
  inListIds: string[];
  orderedIds: string[];
  currentUserId: string;
  activeProfiles: ActiveProfile[];
  onDone: () => void;
}) {
  const [openModal, setOpenModal] = useState<"ordered" | "received" | null>(null);

  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border border-accent bg-accent-soft px-4 py-2.5">
      <span className="text-sm font-medium text-accent">
        {inListIds.length + orderedIds.length} selected
      </span>
      <div className="flex items-center gap-2">
        {inListIds.length > 0 && (
          <button
            type="button"
            onClick={() => setOpenModal("ordered")}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
          >
            Mark {inListIds.length} selected as ordered
          </button>
        )}
        {orderedIds.length > 0 && (
          <button
            type="button"
            onClick={() => setOpenModal("received")}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
          >
            Mark {orderedIds.length} selected as received
          </button>
        )}
      </div>

      {openModal === "ordered" && (
        <BulkMarkOrderedDialog
          itemIds={inListIds}
          onClose={() => setOpenModal(null)}
          onSuccess={onDone}
        />
      )}
      {openModal === "received" && (
        <BulkMarkReceivedDialog
          itemIds={orderedIds}
          currentUserId={currentUserId}
          activeProfiles={activeProfiles}
          onClose={() => setOpenModal(null)}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.4)] p-5"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface shadow-md">
        <form action={formAction}>
          {itemIds.map((id) => (
            <input key={id} type="hidden" name="item_ids" value={id} />
          ))}

          <div className="border-b border-border px-6 py-5">
            <h2 className="text-[17px] font-semibold text-text">
              Mark {itemIds.length} items as ordered
            </h2>
            <p className="mt-1 text-[13px] text-text-muted">
              Attach one receipt or PO — it&rsquo;ll be recorded against all {itemIds.length} selected
              items.
            </p>
          </div>

          <div className="px-6 py-5">
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

          <div className="flex justify-end gap-2 rounded-b-xl border-t border-border bg-[#fafbfc] px-6 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-text hover:bg-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Confirming…" : `Confirm ${itemIds.length} orders`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkMarkReceivedDialog({
  itemIds,
  currentUserId,
  activeProfiles,
  onClose,
  onSuccess,
}: {
  itemIds: string[];
  currentUserId: string;
  activeProfiles: ActiveProfile[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(markReceivedBatch, RECEIVED_INITIAL);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.4)] p-5"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface shadow-md">
        <form action={formAction}>
          {itemIds.map((id) => (
            <input key={id} type="hidden" name="item_ids" value={id} />
          ))}

          <div className="border-b border-border px-6 py-5">
            <h2 className="text-[17px] font-semibold text-text">
              Mark {itemIds.length} items as received &amp; verified
            </h2>
            <p className="mt-1 text-[13px] text-text-muted">
              Confirm the correct items arrived. This moves all {itemIds.length} to History.
            </p>
          </div>

          <div className="px-6 py-5">
            <label htmlFor="bulk-checked-by" className="mb-1.5 block text-sm font-medium text-text">
              Verified by
            </label>
            <select
              id="bulk-checked-by"
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
              onClick={onClose}
              className="rounded-md border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-text hover:bg-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Confirming…" : `Confirm ${itemIds.length} received`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
