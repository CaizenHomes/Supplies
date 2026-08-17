"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "all", label: "All items" },
  { value: "received", label: "Received & verified" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export function HistoryFilter({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "all";

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="mb-3 flex items-center gap-2">
      <label htmlFor="history-filter" className="text-xs text-text-muted">
        Filter:
      </label>
      <select
        id="history-filter"
        value={current}
        onChange={handleChange}
        className="rounded-md border border-border-strong bg-white px-2.5 py-1.5 text-[13px] text-text"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
