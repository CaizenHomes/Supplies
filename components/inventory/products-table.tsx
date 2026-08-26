"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { ProductWithUsage } from "@/lib/products";

export function ProductsTable({ products }: { products: ProductWithUsage[] }) {
  const [search, setSearch] = useState("");

  const filtered = products.filter((product) =>
    product.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search products…"
        className="w-full max-w-sm rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center text-text-muted">
          {products.length === 0
            ? "No products in the catalog yet."
            : `No products match "${search}".`}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[#fafbfc]">
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Name
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Vendor
                </th>
                <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Default price
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Barcode
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Category
                </th>
                <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Times ordered
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-b border-border last:border-0 hover:bg-[#fafbfc]">
                  <td className="px-3.5 py-3">
                    <Link
                      href={`/inventory/products/${product.id}`}
                      className="font-medium text-text hover:text-accent hover:underline"
                    >
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-3.5 py-3 text-text-muted">
                    {product.default_vendor ?? <span className="text-text-subtle">—</span>}
                  </td>
                  <td className="px-3.5 py-3 text-right tabular-nums">
                    {product.default_unit_price != null ? (
                      formatCurrency(product.default_unit_price)
                    ) : (
                      <span className="text-text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-text-muted">
                    {product.barcode ?? <span className="text-text-subtle">—</span>}
                  </td>
                  <td className="px-3.5 py-3 text-text-muted">
                    {product.category ?? <span className="text-text-subtle">—</span>}
                  </td>
                  <td className="px-3.5 py-3 text-right font-semibold tabular-nums">
                    {product.timesOrdered}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
