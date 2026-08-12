"use client";

import { useActionState, useState } from "react";
import { inviteUser, type InviteActionState } from "./actions";

const INITIAL_STATE: InviteActionState = {};

export function InviteModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(inviteUser, INITIAL_STATE);
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
        className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        + Invite teammate
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.4)] p-5"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface shadow-md">
            <form action={formAction}>
              <div className="border-b border-border px-6 py-5">
                <h2 className="text-[17px] font-semibold text-text">Invite a teammate</h2>
                <p className="mt-1 text-[13px] text-text-muted">
                  They&rsquo;ll get an email with a sign-in link. No password needed.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="mb-3.5">
                  <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-text">
                    Full name
                  </label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                </div>
                <div className="mb-3.5">
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="teammate@caizenhomes.com"
                    className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                </div>
                <div className="mb-3.5">
                  <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-text">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    defaultValue="staff"
                    className="w-full rounded-md border border-border-strong bg-white px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>

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
                  {isPending ? "Sending invite…" : "Send invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
