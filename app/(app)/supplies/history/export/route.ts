import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

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
  "urgency",
  "note",
  "requested_by_name",
  "requested_at",
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

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "executive") {
    return NextResponse.json({ error: "Only executives can export history." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("items_detailed")
    .select("*")
    .eq("module", "supplies")
    .in("status", ["received", "rejected", "cancelled"])
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = COLUMNS.join(",");
  const rows = (items ?? []).map((item) =>
    COLUMNS.map((column) => csvEscape((item as Record<string, unknown>)[column])).join(","),
  );
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="supplies-history-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
