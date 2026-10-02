import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/profile";
import { getHistoryItems, parseHistoryFilters } from "@/lib/history";

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const COLUMNS = [
  "module",
  "name",
  "vendor",
  "qty",
  "unit_price",
  "total",
  "status",
  "requested_by_name",
  "requested_at",
  "promoted_at",
  "over_budget_reason",
  "approved_by_name",
  "approved_at",
  "rejected_by_name",
  "rejected_at",
  "ordered_by_name",
  "ordered_at",
  "receipt_path",
  "checked_by_name",
  "checked_at",
  "cancelled_by_name",
  "cancelled_at",
  "cancellation_reason",
] as const;

// Exports exactly the rows the History page shows for the same ?status= and ?month=.
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "executive") {
    return NextResponse.json({ error: "Only executives can export history." }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const filters = parseHistoryFilters({ status: searchParams.get("status"), month: searchParams.get("month") });
  const { items, error } = await getHistoryItems("groceries", filters);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const header = COLUMNS.join(",");
  const rows = items.map((item) =>
    COLUMNS.map((column) => csvEscape((item as Record<string, unknown>)[column])).join(","),
  );
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="groceries-history-${filters.month ?? new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
