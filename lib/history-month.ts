// History's month filter. Pure helpers only (no server imports), so client components can
// use them too.
//
// An item's history month, in Pacific time (APP_TIME_ZONE):
//  * the month it was ordered, if it was ordered (received, or cancelled after ordering);
//  * otherwise the month it was rejected, or cancelled before ordering.
// For Groceries this is the month budget_spent() counts a received item toward.

import { APP_TIME_ZONE } from "@/lib/format";

type MonthDated = {
  status: string | null;
  ordered_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  checked_at: string | null;
};

export type MonthOption = { value: string; label: string };

const monthKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
});

// "2026-09" for an ISO timestamp, in Pacific time.
function monthKey(iso: string): string {
  const parts = monthKeyFormat.formatToParts(new Date(iso));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

export function historyMonthKey(item: MonthDated): string | null {
  const date =
    item.ordered_at ??
    (item.status === "rejected"
      ? item.rejected_at
      : item.status === "cancelled"
        ? item.cancelled_at
        : item.checked_at);
  return date ? monthKey(date) : null;
}

export function isMonthKey(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

// "September 2026" for "2026-09".
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Every month that has history, newest first. `selected` is always included so a URL for
// a month with no rows still shows that month in the dropdown (with the empty state).
export function historyMonthOptions(items: MonthDated[], selected: string | null): MonthOption[] {
  const keys = new Set(items.map(historyMonthKey).filter((key): key is string => key !== null));
  if (selected) keys.add(selected);
  return Array.from(keys)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({ value: key, label: monthLabel(key) }));
}
