// Order-level money for Groceries orders: subtotal of counted items plus optional GST/PST.
// Pure helpers only (no server imports), so client components can use them too.
//
// All arithmetic is done in integer cents so totals match the receipt exactly; amounts are
// only converted back to dollars for display.

export type OrderTax = { gst: number | null; pst: number | null };

// Keyed by receipt_path — an order is the set of items sharing one receipt. A plain object
// (not a Map) so it can be passed from server components to client components.
export type OrderTaxMap = Record<string, OrderTax>;

type TotalsItem = {
  qty: number | null;
  unit_price: number | null;
  counts_as_spent: boolean | null;
};

export type OrderTotals = {
  subtotalCents: number;
  gstCents: number;
  pstCents: number;
  totalCents: number;
  // False when every item on the order is cancelled/rejected — the tax is then excluded,
  // matching budget_spent() in the database.
  taxCounts: boolean;
  hasTax: boolean;
};

// Everything the tables need to render one order's tax summary and Edit tax button.
export type OrderTaxInfo = { receiptPath: string; tax: OrderTax | undefined; totals: OrderTotals };

// Every item on the orders being displayed, whatever its status or the page's filters, so
// an order's totals never depend on which of its rows happen to be on screen.
export type OrderItem = {
  receipt_path: string;
  vendor: string | null;
  qty: number | null;
  unit_price: number | null;
  counts_as_spent: boolean | null;
};

export type OrderTaxData = { taxes: OrderTaxMap; orderItems: OrderItem[] };

export function groupOrderItems(orderItems: OrderItem[]): Map<string, OrderItem[]> {
  const byReceipt = new Map<string, OrderItem[]>();
  for (const item of orderItems) {
    byReceipt.set(item.receipt_path, [...(byReceipt.get(item.receipt_path) ?? []), item]);
  }
  return byReceipt;
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function itemCents(item: { qty: number | null; unit_price: number | null }): number | null {
  return item.unit_price === null ? null : (item.qty ?? 0) * toCents(item.unit_price);
}

// `items` must be every item sharing the order's receipt_path that the page has loaded;
// only counted items contribute to the subtotal.
export function orderTotals(items: TotalsItem[], tax: OrderTax | undefined): OrderTotals {
  const counted = items.filter((item) => item.counts_as_spent);
  const subtotalCents = counted.reduce((sum, item) => sum + (itemCents(item) ?? 0), 0);
  const gstCents = tax?.gst != null ? toCents(tax.gst) : 0;
  const pstCents = tax?.pst != null ? toCents(tax.pst) : 0;
  const taxCounts = counted.length > 0;

  return {
    subtotalCents,
    gstCents,
    pstCents,
    totalCents: subtotalCents + (taxCounts ? gstCents + pstCents : 0),
    taxCounts,
    hasTax: tax != null && (tax.gst != null || tax.pst != null),
  };
}

// numeric(10,2) upper bound.
const MAX_TAX = 99_999_999.99;

// Blank means "no tax entered" (stored as null, treated as $0). Otherwise a non-negative
// dollar amount with at most two decimals; a leading "$" is tolerated.
export function parseTaxInput(
  raw: FormDataEntryValue | null,
  label: string,
): { value: number | null; error?: undefined } | { value?: undefined; error: string } {
  const text = String(raw ?? "").trim().replace(/^\$/, "");
  if (text === "") return { value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return { error: `${label} must be a dollar amount like 4.25 (no negatives, up to 2 decimals).` };
  }
  const value = Number(text);
  if (value > MAX_TAX) return { error: `${label} is too large.` };
  return { value };
}
