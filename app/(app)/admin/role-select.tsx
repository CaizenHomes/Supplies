"use client";

import { useState, useTransition } from "react";
import { updateUserRole } from "./actions";
import type { Enums } from "@/lib/types";

const ROLES: Enums<"user_role">[] = ["staff", "manager", "executive"];

export function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: Enums<"user_role">;
}) {
  const [value, setValue] = useState(currentRole);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const role = event.target.value as Enums<"user_role">;
    const previous = value;
    setValue(role);
    setError(null);
    startTransition(async () => {
      try {
        await updateUserRole(userId, role);
      } catch (err) {
        // Revert visually — e.g. the DB blocked demoting the last active executive.
        setValue(previous);
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md border border-border-strong bg-white px-2 py-1 text-xs text-text disabled:opacity-50"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </option>
        ))}
      </select>
      {error && <span className="max-w-[150px] text-xs text-danger">{error}</span>}
    </div>
  );
}
