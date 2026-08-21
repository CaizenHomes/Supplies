// Shared grouping logic for the Order List and History pages: items that share the
// same non-null receipt_path (i.e. were bulk-ordered / bulk-received together) render
// as one visual group instead of N separate rows. A receipt shared by only one item
// doesn't count as a group — it stays a normal standalone row.

export type ReceiptGroupable = {
  id: string | null;
  receipt_path: string | null;
  name: string | null;
};

export type ReceiptRenderUnit<T> =
  | { kind: "group"; key: string; items: T[]; date: string | null }
  | { kind: "row"; key: string; item: T };

export function buildReceiptRenderUnits<T extends ReceiptGroupable>(
  items: T[],
  dateOf: (item: T) => string | null,
): ReceiptRenderUnit<T>[] {
  const byReceipt = new Map<string, T[]>();
  const standalone: T[] = [];

  for (const item of items) {
    if (!item.receipt_path) {
      standalone.push(item);
      continue;
    }
    const existing = byReceipt.get(item.receipt_path);
    if (existing) {
      existing.push(item);
    } else {
      byReceipt.set(item.receipt_path, [item]);
    }
  }

  const units: ReceiptRenderUnit<T>[] = [];

  for (const [receiptPath, groupItems] of byReceipt) {
    if (groupItems.length < 2) {
      standalone.push(...groupItems);
      continue;
    }

    const sortedItems = [...groupItems].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    const date = sortedItems.reduce<string | null>((earliest, item) => {
      const itemDate = dateOf(item);
      if (!itemDate) return earliest;
      if (!earliest || itemDate < earliest) return itemDate;
      return earliest;
    }, null);

    units.push({ kind: "group", key: receiptPath, items: sortedItems, date });
  }

  for (const item of standalone) {
    units.push({ kind: "row", key: item.id ?? item.name ?? "unknown", item });
  }

  return units.sort((a, b) => {
    const dateA = a.kind === "group" ? a.date : dateOf(a.item);
    const dateB = b.kind === "group" ? b.date : dateOf(b.item);
    return (dateB ?? "").localeCompare(dateA ?? "");
  });
}
