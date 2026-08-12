"use client";

import { useActionState, useState } from "react";
import { markReceived, type MarkReceivedActionState } from "./actions";

const INITIAL_STATE: MarkReceivedActionState = {};

type ActiveProfile = { id: string; full_name: string };

export function MarkReceivedModal({
  itemId,
  currentUserId,
  activeProfiles,
}: {
  itemId: string;
  currentUserId: string;
  activeProfiles: ActiveProfile[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(markReceived, INITIAL_STATE);
  const [handledState, setHandledState] = useState(state);

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
        className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:bg-bg"
      >
        Mark received
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
                <h2 className="text-[17px] font-semibold text-text">Mark as received & verified</h2>
                <p className="mt-1 text-[13px] text-text-muted">
                  Confirm the correct item arrived. This moves it to History.
                </p>
              </div>

              <div className="px-6 py-5">
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
                  {isPending ? "Confirming…" : "Confirm receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
