import { getProductsWithUsage } from "@/lib/products";
import { ProductsTable } from "@/components/inventory/products-table";

export default async function ProductsPage() {
  const products = await getProductsWithUsage();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-base font-semibold text-text">Products</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          The shared catalog behind the autocomplete on Groceries and Supplies forms.
          Sorted by how often each one has actually been ordered.
        </p>
      </div>

      <ProductsTable products={products} />
    </section>
  );
}
