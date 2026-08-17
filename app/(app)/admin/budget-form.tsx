"use client";

import { useActionState } from "react";
import { setBudget, type SetBudgetActionState } from "./actions";

const INITIAL_STATE: SetBudgetActionState = {};

export function BudgetForm({ currentBudget }: { currentBudget: number }) {
  const [state, formAction, isPending] = useActionState(setBudget, INITIAL_STATE);

  return (
    <form
      action={formAction}
      className="max-w-sm rounded-lg border border-border bg-surface p-6 shadow-sm"
    >
      <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-text">
        Monthly budget ($)
      </label>
      <input
        id="amount"
        name="amount"
        type="number"
        min={0.01}
        step="any"
        required
        defaultValue={currentBudget || undefined}
        className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />
      <p className="mt-1 text-xs text-text-muted">
        Applies to the current month. Changing it may push existing items over budget.
      </p>

      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {state.success && <p className="mt-2 text-sm text-success">Budget updated.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="mt-3 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save budget"}
      </button>
    </form>
  );
}
