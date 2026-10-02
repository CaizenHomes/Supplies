import Link from "next/link";
import { monthLabel } from "@/lib/history-month";

// Shown under the History filters when a month is selected. The month is the order month,
// which can differ from the Completed (received) date, so say so.
export function HistoryMonthCaption({ month }: { month: string }) {
  return (
    <p className="mb-3 text-xs text-text-muted">
      Items ordered in {monthLabel(month)}. Rejected and unordered cancelled items are filed by the date
      they were closed.
    </p>
  );
}

export function HistoryNoMatches({ basePath }: { basePath: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center text-text-muted">
      <p className="mb-1 text-[15px] font-medium text-text">No items match these filters</p>
      <Link href={basePath} className="text-accent hover:underline">
        Clear filters
      </Link>
    </div>
  );
}
