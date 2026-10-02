"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { MonthOption } from "@/lib/history-month";

const OPTIONS = [
  { value: "all", label: "All items" },
  { value: "received", label: "Received & verified" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const SELECT_CLASS =
  "min-h-11 rounded-md border border-border-strong bg-white px-2.5 py-1.5 text-[13px] text-text sm:min-h-0";

export function HistoryFilter({ basePath, months }: { basePath: string; months: MonthOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "all";
  const currentMonth = searchParams.get("month") ?? "all";

  // "all" removes the parameter; the other filter's parameter is kept as is.
  function setParam(name: "status" | "month", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete(name);
    } else {
      params.set(name, value);
    }
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <label htmlFor="history-filter" className="text-xs text-text-muted">
          Filter:
        </label>
        <select
          id="history-filter"
          value={current}
          onChange={(event) => setParam("status", event.target.value)}
          className={SELECT_CLASS}
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="history-month" className="text-xs text-text-muted">
          Month:
        </label>
        <select
          id="history-month"
          value={currentMonth}
          onChange={(event) => setParam("month", event.target.value)}
          className={SELECT_CLASS}
        >
          <option value="all">All months</option>
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
