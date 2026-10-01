import { createClient } from "@/lib/supabase/server";
import type { OrderItem, OrderTaxData, OrderTaxMap } from "@/lib/order-totals";

// Loads GST/PST for the given orders (receipt paths), plus every item on those orders so
// totals are complete even when the page shows only some of an order's rows (e.g. a
// History status filter). Orders with no tax row simply have no entry in `taxes`, which
// the display treats as $0 / "no tax entered".
export async function getOrderTaxData(receiptPaths: (string | null)[]): Promise<OrderTaxData> {
  const paths = Array.from(new Set(receiptPaths.filter((path): path is string => !!path)));
  if (paths.length === 0) return { taxes: {}, orderItems: [] };

  const supabase = await createClient();
  const [{ data: taxRows }, { data: itemRows }] = await Promise.all([
    supabase.from("order_taxes").select("receipt_path, gst, pst").in("receipt_path", paths),
    supabase
      .from("items_detailed")
      .select("receipt_path, vendor, qty, unit_price, counts_as_spent")
      .in("receipt_path", paths),
  ]);

  const taxes: OrderTaxMap = {};
  for (const row of taxRows ?? []) {
    taxes[row.receipt_path] = { gst: row.gst, pst: row.pst };
  }

  const orderItems = (itemRows ?? []).filter((item): item is OrderItem => item.receipt_path !== null);
  return { taxes, orderItems };
}
